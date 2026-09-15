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
import { normalizeAppRole } from "@/lib/auth/roles";

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
    role: normalizeAppRole(u.role),
    status: normalizeStatus(u.status),
    permissions: Array.isArray(u.permissions) ? (u.permissions as string[]) : [],
    teamId:
      typeof u.teamId === "number"
        ? u.teamId
        : u.teamId === null
          ? null
          : undefined,
    avatarUrl: typeof u.avatarUrl === "string" ? u.avatarUrl : null,
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
    // Token invalid/expired – clear auth and let RequireAuth / middleware force login.
    clearAuth();
    return null;
  }
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeUser(raw);
}

/** Captain My team — GET/PATCH /auth/team (slot roster, not lookups/bidding/teams). */
export type AuthTeamSlotKey =
  | "bidClerk"
  | "duct1"
  | "duct2"
  | "hydronic1"
  | "hydronic2"
  | "plumbing1"
  | "plumbing2";

export const AUTH_TEAM_SLOT_KEYS: AuthTeamSlotKey[] = [
  "bidClerk",
  "duct1",
  "duct2",
  "hydronic1",
  "hydronic2",
  "plumbing1",
  "plumbing2",
];

export const AUTH_TEAM_SLOT_LABELS: Record<AuthTeamSlotKey, string> = {
  bidClerk: "Bid clerk",
  duct1: "Duct 1",
  duct2: "Duct 2",
  hydronic1: "Hydronic 1",
  hydronic2: "Hydronic 2",
  plumbing1: "Plumbing 1",
  plumbing2: "Plumbing 2",
};

/** Person ref on a slot — Connecteam id and/or portal app user id. */
export type AuthTeamSlotAssignee = {
  connecteamUserId?: number | null;
  appUserId?: number | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null;

export type AuthTeamSlotsPatch = Partial<
  Record<
    AuthTeamSlotKey,
    | { connecteamUserId: number }
    | { appUserId: number }
    | { name: string }
    | null
  >
>;

export interface AuthTeam {
  id?: number | null;
  teamId?: number | null;
  teamName?: string | null;
  /** Login captain — read-only on My team */
  captain?: AuthTeamSlotAssignee;
  captainUserId?: number | null;
  /** Optional contact book / directory blob from GET /auth/team */
  contacts?: unknown;
  slots?: Partial<Record<AuthTeamSlotKey, AuthTeamSlotAssignee>> | null;
  /** Flat name fallbacks if BE still sends Bid_Teams shape */
  bidClerk?: string | null;
  duct1?: string | null;
  duct2?: string | null;
  hydronic1?: string | null;
  hydronic2?: string | null;
  plumbing1?: string | null;
  plumbing2?: string | null;
}

function asSlotAssignee(raw: unknown): AuthTeamSlotAssignee {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const name = raw.trim();
    return name ? { name } : null;
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const connecteamUserId =
    typeof o.connecteamUserId === "number"
      ? o.connecteamUserId
      : typeof o.userId === "number"
        ? o.userId
        : null;
  const appUserId = typeof o.appUserId === "number" ? o.appUserId : null;
  const name =
    typeof o.name === "string"
      ? o.name
      : typeof o.displayName === "string"
        ? o.displayName
        : null;
  const email = typeof o.email === "string" ? o.email : null;
  if (connecteamUserId == null && appUserId == null && !name && !email) return null;
  return {
    connecteamUserId,
    appUserId,
    name,
    displayName: typeof o.displayName === "string" ? o.displayName : null,
    email,
  };
}

function normalizeAuthTeam(raw: Record<string, unknown>): AuthTeam {
  const slotsRaw =
    raw.slots && typeof raw.slots === "object"
      ? (raw.slots as Record<string, unknown>)
      : null;
  const slots: AuthTeam["slots"] = {};
  for (const key of AUTH_TEAM_SLOT_KEYS) {
    const fromSlots = slotsRaw ? asSlotAssignee(slotsRaw[key]) : null;
    const fromFlat = asSlotAssignee(raw[key]);
    slots[key] = fromSlots ?? fromFlat;
  }
  const teamId =
    typeof raw.teamId === "number"
      ? raw.teamId
      : typeof raw.id === "number"
        ? raw.id
        : null;
  return {
    id: typeof raw.id === "number" ? raw.id : null,
    teamId,
    teamName:
      typeof raw.teamName === "string"
        ? raw.teamName
        : typeof raw.name === "string"
          ? raw.name
          : null,
    captain: asSlotAssignee(raw.captain),
    captainUserId:
      typeof raw.captainUserId === "number" ? raw.captainUserId : null,
    contacts: raw.contacts ?? undefined,
    slots,
    bidClerk: typeof raw.bidClerk === "string" ? raw.bidClerk : null,
    duct1: typeof raw.duct1 === "string" ? raw.duct1 : null,
    duct2: typeof raw.duct2 === "string" ? raw.duct2 : null,
    hydronic1: typeof raw.hydronic1 === "string" ? raw.hydronic1 : null,
    hydronic2: typeof raw.hydronic2 === "string" ? raw.hydronic2 : null,
    plumbing1: typeof raw.plumbing1 === "string" ? raw.plumbing1 : null,
    plumbing2: typeof raw.plumbing2 === "string" ? raw.plumbing2 : null,
  };
}

/** Current captain crew roster — Settings → My team. */
export async function getAuthTeam(): Promise<AuthTeam | null> {
  const token = getAccessToken();
  if (!token) return null;

  const res = await fetch(`${BASE()}/auth/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearAuth();
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeAuthTeam(raw);
}

/**
 * Save My team slots. First save creates the captain's Bid_Teams row.
 * Captain slot is always the logged-in user (do not send).
 * Response: `{ user, team }` — replace stored AuthUser from `user`.
 */
export async function patchAuthTeam(body: {
  slots: AuthTeamSlotsPatch;
}): Promise<{ user?: AuthUser; team?: AuthTeam }> {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`${BASE()}/auth/team`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(msg || "Couldn't update team.");
  }

  // Canonical: { user, team }
  if (data.user && typeof data.user === "object") {
    const teamRaw =
      data.team && typeof data.team === "object"
        ? (data.team as Record<string, unknown>)
        : null;
    return {
      user: normalizeUser(data.user as Record<string, unknown>),
      team: teamRaw ? normalizeAuthTeam(teamRaw) : undefined,
    };
  }

  // Legacy: bare AuthUser
  if (typeof data.email === "string" || typeof data.role === "string") {
    return { user: normalizeUser(data) };
  }

  return { team: normalizeAuthTeam(data) };
}

/** Uploads/replaces the current user's profile photo. Throws with a user-facing message on failure. */
export async function uploadAvatar(file: File): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE()}/auth/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(msg || "Couldn't upload photo. Please try again.");
  }
  return normalizeUser(data);
}

/** Removes the current user's profile photo (reverts to initials). */
export async function deleteAvatar(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`${BASE()}/auth/avatar`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(msg || "Couldn't remove photo. Please try again.");
  }
  return normalizeUser(data);
}

/** Changes the current user's password. Throws with a user-facing message on failure. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`${BASE()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(msg || "Couldn't change password. Please try again.");
  }
}
