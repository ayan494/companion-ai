import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Attachment = {
  filename: string;
  mediaType: string;
  url: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function Composer({
  onSend,
  onStop,
  busy,
  disabled,
  placeholder = "Message Ion Chat…",
  autoFocus = true,
}: {
  onSend: (text: string, files: Attachment[]) => void;
  onStop?: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text && files.length === 0) return;
    if (busy) return;
    onSend(text, files);
    setValue("");
    setFiles([]);
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 8MB`);
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast.error("Only images and PDFs are supported");
        continue;
      }
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ filename: file.name, mediaType: file.type, url });
    }
    setFiles((prev) => [...prev, ...next]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-2.5 shadow-elevated backdrop-blur">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.filename}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
            >
              {file.mediaType.startsWith("image/") && (
                <img src={file.url} alt="" className="h-6 w-6 rounded object-cover" />
              )}
              <span className="max-w-40 truncate">{file.filename}</span>
              <button
                type="button"
                aria-label={`Remove ${file.filename}`}
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length > 0) {
            event.preventDefault();
            void addFiles(event.clipboardData.files);
          }
        }}
        className={cn(
          "max-h-56 w-full resize-none bg-transparent px-2 py-2 text-[0.95rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground",
        )}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Attach files"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip />
          </Button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Enter to send · Shift+Enter for a new line
          </span>
        </div>

        {busy ? (
          <Button variant="secondary" size="icon" aria-label="Stop generating" onClick={onStop}>
            <Square className="fill-current" />
          </Button>
        ) : (
          <Button
            variant="ion"
            size="icon"
            aria-label="Send message"
            disabled={disabled || (!value.trim() && files.length === 0)}
            onClick={submit}
          >
            <ArrowUp />
          </Button>
        )}
      </div>
    </div>
  );
}
