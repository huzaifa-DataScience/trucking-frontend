/**
 * Prefer first + last name for UI labels; fall back to email/handle.
 * Comments API historically sent email as authorName — still supported.
 */

export function joinPersonName(
  firstName?: string | null,
  lastName?: string | null
): string {
  return [firstName, lastName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function personDisplayName(opts: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  /** May be a real name or an email (legacy authorName). */
  name?: string | null;
  email?: string | null;
}): string {
  const fromParts = joinPersonName(opts.firstName, opts.lastName);
  if (fromParts) return fromParts;

  const display = opts.displayName?.trim();
  if (display && !looksLikeEmail(display)) return display;

  const name = opts.name?.trim();
  if (name && !looksLikeEmail(name)) return name;

  const email = opts.email?.trim() || (name && looksLikeEmail(name) ? name : "");
  return email || display || name || "Unknown";
}

export function personInitials(opts: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const first = opts.firstName?.trim();
  const last = opts.lastName?.trim();
  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  if (first) return first.slice(0, 2).toUpperCase();

  const label = personDisplayName(opts);
  if (looksLikeEmail(label)) {
    const local = label.split("@")[0]?.trim() || label;
    const parts = local.split(/[._\-+]/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return local.slice(0, 2).toUpperCase() || "?";
  }
  const bits = label.split(/\s+/).filter(Boolean);
  if (bits.length >= 2) {
    return `${bits[0]![0] ?? ""}${bits[1]![0] ?? ""}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}
