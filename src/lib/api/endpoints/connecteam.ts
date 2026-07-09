/**
 * Workforce / Connecteam mirror API — docs/FRONTEND_CONNECTEAM.md
 */
import { del, get, patch, post } from "../client";
import type {
  ClockActionResponse,
  ClockInBody,
  ClockOutBody,
  ConnecteamJob,
  ConnecteamStatus,
  ConnecteamUser,
  ConnecteamUsersMe,
  WorkforceJobSummary,
  CreateScheduledShiftBody,
  CreateTimeOffBody,
  HoursByJobReport,
  HoursByUserReport,
  LinkAppUserBody,
  ManualTimeActivityBody,
  OpenShiftResponse,
  PaginatedJobs,
  PaginatedScheduledShifts,
  PaginatedTimeActivities,
  PaginatedTimeOff,
  PaginatedUsers,
  ScheduledShift,
  Scheduler,
  TimeClocksResponse,
  TimeOffRequest,
} from "@/lib/workforce/types";
import type {
  ChatConversation,
  CreateConversationBody,
  CreateConversationResponse,
  PaginatedConversations,
  PaginatedMessages,
  SendMessageBody,
  SendMessageResponse,
} from "@/lib/workforce/chat-types";

const BASE = "/connecteam";

export async function getConnecteamStatus(): Promise<ConnecteamStatus> {
  return get<ConnecteamStatus>(`${BASE}/status`);
}

export async function getConnecteamUsersMe(): Promise<ConnecteamUsersMe> {
  return get<ConnecteamUsersMe>(`${BASE}/users/me`);
}

export async function listConnecteamUsers(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}): Promise<PaginatedUsers> {
  return get<PaginatedUsers>(`${BASE}/users`, {
    search: params?.search,
    page: params?.page,
    pageSize: params?.pageSize,
    includeArchived: params?.includeArchived ? "true" : undefined,
  });
}

export async function linkConnecteamUser(
  userId: number,
  body: LinkAppUserBody
): Promise<ConnecteamUser> {
  return patch<ConnecteamUser>(`${BASE}/users/${userId}/link-app-user`, body);
}

export async function listConnecteamJobs(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}): Promise<PaginatedJobs> {
  return get<PaginatedJobs>(`${BASE}/jobs`, {
    search: params?.search,
    page: params?.page,
    pageSize: params?.pageSize,
    includeDeleted: params?.includeDeleted ? "true" : undefined,
  });
}

export async function getConnecteamTimeClocks(
  includeArchived = false
): Promise<TimeClocksResponse> {
  return get<TimeClocksResponse>(`${BASE}/time-clocks`, {
    includeArchived: includeArchived ? "true" : undefined,
  });
}

export async function listTimeActivities(params?: {
  timeClockId?: number;
  userId?: number;
  jobId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedTimeActivities> {
  return get<PaginatedTimeActivities>(`${BASE}/time-activities`, {
    timeClockId: params?.timeClockId,
    userId: params?.userId,
    jobId: params?.jobId,
    page: params?.page,
    pageSize: params?.pageSize,
  });
}

export async function getOpenShift(
  timeClockId: number,
  userId: number
): Promise<OpenShiftResponse> {
  return get<OpenShiftResponse>(`${BASE}/time-clocks/${timeClockId}/open-shift`, { userId });
}

export async function clockIn(
  timeClockId: number,
  body: ClockInBody
): Promise<ClockActionResponse> {
  return post<ClockActionResponse>(`${BASE}/time-clocks/${timeClockId}/clock-in`, body);
}

export async function clockOut(
  timeClockId: number,
  body: ClockOutBody
): Promise<ClockActionResponse> {
  return post<ClockActionResponse>(`${BASE}/time-clocks/${timeClockId}/clock-out`, body);
}

export async function createManualTimeActivity(
  timeClockId: number,
  body: ManualTimeActivityBody
): Promise<ClockActionResponse> {
  return post<ClockActionResponse>(`${BASE}/time-clocks/${timeClockId}/time-activities`, body);
}

export async function patchTimeActivity(
  timeClockId: number,
  shiftId: string,
  body: Partial<ManualTimeActivityBody>
): Promise<ClockActionResponse> {
  return patch<ClockActionResponse>(
    `${BASE}/time-clocks/${timeClockId}/time-activities/${shiftId}`,
    body
  );
}

export async function listSchedulers(): Promise<{ schedulers: Scheduler[] }> {
  return get<{ schedulers: Scheduler[] }>(`${BASE}/schedulers`);
}

export async function listScheduledShifts(params?: {
  schedulerId?: number;
  jobId?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedScheduledShifts> {
  return get<PaginatedScheduledShifts>(`${BASE}/scheduled-shifts`, {
    schedulerId: params?.schedulerId,
    jobId: params?.jobId,
    userId: params?.userId,
    page: params?.page,
    pageSize: params?.pageSize,
  });
}

export async function createScheduledShift(
  schedulerId: number,
  body: CreateScheduledShiftBody
): Promise<ScheduledShift> {
  return post<ScheduledShift>(`${BASE}/schedulers/${schedulerId}/shifts`, body);
}

export async function updateScheduledShift(
  schedulerId: number,
  shiftId: string,
  body: Partial<CreateScheduledShiftBody>
): Promise<ScheduledShift> {
  return patch<ScheduledShift>(`${BASE}/schedulers/${schedulerId}/shifts/${shiftId}`, body);
}

export async function deleteScheduledShift(
  schedulerId: number,
  shiftId: string
): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>(`${BASE}/schedulers/${schedulerId}/shifts/${shiftId}`);
}

export async function listTimeOff(params?: {
  userId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedTimeOff> {
  return get<PaginatedTimeOff>(`${BASE}/time-off`, {
    userId: params?.userId,
    status: params?.status,
    page: params?.page,
    pageSize: params?.pageSize,
  });
}

export async function createTimeOff(body: CreateTimeOffBody): Promise<TimeOffRequest> {
  return post<TimeOffRequest>(`${BASE}/time-off`, body);
}

export async function patchTimeOffStatus(
  requestId: number,
  body: { status: "approved" | "denied"; managerNote?: string }
): Promise<TimeOffRequest> {
  return patch<TimeOffRequest>(`${BASE}/time-off/${requestId}/status`, body);
}

export async function getHoursByJob(params?: {
  jobId?: string;
  normalizedJobNumber?: string;
  limit?: number;
}): Promise<HoursByJobReport> {
  return get<HoursByJobReport>(`${BASE}/reports/hours-by-job`, {
    jobId: params?.jobId,
    normalizedJobNumber: params?.normalizedJobNumber,
    limit: params?.limit,
  });
}

export async function getHoursByUser(params?: {
  userId?: number;
  limit?: number;
}): Promise<HoursByUserReport> {
  return get<HoursByUserReport>(`${BASE}/reports/hours-by-user`, {
    userId: params?.userId,
    limit: params?.limit,
  });
}

/** Resolve job label for display — prefers API `jobLabel`. */
export function jobLabel(job: ConnecteamJob | WorkforceJobSummary): string {
  if (job.jobLabel) return job.jobLabel;
  const num = job.normalizedJobNumber ? `#${job.normalizedJobNumber}` : null;
  const title = job.title?.trim();
  if (num && title) return `${num} · ${title}`;
  return num || title || job.code || job.jobId;
}

// ——— Live chat (docs/FRONTEND_CONNECTEAM_CHAT.md) ———

export async function listConversations(params?: {
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}): Promise<PaginatedConversations> {
  return get<PaginatedConversations>(`${BASE}/conversations`, {
    search: params?.search,
    type: params?.type,
    page: params?.page,
    pageSize: params?.pageSize,
    includeDeleted: params?.includeDeleted ? "true" : undefined,
  });
}

export async function getConversation(
  conversationId: string
): Promise<{ conversation: ChatConversation | null }> {
  return get<{ conversation: ChatConversation | null }>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}`
  );
}

export async function listConversationMessages(
  conversationId: string,
  params?: { page?: number; pageSize?: number; includeDeleted?: boolean }
): Promise<PaginatedMessages> {
  return get<PaginatedMessages>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      page: params?.page,
      pageSize: params?.pageSize,
      includeDeleted: params?.includeDeleted ? "true" : undefined,
    }
  );
}

export async function sendConversationMessage(
  conversationId: string,
  body: SendMessageBody
): Promise<SendMessageResponse> {
  return post<SendMessageResponse>(
    `${BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
    body
  );
}

export async function createConversation(
  body: CreateConversationBody
): Promise<CreateConversationResponse> {
  return post<CreateConversationResponse>(`${BASE}/conversations`, body);
}
