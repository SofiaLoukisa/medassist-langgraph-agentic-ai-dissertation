import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

interface Session {
  id: string;
  title: string;
  updatedAt: string;
}

interface SessionWithMessages extends Session {
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    sources?: unknown;
    toolData?: { toolsUsed?: string[] } | null;
    isBookmarked: boolean;
  }>;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const { messages, setMessages, isStreaming, error, sendMessage, toolCalls } = useChat(id);

  // Load sessions list (refresh when streaming ends to pick up auto-generated titles)
  useEffect(() => {
    if (!isStreaming) {
      api.get<Session[]>("/chat/sessions").then(setSessions).catch(console.error);
    }
  }, [isStreaming]);

  // Load session messages when id changes
  useEffect(() => {
    if (!id) return;
    api.get<SessionWithMessages>(`/chat/sessions/${id}`).then((session) => {
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources as Array<{ content: string; source: string; score: number }> | undefined,
          toolsUsed: m.toolData?.toolsUsed,
          isBookmarked: m.isBookmarked,
        }))
      );
    }).catch(console.error);
  }, [id, setMessages]);

  const createSession = async () => {
    const session = await api.post<Session>("/chat/sessions", {});
    setSessions((prev) => [session, ...prev]);
    navigate(`/chat/${session.id}`);
  };

  const deleteSession = async (sessionId: string) => {
    await api.delete(`/chat/sessions/${sessionId}`);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (id === sessionId) navigate("/chat");
  };

  const handleBookmark = async (messageId: string) => {
    if (!id) return;
    await api.post("/bookmarks", { messageId, sessionId: id });
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isBookmarked: true } : m))
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Sidebar: Session List */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <Button onClick={createSession} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 p-2 mx-2 my-1 rounded-lg text-sm cursor-pointer group ${
                s.id === id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <Link to={`/chat/${s.id}`} className="flex-1 truncate flex items-center gap-2">
                <MessageSquare className="h-3 w-3 shrink-0" />
                {s.title || "Untitled"}
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {id ? (
          <ChatWindow
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            toolCalls={toolCalls}
            onSend={sendMessage}
            onBookmark={handleBookmark}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Select or create a chat</p>
            <Button onClick={createSession} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
