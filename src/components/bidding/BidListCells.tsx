"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BidListItem, BoardStatus } from "@/lib/bidding/types";

/** Estimates list cells (status dropdown, bid date + time, assignees, notes) — bid-board layout. */

export const BOARD_STATUS_OPTIONS: { value: BoardStatus; label: string; pill: string }[] = [
  { value: "not_started", label: "Not Started", pill: "border-ink/15 bg-ink/[0.04] text-ink/70" },
  { value: "bidding", label: "Bidding", pill: "border-info-border bg-info-tint text-info" },
  { value: "bid_submitted", label: "Bid Submitted", pill: "border-[#f2b48a] bg-[#fdebdc] text-[#8a3d0c]" },
  { value: "won", label: "Won", pill: "border-success-border bg-success-tint text-success" },
  { value: "lost", label: "Lost", pill: "border-danger-border bg-danger-tint text-danger" },
  { value: "no_bid", label: "No Bid", pill: "border-ink/20 bg-ink/[0.07] text-ink/70" },
  { value: "on_hold", label: "On Hold", pill: "border-warning-border bg-warning-tint text-warning" },
  { value: "cancelled", label: "Cancelled", pill: "border-ink/15 bg-white text-ink/50 line-through" },
];

const BOARD_STATUS_ORDER = new Map(BOARD_STATUS_OPTIONS.map((o, i) => [o.value, i]));

/** Fallback for an older API that does not send `boardStatus` yet (same mapping as the server). */
export function boardStatusFor(bid: BidListItem): BoardStatus {
  if (bid.boardStatus) return bid.boardStatus;
  switch (bid.outcomeStatus) {
    case "awarded":
      return "won";
    case "lost":
      return "lost";
    case "no_bid":
      return "no_bid";
    case "postponed":
      return "on_hold";
    case "cancelled":
      return "cancelled";
  }
  if (bid.processStage === "post_bid" || bid.processStage === "result") return "bid_submitted";
  if (["estimating_setup", "takeoff", "proposal"].includes(bid.processStage ?? "")) return "bidding";
  return "not_started";
}

export function boardStatusRank(bid: BidListItem): number {
  return BOARD_STATUS_ORDER.get(boardStatusFor(bid)) ?? 0;
}

/** "Sep 9th 2026 12:00 PM" from `dueDate` (YYYY-MM-DD) + `dueTime` (HH:mm, 24h). */
export function formatBidDateTime(date?: string | null, time?: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return date;
  const month = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short" });
  const suffix = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  const out = `${month} ${d}${suffix} ${y}`;
  const t = time?.match(/^(\d{1,2}):(\d{2})/);
  if (!t) return out;
  const h = Number(t[1]);
  return `${out} ${h % 12 || 12}:${t[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** Sort key for bid date + time (missing time sorts as end of day). */
export function bidDateTimeKey(bid: BidListItem): string {
  return bid.dueDate ? `${bid.dueDate.slice(0, 10)}T${bid.dueTime?.slice(0, 5) || "23:59"}` : "";
}

// ---------- popover (portaled + fixed: the table scroll box would clip it, and an animated
// (transformed) ancestor would make `fixed` relative to itself instead of the viewport) ----------

type PopoverPos = { top: number; left: number };

/** Where to open a popover of `width` under `el` (called from the click handler, not during render). */
function popoverPosFor(el: HTMLElement | null, width: number): PopoverPos | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) };
}

function Popover({
  anchorRef,
  pos,
  onClose,
  children,
  width = 320,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  pos: PopoverPos | null;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const open = pos != null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, anchorRef, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      style={{ position: "fixed", top: pos.top, left: pos.left, width }}
      className="z-50 whitespace-normal rounded-lg border border-ink/[0.12] bg-white p-3 text-sm text-ink/[0.87] shadow-[0_8px_24px_-8px_rgba(1,1,1,0.25)]"
    >
      {children}
    </div>,
    document.body,
  );
}

// ---------- status ----------

export function BoardStatusCell({
  bid,
  editable,
  onChanged,
  onError,
}: {
  bid: BidListItem;
  editable: boolean;
  onChanged: (status: BoardStatus) => void;
  onError: (message: string) => void;
}) {
  const current = boardStatusFor(bid);
  /** Last value the server confirmed — what we fall back to if a save fails. */
  const confirmedRef = useRef<BoardStatus>(current);
  /** Only the newest request may settle the row (fast repeated changes). */
  const seqRef = useRef(0);
  const [saving, setSaving] = useState(false);
  const option = BOARD_STATUS_OPTIONS.find((o) => o.value === current) ?? BOARD_STATUS_OPTIONS[0];
  const pill = `inline-flex h-7 w-[8.5rem] items-center rounded-md border px-2.5 text-[13px] ${option.pill}`;

  if (!editable) return <span className={pill}>{option.label}</span>;

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label={`Status for ${bid.bidName || bid.estimateNumber}`}
        value={current}
        aria-busy={saving}
        onChange={(e) => {
          const next = e.target.value as BoardStatus;
          const seq = ++seqRef.current;
          onChanged(next);
          setSaving(true);
          void biddingApi
            .setBidBoardStatus(bid.id, next)
            .then((res) => {
              confirmedRef.current = res.boardStatus;
              if (seq === seqRef.current) onChanged(res.boardStatus);
            })
            .catch((err) => {
              if (seq !== seqRef.current) return;
              onChanged(confirmedRef.current);
              onError(getApiErrorMessage(err, "Could not change status"));
            })
            .finally(() => {
              if (seq === seqRef.current) setSaving(false);
            });
        }}
        className={`${pill} cursor-pointer appearance-none pr-7 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${saving ? "opacity-70" : ""}`}
      >
        {BOARD_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-ink no-underline">
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-current opacity-70"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
      </svg>
    </span>
  );
}

// ---------- assigned to ----------

const AVATAR_COLORS = ["bg-[#1f6f8b]", "bg-[#2e7d32]", "bg-[#6a4c93]", "bg-[#c2185b]", "bg-[#ef6c00]", "bg-[#455a64]"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function AssigneesCell({ bid }: { bid: BidListItem }) {
  const people = bid.assignees?.length
    ? bid.assignees
    : bid.estimator
      ? [{ name: bid.estimator, role: "Estimator" }]
      : [];
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  if (!people.length) return <span className="text-ink/30">—</span>;
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => setPos((p) => (p ? null : popoverPosFor(e.currentTarget, 280)))}
        aria-label={`Assigned to: ${people.map((p) => p.name).join(", ")}`}
        aria-expanded={pos != null}
        className="group inline-flex items-center gap-1 rounded-full py-0.5 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="flex -space-x-1.5">
          {shown.map((p) => (
            <span
              key={p.name}
              title={`${p.name} — ${p.role}`}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium text-white ring-2 ring-white ${avatarColor(p.name)}`}
            >
              {initials(p.name)}
            </span>
          ))}
          {extra > 0 ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-[11px] font-medium text-ink/70 ring-2 ring-white">
              +{extra}
            </span>
          ) : null}
        </span>
        <svg aria-hidden className="h-3.5 w-3.5 text-ink/40 group-hover:text-ink/70" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
        </svg>
      </button>
      <Popover anchorRef={btnRef} pos={pos} onClose={() => setPos(null)} width={280}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">Assigned to</p>
        <ul className="flex flex-col gap-2">
          {people.map((p) => (
            <li key={p.name} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white ${avatarColor(p.name)}`}
              >
                {initials(p.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{p.name}</span>
                <span className="block truncate text-xs text-ink/50">{p.role}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={`/bidding/${bid.id}?stage=assignment`}
          className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
        >
          Edit assignment →
        </Link>
      </Popover>
    </>
  );
}

// ---------- notes ----------

export function NotesCell({
  bid,
  editable,
  onAdded,
}: {
  bid: BidListItem;
  editable: boolean;
  onAdded: (note: { body: string; authorName: string; at: string }) => void;
}) {
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const note = bid.latestNote;
  if (!note && !editable) return <span className="text-ink/30">—</span>;

  const save = async () => {
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    setErr(null);
    try {
      const c = await biddingApi.postBidComment(bid.id, { body });
      onAdded({ body, authorName: c.authorName ?? "You", at: c.createdAt ?? new Date().toISOString() });
      setDraft("");
      setPos(null);
    } catch (e) {
      setErr(getApiErrorMessage(e, "Could not save note"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => setPos((p) => (p ? null : popoverPosFor(e.currentTarget, 360)))}
        aria-expanded={pos != null}
        title={note?.body}
        className={`block w-full truncate text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/40 ${
          note ? "text-[#1b7a43]" : "text-ink/35"
        }`}
      >
        {note ? note.body.replace(/\s+/g, " ") : "+ Add note"}
      </button>
      <Popover anchorRef={btnRef} pos={pos} onClose={() => setPos(null)} width={360}>
        {note ? (
          <div className="mb-3">
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap">{note.body}</p>
            <p className="mt-1 text-xs text-ink/50">
              {note.authorName} · {new Date(note.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        ) : null}
        {editable ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              className="w-full resize-y rounded-md border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <Link href={`/bidding/${bid.id}?stage=intake&notes=1`} className="text-xs text-ink/55 hover:text-brand hover:underline">
                All notes →
              </Link>
              <button
                type="button"
                disabled={!draft.trim() || saving}
                onClick={() => void save()}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save note"}
              </button>
            </div>
          </>
        ) : null}
      </Popover>
    </>
  );
}
