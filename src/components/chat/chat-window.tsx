import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertTriangle, ArrowDown, PanelLeft, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Composer, type Attachment } from "@/components/chat/composer";
import { MessageItem } from "@/components/chat/message-item";
import { ModelPicker } from "@/components/chat/model-picker";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { estimateCost, formatCost, getModel } from "@/lib/models";
import {
  deriveTitle,
  messageText,
  saveMessage,
  updateConversation,
  type ChatUIMessage,
  type Conversation,
} from "@/lib/chat-data";

type Props = {
  conversation: Conversation;
  initialMessages: ChatUIMessage[];
  pending?: { text: string; files: Attachment[] } | null;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onConversationChanged: () => void;
};

export function ChatWindow({
  conversation,
  initialMessages,
  pending,
  onToggleSidebar,
  onOpenSettings,
  onConversationChanged,
}: Props) {
  const { user } = useAuth();
  const [model, setModel] = useState(conversation.model);
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedIds = useRef(new Set(initialMessages.map((message) => message.id)));
  const pendingSent = useRef(false);
  const titleSet = useRef(conversation.title !== "New chat");

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          return {
            headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
            body: {
              messages,
              conversationId: conversation.id,
              model,
              systemPrompt: conversation.system_prompt ?? undefined,
              temperature: conversation.temperature,
              maxTokens: conversation.max_tokens ?? undefined,
              ...body,
            },
          };
        },
      }),
    [conversation.id, conversation.system_prompt, conversation.temperature, conversation.max_tokens, model],
  );

  const { messages, sendMessage, status, stop, error, regenerate, setMessages } =
    useChat<ChatUIMessage>({
      id: conversation.id,
      messages: initialMessages,
      transport,
      onError: (err) => toast.error(err.message || "The model failed to respond"),
      onFinish: async ({ message }) => {
        if (!user || savedIds.current.has(message.id)) return;
        savedIds.current.add(message.id);
        const meta = message.metadata;
        try {
          await saveMessage({
            conversationId: conversation.id,
            userId: user.id,
            message: {
              ...message,
              metadata: { ...meta, model: meta?.model ?? model },
            },
            costUsd: estimateCost(
              meta?.model ?? model,
              meta?.inputTokens ?? 0,
              meta?.outputTokens ?? 0,
            ),
          });
          await updateConversation(conversation.id, { updated_at: new Date().toISOString() });
          onConversationChanged();
        } catch (saveError) {
          console.error(saveError);
          toast.error("Could not save the reply to your history");
        }
      },
    });

  const busy = status === "submitted" || status === "streaming";

  const persistUserMessage = async (message: ChatUIMessage, text: string) => {
    if (!user) return;
    savedIds.current.add(message.id);
    try {
      await saveMessage({ conversationId: conversation.id, userId: user.id, message });
      if (!titleSet.current) {
        titleSet.current = true;
        await updateConversation(conversation.id, { title: deriveTitle(text) });
      }
      onConversationChanged();
    } catch (saveError) {
      console.error(saveError);
      toast.error("Could not save your message");
    }
  };

  const send = async (text: string, files: Attachment[]) => {
    const id = crypto.randomUUID();
    const parts: ChatUIMessage["parts"] = [
      ...files.map((file) => ({
        type: "file" as const,
        url: file.url,
        mediaType: file.mediaType,
        filename: file.filename,
      })),
      ...(text ? [{ type: "text" as const, text }] : []),
    ];
    const message: ChatUIMessage = { id, role: "user", parts };
    await persistUserMessage(message, text);
    void sendMessage(message);
  };

  // Send the message typed on the "new chat" screen once the thread exists.
  useEffect(() => {
    if (!pending || pendingSent.current || !user) return;
    pendingSent.current = true;
    void send(pending.text, pending.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, user]);

  useEffect(() => {
    if (!atBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, atBottom, status]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const handleEdit = async (message: ChatUIMessage, nextText: string) => {
    const index = messages.findIndex((entry) => entry.id === message.id);
    if (index < 0 || !nextText.trim()) return;
    const removed = messages.slice(index).map((entry) => entry.id);
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .in("id", removed.filter((id) => savedIds.current.has(id)));
    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }
    setMessages(messages.slice(0, index));
    const files = message.parts.filter((part) => part.type === "file") as Attachment[] &
      ChatUIMessage["parts"];
    await send(
      nextText.trim(),
      (files as unknown as Array<{ url: string; mediaType: string; filename?: string }>).map(
        (file) => ({
          url: file.url,
          mediaType: file.mediaType,
          filename: file.filename ?? "attachment",
        }),
      ),
    );
  };

  const handleRegenerate = async (message: ChatUIMessage) => {
    const { error: deleteError } = await supabase.from("messages").delete().eq("id", message.id);
    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }
    savedIds.current.delete(message.id);
    void regenerate({ messageId: message.id });
  };

  const totals = messages.reduce(
    (acc, message) => {
      const meta = message.metadata;
      acc.tokens += (meta?.inputTokens ?? 0) + (meta?.outputTokens ?? 0);
      acc.cost +=
        meta?.costUsd ??
        (meta?.model ? estimateCost(meta.model, meta.inputTokens ?? 0, meta.outputTokens ?? 0) : 0);
      return acc;
    },
    { tokens: 0, cost: 0 },
  );

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle sidebar"
          className="lg:hidden"
          onClick={onToggleSidebar}
        >
          <PanelLeft />
        </Button>
        <ModelPicker
          value={model}
          onChange={(next) => {
            setModel(next);
            void updateConversation(conversation.id, { model: next }).then(onConversationChanged);
          }}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {conversation.title}
        </span>
        {totals.tokens > 0 && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {totals.tokens.toLocaleString()} tokens · {formatCost(totals.cost)}
          </span>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Chat settings" onClick={onOpenSettings}>
          <SlidersHorizontal />
        </Button>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scrollbar-thin relative flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-7">
          {messages.length === 0 && !busy && (
            <div className="py-20 text-center">
              <h2 className="text-xl font-semibold tracking-tight">
                What are we working on today?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Using {getModel(model).label} · {getModel(model).description}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={busy && message.id === lastAssistantId}
              canRegenerate={!busy}
              onEdit={(target, text) => void handleEdit(target, text)}
              onRegenerate={(target) => void handleRegenerate(target)}
            />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Thinking…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative px-4 pb-5">
        {!atBottom && (
          <Button
            variant="secondary"
            size="icon"
            aria-label="Scroll to latest"
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full shadow-elevated"
            onClick={() => setAtBottom(true)}
          >
            <ArrowDown />
          </Button>
        )}
        <div className="mx-auto max-w-3xl">
          <Composer busy={busy} onStop={stop} onSend={(text, files) => void send(text, files)} />
        </div>
      </div>
    </div>
  );
}
