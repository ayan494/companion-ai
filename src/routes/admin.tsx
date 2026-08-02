import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Users, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCost } from "@/lib/models";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Ion Chat" },
      { name: "description", content: "Usage overview for Ion Chat administrators." },
      { property: "og:title", content: "Admin — Ion Chat" },
      { property: "og:description", content: "Usage overview for Ion Chat administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const [stats, setStats] = useState<{
    profiles: number;
    conversations: number;
    messages: number;
    cost: number;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const [profiles, conversations, messages, costRows] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("cost_usd"),
      ]);
      setStats({
        profiles: profiles.count ?? 0,
        conversations: conversations.count ?? 0,
        messages: messages.count ?? 0,
        cost: (costRows.data ?? []).reduce((sum, row) => sum + (row.cost_usd ?? 0), 0),
      });
    })();
  }, [isAdmin]);

  if (loading) return null;

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn't have the admin role for this workspace.
        </p>
        <Button asChild variant="outline">
          <Link to="/chat">Back to chat</Link>
        </Button>
      </div>
    );
  }

  const cards = [
    { icon: Users, label: "Profiles", value: stats ? stats.profiles.toLocaleString() : "—" },
    {
      icon: MessageSquare,
      label: "Conversations",
      value: stats ? stats.conversations.toLocaleString() : "—",
    },
    { icon: MessageSquare, label: "Messages", value: stats ? stats.messages.toLocaleString() : "—" },
    { icon: Coins, label: "Estimated spend", value: stats ? formatCost(stats.cost) : "—" },
  ];

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/chat">
            <ArrowLeft />
            Back to chat
          </Link>
        </Button>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate usage visible to accounts with the admin role.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
              <card.icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
