import {
  AIMessage,
  SystemMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { llm } from "../../lib/llm.js";
import { AgentStateType } from "../state.js";
import { allTools, toolsByIntent } from "../tools/index.js";
import {
  RAG_PROMPT,
  INTERACTION_PROMPT,
  CARD_PROMPT,
  PATIENT_MANAGEMENT_PROMPT,
  GENERAL_PROMPT,
} from "../prompts.js";

// Map tool name -> tool instance for execution (typed as base interface)
const toolMap = new Map<string, StructuredToolInterface>(
  allTools.map((t) => [t.name, t as StructuredToolInterface])
);

// System prompt per intent
function getSystemPrompt(intent: string): string {
  switch (intent) {
    case "rag_query":
      return RAG_PROMPT.replace(
        "{context}",
        "(Use the search_medicines tool to retrieve relevant context before answering.)"
      );
    case "interaction_check":
      return INTERACTION_PROMPT.replace(
        "{interactions}",
        "(Use check_interactions and search_medicines tools to gather interaction data before analyzing.)"
      );
    case "card_generation":
      return CARD_PROMPT.replace(
        "{patientData}",
        "(Use search_patients to find the patient first, then create_dosage_card or create_patient_card with their ID.)"
      );
    case "patient_management":
      return PATIENT_MANAGEMENT_PROMPT;
    default:
      return GENERAL_PROMPT;
  }
}

/**
 * Tool-calling agent node. Uses a ReAct loop:
 * 1. LLM receives messages + available tools
 * 2. If LLM returns tool calls, execute them and feed results back
 * 3. Repeat until LLM responds with a final text answer
 */
export async function toolAgentNode(
  state: AgentStateType,
  config?: RunnableConfig
): Promise<Partial<AgentStateType>> {
  const onToolCall = config?.configurable?.onToolCall as ((name: string, args: Record<string, unknown>, callId: string) => void) | undefined;
  const onToolResult = config?.configurable?.onToolResult as ((name: string, result: string, callId: string) => void) | undefined;
  const intent = state.intent;
  const tools = toolsByIntent[intent] || allTools;
  const llmWithTools = llm.bindTools(tools);

  const systemPrompt = getSystemPrompt(intent);

  // Build initial messages: system prompt + conversation history
  const callMessages: BaseMessage[] = [
    new SystemMessage(
      systemPrompt +
        (state.patientId
          ? `\n\nCurrent patient ID: ${state.patientId}`
          : "\n\nNo patient is currently selected.")
    ),
    ...state.messages,
  ];

  // ReAct loop — max 5 iterations to prevent infinite loops
  const MAX_ITERATIONS = 5;
  const newMessages: BaseMessage[] = [];
  const toolsUsed: string[] = [];

  console.log(`[ToolAgent] Starting ReAct loop for intent="${intent}", tools=[${tools.map(t => t.name).join(", ")}]`);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const isLastIteration = i === MAX_ITERATIONS - 1;

    if (isLastIteration) {
      // Final iteration: ask LLM to synthesize an answer from gathered context
      console.log(`[ToolAgent] Iteration ${i + 1}/${MAX_ITERATIONS} — forcing final response (no tools)`);
      callMessages.push(new HumanMessage(
        "You have gathered enough information from the tools above. Now synthesize a comprehensive answer based on all the tool results you received. Do NOT call any more tools."
      ));
      const finalResponse = await llm.invoke(callMessages);
      const content = typeof finalResponse.content === "string" ? finalResponse.content : "";
      console.log(`[ToolAgent] Forced final response generated (${content.length} chars)`);
      newMessages.push(new AIMessage(content));
      break;
    }

    console.log(`[ToolAgent] Iteration ${i + 1}/${MAX_ITERATIONS} — invoking LLM`);
    const response = await llmWithTools.invoke(callMessages);

    // Check if the LLM wants to call tools
    const toolCalls = response.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — this is the final response
      console.log(`[ToolAgent] Final response generated (${typeof response.content === "string" ? response.content.length : 0} chars)`);
      newMessages.push(response);
      break;
    }

    // LLM wants to use tools — add its message (with tool_calls) to history
    callMessages.push(response);

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const toolInstance = toolMap.get(toolCall.name);

      const callId = toolCall.id || `${toolCall.name}_${i}_${toolCalls.indexOf(toolCall)}`;
      console.log(`[ToolAgent] Tool call: ${toolCall.name}(${JSON.stringify(toolCall.args).slice(0, 200)})`);
      onToolCall?.(toolCall.name, toolCall.args, callId);

      let toolResult: string;
      if (toolInstance) {
        try {
          toolResult = await toolInstance.invoke(toolCall.args, config);
        } catch (error) {
          toolResult = JSON.stringify({
            error: error instanceof Error ? error.message : "Tool execution failed",
          });
          console.error(`[ToolAgent] Tool error: ${toolCall.name} — ${toolResult}`);
        }
      } else {
        toolResult = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
        console.error(`[ToolAgent] Unknown tool: ${toolCall.name}`);
      }

      console.log(`[ToolAgent] Tool result: ${toolCall.name} — ${toolResult.slice(0, 200)}${toolResult.length > 200 ? "..." : ""}`);
      onToolResult?.(toolCall.name, toolResult, callId);
      toolsUsed.push(toolCall.name);

      // Add tool result as a ToolMessage
      const toolMessage = new ToolMessage({
        content: toolResult,
        tool_call_id: toolCall.id || toolCall.name,
        name: toolCall.name,
      });

      callMessages.push(toolMessage);
    }
  }

  console.log(`[ToolAgent] ReAct loop complete. Tools used: [${toolsUsed.join(", ")}]`);

  // Extract sources from any search_medicines tool calls for the UI
  const retrievedDocs: Array<{ content: string; source: string; score: number }> = [];
  for (const msg of callMessages) {
    if (msg instanceof ToolMessage && msg.name === "search_medicines") {
      try {
        const results = JSON.parse(typeof msg.content === "string" ? msg.content : "[]");
        if (Array.isArray(results)) {
          for (const r of results) {
            retrievedDocs.push({
              content: r.content || "",
              source: r.source || "unknown",
              score: 0,
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Extract generated card data
  let generatedCard: Record<string, unknown> | null = null;
  for (const msg of callMessages) {
    if (
      msg instanceof ToolMessage &&
      (msg.name === "create_dosage_card" || msg.name === "create_patient_card")
    ) {
      try {
        const content = typeof msg.content === "string" ? msg.content : "";
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        generatedCard = JSON.parse(cleaned);
      } catch {
        generatedCard = { raw: msg.content };
      }
    }
  }

  return {
    messages: newMessages,
    retrievedDocs: retrievedDocs.length > 0 ? retrievedDocs : state.retrievedDocs,
    interactionResults: state.interactionResults,
    generatedCard: generatedCard ?? state.generatedCard,
  };
}
