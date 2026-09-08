/**
 * Auth types per FRONTEND_AUTH.md + FRONTEND_RBAC.md.
 */

import type { AppRoleId } from "./roles";

export type { AppRoleId };
/** @deprecated Use AppRoleId */
export type AuthRole = AppRoleId;

export type UserStatus = "pending" | "active" | "inactive" | "rejected";

/**
 * Shape of the authenticated user returned by /auth/login, /auth/register, and /auth/profile.
 * Includes profile fields and permissions (see FRONTEND_AUTH.md / FRONTEND_RBAC.md).
 */
export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  displayName?: string;
  role: AppRoleId;
  status: UserStatus;
  permissions: string[];
  /** Relative path (e.g. /auth/avatar/12); resolve against the API base URL. Null when no photo set. */
  avatarUrl: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  password: string;
  confirmPassword?: string;
}
