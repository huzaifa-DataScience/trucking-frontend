"use client";

import { SoftTab } from "@/components/ui/SoftTab";
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
    <div className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-surface/80 p-3">
      {views.map((v) => {
        const conditions = v.groups.flatMap((g) => g.conditions);
        return (
          <div key={v.id} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">
              {v.name}
              <button
                type="button"
                aria-label={`Remove view ${v.name}`}
                onClick={() => onRemoveView(v.id)}
                className="rounded-md p-0.5 text-ink/35 transition hover:bg-canvas hover:text-ink"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </span>
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={`${v.name} filters`}>
              {conditions.length === 0 ? (
                <span className="cs-helper">(no criteria)</span>
              ) : (
                conditions.map((c) => {
                  const active = activeKeys.includes(conditionKey(v.id, c.id));
                  return (
                    <SoftTab key={c.id} selected={active} onClick={() => onToggleCondition(v.id, c)}>
                      {describeCondition(fields, c)}
                    </SoftTab>
                  );
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
          className="self-start px-1 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Clear view
        </button>
      ) : null}
    </div>
  );
}
