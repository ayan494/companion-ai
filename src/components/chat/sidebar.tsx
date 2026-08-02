import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Bot,
  Check,
  Download,
  LogOut,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Conversation } from "@/lib/chat-data";

type Props = {
  conversations: Conversation[];
  loading: boolean;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenSettings: () => void;
  onClose?: () => void;
};

export function ChatSidebar({
  conversations,
  loading,
  onNewChat,
  onRename,
  onTogglePin,
  onDelete,
  onExport,
  onImport,
  onOpenSettings,
  onClose,
}: Props) {
  const { profile, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ion text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Ion Chat</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {onClose && (
            <Button variant="ghost" size="icon-sm" aria-label="Close sidebar" onClick={onClose}>
              <X />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 px-3">
        <Button variant="ion" className="w-full justify-start" onClick={onNewChat}>
          <MessageSquarePlus />
          New chat
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="h-9 bg-card pl-8 text-xs"
          />
        </div>
      </div>

      <nav className="scrollbar-thin mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="mx-1 my-1 h-9 animate-pulse rounded-lg bg-surface-2" />
          ))
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {query ? "No chats match that search." : "No conversations yet."}
          </p>
        ) : (
          filtered.map((conversation) => {
            const active = params.conversationId === conversation.id;
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group/item relative flex items-center gap-1 rounded-lg pr-1 transition-colors",
                  active ? "bg-surface-2" : "hover:bg-surface-2/70",
                )}
              >
                {renamingId === conversation.id ? (
                  <form
                    className="flex w-full items-center gap-1 p-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const title = renameValue.trim();
                      if (title) onRename(conversation.id, title.slice(0, 120));
                      setRenamingId(null);
                    }}
                  >
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="icon-sm" variant="ghost" aria-label="Save title">
                      <Check />
                    </Button>
                  </form>
                ) : (
                  <>
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: conversation.id }}
                      onClick={onClose}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm"
                    >
                      {conversation.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                      <span className="truncate">{conversation.title}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Chat options"
                      className="opacity-0 group-hover/item:opacity-100 data-[open=true]:opacity-100"
                      data-open={menuId === conversation.id}
                      onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}
                    >
                      <MoreHorizontal />
                    </Button>
                  </>
                )}

                {menuId === conversation.id && (
                  <div
                    className="absolute right-1 top-9 z-30 w-40 rounded-lg border border-border bg-popover p-1 shadow-elevated"
                    onMouseLeave={() => setMenuId(null)}
                  >
                    <MenuItem
                      icon={Pencil}
                      label="Rename"
                      onClick={() => {
                        setRenameValue(conversation.title);
                        setRenamingId(conversation.id);
                        setMenuId(null);
                      }}
                    />
                    <MenuItem
                      icon={conversation.pinned ? PinOff : Pin}
                      label={conversation.pinned ? "Unpin" : "Pin"}
                      onClick={() => {
                        onTogglePin(conversation);
                        setMenuId(null);
                      }}
                    />
                    <MenuItem
                      icon={Trash2}
                      label="Delete"
                      destructive
                      onClick={() => {
                        onDelete(conversation.id);
                        setMenuId(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="space-y-1 border-t border-border p-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={onExport}>
            <Download />
            Export
          </Button>
          <label className="flex-1">
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = "";
              }}
            />
            <span className="inline-flex h-8 w-full cursor-pointer items-center justify-start gap-2 rounded-lg px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
              <Upload className="h-3.5 w-3.5" />
              Import
            </span>
          </label>
        </div>

        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => void navigate({ to: "/admin" })}
          >
            <Shield />
            Admin dashboard
          </Button>
        )}

        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onOpenSettings}>
          <Settings />
          Settings & profile
        </Button>

        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold uppercase">
            {(profile?.display_name ?? user?.email ?? "?").slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {profile?.display_name ?? "Account"}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{user?.email}</span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={() => {
              void signOut().then(() => {
                toast.success("Signed out");
                void navigate({ to: "/" });
              });
            }}
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary",
        destructive && "text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
