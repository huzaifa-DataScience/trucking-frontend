/**
 * Admin panel types per ADMIN_PANEL_SPEC.md + FRONTEND_RBAC.md
 */

import type { AppRoleId } from "@/lib/auth/roles";

export type UserStatus = "pending" | "active" | "inactive" | "rejected";
export type UserRole = AppRoleId;

export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Present when backend includes permissions on user admin APIs. Read-only in UI. */
  permissions?: string[];
  createdAt: string; // ISO datetime
  lastLoginAt: string | null; // ISO datetime or null
}

export interface AdminUsersResponse {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserFilters {
  page?: number;
  pageSize?: number;
  status?: UserStatus | "all";
  role?: UserRole | "all";
  search?: string;
  startDate?: string;
  endDate?: string;
}

/** PATCH /admin/users/:id — do not send permissions (FRONTEND_RBAC.md). */
export interface UpdateUserPayload {
  role?: UserRole;
  status?: UserStatus;
}

/** GET/PATCH /admin/settings/rbac-user-defaults */
export interface RbacUserDefaultsSettings {
  role: AppRoleId | string;
  permissions?: string[];
}

export interface RbacRoleMeta {
  id: AppRoleId | string;
  label: string;
  note?: string | null;
  locked?: boolean;
}

export interface RbacPermissionMeta {
  key: string;
  label: string;
  description?: string | null;
  group?: string | null;
}

/** GET /admin/rbac */
export interface RbacMatrixResponse {
  roles: RbacRoleMeta[];
  permissions: RbacPermissionMeta[];
  matrix: Record<string, string[]>;
  defaults?: {
    role: string;
    permissions?: string[];
  };
}

export interface BulkActionResponse {
  message: string;
  successCount: number;
  failedCount: number;
}

/** GET /admin/email-templates/siteline-overdue (ADMIN_OVERDUE_EMAIL_TEMPLATE.md). */
export interface SitelineOverdueEmailTemplate {
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  /** Backend may return placeholder keys or docs; optional. */
  placeholders?: unknown;
  updatedAt?: string | null;
}

export interface SitelineOverdueEmailTemplateUpdate {
  subjectTemplate: string;
  bodyHtmlTemplate: string;
}

export type EmailTemplatePlaceholder = string;

export interface AdminEmailTemplate {
  templateKey: string;
  purpose: string;
  name: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  isActive: boolean;
  activatedAt: string | null;
  updatedAt: string | null;
}

export interface AdminEmailTemplateActive extends AdminEmailTemplate {
  placeholders: EmailTemplatePlaceholder[];
}

export interface AdminEmailTemplateListItem {
  templateKey: string;
  purpose: string;
  name: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  isActive: boolean;
  activatedAt: string | null;
  updatedAt: string | null;
}

export interface AdminEmailTemplatesPurposesResponse {
  purposes: string[];
}

export interface AdminEmailTemplateUpdatePayload {
  purpose?: string;
  name?: string;
  subjectTemplate?: string;
  bodyHtmlTemplate?: string;
  isActive?: boolean;
}

export interface AdminEmailTemplateCreatePayload extends AdminEmailTemplateUpdatePayload {
  templateKey: string;
  purpose: string;
  name: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  isActive: boolean;
}

/** GET/PATCH /admin/settings/overdue-email-sending (ADMIN_OVERDUE_EMAIL_TEMPLATE.md). */
export interface OverdueEmailSendingSettings {
  envMasterEnabled: boolean;
  adminToggleEnabled: boolean;
  effectiveEnabled: boolean;
}

/** GET/PATCH /admin/settings/siteline-clearstory-gap-alert (FRONTEND_SITELINE_PM_EMAILS.md). */
export interface SitelineClearstoryGapAlertSettings {
  envMasterEnabled: boolean;
  adminToggleEnabled: boolean;
  effectiveEnabled: boolean;
  recipientTo: string;
}

export const EMAIL_PURPOSE_OVERDUE_LEAD_PM = "siteline.overdue_leadpm" as const;
export const EMAIL_PURPOSE_CLEARSTORY_GAP = "siteline.clearstory_data_gap" as const;
