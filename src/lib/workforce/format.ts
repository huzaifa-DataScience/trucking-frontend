/** Workforce display helpers */

export const DEFAULT_TIMEZONE = "America/Los_Angeles";

const LAST_JOB_KEY = "workforce-last-job-id";
const LAST_CLOCK_KEY = "workforce-last-time-clock-id";

/** Unix seconds (number or string) → Date */
export function unixSecondsToDate(value: string | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (Number.isNaN(n)) return null;
  return new Date(n * 1000);
}

export function formatWorkforceDateTime(value: string | number | null | undefined): string {
  const d = unixSecondsToDate(value);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatWorkforceTime(value: string | number | null | undefined): string {
  const d = unixSecondsToDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  return hours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function elapsedSince(startUnix: string | number): string {
  const start = unixSecondsToDate(startUnix);
  if (!start) return "—";
  const mins = Math.floor((Date.now() - start.getTime()) / 60000);
  return formatDurationMinutes(mins);
}

export function parseUserIdsJson(json: string | null | undefined): number[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function formatSyncAge(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never synced";
  const d = new Date(lastSyncAt);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

export function connecteamUserName(u: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.email || "Unknown";
}

export function getStoredLastJobId(): string | null {
  try {
    return localStorage.getItem(LAST_JOB_KEY);
  } catch {
    return null;
  }
}

export function setStoredLastJobId(jobId: string | null): void {
  try {
    if (jobId) localStorage.setItem(LAST_JOB_KEY, jobId);
    else localStorage.removeItem(LAST_JOB_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredTimeClockId(): number | null {
  try {
    const v = localStorage.getItem(LAST_CLOCK_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setStoredTimeClockId(id: number): void {
  try {
    localStorage.setItem(LAST_CLOCK_KEY, String(id));
  } catch {
    /* ignore */
  }
}

/** Start of local day as Unix seconds */
export function startOfTodayUnix(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function endOfTodayUnix(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}
