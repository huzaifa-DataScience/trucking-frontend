/** Workforce / Connecteam mirror — docs/FRONTEND_CONNECTEAM.md */

export interface ConnecteamStatus {
  module: string;
  ready: boolean;
  configured: string | boolean;
  lastSyncAt: string | null;
  message?: string;
}

export interface ConnecteamUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  userType?: string;
  employeeId?: string | null;
  isArchived: boolean;
  appUserId?: number | null;
}

export interface ConnecteamUsersMe {
  linked: boolean;
  connecteamUser: ConnecteamUser | null;
}

export interface PaginatedUsers {
  page: number;
  pageSize: number;
  total: number;
  users: ConnecteamUser[];
}

export interface ConnecteamJob {
  jobId: string;
  code?: string | null;
  normalizedJobNumber?: string | null;
  title?: string | null;
  refJobId?: number | null;
  companyLabel?: string | null;
  gpsAddress?: string | null;
  isDeleted?: boolean;
}

export interface PaginatedJobs {
  page: number;
  pageSize: number;
  total: number;
  jobs: ConnecteamJob[];
}

export interface TimeClock {
  timeClockId: number;
  name: string;
  isArchived: boolean;
}

export interface TimeClocksResponse {
  timeClocks: TimeClock[];
}

export type RecordSource = "sync" | "native";

export interface TimeActivity {
  shiftId: string;
  timeClockId: number;
  userId: number;
  jobId?: string | null;
  startTimestamp: string | number;
  endTimestamp?: string | number | null;
  durationMinutes?: number | null;
  employeeNote?: string | null;
  managerNote?: string | null;
  recordSource?: RecordSource;
}

export interface PaginatedTimeActivities {
  page: number;
  pageSize: number;
  total: number;
  activities: TimeActivity[];
}

export interface OpenShiftResponse {
  openShift: TimeActivity | null;
}

export interface ClockInBody {
  userId: number;
  jobId?: string;
  timezone?: string;
  timestamp?: number;
  schedulerShiftId?: string;
}

export interface ClockOutBody {
  userId: number;
  timezone?: string;
  timestamp?: number;
}

export interface ClockActionResponse {
  ok: boolean;
  timeActivity?: TimeActivity;
}

export interface ManualTimeActivityBody {
  userId: number;
  startTimestamp: number;
  endTimestamp: number;
  startTimezone?: string;
  endTimezone?: string;
  jobId?: string;
  employeeNote?: string;
  managerNote?: string;
}

export interface Scheduler {
  schedulerId: number;
  name: string;
  isArchived?: boolean;
}

export interface ScheduledShift {
  shiftId: string;
  schedulerId: number;
  startTime: string | number;
  endTime: string | number;
  title?: string | null;
  jobId?: string | null;
  timezone?: string | null;
  isPublished?: boolean;
  isOpenShift?: boolean;
  assignedUserIdsJson?: string | null;
  locationAddress?: string | null;
}

export interface PaginatedScheduledShifts {
  page: number;
  pageSize: number;
  total: number;
  shifts: ScheduledShift[];
}

export interface CreateScheduledShiftBody {
  startTime: number;
  endTime: number;
  title?: string;
  jobId?: string;
  timezone?: string;
  isPublished?: boolean;
  isOpenShift?: boolean;
  assignedUserIds?: number[];
  locationAddress?: string;
}

export type TimeOffStatus = "pending" | "approved" | "denied";

export interface TimeOffRequest {
  requestId: number;
  userId: number;
  startDate: string;
  endDate: string;
  isAllDay?: boolean;
  status: TimeOffStatus;
  employeeNote?: string | null;
  managerNote?: string | null;
}

export interface PaginatedTimeOff {
  page: number;
  pageSize: number;
  total: number;
  requests: TimeOffRequest[];
}

export interface CreateTimeOffBody {
  userId: number;
  startDate: string;
  endDate: string;
  isAllDay?: boolean;
  employeeNote?: string;
  timezone?: string;
}

export interface HoursByJobRow {
  jobId?: string;
  normalizedJobNumber?: string | null;
  title?: string | null;
  totalHours?: number | null;
  shiftCount?: number | null;
}

export interface HoursByJobReport {
  rows: HoursByJobRow[];
}

export interface HoursByUserRow {
  userId: number;
  firstName?: string;
  lastName?: string;
  totalHours: number;
  shiftCount: number;
}

export interface HoursByUserReport {
  rows: HoursByUserRow[];
}

export interface LinkAppUserBody {
  appUserId: number;
}
