/**
 * Personal calendar — types + pure date helpers. API: GET /calendar (backend docs/CALENDAR.md).
 * Dates are local wall-clock days (`YYYY-MM-DD`); weeks start on Sunday.
 */

export type CalendarSource =
  | "bid"
  | "takeoff"
  | "shift"
  | "clocked"
  | "task"
  | "time_off"
  | "custom";

export interface CalendarBidInfo {
  id: number;
  estimateNumber: string;
  bidName: string | null;
  clientCompanyName: string | null;
  processStage: string;
  outcomeStatus: string;
  dueDate: string | null;
  dueTime: string | null;
  teamName: string | null;
  captain: string | null;
  roles: string[];
}

export interface CalendarItem {
  id: string;
  source: CalendarSource;
  kind: string;
  title: string;
  /** All-day: `YYYY-MM-DD`. Timed: ISO (with or without zone). */
  start: string;
  end: string | null;
  allDay: boolean;
  description: string | null;
  location: string | null;
  bid: CalendarBidInfo | null;
  details: Array<{ label: string; value: string }>;
  editable: boolean;
  customEventId?: number;
}

export interface CalendarResponse {
  person: { id: number; name: string; email: string };
  from: string;
  to: string;
  items: CalendarItem[];
  warnings: string[];
}

export interface CalendarPerson {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CalendarEventBody {
  title: string;
  description?: string | null;
  location?: string | null;
  allDay: boolean;
  start: string;
  end?: string | null;
  bidId?: number | null;
}

export type CalendarView = "month" | "week" | "agenda";

export const SOURCE_META: Record<CalendarSource, { label: string; dot: string; chip: string }> = {
  bid: { label: "Bid due", dot: "bg-brand", chip: "bg-brand/10 text-ink border-brand/30" },
  takeoff: { label: "Takeoff", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-900 border-amber-200" },
  shift: { label: "Shifts", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-900 border-sky-200" },
  clocked: { label: "Clocked time", dot: "bg-teal-500", chip: "bg-teal-50 text-teal-900 border-teal-200" },
  task: { label: "Tasks", dot: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  time_off: { label: "Time off", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-900 border-rose-200" },
  custom: { label: "My events", dot: "bg-ink/55", chip: "bg-ink/[0.05] text-ink border-ink/15" },
};

export const SOURCES = Object.keys(SOURCE_META) as CalendarSource[];

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date → `YYYY-MM-DD`. */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `YYYY-MM-DD` → local midnight. */
export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(ymd: string, days: number): string {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

export function addMonths(ymd: string, months: number): string {
  const d = fromYmd(ymd);
  return toYmd(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

export function startOfWeek(ymd: string): string {
  return addDays(ymd, -fromYmd(ymd).getDay());
}

/** 6×7 grid of days covering the month of `ymd`. */
export function monthGrid(ymd: string): string[][] {
  const d = fromYmd(ymd);
  const first = toYmd(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = startOfWeek(first);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
}

/** Visible range for a view (inclusive). Agenda shows 30 days from the anchor. */
export function viewRange(view: CalendarView, anchor: string): { from: string; to: string } {
  if (view === "month") {
    const grid = monthGrid(anchor);
    return { from: grid[0][0], to: grid[5][6] };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  return { from: anchor, to: addDays(anchor, 29) };
}

/** Item start → local `Date`. Zone-less `2026-09-24T14:00` is bid wall-clock time → local. */
export function itemStart(item: Pick<CalendarItem, "start" | "allDay">): Date {
  return item.allDay ? fromYmd(item.start.slice(0, 10)) : new Date(item.start);
}

/** Local days an item covers (multi-day time off, overnight shifts). Capped at 62 days. */
export function itemDays(item: Pick<CalendarItem, "start" | "end" | "allDay">): string[] {
  const first = item.allDay ? item.start.slice(0, 10) : toYmd(new Date(item.start));
  let last = first;
  if (item.end) {
    if (item.allDay) last = item.end.slice(0, 10);
    else {
      // An event ending exactly at midnight doesn't occupy the next day.
      const end = new Date(new Date(item.end).getTime() - 1);
      last = toYmd(end);
    }
  }
  if (last < first) last = first;
  const out: string[] = [];
  for (let d = first; d <= last && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Items per local day, in server order (all-day first, then by time). */
export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    for (const day of itemDays(item)) {
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return itemStart(a).getTime() - itemStart(b).getTime() || a.title.localeCompare(b.title);
    });
  }
  return map;
}

/** "2:30 PM" for timed items, "" for all-day. */
export function itemTimeLabel(item: CalendarItem): string {
  if (item.allDay) return "";
  return new Date(item.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Sep 24, 2026, 2:30 PM – 4:00 PM" / "Sep 24 – Sep 26, 2026 (all day)". */
export function itemWhenLabel(item: CalendarItem): string {
  const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (item.allDay) {
    const s = fromYmd(item.start.slice(0, 10)).toLocaleDateString("en-US", dateOpts);
    const e = item.end && item.end.slice(0, 10) !== item.start.slice(0, 10)
      ? fromYmd(item.end.slice(0, 10)).toLocaleDateString("en-US", dateOpts)
      : null;
    return e ? `${s} – ${e} (all day)` : `${s} (all day)`;
  }
  const s = new Date(item.start);
  const start = s.toLocaleString("en-US", { ...dateOpts, hour: "numeric", minute: "2-digit" });
  if (!item.end) return start;
  const e = new Date(item.end);
  const sameDay = toYmd(s) === toYmd(e);
  const end = sameDay
    ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : e.toLocaleString("en-US", { ...dateOpts, hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

export function rangeTitle(view: CalendarView, anchor: string): string {
  const d = fromYmd(anchor);
  if (view === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const { from, to } = viewRange(view, anchor);
  const f = fromYmd(from);
  const t = fromYmd(to);
  const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${f.toLocaleDateString("en-US", fmt)} – ${t.toLocaleDateString("en-US", { ...fmt, year: "numeric" })}`;
}

/** @deprecated Prefer formatProcessStage / formatOutcome from process-types. */
export function stageLabel(stage: string): string {
  const s = stage.replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Deep link into an estimate at its current process stage. */
export function calendarBidHref(bid: Pick<CalendarBidInfo, "id" | "processStage">): string {
  const stage = String(bid.processStage || "intake").trim() || "intake";
  return `/bidding/${bid.id}?stage=${encodeURIComponent(stage)}`;
}
