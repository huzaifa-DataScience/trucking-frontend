"use client";

import { COR_STATUSES } from "@/components/clearstory/CorOverviewSummary";

type Payload = Record<string, unknown>;

const obj = (v: unknown): Payload => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Payload) : {});
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const money = (n: number, cents = true) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
const date = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};
// "premiumOverTimeRate" -> "Premium over time rate"
const humanize = (k: string) =>
  k
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bid\b/g, "ID");
// "companyRateId", "id", "rateGroupId": identifiers, shown without thousands separators.
const isIdKey = (k: string) => k === "id" || /Id$/.test(k);

const LABOR_RATES: { key: string; label: string }[] = [
  { key: "straightTimeRate", label: "Straight time" },
  { key: "overTimeRate", label: "Overtime" },
  { key: "doubleTimeRate", label: "Double time" },
  { key: "premiumOverTimeRate", label: "Premium overtime" },
  { key: "premiumDoubleTimeRate", label: "Premium double time" },
];
const NAME_KEYS = ["laborClass", "material", "equipment", "other", "name", "description"];
// Shown in the header / price block or meaningless to a reader, so left out of "Details".
const HIDDEN_KEYS = new Set([
  ...NAME_KEYS,
  "projectRateId",
  ...LABOR_RATES.map((r) => r.key),
  "rate",
  "unit",
  "rateGroup",
  "rateGroupId",
]);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="break-words text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** Any value as short readable text (no JSON). */
function plain(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (isNum(v)) return v.toLocaleString("en-US");
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? (date(v) ?? v) : v;
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.map(plain).join(", ");
  const o = obj(v);
  if (typeof o.name === "string") return o.name;
  return Object.entries(o)
    .map(([k, x]) => `${humanize(k)}: ${plain(x)}`)
    .join(" · ");
}

/** One company rate (labor / material / equipment / other). */
export function RateResult({ payload, rateType }: { payload: unknown; rateType: string }) {
  const p = obj(payload);
  // Project rates carry `projectRateId` instead of `id`.
  const recordId = p.id ?? p.projectRateId;
  const nameKey = NAME_KEYS.find((k) => typeof p[k] === "string" && p[k]);
  const name = nameKey ? String(p[nameKey]) : `Rate ${plain(recordId)}`;
  const group = obj(p.rateGroup);
  const groupName = typeof group.name === "string" ? group.name : null;
  const isLabor = LABOR_RATES.some((r) => isNum(p[r.key]));
  const unit = typeof p.unit === "string" && p.unit ? p.unit : null;

  const details: { label: string; value: string }[] = [
    { label: "Record ID", value: recordId == null ? "—" : String(recordId) },
    ...(groupName || p.rateGroupId != null
      ? [
          {
            label: "Rate group",
            value: groupName ? `${groupName} (#${String(p.rateGroupId ?? group.id ?? "—")})` : String(p.rateGroupId),
          },
        ]
      : []),
    ...Object.entries(p)
      .filter(
        ([k, v]) => !HIDDEN_KEYS.has(k) && k !== "id" && v != null && !(typeof v === "object" && !Array.isArray(v)),
      )
      // Created / Last updated go last, in that order.
      .sort(
        ([a], [b]) =>
          (a === "createdAt" ? 1 : a === "updatedAt" ? 2 : 0) - (b === "createdAt" ? 1 : b === "updatedAt" ? 2 : 0),
      )
      .map(([k, v]) => ({
        label:
          k === "standardItem"
            ? "Standard item"
            : k === "createdAt"
              ? "Created"
              : k === "updatedAt"
                ? "Last updated"
                : humanize(k),
        value:
          k === "standardItem"
            ? v
              ? "Yes"
              : "No"
            : k === "standardAmount" && isNum(v)
              ? money(v)
              : isIdKey(k) && isNum(v)
                ? String(v)
                : plain(v),
      })),
  ];

  return (
    <article className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white p-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[22px] items-center rounded-full bg-[#e3f2fd] px-2.5 text-[12px] font-medium text-[#1565c0]">
            {rateType.charAt(0).toUpperCase() + rateType.slice(1)} rate
          </span>
          {groupName ? <span className="text-[12px] text-ink-muted">{groupName}</span> : null}
        </div>
        <h2 className="text-[15px] font-semibold leading-snug text-ink">{name}</h2>
      </header>

      {isLabor ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {LABOR_RATES.map((r) => (
            <div key={r.key} className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-[#f7f9fc] px-3 py-2.5">
              <span className="text-[12px] text-ink-muted">{r.label}</span>
              <span className="text-[18px] font-semibold tabular-nums text-ink">
                {isNum(p[r.key]) ? money(p[r.key] as number) : "—"}
                <span className="ml-0.5 text-[12px] font-normal text-ink-muted">/hr</span>
              </span>
            </div>
          ))}
        </div>
      ) : isNum(p.rate) ? (
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-semibold tabular-nums text-ink">{money(p.rate)}</span>
          {unit ? <span className="text-[13px] text-ink-muted">per {unit}</span> : null}
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {details.map((d) => (
          <Field key={d.label} label={d.label}>
            {d.value}
          </Field>
        ))}
      </dl>
    </article>
  );
}

/** COR contract summary: original vs pending contract value and the amount in each COR status. */
export function CorContractSummaryResult({ payload, inbox }: { payload: unknown; inbox?: "sent" | "received" }) {
  const p = obj(payload);
  const values = obj(p.contractSummaryValues);
  const original = isNum(p.originalContractValue) ? p.originalContractValue : 0;
  const pending = isNum(p.pendingContractValue) ? p.pendingContractValue : 0;
  const rows = COR_STATUSES.map((s) => ({
    ...s,
    amount: isNum(values[s.key]) ? (values[s.key] as number) : 0,
  }));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const change = pending - original;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Original contract value",
            value: money(original, false),
            note: "Before change orders",
          },
          {
            label: "Pending contract value",
            value: money(pending, false),
            note: "Including pending change orders",
          },
          {
            label: "Difference",
            value: `${change >= 0 ? "+" : "−"}${money(Math.abs(change), false)}`,
            note: original > 0 ? `${((change / original) * 100).toFixed(1)}% of original` : "",
          },
        ].map((t) => (
          <div
            key={t.label}
            className="flex min-w-0 flex-col gap-1 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white px-4 py-3.5"
          >
            <span className="text-[12px] text-ink-muted">{t.label}</span>
            <span className="truncate text-[22px] font-semibold leading-tight tabular-nums text-ink">{t.value}</span>
            <span className="truncate text-[12px] text-ink-muted">{t.note}</span>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white px-4 py-6 text-center text-[13px] text-ink-muted">
          No change order amounts {inbox === "received" ? "received" : inbox === "sent" ? "sent" : ""} in Clearstory for this
          contract summary, so every status is $0.
        </p>
      ) : (
      <div className="cs-data-table cs-table-shell table-scroll">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Change order amount by status</caption>
          <thead>
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Status</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Amount</th>
              <th className="w-[45%] whitespace-nowrap px-3 py-2">
                <span className="sr-only">Share of amount</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.key}
                className={`border-b border-[var(--border-subtle)] ${idx % 2 === 1 ? "bg-canvas/50" : "bg-white"}`}
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-[13px]">
                  <span
                    className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium ${r.pill}`}
                  >
                    {r.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-medium tabular-nums">
                  {money(r.amount, false)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 flex-1">
                      {r.amount > 0 ? (
                        <span
                          className="block h-full rounded-full bg-brand"
                          style={{ width: `${Math.max((r.amount / max) * 100, 2)}%` }}
                        />
                      ) : null}
                    </span>
                    <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-ink-muted">
                      {total > 0 ? `${((r.amount / total) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f3f4f6] font-semibold">
              <td className="px-3 py-2.5 text-[13px]">Total</td>
              <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{money(total, false)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}

/** Fallback for a payload shape we don't know: labelled fields instead of JSON. */
export function GenericResult({ payload }: { payload: unknown }) {
  const p = obj(payload);
  const entries = Object.entries(p);
  if (entries.length === 0) return <p className="text-[13px] text-ink-muted">{plain(payload)}</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([k, v]) => (
        <Field key={k} label={humanize(k)}>
          {isIdKey(k) && isNum(v) ? String(v) : plain(v)}
        </Field>
      ))}
    </dl>
  );
}
