import { Loader2, Wrench, Check } from "lucide-react";
import { getToolLabel } from "@/lib/toolLabels";

interface ToolCall {
  callId: string;
  tool: string;
  args?: Record<string, unknown>;
  status: "running" | "done";
}

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
}

export function ToolCallIndicator({ toolCalls }: ToolCallIndicatorProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      {toolCalls.map((tc, i) => (
        <div key={tc.callId} className="flex items-center gap-2 text-sm text-muted-foreground">
          {tc.status === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Check className="h-3.5 w-3.5 text-green-500" />
          )}
          <Wrench className="h-3 w-3" />
          <span>{getToolLabel(tc.tool)}</span>
          {tc.status === "running" && <span>...</span>}
        </div>
      ))}
    </div>
  );
}
