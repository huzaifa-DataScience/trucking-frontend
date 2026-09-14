"use client";

import type { SavedView } from "@/lib/filters/types";

export function SavedViewTabs({
  views,
  activeId,
  showClear,
  onOpen,
  onRemove,
  onClear,
}: {
  views: SavedView[];
  activeId: string | null;
  showClear: boolean;
  onOpen: (view: SavedView) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (views.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((v) => {
        const active = activeId === v.id;
        return (
          <div
            key={v.id}
            className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active ? "border-brand/40 bg-brand/10 text-brand" : "border-ink/10 bg-surface text-ink/60 hover:border-ink/20 hover:text-ink"
            }`}
          >
            <button type="button" onClick={() => onOpen(v)}>
              {v.name}
            </button>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove view ${v.name}`}
              onClick={() => onRemove(v.id)}
              className="rounded-full p-0.5 text-current opacity-0 transition hover:bg-black/10 group-hover:opacity-60"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        );
      })}
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink/45 underline-offset-2 hover:text-ink hover:underline"
        >
          Clear view
        </button>
      ) : null}
    </div>
  );
}
