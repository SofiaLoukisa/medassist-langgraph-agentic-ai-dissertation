import { db } from "../db/index.js";
import { chatSessions, chatMessages } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { graph } from "../agent/graph.js";
import { llm } from "../lib/llm.js";

export async function createSession(
  userId: string,
  patientId?: string,
  title?: string
) {
  const [session] = await db
    .insert(chatSessions)
    .values({ userId, patientId, title: title || "New Chat" })
    .returning();
  return session;
}

export async function getSessions(userId: string) {
  return db.query.chatSessions.findMany({
    where: eq(chatSessions.userId, userId),
    orderBy: desc(chatSessions.updatedAt),
  });
}

export async function getSessionWithMessages(sessionId: string, userId: string) {
  return db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.userId, userId)
    ),
    with: {
      messages: { orderBy: chatMessages.createdAt },
    },
  });
}

export async function deleteSession(sessionId: string, userId: string) {
  const result = await db
    .delete(chatSessions)
    .where(
      and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))
    )
    .returning();
  return result.length > 0;
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  content: string,
  onToken: (token: string) => void,
  onToolEvent: (event: { type: "tool_start" | "tool_end"; tool: string; callId: string; args?: Record<string, unknown> }) => void,
  onDone: (fullResponse: string, sources: unknown[], toolsUsed: string[]) => void,
  onError: (error: string) => void
) {
  try {
    // Verify session ownership
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId)
      ),
    });

    if (!session) {
      onError("Session not found");
      return;
    }

    // Save user message
    await db.insert(chatMessages).values({
      sessionId,
      role: "user",
      content,
    });

    // Get conversation history
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    // Convert to LangChain messages
    const messages = history.map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    );

    // Stream the agent response
    let fullResponse = "";
    let sources: unknown[] = [];
    const toolsUsed: string[] = [];

    console.log(`[Chat] Sending message for session=${sessionId}, patientId=${session.patientId || "none"}, history=${history.length} messages`);

    const stream = await graph.stream(
      {
        messages,
        ...(session.patientId ? { patientId: session.patientId } : {}),
      },
      {
        streamMode: "updates",
        configurable: {
          userId,
          onToolCall: (name: string, args: Record<string, unknown>, callId: string) => {
            toolsUsed.push(name);
            onToolEvent({ type: "tool_start", tool: name, callId, args });
          },
          onToolResult: (name: string, _result: string, callId: string) => {
            onToolEvent({ type: "tool_end", tool: name, callId });
          },
        },
      }
    );

    for await (const update of stream) {
      // Extract messages from node updates
      for (const [nodeName, nodeOutput] of Object.entries(update)) {
        console.log(`[Chat] Stream update from node: ${nodeName}`);
        const output = nodeOutput as Record<string, unknown>;
        if (output.messages && Array.isArray(output.messages)) {
          for (const msg of output.messages) {
            const aiMsg = msg as AIMessage;
            const text =
              typeof aiMsg.content === "string"
                ? aiMsg.content
                : JSON.stringify(aiMsg.content);
            fullResponse += text;
            onToken(text);
          }
        }
        if (output.retrievedDocs) {
          sources = output.retrievedDocs as unknown[];
          console.log(`[Chat] Retrieved ${(sources as unknown[]).length} source documents`);
        }
      }
    }

    // Save assistant message with tools used
    await db.insert(chatMessages).values({
      sessionId,
      role: "assistant",
      content: fullResponse,
      sources: sources.length > 0 ? sources : null,
      toolData: toolsUsed.length > 0 ? { toolsUsed } : null,
    });

    // Auto-generate title if first exchange
    if (history.length <= 1) {
      generateTitle(sessionId, content).catch(console.error);
    }

    // Update session timestamp
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    console.log(`[Chat] Response complete. Length=${fullResponse.length}, sources=${sources.length}, tools=[${toolsUsed.join(", ")}]`);
    onDone(fullResponse, sources, toolsUsed);
  } catch (error) {
    console.error("Send message error:", error);
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}

async function generateTitle(sessionId: string, firstMessage: string) {
  console.log(`[Chat] Generating title for session=${sessionId}`);
  const result = await llm.invoke([
    new HumanMessage(
      `Generate a very short title (max 6 words) for a chat that starts with this message: "${firstMessage}". Return only the title, nothing else.`
    ),
  ]);
  const title =
    typeof result.content === "string"
      ? result.content.replace(/"/g, "").trim()
      : "Chat";

  await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));
}
