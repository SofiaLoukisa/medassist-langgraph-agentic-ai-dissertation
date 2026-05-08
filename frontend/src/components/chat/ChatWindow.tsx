import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ToolCallIndicator } from "./ToolCallIndicator";
import { Loader2 } from "lucide-react";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{ content: string; source: string; score: number }>;
  toolsUsed?: string[];
  isBookmarked?: boolean;
}

interface ToolCall {
  callId: string;
  tool: string;
  args?: Record<string, unknown>;
  status: "running" | "done";
}

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  toolCalls?: ToolCall[];
  onSend: (message: string) => void;
  onBookmark?: (messageId: string) => void;
}

export function ChatWindow({
  messages,
  isStreaming,
  error,
  toolCalls = [],
  onSend,
  onBookmark,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Ask about medicines, drug interactions, or dosages</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            toolsUsed={msg.toolsUsed}
            isBookmarked={msg.isBookmarked}
            onBookmark={msg.id && onBookmark ? () => onBookmark(msg.id!) : undefined}
          />
        ))}
        {isStreaming && (
          <div className="flex flex-col gap-1 p-2">
            {toolCalls.length > 0 ? (
              <ToolCallIndicator toolCalls={toolCalls} />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
}
