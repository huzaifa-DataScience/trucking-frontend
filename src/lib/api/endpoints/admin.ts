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
