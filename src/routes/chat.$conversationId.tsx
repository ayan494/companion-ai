import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ChatWindow } from "@/components/chat/chat-window";
import { useAuth } from "@/lib/auth";
import { getConversation, listMessages, type ChatUIMessage, type Conversation } from "@/lib/chat-data";
import { chatUiStore } from "@/lib/chat-ui-store";

export const Route = createFileRoute("/chat/$conversationId")({
  component: ConversationRoute,
});

function ConversationRoute() {
  const { conversationId } = Route.useParams();
  const { user, loading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatUIMessage[] | null>(null);
  const [pending] = useState(() => {
    const entry = chatUiStore.pendingMessage;
    if (entry && entry.conversationId === conversationId) {
      chatUiStore.pendingMessage = null;
      return { text: entry.text, files: entry.files };
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void Promise.all([getConversation(conversationId), listMessages(conversationId)]).then(
      ([conv, msgs]) => {
        if (cancelled) return;
        setConversation(conv);
        setMessages(msgs);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [conversationId, user]);

  if (loading || !messages || !conversation) {
    return (
      <div className="flex h-full flex-1 flex-col gap-4 p-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  return (
    <ChatWindow
      key={conversation.id}
      conversation={conversation}
      initialMessages={messages}
      pending={pending}
      onToggleSidebar={() => chatUiStore.toggleSidebar()}
      onOpenSettings={() => chatUiStore.openSettings()}
      onConversationChanged={() => void chatUiStore.refreshConversations()}
    />
  );
}
