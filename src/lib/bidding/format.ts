export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMoneyPrecise(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Decimal 0.15 → "15%" */
export function formatPercentDecimal(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Bid dueTime / HH:mm — 12h display when parseable. */
export function formatBidTime(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i.exec(t);
  if (!m) return t;
  let h = Number(m[1]);
  const min = m[2];
  const mer = m[3]?.toLowerCase();
  if (mer) {
    return `${h}:${min} ${mer}`;
  }
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min} ${suffix}`;
}

export function formatBidDateAndTime(opts: {
  bidDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
}): { date: string; time: string | null; label: string } {
  const dateRaw = opts.bidDate || opts.dueDate;
  const date = dateRaw ? formatDate(String(dateRaw).slice(0, 10)) : "—";
  const time = formatBidTime(opts.dueTime);
  return {
    date,
    time,
    label: time ? `${date} · ${time}` : date,
  };
}

export function telHref(phone: string | null | undefined): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length < 7) return null;
  return `tel:${digits}`;
}
