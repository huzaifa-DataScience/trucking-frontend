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
          className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-[0_1px_3px_rgba(1,1,1,0.06)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{item.label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
