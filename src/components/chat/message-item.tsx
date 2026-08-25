import { memo, useState } from "react";
import { Check, Copy, Pencil, RefreshCw, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/chat/markdown";
import { BrandIcon } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { estimateCost, formatCost, getModel } from "@/lib/models";
import type { ChatUIMessage } from "@/lib/chat-data";

type Props = {
  message: ChatUIMessage;
  isStreaming: boolean;
  canRegenerate: boolean;
  onEdit: (message: ChatUIMessage, nextText: string) => void;
  onRegenerate: (message: ChatUIMessage) => void;
};

export const MessageItem = memo(function MessageItem({
  message,
  isStreaming,
  canRegenerate,
  onEdit,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const isUser = message.role === "user";
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n");
  const files = message.parts.filter((part) => part.type === "file") as Array<{
    type: "file";
    url: string;
    mediaType: string;
    filename?: string;
  }>;

  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const meta = message.metadata;
  const totalTokens = (meta?.inputTokens ?? 0) + (meta?.outputTokens ?? 0);
  const cost =
    meta?.costUsd ??
    (meta?.model ? estimateCost(meta.model, meta.inputTokens ?? 0, meta.outputTokens ?? 0) : 0);

  return (
    <div className={cn("group/message flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 hidden shrink-0 sm:flex">
          <BrandIcon size="sm" />
        </div>
      )}

      <div className={cn("min-w-0", isUser ? "max-w-[85%]" : "w-full max-w-full")}>
        {files.length > 0 && (
          <div className={cn("mb-2 flex flex-wrap gap-2", isUser && "justify-end")}>
            {files.map((file, index) =>
              file.mediaType.startsWith("image/") ? (
                <img
                  key={index}
                  src={file.url}
                  alt={file.filename ?? "Attached image"}
                  className="max-h-52 rounded-xl border border-border object-cover"
                />
              ) : (
                <span
                  key={index}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground"
                >
                  {file.filename ?? "Attachment"}
                </span>
              ),
            )}
          </div>
        )}

        {editing ? (
          <div className="rounded-2xl border border-border bg-card p-3">
            <Textarea
              autoFocus
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="resize-y"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ion"
                onClick={() => {
                  setEditing(false);
                  onEdit(message, draft);
                }}
              >
                Save & resend
              </Button>
            </div>
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap rounded-2xl bg-bubble px-4 py-2.5 text-[0.95rem] leading-relaxed text-bubble-foreground">
            {text}
          </div>
        ) : (
          <>
            <Markdown content={text} />
            {isStreaming && text.length === 0 && (
              <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-primary align-middle" />
            )}
          </>
        )}

        {!editing && (
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1 text-muted-foreground opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100",
              isUser && "justify-end",
            )}
          >
            <Button variant="ghost" size="icon-sm" aria-label="Copy message" onClick={copy}>
              {copied ? <Check /> : <Copy />}
            </Button>
            {isUser && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit message"
                onClick={() => {
                  setDraft(text);
                  setEditing(true);
                }}
              >
                <Pencil />
              </Button>
            )}
            {!isUser && canRegenerate && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Regenerate response"
                onClick={() => onRegenerate(message)}
              >
                <RefreshCw />
              </Button>
            )}
            {!isUser && totalTokens > 0 && (
              <span className="ml-1 text-[11px]">
                {meta?.model ? `${getModel(meta.model).label} · ` : ""}
                {totalTokens.toLocaleString()} tokens · {formatCost(cost)}
              </span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground sm:flex">
          <User className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
});
