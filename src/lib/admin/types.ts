/**
 * Admin panel types per ADMIN_PANEL_SPEC.md
 */

export type UserStatus = "pending" | "active" | "inactive" | "rejected";
export type UserRole = "user" | "admin";

export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
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

export interface UpdateUserPayload {
  role?: UserRole;
  status?: UserStatus;
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
