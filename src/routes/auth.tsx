import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bot, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Ion Chat" },
      { name: "description", content: "Sign in or create your Ion Chat account to start chatting." },
      { property: "og:title", content: "Sign in — Ion Chat" },
      { property: "og:description", content: "Sign in or create your Ion Chat account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const { mode, next } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: safeNext(next) ?? "/chat" });
    }
  }, [loading, user, navigate, next]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/chat",
            data: { display_name: displayName.trim() || parsed.data.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  const handleReset = async () => {
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email address first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ion text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Ion Chat</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-7 backdrop-blur">
          {checkEmail ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold">Check your inbox</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>.
                Click it to activate your account, then come back and sign in.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => {
                  setCheckEmail(false);
                  void navigate({ to: "/auth", search: { mode: "signin", next } });
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                {isSignup ? "Create your account" : "Sign in to Ion Chat"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isSignup
                  ? "Your conversations are saved to your account."
                  : "Pick up right where you left off."}
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                disabled={busy}
                onClick={handleGoogle}
              >
                <GoogleMark />
                Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {isSignup && (
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      maxLength={60}
                      placeholder="Ada Lovelace"
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button type="submit" variant="ion" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {isSignup ? "Create account" : "Sign in"}
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <Link
                  to="/auth"
                  search={{ mode: isSignup ? "signin" : "signup", next }}
                  className="text-primary hover:underline"
                >
                  {isSignup ? "I already have an account" : "Create an account"}
                </Link>
                {!isSignup && (
                  <button type="button" className="hover:text-foreground" onClick={handleReset}>
                    Forgot password?
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function safeNext(next?: string) {
  if (!next) return undefined;
  return next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
