"use client";

import { describeCondition, type FilterCondition, type FilterFieldDef, type SavedView } from "@/lib/filters/types";

export function conditionKey(viewId: string, conditionId: string): string {
  return `${viewId}::${conditionId}`;
}

export function SavedViewTabs({
  views,
  fields,
  activeKeys,
  showClear,
  onToggleCondition,
  onRemoveView,
  onClear,
}: {
  views: SavedView[];
  fields: FilterFieldDef[];
  activeKeys: string[];
  showClear: boolean;
  onToggleCondition: (viewId: string, condition: FilterCondition) => void;
  onRemoveView: (id: string) => void;
  onClear: () => void;
}) {
  if (views.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-ink/[0.08] bg-surface p-3">
      {views.map((v) => {
        const conditions = v.groups.flatMap((g) => g.conditions);
        return (
          <div key={v.id} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-ink/70">
              {v.name}
              <button
                type="button"
                aria-label={`Remove view ${v.name}`}
                onClick={() => onRemoveView(v.id)}
                className="rounded-full p-0.5 text-ink/35 transition hover:bg-black/10 hover:text-ink"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {conditions.length === 0 ? (
                <span className="text-xs text-ink/35">(no criteria)</span>
              ) : (
                // A multi-select ("in") condition gets one chip per value, each
                // independently toggleable, instead of one combined "A or B" chip.
                conditions.flatMap((c) => {
                  const chips =
                    c.op === "in" && (c.values?.length ?? 0) > 1
                      ? (c.values ?? []).map(
                          (val): FilterCondition => ({
                            id: `${c.id}::${val}`,
                            field: c.field,
                            op: "is",
                            value: val,
                          })
                        )
                      : [c];
                  return chips.map((chip) => {
                    const active = activeKeys.includes(conditionKey(v.id, chip.id));
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleCondition(v.id, chip)}
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-brand/40 bg-brand/10 text-brand"
                            : "border-ink/10 bg-canvas text-ink/60 hover:border-ink/20 hover:text-ink"
                        }`}
                      >
                        {describeCondition(fields, chip)}
                      </button>
                    );
                  });
                })
              )}
            </div>
          </div>
        );
      })}
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="self-start rounded-full px-1 text-xs font-semibold text-ink/45 underline-offset-2 hover:text-ink hover:underline"
        >
          Clear view
        </button>
      ) : null}
    </div>
  );
}
