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
