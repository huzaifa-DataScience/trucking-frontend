/**
 * Auth API: login, register, profile (FRONTEND_AUTH.md).
 * Login/register use fetch directly (no Bearer token). Profile uses token from store.
 */

import { getBaseUrl } from "../config";
import { getAccessToken, clearAuth } from "@/lib/auth/store";
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "@/lib/auth/types";

const BASE = () => getBaseUrl();

const VALID_STATUSES: AuthUser["status"][] = ["pending", "active", "inactive", "rejected"];

function normalizeStatus(raw: unknown): AuthUser["status"] {
  const s = String(raw ?? "").toLowerCase() as AuthUser["status"];
  return VALID_STATUSES.includes(s) ? s : "pending";
}

/** Normalize user from API so all required fields exist (backward compat). */
function normalizeUser(raw: Record<string, unknown>): AuthUser {
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
    status: normalizeStatus(u.status),
    permissions: Array.isArray(u.permissions) ? (u.permissions as string[]) : [],
  };
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${BASE()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user?: AuthUser;
    message?: string | string[];
    error?: string;
    statusCode?: number;
  };

  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    if (res.status === 401) {
      throw new Error(typeof msg === "string" && msg ? msg : "Invalid email or password");
    }
    if (res.status === 400) {
      throw new Error(msg ?? "Validation failed");
    }
    throw new Error(String(msg ?? data.error ?? "Login failed"));
  }

  if (!data.access_token || !data.user) throw new Error("Invalid login response");
  const user = normalizeUser(data.user as unknown as Record<string, unknown>);
  return { access_token: data.access_token, user };
}

export async function register(body: RegisterRequest): Promise<LoginResponse> {
  const res = await fetch(`${BASE()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user?: AuthUser;
    message?: string | string[];
    statusCode?: number;
  };

  if (!res.ok) {
    if (res.status === 409) throw new Error("An account with this email already exists");
    if (res.status === 400) {
      const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
      throw new Error(msg ?? "Validation failed");
    }
    throw new Error(String(data.message ?? "Registration failed"));
  }

  if (!data.access_token || !data.user) throw new Error("Invalid register response");
  const user = normalizeUser(data.user as unknown as Record<string, unknown>);
  return { access_token: data.access_token, user };
}

export async function getProfile(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;

  const res = await fetch(`${BASE()}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearAuth();
    return null;
  }
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeUser(raw);
}
