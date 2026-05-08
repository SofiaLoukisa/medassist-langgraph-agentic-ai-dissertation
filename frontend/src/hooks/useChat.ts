import { useState, useCallback } from "react";
import { fetchSSE } from "@/lib/api";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{ content: string; source: string; score: number }>;
  toolsUsed?: string[];
  isBookmarked?: boolean;
  createdAt?: string;
}

interface ToolCall {
  callId: string;
  tool: string;
  args?: Record<string, unknown>;
  status: "running" | "done";
}

export function useChat(sessionId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || isStreaming) return;

      setError(null);
      // Add user message immediately
      const userMsg: Message = { role: "user", content, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);

      // Add empty assistant message for streaming
      const assistantMsg: Message = { role: "assistant", content: "", createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsStreaming(true);

      await fetchSSE(
        `/chat/sessions/${sessionId}/messages`,
        { content },
        (data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.content,
                  };
                }
                return updated;
              });
            } else if (parsed.type === "tool_start") {
              setToolCalls((prev) => [
                ...prev,
                { callId: parsed.callId, tool: parsed.tool, args: parsed.args, status: "running" },
              ]);
            } else if (parsed.type === "tool_end") {
              setToolCalls((prev) =>
                prev.map((tc) =>
                  tc.callId === parsed.callId
                    ? { ...tc, status: "done" }
                    : tc
                )
              );
            } else if (parsed.type === "done") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: parsed.content,
                    sources: parsed.sources,
                    toolsUsed: parsed.toolsUsed,
                  };
                }
                return updated;
              });
              setToolCalls([]);
            } else if (parsed.type === "error") {
              setError(parsed.error);
              setToolCalls([]);
            }
          } catch {
            // ignore parse errors
          }
        },
        () => {
          setIsStreaming(false);
        },
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    },
    [sessionId, isStreaming]
  );

  return { messages, setMessages, isStreaming, error, sendMessage, toolCalls };
}
