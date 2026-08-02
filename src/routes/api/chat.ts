import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";
import { DEFAULT_MODEL, isSupportedModel } from "@/lib/models";
import type { Database } from "@/integrations/supabase/types";

type ChatRequestBody = {
  messages?: unknown;
  conversationId?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return json({ error: "Messages are required" }, 400);
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];
        if (!supabaseUrl || !supabaseKey) {
          return json({ error: "Backend is not configured" }, 500);
        }
        if (!lovableKey) {
          return json({ error: "AI is not configured" }, 500);
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return json({ error: "You must be signed in to chat" }, 401);
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              headers.delete("Authorization");
              headers.set("Authorization", `Bearer ${token}`);
              headers.set("apikey", supabaseKey);
              return fetch(input, { ...init, headers });
            },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (claimsError || !userId) {
          return json({ error: "Your session expired. Please sign in again." }, 401);
        }

        const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
        if (!conversationId) {
          return json({ error: "conversationId is required" }, 400);
        }

        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .select("id, model, system_prompt, temperature, max_tokens")
          .eq("id", conversationId)
          .maybeSingle();

        if (conversationError || !conversation) {
          return json({ error: "Conversation not found" }, 404);
        }

        const modelId = isSupportedModel(body.model)
          ? body.model
          : isSupportedModel(conversation.model)
            ? conversation.model
            : DEFAULT_MODEL;

        const systemPrompt =
          typeof body.systemPrompt === "string" && body.systemPrompt.trim().length > 0
            ? body.systemPrompt.trim()
            : (conversation.system_prompt ?? undefined);

        const temperature =
          typeof body.temperature === "number"
            ? Math.min(Math.max(body.temperature, 0), 2)
            : (conversation.temperature ?? 1);

        const maxTokensRaw =
          typeof body.maxTokens === "number" ? body.maxTokens : conversation.max_tokens;
        const maxTokens =
          typeof maxTokensRaw === "number" && maxTokensRaw > 0
            ? Math.min(Math.round(maxTokensRaw), 32000)
            : undefined;

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(lovableKey, initialRunId);
        const isOpenAI = modelId.startsWith("openai/");

        try {
          const result = streamText({
            model: gateway(modelId),
            ...(systemPrompt ? { system: systemPrompt } : {}),
            messages: await convertToModelMessages(messages as UIMessage[]),
            // GPT-5 family rejects non-default temperature; only send it elsewhere.
            ...(isOpenAI ? {} : { temperature }),
            ...(maxTokens && !isOpenAI ? { maxOutputTokens: maxTokens } : {}),
            providerOptions: {
              lovable: {
                ...(modelId.startsWith("openai/gpt-5.6") ? { reasoningEffort: "none" } : {}),
                ...(isOpenAI && maxTokens ? { max_completion_tokens: maxTokens } : {}),
              },
            },
            abortSignal: request.signal,
            onError: ({ error }) => {
              console.error("[chat] stream error", error);
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            messageMetadata: ({ part }) => {
              if (part.type === "finish") {
                return {
                  model: modelId,
                  inputTokens: part.totalUsage?.inputTokens ?? 0,
                  outputTokens: part.totalUsage?.outputTokens ?? 0,
                };
              }
              return undefined;
            },
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              "X-Chat-Model": modelId,
            }),
            onError: (error) => {
              const message = error instanceof Error ? error.message : String(error);
              if (message.includes("429")) return "Rate limit reached. Try again in a moment.";
              if (message.includes("402"))
                return "AI credits exhausted. Add credits in your workspace settings.";
              return message || "The model failed to respond.";
            },
          });
        } catch (error) {
          console.error("[chat] fatal", error);
          const message = error instanceof Error ? error.message : "Unexpected AI error";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
