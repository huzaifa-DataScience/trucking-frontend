/** Formats an ISO datetime string as "Sep 5, 2026, 7:34 AM" (local time). Falls back to the raw value if unparseable. */
export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a plain "YYYY-MM-DD" date string as "Sep 5, 2026". Falls back to the raw value if unparseable. */
export function formatDate(dateOnly: string): string {
  if (!dateOnly) return "—";
  const d = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateOnly;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
