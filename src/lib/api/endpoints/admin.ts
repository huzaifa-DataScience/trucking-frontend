/**
 * Admin API endpoints per ADMIN_PANEL_SPEC.md
 * All endpoints require admin role (backend enforces).
 */

import { get, post, patch, del } from "../client";
import type {
  AdminUser,
  AdminUsersResponse,
  UserFilters,
  UpdateUserPayload,
  BulkActionResponse,
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
