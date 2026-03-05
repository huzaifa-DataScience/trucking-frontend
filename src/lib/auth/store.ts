/**
 * Auth persistence (localStorage + session cookie). Used by AuthContext and API client.
 * Token and user are stored so they survive refresh; API client reads token for requests.
 * Session cookie is used by middleware to redirect unauthenticated users to /login.
 */

import type { AuthUser, UserStatus } from "./types";

const TOKEN_KEY = "construction-logistics-access-token";
const USER_KEY = "construction-logistics-user";
/** Cookie checked by middleware to protect dashboard routes (cannot read localStorage in middleware). */
export const SESSION_COOKIE_NAME = "construction-logistics-session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}

/** Call after confirming token is valid (e.g. profile fetch) so middleware allows protected routes after refresh. */
export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

const VALID_STATUSES: UserStatus[] = ["pending", "active", "inactive", "rejected"];

function normalizeStoredStatus(raw: unknown): UserStatus {
  const s = String(raw ?? "").toLowerCase();
  return VALID_STATUSES.includes(s as UserStatus) ? (s as UserStatus) : "active";
}

/** Normalize stored user so it always has full AuthUser shape (handles legacy cached users). */
function normalizeStoredUser(raw: Record<string, unknown>): AuthUser {
  const u = raw as Partial<AuthUser>;
  return {
    id: u.id ?? 0,
    firstName: typeof u.firstName === "string" ? u.firstName : "",
    lastName: typeof u.lastName === "string" ? u.lastName : "",
    email: typeof u.email === "string" ? u.email : "",
    phone: u.phone != null ? String(u.phone) : null,
    company: u.company != null ? String(u.company) : null,
    displayName: typeof u.displayName === "string" ? u.displayName : undefined,
    role: u.role === "admin" ? "admin" : "user",
    status: normalizeStoredStatus(u.status),
    permissions: Array.isArray(u.permissions) ? (u.permissions as string[]) : [],
  };
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeStoredUser(parsed);
  } catch {
    return null;
  }
}
