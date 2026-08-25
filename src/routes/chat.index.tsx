import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PanelLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Composer } from "@/components/chat/composer";
import { BrandIcon } from "@/components/brand-logo";
import { useAuth } from "@/lib/auth";
import { createConversation, deriveTitle } from "@/lib/chat-data";
import { chatUiStore } from "@/lib/chat-ui-store";
import { DEFAULT_MODEL, getModel } from "@/lib/models";

export const Route = createFileRoute("/chat/")({
  component: NewChat,
});

function NewChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = chatUiStore.pendingSettings;
  const model = settings?.model ?? DEFAULT_MODEL;

  const start = async (
    text: string,
    files: Array<{ url: string; mediaType: string; filename: string }>,
  ) => {
    if (!user) return;
    try {
      const conversation = await createConversation(user.id, {
        title: deriveTitle(text),
        model,
        system_prompt: settings?.systemPrompt?.trim() || null,
        temperature: settings?.temperature ?? 1,
        max_tokens: settings?.maxTokens ?? null,
      });
      chatUiStore.pendingMessage = { conversationId: conversation.id, text, files };
      await chatUiStore.refreshConversations();
      void navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the chat");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle sidebar"
          className="lg:hidden"
          onClick={() => chatUiStore.toggleSidebar()}
        >
          <PanelLeft />
        </Button>
        <span className="text-xs text-muted-foreground">New chat · {getModel(model).label}</span>
      </header>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-3xl text-center">
          <BrandIcon size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What are we working on today?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask anything, attach an image or PDF, and switch models at any point.
          </p>
          <div className="mt-8 text-left">
            <Composer busy={false} onSend={(text, files) => void start(text, files)} />
          </div>
        </div>
      </div>
    </div>
  );
}
