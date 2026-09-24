"use client";

import {
  addDays,
  fromYmd,
  itemTimeLabel,
  monthGrid,
  SOURCE_META,
  startOfWeek,
  type CalendarItem,
} from "@/lib/calendar/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_CELL_LIMIT = 3;

function ItemChip({ item, onOpen, compact }: { item: CalendarItem; onOpen: (i: CalendarItem) => void; compact?: boolean }) {
  const meta = SOURCE_META[item.source];
  const time = itemTimeLabel(item);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.title}
      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-left transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${meta.chip} ${
        compact ? "py-0.5 text-[11px]" : "py-1 text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
      {time ? <span className="shrink-0 font-semibold">{time}</span> : null}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

export function MonthView({
  anchor,
  today,
  byDay,
  onOpen,
  onPickDay,
}: {
  anchor: string;
  today: string;
  byDay: Map<string, CalendarItem[]>;
  onOpen: (i: CalendarItem) => void;
  onPickDay: (day: string) => void;
}) {
  const month = fromYmd(anchor).getMonth();
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[46rem]">
        <div className="grid grid-cols-7 border-b border-ink/[0.08] text-xs font-semibold uppercase tracking-wide text-ink/45">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid(anchor).flat().map((day) => {
            const items = byDay.get(day) ?? [];
            const inMonth = fromYmd(day).getMonth() === month;
            const extra = items.length - MONTH_CELL_LIMIT;
            return (
              <div
                key={day}
                className={`min-h-[7.5rem] border-b border-r border-ink/[0.06] p-1.5 ${inMonth ? "" : "bg-ink/[0.02]"}`}
              >
                <button
                  type="button"
                  onClick={() => onPickDay(day)}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition hover:bg-ink/[0.06] ${
                    day === today ? "bg-brand text-white hover:bg-brand" : inMonth ? "text-ink" : "text-ink/35"
                  }`}
                  aria-label={`Show ${fromYmd(day).toDateString()}`}
                >
                  {fromYmd(day).getDate()}
                </button>
                <div className="space-y-0.5">
                  {items.slice(0, MONTH_CELL_LIMIT).map((item) => (
                    <ItemChip key={`${day}-${item.id}`} item={item} onOpen={onOpen} compact />
                  ))}
                  {extra > 0 ? (
                    <button
                      type="button"
                      onClick={() => onPickDay(day)}
                      className="px-1.5 text-[11px] font-semibold text-ink/50 hover:text-ink"
                    >
                      +{extra} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function WeekView({
  anchor,
  today,
  byDay,
  onOpen,
}: {
  anchor: string;
  today: string;
  byDay: Map<string, CalendarItem[]>;
  onOpen: (i: CalendarItem) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[52rem] grid-cols-7 divide-x divide-ink/[0.06]">
        {days.map((day) => {
          const d = fromYmd(day);
          const items = byDay.get(day) ?? [];
          return (
            <div key={day} className="min-h-[24rem] p-2">
              <div className="mb-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{WEEKDAYS[d.getDay()]}</p>
                <p
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    day === today ? "bg-brand text-white" : "text-ink"
                  }`}
                >
                  {d.getDate()}
                </p>
              </div>
              <div className="space-y-1">
                {items.length === 0 ? <p className="pt-2 text-center text-xs text-ink/30">—</p> : null}
                {items.map((item) => (
                  <ItemChip key={`${day}-${item.id}`} item={item} onOpen={onOpen} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgendaView({
  days,
  today,
  byDay,
  onOpen,
}: {
  days: string[];
  today: string;
  byDay: Map<string, CalendarItem[]>;
  onOpen: (i: CalendarItem) => void;
}) {
  const withItems = days.filter((d) => (byDay.get(d) ?? []).length > 0);
  if (!withItems.length) {
    return <p className="py-12 text-center text-sm text-ink/50">Nothing scheduled in this period.</p>;
  }
  return (
    <div className="divide-y divide-ink/[0.06]">
      {withItems.map((day) => {
        const d = fromYmd(day);
        return (
          <div key={day} className="grid gap-3 py-3 sm:grid-cols-[9rem_1fr]">
            <p className={`text-sm font-semibold ${day === today ? "text-brand" : "text-ink"}`}>
              {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {day === today ? <span className="ml-1.5 text-xs font-medium text-ink/45">Today</span> : null}
            </p>
            <ul className="space-y-1.5">
              {(byDay.get(day) ?? []).map((item) => {
                const meta = SOURCE_META[item.source];
                return (
                  <li key={`${day}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-ink/[0.04]"
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                      <span className="w-16 shrink-0 text-ink/55">{itemTimeLabel(item) || "All day"}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{item.title}</span>
                        {item.bid?.roles.length ? (
                          <span className="block text-xs text-ink/45">{item.bid.roles.join(" · ")}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
