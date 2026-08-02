import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Code2,
  Gauge,
  History,
  Layers,
  Paperclip,
  Sparkle,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CHAT_MODELS } from "@/lib/models";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ion Chat — A premium multi-model AI workspace" },
      {
        name: "description",
        content:
          "Chat with GPT-5.6 and Gemini side by side. Streaming replies, saved history, file uploads, temperature control and cost tracking.",
      },
      { property: "og:title", content: "Ion Chat — A premium multi-model AI workspace" },
      {
        property: "og:description",
        content: "Streaming multi-model AI chat with saved history, file uploads and cost tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Layers,
    title: "Every model, one thread",
    body: "Switch between GPT-5.6 and Gemini mid-conversation. The thread keeps its full context.",
  },
  {
    icon: Zap,
    title: "Token-by-token streaming",
    body: "Responses render as they generate, with a stop button that actually halts the run.",
  },
  {
    icon: Code2,
    title: "Markdown & syntax highlighting",
    body: "Fenced code blocks, tables and lists render properly — with one-click copy.",
  },
  {
    icon: History,
    title: "Searchable history",
    body: "Rename, pin, delete and search every conversation. Stored against your account.",
  },
  {
    icon: Paperclip,
    title: "Images and PDFs",
    body: "Drag and drop attachments straight into the composer and ask about them.",
  },
  {
    icon: Gauge,
    title: "Tuning and cost",
    body: "Per-chat system prompt, temperature and max tokens, plus live token and cost estimates.",
  },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ion text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Ion Chat</span>
        </div>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : user ? (
            <Button asChild variant="ion" size="sm">
              <Link to="/chat">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin", next: undefined }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="ion" size="sm">
                <Link to="/auth" search={{ mode: "signup", next: undefined }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkle className="h-3.5 w-3.5 text-primary" />
            {CHAT_MODELS.length} models available out of the box
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            The AI workspace that keeps up with how you actually think
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Streaming answers, saved threads, attachments, per-chat tuning and honest cost
            tracking — in one fast, quiet interface.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="ion">
              <Link to={user ? "/chat" : "/auth"} search={user ? undefined : { mode: "signup", next: undefined }}>
                {user ? "Open your chats" : "Start chatting free"}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">See what's inside</a>
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-colors hover:border-primary/40"
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-3xl border border-border bg-card/70 p-8 text-center backdrop-blur sm:p-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Bring your questions. We'll handle the plumbing.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              No API keys to paste, no provider dashboards. Sign up and start a thread.
            </p>
            <Button asChild size="lg" variant="ion" className="mt-7">
              <Link to={user ? "/chat" : "/auth"} search={user ? undefined : { mode: "signup", next: undefined }}>
                {user ? "Open your chats" : "Create your account"}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Ion Chat — built for people who live in a chat window.
      </footer>
    </div>
  );
}
