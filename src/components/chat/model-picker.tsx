import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CHAT_MODELS, getModel } from "@/lib/models";
import { cn } from "@/lib/utils";

export function ModelPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const model = getModel(value);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-semibold">{model.label}</span>
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-elevated"
        >
          {CHAT_MODELS.map((entry) => (
            <button
              key={entry.id}
              role="option"
              aria-selected={entry.id === value}
              onClick={() => {
                onChange(entry.id);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {entry.label}
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {entry.provider}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {entry.description}
                </span>
              </span>
              {entry.id === value && <Check className="mt-1 h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
