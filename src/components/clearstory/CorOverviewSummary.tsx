"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClearstoryApiPayload } from "@/lib/api/endpoints/clearstory";
import { getApiErrorMessage } from "@/lib/api/client";

type Inbox = "sent" | "received";
type Payload = Record<string, unknown>;

/** Clearstory COR statuses in workflow order, with plain labels and a status colour. */
export const COR_STATUSES: { key: string; label: string; pill: string }[] = [
  { key: "in_review", label: "In review", pill: "bg-amber-50 text-amber-800" },
  { key: "approved_to_proceed", label: "Approved to proceed", pill: "bg-blue-50 text-blue-700" },
  { key: "approved_co_issued", label: "Approved, CO issued", pill: "bg-green-50 text-green-700" },
  { key: "rejected", label: "Rejected", pill: "bg-red-50 text-red-700" },
  { key: "placeholder", label: "Placeholder", pill: "bg-[#f3f4f6] text-ink-muted" },
];

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const obj = (v: unknown): Payload =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Payload) : {};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const count = (n: number) => n.toLocaleString("en-US");

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "warn" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-white px-4 py-3.5">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className={`truncate text-[22px] font-semibold leading-tight tabular-nums ${tone === "warn" ? "text-amber-800" : "text-ink"}`}>
        {value}
      </span>
      <span className="truncate text-[12px] text-ink-muted">{note}</span>
    </div>
  );
}

/**
 * Readable summary of Clearstory's stored COR overview (`cors_overview`, per inbox):
 * headline numbers plus a by-status table. Shows the Sent/Received switch only when
 * the received inbox actually has CORs. `bare` drops the panel border/padding when placed inside another card.
 */
export function CorOverviewSummary({ bare = false }: { bare?: boolean } = {}) {
  const [data, setData] = useState<Partial<Record<Inbox, { payload: Payload; fetchedAt: string | null }>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [inbox, setInbox] = useState<Inbox>("sent");

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled(
      (["sent", "received"] as const).map((which) =>
        getClearstoryApiPayload({ type: "cors_overview", key: `inbox=${which}` }).then((res) => ({ which, res }))
      )
    ).then((results) => {
      if (cancelled) return;
      const next: typeof data = {};
      let firstError: unknown = null;
      for (const r of results) {
        if (r.status === "fulfilled") {
          next[r.value.which] = { payload: obj(r.value.res.payload), fetchedAt: r.value.res.lastFetchedAt ?? null };
        } else if (!firstError) {
          firstError = r.reason;
        }
      }
      setData(next);
      if (!next.sent && firstError) setError(getApiErrorMessage(firstError, "Couldn't load the change order summary"));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasReceived = num(data.received?.payload.totalCount) > 0;
  const current = data[inbox] ?? data.sent;
  const asOf = current?.fetchedAt
    ? new Date(current.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  if (loaded && !data.sent && !data.received) {
    return error ? (
      <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
        {error}
      </p>
    ) : null;
  }

  return (
    <section
      className={`flex flex-col gap-4 ${bare ? "" : "cs-content-panel rounded-lg p-5"}`}
      aria-labelledby="cor-summary-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="cor-summary-title" className="cs-section-title">
            Change order summary
          </h2>
          <p className="cs-helper mt-0.5">
            {inbox === "sent" ? "CORs your company sent" : "CORs sent to your company"}
            {asOf ? ` · from Clearstory, as of ${asOf}` : ""}
          </p>
        </div>
        {hasReceived ? (
          <div className="inline-flex gap-1 rounded-[var(--radius)] bg-[#f3f4f6] p-1" role="radiogroup" aria-label="Inbox">
            {(["sent", "received"] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={inbox === w}
                onClick={() => setInbox(w)}
                className={`h-8 rounded-[var(--radius-md)] px-3 text-[13px] font-medium transition-colors ${
                  inbox === w ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-muted hover:text-ink"
                }`}
              >
                {w === "sent" ? "Sent" : "Received"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!loaded ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[92px] rounded-[var(--radius)]" />
            ))}
          </div>
          <Skeleton className="h-56 rounded-[var(--radius)]" />
        </>
      ) : (
        <CorOverviewContent payload={current?.payload ?? {}} />
      )}
    </section>
  );
}

/** Tiles + by-status table + footnote for one `cors_overview` payload (also used on Clearstory Rates). */
export function CorOverviewContent({ payload }: { payload: unknown }) {
  const p = obj(payload);
  const total = num(p.totalCount);
  const requested = num(p.totalRequestedAmount);
  const inReview = obj(p.in_review);
  const approvedCount = num(obj(p.approved_to_proceed).totalCount) + num(obj(p.approved_co_issued).totalCount);
  const approvedAmount = num(obj(p.approved_to_proceed).totalAmount) + num(obj(p.approved_co_issued).totalAmount);
  const avgDays = num(p.averageDaysInReview);
  const rows = COR_STATUSES.map((s) => ({ ...s, count: num(obj(p[s.key]).totalCount), amount: num(obj(p[s.key]).totalAmount) }));
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount));
  const statusTotal = rows.reduce((a, r) => a + r.amount, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Total requested" value={money(requested)} note={`${count(total)} CORs`} />
        <Tile
          label="In review"
          value={money(num(inReview.totalAmount))}
          note={`${count(num(inReview.totalCount))} CORs waiting for an answer`}
          tone="warn"
        />
        <Tile label="Approved" value={money(approvedAmount)} note={`${count(approvedCount)} CORs, incl. CO issued`} />
        <Tile
          label="Average time in review"
          value={`${count(avgDays)} days`}
          note={`Avg request ${money(num(p.averageRequestedValue))}`}
          tone={avgDays > 60 ? "warn" : undefined}
        />
      </div>

      <div className="cs-data-table cs-table-shell">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Change orders by status</caption>
          <thead>
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Status</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">CORs</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Amount</th>
              <th className="w-[38%] whitespace-nowrap px-3 py-2">
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
                  <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium ${r.pill}`}>
                    {r.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums">{count(r.count)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-medium tabular-nums">{money(r.amount)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f3f4f6]">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(r.amount / maxAmount) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-ink-muted">
                      {statusTotal > 0 ? `${((r.amount / statusTotal) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f3f4f6] font-semibold">
              <td className="px-3 py-2.5 text-[13px]">Total</td>
              <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{count(rows.reduce((a, r) => a + r.count, 0))}</td>
              <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{money(statusTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[12.5px] text-ink-muted">
        Still to be billed: <span className="font-medium text-ink">{money(num(p.totalAmountRemaining))}</span> · Value completed:{" "}
        <span className="font-medium text-ink">{money(num(p.valueCompleted))}</span> · T&amp;M tags on these CORs:{" "}
        <span className="font-medium text-ink">{count(num(p.totalTags))}</span>
      </p>
    </>
  );
}
