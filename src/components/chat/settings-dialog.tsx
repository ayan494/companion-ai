import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ModelPicker } from "@/components/chat/model-picker";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/lib/chat-data";

export type ChatSettings = {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number | null;
};

export function SettingsDialog({
  open,
  onClose,
  conversation,
  defaults,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  defaults: ChatSettings;
  onSave: (settings: ChatSettings) => void;
}) {
  const { profile, user, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<ChatSettings>(defaults);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(defaults);
      setDisplayName(profile?.display_name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim().slice(0, 60) || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="scrollbar-thin max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
            <p className="text-xs text-muted-foreground">
              {conversation ? `Applies to “${conversation.title}”` : "Applies to your next chat"}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close settings" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Model</Label>
            <div className="rounded-lg border border-border bg-surface px-1 py-0.5">
              <ModelPicker
                value={settings.model}
                onChange={(model) => setSettings((prev) => ({ ...prev, model }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea
              id="systemPrompt"
              rows={4}
              maxLength={4000}
              placeholder="You are a concise, technically precise assistant…"
              value={settings.systemPrompt}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature — {settings.temperature.toFixed(2)}</Label>
            <input
              id="temperature"
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={settings.temperature}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, temperature: Number(event.target.value) }))
              }
              className="w-full accent-[var(--primary)]"
            />
            <p className="text-[11px] text-muted-foreground">
              GPT-5 models always run at their fixed default temperature; this applies to Gemini
              models.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxTokens">Max output tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              min={64}
              max={32000}
              placeholder="Model default"
              value={settings.maxTokens ?? ""}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  maxTokens: event.target.value ? Number(event.target.value) : null,
                }))
              }
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold">Profile</h3>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                maxLength={60}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <p className="pt-1 text-[11px] text-muted-foreground">Signed in as {user?.email}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={savingProfile}
              onClick={() => void saveProfile()}
            >
              {savingProfile && <Loader2 className="animate-spin" />}
              Save profile
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="ion"
            onClick={() => {
              onSave(settings);
              onClose();
            }}
          >
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}
