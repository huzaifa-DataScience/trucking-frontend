"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage } from "@/lib/api/client";

export function ChatCreateChannelModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (title: string) => Promise<{ conversationId: string } | void>;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const conv = await onCreated(trimmed);
      showToast("Channel created.", "success");
      setTitle("");
      onClose();
      return conv;
    } catch (err) {
      showToast(getApiErrorMessage(err, "Could not create channel"), "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-ink/10 bg-surface p-6 shadow-xl ui-animate-in">
        <h2 className="text-lg font-semibold text-ink">New team channel</h2>
        <p className="mt-1 text-sm text-ink/50">
          App-native channels live on our portal. Messages sync to Connecteam when write-through is
          enabled.
        </p>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="channel-title" className="text-xs font-medium text-ink/45">
              Channel name
            </label>
            <input
              id="channel-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Job 2768 Crew"
              maxLength={120}
              autoFocus
              className="mt-1 w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={creating} disabled={!title.trim()}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
