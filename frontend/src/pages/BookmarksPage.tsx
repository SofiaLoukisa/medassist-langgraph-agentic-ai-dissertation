import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Search, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface BookmarkItem {
  id: string;
  note?: string;
  createdAt: string;
  message: {
    id: string;
    role: string;
    content: string;
  };
  session: {
    id: string;
    title: string;
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBookmarks = async () => {
    try {
      const data = await api.get<BookmarkItem[]>("/bookmarks");
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const deleteBookmark = async (id: string) => {
    await api.delete(`/bookmarks/${id}`);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const filtered = bookmarks.filter(
    (b) =>
      b.message.content.toLowerCase().includes(search.toLowerCase()) ||
      b.note?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bookmarks</h2>
        <Badge variant="secondary">{bookmarks.length} saved</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {search ? "No matching bookmarks" : "No bookmarks yet. Bookmark messages from chat to save them."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Bookmark className="h-4 w-4 text-primary fill-primary" />
                      <Link
                        to={`/chat/${b.session.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {b.session.title || "Untitled Chat"}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {b.message.content.length > 300
                          ? b.message.content.slice(0, 300) + "..."
                          : b.message.content}
                      </ReactMarkdown>
                    </div>
                    {b.note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Note: {b.note}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBookmark(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
