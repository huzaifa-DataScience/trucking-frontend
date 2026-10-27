/**
 * Admin API endpoints per ADMIN_PANEL_SPEC.md
 * All endpoints require admin role (backend enforces).
 */

import { get, post, patch, put, del } from "../client";
import type {
  AdminUser,
  AdminUsersResponse,
  UserFilters,
  UpdateUserPayload,
  BulkActionResponse,
  SitelineOverdueEmailTemplate,
  SitelineOverdueEmailTemplateUpdate,
  AdminEmailTemplate,
  AdminEmailTemplateActive,
  AdminEmailTemplateListItem,
  AdminEmailTemplatesPurposesResponse,
  AdminEmailTemplateUpdatePayload,
  AdminEmailTemplateCreatePayload,
  OverdueEmailSendingSettings,
  SitelineClearstoryGapAlertSettings,
  RbacUserDefaultsSettings,
  RbacMatrixResponse,
} from "@/lib/admin/types";

export async function getUsers(filters: UserFilters): Promise<AdminUsersResponse> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 25,
  };
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.role && filters.role !== "all") params.role = filters.role;
  if (filters.search) params.search = filters.search;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;

  return get<AdminUsersResponse>("/admin/users", params);
}

export async function getUserById(id: number): Promise<AdminUser> {
  return get<AdminUser>(`/admin/users/${id}`);
}

export async function approveUser(id: number): Promise<{ message: string; user: AdminUser }> {
  return post<{ message: string; user: AdminUser }>(`/admin/users/${id}/approve`, {});
}

export async function rejectUser(id: number): Promise<{ message: string; user: AdminUser }> {
  return post<{ message: string; user: AdminUser }>(`/admin/users/${id}/reject`, {});
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<{ message: string; user: AdminUser }> {
  return patch<{ message: string; user: AdminUser }>(`/admin/users/${id}`, payload);
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  return del<{ message: string }>(`/admin/users/${id}`);
}

export async function bulkApprove(userIds: number[]): Promise<BulkActionResponse> {
  return post<BulkActionResponse>("/admin/users/bulk-approve", { userIds });
}

export async function bulkReject(userIds: number[]): Promise<BulkActionResponse> {
  return post<BulkActionResponse>("/admin/users/bulk-reject", { userIds });
}

export async function bulkDelete(userIds: number[]): Promise<BulkActionResponse> {
  return del<BulkActionResponse>("/admin/users/bulk-delete", { userIds });
}

/** Siteline lead-PM overdue email HTML template (admin JWT). */
export async function getSitelineOverdueEmailTemplate(): Promise<SitelineOverdueEmailTemplate> {
  return get<SitelineOverdueEmailTemplate>("/admin/email-templates/siteline-overdue");
}

export async function updateSitelineOverdueEmailTemplate(
  payload: SitelineOverdueEmailTemplateUpdate
): Promise<SitelineOverdueEmailTemplate> {
  return put<SitelineOverdueEmailTemplate>("/admin/email-templates/siteline-overdue", payload);
}

/**
 * Generic admin email template management (see FRONTEND_EMAIL_TEMPLATES.md).
 */
export async function listEmailTemplates(params?: { purpose?: string }): Promise<AdminEmailTemplateListItem[]> {
  return get<AdminEmailTemplateListItem[]>("/admin/email-templates", {
    purpose: params?.purpose,
  });
}

export async function getEmailTemplatePurposes(): Promise<AdminEmailTemplatesPurposesResponse> {
  return get<AdminEmailTemplatesPurposesResponse>("/admin/email-templates/purposes");
}

export async function getActiveEmailTemplateByPurpose(
  purpose: string
): Promise<AdminEmailTemplateActive> {
  return get<AdminEmailTemplateActive>("/admin/email-templates/active", { purpose });
}

export async function updateActiveEmailTemplateByPurpose(
  purpose: string,
  payload: Pick<AdminEmailTemplateUpdatePayload, "subjectTemplate" | "bodyHtmlTemplate" | "name">
): Promise<AdminEmailTemplateActive> {
  return put<AdminEmailTemplateActive>("/admin/email-templates/active", payload, { purpose });
}

export async function updateEmailTemplateByKey(
  templateKey: string,
  payload: AdminEmailTemplateUpdatePayload
): Promise<{ message: string }> {
  return put<{ message: string }>(`/admin/email-templates/${templateKey}`, payload);
}

export async function activateEmailTemplateByKey(
  templateKey: string
): Promise<{ message: string }> {
  return post<{ message: string }>(`/admin/email-templates/${templateKey}/activate`, {});
}

export async function createEmailTemplate(
  payload: AdminEmailTemplateCreatePayload
): Promise<{ message: string; template: AdminEmailTemplate }> {
  return post<{ message: string; template: AdminEmailTemplate }>("/admin/email-templates", payload);
}

export async function deleteEmailTemplateByKey(
  templateKey: string
): Promise<{ message: string }> {
  return del<{ message: string }>(`/admin/email-templates/${templateKey}`);
}

/** Overdue email cron sending toggle (env + admin toggle → effective). */
export async function getOverdueEmailSendingSettings(): Promise<OverdueEmailSendingSettings> {
  return get<OverdueEmailSendingSettings>("/admin/settings/overdue-email-sending");
}

export async function patchOverdueEmailSendingSettings(enabled: boolean): Promise<void> {
  await patch<unknown>("/admin/settings/overdue-email-sending", { enabled });
}

/** SMTP connectivity test; does not require OVERDUE_EMAIL_ENABLED. */
export async function postSmtpTestEmail(to: string): Promise<{ ok: boolean; message: string }> {
  return post<{ ok: boolean; message: string }>("/admin/settings/smtp-test-email", {
    to,
    leadPmName: "Test PM",
  });
}

/** Siteline vs Clearstory gap alert cron toggle (FRONTEND_SITELINE_PM_EMAILS.md). */
export async function getSitelineClearstoryGapAlertSettings(): Promise<SitelineClearstoryGapAlertSettings> {
  return get<SitelineClearstoryGapAlertSettings>(
    "/admin/settings/siteline-clearstory-gap-alert"
  );
}

export async function patchSitelineClearstoryGapAlertSettings(
  enabled: boolean
): Promise<void> {
  await patch<unknown>("/admin/settings/siteline-clearstory-gap-alert", { enabled });
}

/** Manually trigger gap alert job (backend optional). */
export async function postRunSitelineClearstoryGapAlertJob(): Promise<{
  ok: boolean;
  message: string;
  gapCount?: number;
}> {
  return post<{ ok: boolean; message: string; gapCount?: number }>(
    "/admin/jobs/siteline-clearstory-gap-alert/run",
    {}
  );
}

/** Default role for newly approved / registered users (FRONTEND_RBAC.md). */
export async function getRbacUserDefaults(): Promise<RbacUserDefaultsSettings> {
  return get<RbacUserDefaultsSettings>("/admin/settings/rbac-user-defaults");
}

export async function patchRbacUserDefaults(role: string): Promise<void> {
  await patch<unknown>("/admin/settings/rbac-user-defaults", { role });
}

/** Full role × permission matrix. */
export async function getRbacMatrix(): Promise<RbacMatrixResponse> {
  return get<RbacMatrixResponse>("/admin/rbac");
}

export async function patchRbacRolePermissions(
  roleName: string,
  permissions: string[]
): Promise<{ role: string; permissions: string[] }> {
  return patch<{ role: string; permissions: string[] }>(
    `/admin/rbac/roles/${encodeURIComponent(roleName)}`,
    { permissions }
  );
}

/** One sign-in: who, where (browser location), how accurate, which floor. */
export interface SignInLocationRow {
  id: number;
  userId: number;
  name: string;
  email: string;
  /** Office the person confirmed; null = not at an office. */
  officeName: string | null;
  /** The office's exact spot, when the person confirmed an office. */
  officeLatitude: number | null;
  officeLongitude: number | null;
  /** Readable address looked up from the coordinates; null until found. */
  address: string | null;
  latitude: number;
  longitude: number;
  accuracyM: number;
  floor: string;
  signedInAt: string;
}

/** GET /auth/sign-in-locations: newest first (admin only). */
export function getSignInLocations(limit = 500): Promise<SignInLocationRow[]> {
  return get<SignInLocationRow[]>("/auth/sign-in-locations", { limit });
}

/** A known office: name and exact spot. */
export interface OfficeRow {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export function getOffices(): Promise<OfficeRow[]> {
  return get<OfficeRow[]>("/admin/offices");
}

export function createOffice(body: { name: string; latitude: number; longitude: number }): Promise<OfficeRow> {
  return post<OfficeRow>("/admin/offices", body);
}

export function deleteOffice(id: number): Promise<void> {
  return del<void>(`/admin/offices/${id}`);
}

/** One person's tracked day: stretches of time, Live/Stopped, and the trail. */
export interface TrackedPerson {
  userId: number;
  name: string;
  email: string;
  stretches: Array<{ start: string; end: string; minutes: number }>;
  trackedMinutes: number;
  live: boolean;
  lastPingAt: string | null;
  last: { latitude: number; longitude: number; accuracyM: number } | null;
  trail: Array<{ latitude: number; longitude: number; accuracyM: number; at: string }>;
}

/** GET /admin/tracking: from/to are the start and end of the viewer's local day. */
export function getTracking(from: string, to: string): Promise<TrackedPerson[]> {
  return get<TrackedPerson[]>("/admin/tracking", { from, to });
}
