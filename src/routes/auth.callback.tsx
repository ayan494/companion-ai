import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BrandIcon } from "@/components/brand-logo";

const callbackSearchSchema = z
  .object({
    next: z.string().optional(),
    code: z.string().optional(),
    error: z.string().optional(),
    error_code: z.string().optional(),
    error_description: z.string().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/auth/callback")({
  validateSearch: callbackSearchSchema,
  head: () => ({
    meta: [
      { title: "Authenticating — Ion Chat" },
      { name: "description", content: "Completing authentication..." },
    ],
  }),
  component: AuthCallbackPage,
});

function safeNext(next?: string) {
  if (!next) return undefined;
  return next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

function AuthCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [statusMessage, setStatusMessage] = useState("Completing authentication...");

  useEffect(() => {
    // 1. Check for OAuth errors in search params
    if (search.error || search.error_description) {
      const errorMsg = search.error_description || search.error || "Authentication failed";
      toast.error(decodeURIComponent(errorMsg).replace(/\+/g, " "));
      void navigate({ to: "/auth", search: { mode: "signin", next: search.next } });
      return;
    }

    // 2. Check for OAuth errors in hash fragment if any
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        toast.error(decodeURIComponent(hashError).replace(/\+/g, " "));
        void navigate({ to: "/auth", search: { mode: "signin", next: search.next } });
        return;
      }
    }

    // 3. If user is already authenticated in context
    if (!loading && user) {
      void navigate({ to: safeNext(search.next) ?? "/chat" });
      return;
    }

    // 4. Actively check / exchange session with Supabase
    let isCancelled = false;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        if (data.session && !isCancelled) {
          setStatusMessage("Session established, redirecting...");
          void navigate({ to: safeNext(search.next) ?? "/chat" });
        }
      } catch (err) {
        if (!isCancelled) {
          const raw = err instanceof Error ? err.message : "Failed to establish session";
          const message = raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("fetch failed")
            ? "Cannot reach Supabase. Please verify your VITE_SUPABASE_URL in .env."
            : raw;
          toast.error(message);
          void navigate({ to: "/auth", search: { mode: "signin", next: search.next } });
        }
      }
    };

    void checkSession();

    // Fallback timer: if nothing happens within 10 seconds, redirect back to /auth
    const timeout = setTimeout(() => {
      if (!isCancelled && !user) {
        toast.error("Authentication timed out. Please try again.");
        void navigate({ to: "/auth", search: { mode: "signin", next: search.next } });
      }
    }, 10000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [user, loading, search, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero px-5">
      <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-border bg-card/80 p-8 text-center backdrop-blur shadow-xl">
        <BrandIcon size="lg" className="mb-1" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Signing you in</h1>
        <p className="mt-1.5 text-xs text-muted-foreground">{statusMessage}</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Please wait...</span>
        </div>
      </div>
    </div>
  );
}
