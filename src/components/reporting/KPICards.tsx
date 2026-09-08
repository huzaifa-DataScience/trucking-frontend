export interface KPICardItem {
  label: string;
  value: string | number;
}

interface KPICardsProps {
  items: KPICardItem[];
}

/** KPI strip — executive dashboard style (large type, soft cards on canvas). */
export function KPICards({ items }: KPICardsProps) {
  const cols =
    items.length <= 2 ? "sm:grid-cols-2" : items.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-4 ${cols}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="ui-shadow-card ui-card-highlight min-w-0 rounded-2xl border border-ink/[0.06] bg-surface p-4 sm:p-5"
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink/40">{item.label}</p>
          <p className="ui-num mt-1 break-words text-base font-bold leading-snug tracking-tight text-ink sm:mt-3 sm:text-[1.75rem] sm:leading-tight">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
