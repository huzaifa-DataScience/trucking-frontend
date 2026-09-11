import type { ReactNode } from "react";

export interface KPICardItem {
  label: string;
  value: string | number;
  /** Optional leading icon square (e.g. while data syncs, or to distinguish metrics at a glance). */
  icon?: ReactNode;
  /** Shows a skeleton bar instead of the value — icon and label stay put so the layout doesn't shift. */
  loading?: boolean;
}

interface KPICardsProps {
  items: KPICardItem[];
  /** Force a fixed column count (e.g. 2 → wraps 3 items as 2 on top, 1 below) instead of the default responsive grid. */
  maxCols?: 2 | 3 | 4;
}

/** KPI strip — executive dashboard style (large type, soft cards on canvas). */
export function KPICards({ items, maxCols }: KPICardsProps) {
  const cols = maxCols
    ? { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[maxCols]
    : items.length <= 2
      ? "sm:grid-cols-2"
      : items.length === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-4 ${cols}`}>
      {items.map((item) => {
        // Long text values (e.g. a company/site name) look oversized and wrap awkwardly
        // at the large numeric-KPI size, so scale them down instead of bumping up.
        const isLongText = typeof item.value === "string" && item.value.length > 18;
        return (
          <div
            key={item.label}
            className="ui-shadow-card ui-card-highlight flex min-w-0 items-start gap-3 rounded-2xl border border-ink/[0.06] bg-surface p-4 sm:p-5"
          >
            {item.icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink/50">
                {item.icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink/40">{item.label}</p>
              {item.loading ? (
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-ink/[0.08] sm:mt-2.5 sm:h-5" aria-hidden />
              ) : isLongText ? (
                <p className="mt-1.5 break-words text-sm font-semibold leading-snug text-ink sm:mt-2">
                  {item.value}
                </p>
              ) : (
                <p className="ui-num mt-1 break-words text-sm font-bold leading-snug tracking-tight text-ink sm:mt-2 sm:text-xl sm:leading-tight">
                  {item.value}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
