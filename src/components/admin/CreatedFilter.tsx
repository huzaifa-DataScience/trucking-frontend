"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";

type Preset = "any" | "7" | "30" | "90" | "year";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "year", label: "This year" },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Start date for a preset; presets have no end date (up to today). */
function presetStart(p: Preset): string | undefined {
  const now = new Date();
  if (p === "year") return ymd(new Date(now.getFullYear(), 0, 1));
  if (p === "7" || p === "30" || p === "90") {
    const d = new Date(now);
    d.setDate(d.getDate() - Number(p));
    return ymd(d);
  }
  return undefined;
}

function shortDate(v: string): string {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CalendarIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

/** "Created" filter: presets apply at once; a custom range is drafted and applied in the pop-up. */
export function CreatedFilter({
  startDate,
  endDate,
  onChange,
}: {
  startDate?: string;
  endDate?: string;
  onChange: (range: { startDate?: string; endDate?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(startDate ?? "");
  const [draftTo, setDraftTo] = useState(endDate ?? "");

  const preset: Preset | "custom" =
    !startDate && !endDate
      ? "any"
      : (PRESETS.find((p) => p.id !== "any" && !endDate && presetStart(p.id) === startDate)?.id ?? "custom");
  const [customOpen, setCustomOpen] = useState(preset === "custom");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label =
    preset === "custom"
      ? [startDate ? shortDate(startDate) : "…", endDate ? shortDate(endDate) : "today"].join(" – ")
      : PRESETS.find((p) => p.id === preset)!.label;
  const active = preset !== "any";

  const openPopover = () => {
    setDraftFrom(startDate ?? "");
    setDraftTo(endDate ?? "");
    setCustomOpen(preset === "custom");
    setOpen(true);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPopover())}
        className={`cursor-pointer inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-[13px] transition-colors ${
          active ? "border-[#b9d8f6] bg-[#f5faff] text-ink" : "border-[var(--border-subtle)] bg-white text-ink hover:border-ink/20"
        }`}
      >
        <CalendarIcon className="h-3.5 w-3.5 text-ink-soft" />
        <span className="text-ink-muted">Created</span>
        {label}
        <svg className="h-3.5 w-3.5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Created date"
            className="absolute right-0 top-[calc(100%+6px)] z-40 w-[312px] rounded-xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.14)]"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange({ startDate: presetStart(p.id), endDate: undefined });
                  setCustomOpen(false);
                  setOpen(false);
                }}
                className={`cursor-pointer flex w-full items-center justify-between rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors ${
                  preset === p.id && !customOpen ? "bg-brand-tint font-medium text-brand-secondary" : "text-ink hover:bg-[#f3f4f6]"
                }`}
              >
                {p.label}
                {preset === p.id && !customOpen ? <span aria-hidden>✓</span> : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              aria-expanded={customOpen}
              className={`cursor-pointer flex w-full items-center justify-between rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors ${
                customOpen ? "bg-brand-tint font-medium text-brand-secondary" : "text-ink hover:bg-[#f3f4f6]"
              }`}
            >
              Custom range
              {customOpen ? <span aria-hidden>✓</span> : null}
            </button>
            {customOpen ? (
              <div className="mt-1 border-t border-[#f0f1f3] px-1.5 pb-1 pt-2.5">
                <div className="flex items-center gap-2">
                  <DatePicker
                    ariaLabel="Created from"
                    value={draftFrom}
                    onChange={setDraftFrom}
                    className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-white pl-2 pr-0.5 text-[13px]"
                  />
                  <span className="text-ink-soft">–</span>
                  <DatePicker
                    ariaLabel="Created to"
                    value={draftTo}
                    onChange={setDraftTo}
                    className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-white pl-2 pr-0.5 text-[13px]"
                  />
                </div>
                <div className="mt-2.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFrom("");
                      setDraftTo("");
                    }}
                    className="cursor-pointer h-7 rounded-md px-2.5 text-[12.5px] font-medium text-ink-muted hover:bg-[#f3f4f6] hover:text-ink"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={!draftFrom && !draftTo}
                    onClick={() => {
                      onChange({ startDate: draftFrom || undefined, endDate: draftTo || undefined });
                      setOpen(false);
                    }}
                    className="cursor-pointer h-7 rounded-md bg-brand px-3 text-[12.5px] font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
