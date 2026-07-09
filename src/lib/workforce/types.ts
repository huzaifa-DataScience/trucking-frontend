/** Workforce / Connecteam mirror — docs/FRONTEND_CONNECTEAM.md */

export interface ConnecteamStatus {
  module: string;
  ready: boolean;
  configured: string | boolean;
  lastSyncAt: string | null;
  message?: string;
}

export interface WorkforceUserSummary {
  userId: number;
  displayName?: string;
  initials?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeId?: string | null;
  phoneNumber?: string | null;
  userType?: string;
  profilePictureUrl?: string | null;
}

export interface ConnecteamUser extends WorkforceUserSummary {
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

export interface RefJobSummary {
  id: number;
  jobNumber?: string;
  name?: string;
  jobAddress?: string;
  city?: string;
  isActive?: boolean;
}

export interface WorkforceJobSummary {
  jobId: string;
  jobLabel?: string;
  title?: string | null;
  code?: string | null;
  normalizedJobNumber?: string | null;
  companyLabel?: string | null;
  gpsAddress?: string | null;
  refJobId?: number | null;
  refJob?: RefJobSummary | null;
}

export interface ConnecteamJob extends WorkforceJobSummary {
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
  shiftLabel?: string;
  timeClockId?: number;
  timeClockName?: string | null;
  userId: number;
  jobId?: string | null;
  startTimestamp?: string | number;
  endTimestamp?: string | number | null;
  startAt?: string | null;
  endAt?: string | null;
  durationMinutes?: number | null;
  durationHours?: number | null;
  isOpen?: boolean;
  employeeNote?: string | null;
  managerNote?: string | null;
  recordSource?: RecordSource;
  user?: WorkforceUserSummary | null;
  job?: WorkforceJobSummary | null;
}

export interface PaginatedTimeActivities {
  page: number;
  pageSize: number;
  total: number;
  activities?: TimeActivity[];
  timeActivities?: TimeActivity[];
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
  shiftLabel?: string;
  schedulerId: number;
  schedulerName?: string | null;
  startTime?: string | number;
  endTime?: string | number;
  startAt?: string | null;
  endAt?: string | null;
  durationHours?: number | null;
  title?: string | null;
  jobId?: string | null;
  job?: WorkforceJobSummary | null;
  timezone?: string | null;
  isPublished?: boolean;
  isOpenShift?: boolean;
  assignedUserIdsJson?: string | null;
  assignedUserNames?: string[];
  assignedUsers?: WorkforceUserSummary[];
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
  dateRangeLabel?: string;
  durationLabel?: string | null;
  isAllDay?: boolean;
  status: TimeOffStatus;
  employeeNote?: string | null;
  managerNote?: string | null;
  user?: WorkforceUserSummary | null;
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
  jobLabel?: string;
  normalizedJobNumber?: string | null;
  title?: string | null;
  companyLabel?: string | null;
  totalHours?: number | null;
  totalMinutes?: number | null;
  shiftCount?: number | null;
  refJob?: RefJobSummary | null;
}

export interface HoursByJobReport {
  rows: HoursByJobRow[];
}

export interface HoursByUserRow {
  userId: number;
  displayName?: string;
  initials?: string;
  employeeId?: string | null;
  firstName?: string;
  lastName?: string;
  totalHours?: number | null;
  totalMinutes?: number | null;
  shiftCount?: number | null;
}

export interface HoursByUserReport {
  rows: HoursByUserRow[];
}

export interface LinkAppUserBody {
  appUserId: number;
}
