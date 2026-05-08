import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { getToolLabel } from "@/lib/toolLabels";
import { User, Bot, Bookmark, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{ content: string; source: string; score: number }>;
  toolsUsed?: string[];
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export function ChatMessage({
  role,
  content,
  sources,
  toolsUsed,
  isBookmarked,
  onBookmark,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        role === "user" ? "bg-muted" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">
            {role === "user" ? "You" : "MedAssist"}
          </span>
          {onBookmark && role === "assistant" && (
            <button onClick={onBookmark} className="text-muted-foreground hover:text-primary">
              <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-primary text-primary")} />
            </button>
          )}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:text-sm prose-th:bg-muted prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-pre:bg-muted prose-pre:rounded-md prose-code:text-xs prose-strong:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {sources && sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {[...new Set(sources.map((s) => s.source))].map((source, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        )}
        {toolsUsed && toolsUsed.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set(toolsUsed)].map((t, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1">
                <Wrench className="h-3 w-3" />
                {getToolLabel(t)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
