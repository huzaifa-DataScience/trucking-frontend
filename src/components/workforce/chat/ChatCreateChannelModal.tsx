"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage } from "@/lib/api/client";
import * as connecteamApi from "@/lib/api/endpoints/connecteam";
import type { ConnecteamUser } from "@/lib/workforce/types";

function displayNameFor(u: ConnecteamUser): string {
  return (
    u.displayName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    u.email ||
    `User #${u.userId}`
  );
}

export function ChatCreateChannelModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (title: string, memberIds: number[]) => Promise<{ conversationId: string } | void>;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [roster, setRoster] = useState<ConnecteamUser[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setRosterLoading(true);
    void connecteamApi
      .listAllConnecteamUsers()
      .then((users) => setRoster(users.filter((u) => !u.isArchived)))
      .catch(() => setRoster([]))
      .finally(() => setRosterLoading(false));
  }, [open]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? roster
    : roster.filter((u) => displayNameFor(u).toLowerCase().includes(q));

  const toggle = (userId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const conv = await onCreated(trimmed, Array.from(selected));
      showToast("Channel created.", "success");
      setTitle("");
      setSelected(new Set());
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
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-ink/10 bg-surface p-6 shadow-xl ui-animate-in">
        <h2 className="text-lg font-semibold text-ink">New team channel</h2>
        <p className="mt-1 text-sm text-ink/50">
          App-native channels live on our portal. Add members to sync a real Connecteam group so
          everyone can send and receive messages.
        </p>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mt-5 flex min-h-0 flex-1 flex-col gap-4"
        >
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

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink/45">
                Members {selected.size ? `(${selected.size} selected)` : ""}
              </span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-ink/[0.08]">
              {rosterLoading ? (
                <p className="px-3 py-3 text-xs text-ink/45">Loading people…</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-ink/45">No people match.</p>
              ) : (
                <ul className="divide-y divide-ink/[0.05]">
                  {filtered.map((u) => (
                    <li key={u.userId}>
                      <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-ink/[0.03]">
                        <input
                          type="checkbox"
                          checked={selected.has(u.userId)}
                          onChange={() => toggle(u.userId)}
                          className="h-4 w-4 accent-brand"
                        />
                        <span className="truncate text-ink">{displayNameFor(u)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
