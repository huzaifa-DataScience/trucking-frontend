/** Relative date-range presets for filter date-range fields — mirrors the reference CRM's "Filter by fixed date" dropdown. */

export interface DatePresetOption {
  value: string;
  label: string;
  range: () => { start: string; end: string };
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function startOfWeek(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(d, diff);
}
function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}
function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0));
}
function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}
function endOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
}

export const CUSTOM_DATE_RANGE = "custom";

export const DATE_PRESETS: DatePresetOption[] = [
  {
    value: "today",
    label: "Today",
    range: () => {
      const t = todayUTC();
      return { start: toIso(t), end: toIso(t) };
    },
  },
  {
    value: "yesterday",
    label: "Yesterday",
    range: () => {
      const t = addDays(todayUTC(), -1);
      return { start: toIso(t), end: toIso(t) };
    },
  },
  {
    value: "last_7_days",
    label: "Last 7 Days",
    range: () => {
      const t = todayUTC();
      return { start: toIso(addDays(t, -6)), end: toIso(t) };
    },
  },
  {
    value: "next_7_days",
    label: "Next 7 Days",
    range: () => {
      const t = todayUTC();
      return { start: toIso(t), end: toIso(addDays(t, 6)) };
    },
  },
  {
    value: "last_week",
    label: "Last Week (Mo-Su)",
    range: () => {
      const s = addDays(startOfWeek(todayUTC()), -7);
      return { start: toIso(s), end: toIso(addDays(s, 6)) };
    },
  },
  {
    value: "current_week",
    label: "Current Week (Mo-Su)",
    range: () => {
      const t = todayUTC();
      return { start: toIso(startOfWeek(t)), end: toIso(endOfWeek(t)) };
    },
  },
  {
    value: "next_week",
    label: "Next Week (Mo-Su)",
    range: () => {
      const s = addDays(startOfWeek(todayUTC()), 7);
      return { start: toIso(s), end: toIso(addDays(s, 6)) };
    },
  },
  {
    value: "month_to_date",
    label: "Month to Date",
    range: () => {
      const t = todayUTC();
      return { start: toIso(startOfMonth(t)), end: toIso(t) };
    },
  },
  {
    value: "last_30_days",
    label: "Last 30 Days",
    range: () => {
      const t = todayUTC();
      return { start: toIso(addDays(t, -29)), end: toIso(t) };
    },
  },
  {
    value: "next_30_days",
    label: "Next 30 Days",
    range: () => {
      const t = todayUTC();
      return { start: toIso(t), end: toIso(addDays(t, 29)) };
    },
  },
  {
    value: "last_month",
    label: "Last Month",
    range: () => {
      const lastMonthEnd = addDays(startOfMonth(todayUTC()), -1);
      return { start: toIso(startOfMonth(lastMonthEnd)), end: toIso(lastMonthEnd) };
    },
  },
  {
    value: "current_month",
    label: "Current Month",
    range: () => {
      const t = todayUTC();
      return { start: toIso(startOfMonth(t)), end: toIso(endOfMonth(t)) };
    },
  },
  {
    value: "next_month",
    label: "Next Month",
    range: () => {
      const t = todayUTC();
      const nextFirst = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1));
      return { start: toIso(nextFirst), end: toIso(endOfMonth(nextFirst)) };
    },
  },
  {
    value: "current_quarter",
    label: "Current Quarter",
    range: () => {
      const t = todayUTC();
      return { start: toIso(startOfQuarter(t)), end: toIso(endOfQuarter(t)) };
    },
  },
  {
    value: "last_quarter",
    label: "Last Quarter",
    range: () => {
      const lastQEnd = addDays(startOfQuarter(todayUTC()), -1);
      return { start: toIso(startOfQuarter(lastQEnd)), end: toIso(lastQEnd) };
    },
  },
  {
    value: "next_quarter",
    label: "Next Quarter",
    range: () => {
      const nextQStart = addDays(endOfQuarter(todayUTC()), 1);
      return { start: toIso(nextQStart), end: toIso(endOfQuarter(nextQStart)) };
    },
  },
  {
    value: "current_year",
    label: "Current Year",
    range: () => {
      const t = todayUTC();
      return { start: toIso(startOfYear(t)), end: toIso(endOfYear(t)) };
    },
  },
  {
    value: "last_year",
    label: "Last Year",
    range: () => {
      const ly = new Date(Date.UTC(todayUTC().getUTCFullYear() - 1, 0, 1));
      return { start: toIso(ly), end: toIso(endOfYear(ly)) };
    },
  },
  {
    value: "next_year",
    label: "Next Year",
    range: () => {
      const ny = new Date(Date.UTC(todayUTC().getUTCFullYear() + 1, 0, 1));
      return { start: toIso(ny), end: toIso(endOfYear(ny)) };
    },
  },
];
