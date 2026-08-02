import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEFAULT_MODEL } from "@/lib/models";

export type Conversation = Tables<"conversations">;
export type MessageRow = Tables<"messages">;

export type ChatMetadata = {
  model?: string | undefined;
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  costUsd?: number | undefined;
  stopped?: boolean | undefined;
};

export type ChatUIMessage = UIMessage<ChatMetadata>;

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createConversation(
  userId: string,
  values: Partial<Pick<Conversation, "title" | "model" | "system_prompt" | "temperature" | "max_tokens">> = {},
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: values.title ?? "New chat",
      model: values.model ?? DEFAULT_MODEL,
      system_prompt: values.system_prompt ?? null,
      temperature: values.temperature ?? 1,
      max_tokens: values.max_tokens ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversation(id: string, patch: Partial<Conversation>) {
  const { error } = await supabase.from("conversations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function listMessages(conversationId: string): Promise<ChatUIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToUIMessage);
}

export function rowToUIMessage(row: MessageRow): ChatUIMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    parts: (Array.isArray(row.parts) ? row.parts : []) as ChatUIMessage["parts"],
    metadata: {
      model: row.model ?? undefined,
      inputTokens: row.input_tokens ?? undefined,
      outputTokens: row.output_tokens ?? undefined,
      costUsd: row.cost_usd ?? undefined,
    },
  };
}

export async function saveMessage(args: {
  conversationId: string;
  userId: string;
  message: ChatUIMessage;
  costUsd?: number;
}) {
  const { message } = args;
  const { error } = await supabase.from("messages").insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: message.role,
    parts: message.parts as never,
    model: message.metadata?.model ?? null,
    input_tokens: message.metadata?.inputTokens ?? null,
    output_tokens: message.metadata?.outputTokens ?? null,
    cost_usd: args.costUsd ?? message.metadata?.costUsd ?? null,
  });
  if (error) throw error;
}

export async function deleteMessagesFrom(conversationId: string, createdAtIso: string) {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId)
    .gte("created_at", createdAtIso);
  if (error) throw error;
}

export function messageText(message: ChatUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
}

export function deriveTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}
