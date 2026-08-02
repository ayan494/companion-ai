import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ChatSidebar } from "@/components/chat/sidebar";
import { SettingsDialog, type ChatSettings } from "@/components/chat/settings-dialog";
import { useAuth } from "@/lib/auth";
import { DEFAULT_MODEL } from "@/lib/models";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  saveMessage,
  updateConversation,
  type ChatUIMessage,
  type Conversation,
} from "@/lib/chat-data";
import { chatUiStore } from "@/lib/chat-ui-store";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Ion Chat" },
      { name: "description", content: "Your multi-model AI conversations, saved and searchable." },
      { property: "og:title", content: "Chat — Ion Chat" },
      { property: "og:description", content: "Your multi-model AI conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", search: { mode: "signin", next: "/chat" } });
  }, [loading, user, navigate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setConversations(await listConversations());
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    chatUiStore.refreshConversations = refresh;
    chatUiStore.openSettings = () => setSettingsOpen(true);
    chatUiStore.toggleSidebar = () => setSidebarOpen((prev) => !prev);
  }, [refresh]);

  const active = conversations.find((c) => window.location.pathname.endsWith(c.id)) ?? null;

  const handleNewChat = () => {
    setSidebarOpen(false);
    void navigate({ to: "/chat" });
  };

  const handleExport = async () => {
    try {
      const payload = await Promise.all(
        conversations.map(async (conversation) => ({
          conversation,
          messages: await listMessages(conversation.id),
        })),
      );
      const blob = new Blob([JSON.stringify({ version: 1, data: payload }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ion-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleImport = async (file: File) => {
    if (!user) return;
    try {
      const parsed = JSON.parse(await file.text()) as {
        data?: Array<{ conversation: Conversation; messages: ChatUIMessage[] }>;
      };
      if (!Array.isArray(parsed.data)) throw new Error("Unrecognised export file");
      for (const entry of parsed.data) {
        const created = await createConversation(user.id, {
          title: entry.conversation?.title ?? "Imported chat",
          model: entry.conversation?.model ?? DEFAULT_MODEL,
          system_prompt: entry.conversation?.system_prompt ?? null,
          temperature: entry.conversation?.temperature ?? 1,
          max_tokens: entry.conversation?.max_tokens ?? null,
        });
        for (const message of entry.messages ?? []) {
          await saveMessage({
            conversationId: created.id,
            userId: user.id,
            message: { ...message, id: crypto.randomUUID() },
          });
        }
      }
      await refresh();
      toast.success("Import complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  const defaults: ChatSettings = {
    model: active?.model ?? DEFAULT_MODEL,
    systemPrompt: active?.system_prompt ?? "",
    temperature: active?.temperature ?? 1,
    maxTokens: active?.max_tokens ?? null,
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <ChatSidebar
          conversations={conversations}
          loading={listLoading}
          onNewChat={handleNewChat}
          onRename={(id, title) => void updateConversation(id, { title }).then(refresh)}
          onTogglePin={(conversation) =>
            void updateConversation(conversation.id, { pinned: !conversation.pinned }).then(refresh)
          }
          onDelete={(id) =>
            void deleteConversation(id).then(async () => {
              await refresh();
              void navigate({ to: "/chat" });
            })
          }
          onExport={() => void handleExport()}
          onImport={(file) => void handleImport(file)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-background/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative">
            <ChatSidebar
              conversations={conversations}
              loading={listLoading}
              onNewChat={handleNewChat}
              onRename={(id, title) => void updateConversation(id, { title }).then(refresh)}
              onTogglePin={(conversation) =>
                void updateConversation(conversation.id, { pinned: !conversation.pinned }).then(
                  refresh,
                )
              }
              onDelete={(id) =>
                void deleteConversation(id).then(async () => {
                  await refresh();
                  void navigate({ to: "/chat" });
                })
              }
              onExport={() => void handleExport()}
              onImport={(file) => void handleImport(file)}
              onOpenSettings={() => setSettingsOpen(true)}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <Outlet />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        conversation={active}
        defaults={defaults}
        onSave={(settings) => {
          if (!active) {
            chatUiStore.pendingSettings = settings;
            toast.success("Saved for your next chat");
            return;
          }
          void updateConversation(active.id, {
            model: settings.model,
            system_prompt: settings.systemPrompt.trim() || null,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
          }).then(async () => {
            await refresh();
            toast.success("Settings saved");
          });
        }}
      />
    </div>
  );
}
