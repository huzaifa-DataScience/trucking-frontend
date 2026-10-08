import type { AuthUser } from "./types";

type NameFields = Pick<AuthUser, "firstName" | "lastName" | "displayName" | "email">;

/**
 * Prefer real name over displayName — APIs often set displayName to the email,
 * which made the profile menu show email twice (name line + email line).
 */
export function userFullName(user: NameFields | null | undefined): string {
  if (!user) return "User";
  const fromParts = [user.firstName, user.lastName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");
  if (fromParts) return fromParts;

  const email = (user.email ?? "").trim();
  const dn = (user.displayName ?? "").trim();
  if (dn && dn.toLowerCase() !== email.toLowerCase()) return dn;

  return email || "User";
}
