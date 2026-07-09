/**
 * UI display helpers — docs/FRONTEND_CONNECTEAM.md §4
 */
import type {
  HoursByJobRow,
  ScheduledShift,
  TimeActivity,
  TimeOffRequest,
  WorkforceJobSummary,
  WorkforceUserSummary,
} from "@/lib/workforce/types";
import {
  connecteamUserName,
  elapsedSince,
  formatDurationMinutes,
  formatHours,
  formatWorkforceDateTime,
  parseUserIdsJson,
  unixSecondsToDate,
} from "@/lib/workforce/format";

export function userDisplayName(
  user?: WorkforceUserSummary | null,
  fallbackUserId?: number
): string {
  if (user?.displayName) return user.displayName;
  if (user) return connecteamUserName(user);
  if (fallbackUserId != null) return `User #${fallbackUserId}`;
  return "Unknown";
}

export function userInitials(user?: WorkforceUserSummary | null): string {
  if (user?.initials) return user.initials;
  const name = userDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function jobDisplayLabel(
  job?: WorkforceJobSummary | null,
  fallback?: { jobId?: string | null; title?: string | null }
): string {
  if (job?.jobLabel) return job.jobLabel;
  if (job) {
    const num = job.normalizedJobNumber ? `#${job.normalizedJobNumber}` : null;
    const title = job.title?.trim();
    if (num && title) return `${num} · ${title}`;
    return num || title || job.code || job.jobId;
  }
  if (fallback?.title) return fallback.title;
  if (fallback?.jobId) return fallback.jobId.slice(0, 16);
  return "—";
}

export function hoursByJobDisplayLabel(row: HoursByJobRow): string {
  if (row.jobLabel) return row.jobLabel;
  if (row.normalizedJobNumber && row.title) {
    return `#${row.normalizedJobNumber} · ${row.title}`;
  }
  return row.normalizedJobNumber ?? row.title ?? row.jobId?.slice(0, 12) ?? "—";
}

export function isActivityOpen(a: TimeActivity): boolean {
  if (a.isOpen === true) return true;
  return a.endTimestamp == null || a.endTimestamp === "";
}

export function activityStartDisplay(a: TimeActivity): string {
  if (a.startAt) return formatIsoDateTime(a.startAt);
  return formatWorkforceDateTime(a.startTimestamp);
}

export function activityEndDisplay(a: TimeActivity): string {
  if (isActivityOpen(a)) return "—";
  if (a.endAt) return formatIsoDateTime(a.endAt);
  return formatWorkforceDateTime(a.endTimestamp);
}

export function activityDurationDisplay(a: TimeActivity): string {
  if (isActivityOpen(a)) return "—";
  if (a.durationHours != null && !Number.isNaN(a.durationHours)) {
    return `${formatHours(a.durationHours)} hrs`;
  }
  return formatDurationMinutes(a.durationMinutes ?? undefined);
}

export function activityElapsedDisplay(a: TimeActivity): string {
  if (a.startAt) {
    const start = new Date(a.startAt);
    if (!Number.isNaN(start.getTime())) {
      const mins = Math.floor((Date.now() - start.getTime()) / 60000);
      return formatDurationMinutes(mins);
    }
  }
  return elapsedSince(a.startTimestamp ?? "");
}

export function shiftDisplayTitle(s: ScheduledShift): string {
  return s.shiftLabel ?? s.title ?? "Shift";
}

export function shiftStartDisplay(s: ScheduledShift): string {
  if (s.startAt) return formatIsoDateTime(s.startAt);
  return formatWorkforceDateTime(s.startTime);
}

export function shiftEndDisplay(s: ScheduledShift): string {
  if (s.endAt) return formatIsoDateTime(s.endAt);
  return formatWorkforceDateTime(s.endTime);
}

export function shiftAssignedDisplay(s: ScheduledShift): string {
  if (s.assignedUserNames?.length) return s.assignedUserNames.join(", ");
  const ids = parseUserIdsJson(s.assignedUserIdsJson);
  if (ids.length) return `${ids.length} assigned`;
  return "Unassigned";
}

export function shiftGroupDateKey(s: ScheduledShift): string {
  const iso = s.startAt;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  }
  const d = unixSecondsToDate(s.startTime);
  if (!d) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function ptoDisplayTitle(r: TimeOffRequest): string {
  const name = userDisplayName(r.user, r.userId);
  const range = r.dateRangeLabel ?? `${r.startDate} → ${r.endDate}`;
  return `${name} · ${range}`;
}

export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatIsoTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Normalize paginated time-activities response shape from API. */
export function extractTimeActivities(res: {
  activities?: TimeActivity[];
  timeActivities?: TimeActivity[];
}): TimeActivity[] {
  return res.activities ?? res.timeActivities ?? [];
}

export const WORKFORCE_PAGE_SIZE = 25;

export function paginationRange(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 results";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `${start}–${end} of ${total}`;
}
