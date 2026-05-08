import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  MessageSquare,
  FileText,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
} from "lucide-react";

interface Stats {
  sessions: number;
  pdfs: number;
  patients: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ sessions: 0, pdfs: 0, patients: 0 });
  const [recentChats, setRecentChats] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);

  useEffect(() => {
    Promise.all([
      api.get<Array<unknown>>("/chat/sessions").catch(() => []),
      api.get<Array<unknown>>("/pdfs").catch(() => []),
      api.get<Array<unknown>>("/patients").catch(() => []),
    ]).then(([sessions, pdfs, patients]) => {
      setStats({
        sessions: sessions.length,
        pdfs: pdfs.length,
        patients: patients.length,
      });
      setRecentChats(
        (sessions as Array<{ id: string; title: string; updatedAt: string }>).slice(0, 5)
      );
    });
  }, []);

  const statCards = [
    { title: "Chat Sessions", value: stats.sessions, icon: MessageSquare, href: "/chat" },
    { title: "PDF Documents", value: stats.pdfs, icon: FileText, href: "/pdfs" },
    { title: "Patients", value: stats.patients, icon: Users, href: "/patients" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Welcome to MedAssist</h2>
        <Link to="/chat">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Chats</CardTitle>
        </CardHeader>
        <CardContent>
          {recentChats.length === 0 ? (
            <p className="text-muted-foreground text-sm">No chat sessions yet</p>
          ) : (
            <div className="space-y-2">
              {recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/chat/${chat.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                >
                  <div>
                    <p className="font-medium text-sm">{chat.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/chat">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 pt-6">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Ask a Question</p>
                <p className="text-sm text-muted-foreground">Query medicine info via AI</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/pdfs">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 pt-6">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Upload PDFs</p>
                <p className="text-sm text-muted-foreground">Add medicine reference docs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/patients">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 pt-6">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Manage Patients</p>
                <p className="text-sm text-muted-foreground">Profiles & dosage cards</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
