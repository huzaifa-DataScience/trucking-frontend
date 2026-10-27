"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SignInMap } from "@/components/admin/SignInMap";
import { getApiErrorMessage } from "@/lib/api/client";
import { getSignInLocations, type SignInLocationRow } from "@/lib/api/endpoints/admin";

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const th = "whitespace-nowrap border-b border-[var(--border-subtle)] bg-[#fafbfc] px-4 py-[9px] text-left text-[11.5px] font-semibold text-ink-muted";
const td = "whitespace-nowrap border-b border-[#f0f1f3] px-4 py-3 align-middle";

export default function SignInLocationsPage() {
  const [rows, setRows] = useState<SignInLocationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSignInLocations()
      .then(setRows)
      .catch((e) => {
        setError(getApiErrorMessage(e, "Couldn’t load sign-in locations"));
        setRows([]);
      });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader title="Sign-in locations" subtitle="Where each person was when they signed in, newest first." />

      {error ? (
        <div className="rounded-[10px] border border-warning-border bg-warning-tint px-4 py-3 text-[13px] text-warning">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {rows == null ? (
          <TableSkeleton rows={8} toolbar={false} />
        ) : rows.length === 0 ? (
          !error ? <EmptyState message="No sign-ins with a location yet." /> : null
        ) : (
          <div className="table-scroll overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-[13.5px]">
              <thead>
                <tr>
                  <th className={th}>Person</th>
                  <th className={th}>Signed in</th>
                  <th className={th}>Location</th>
                  <th className={th}>Floor</th>
                  <th className={th}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>
                      <div className="font-semibold text-ink">{r.name}</div>
                      {r.email && r.email !== r.name ? <div className="text-[12px] text-ink-muted">{r.email}</div> : null}
                    </td>
                    <td className={`${td} text-ink-muted`}>{when(r.signedInAt)}</td>
                    <td className={`${td} max-w-[420px] whitespace-normal`}>
                      <div className="font-medium text-ink">{r.officeName ?? r.address ?? "Address not found"}</div>
                      <div className="text-[12px] text-ink-muted">
                        {r.officeName ? (r.address ?? "Office") : "Not at an office"}
                      </div>
                    </td>
                    <td className={`${td} text-ink`}>{r.floor}</td>
                    <td className={`${td} tabular-nums text-ink-muted`}>± {Math.round(r.accuracyM)} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows && rows.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-[var(--border-subtle)] px-[18px] py-3">
            <h2 className="text-[14px] font-semibold text-ink">Where everyone is</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              Each person’s latest sign-in. People at an office are shown on the office’s exact spot. For anyone else, the shaded circle is how far off the browser’s guess may be. Click a dot for details.
            </p>
          </div>
          <SignInMap rows={rows} when={when} />
        </section>
      ) : null}
    </div>
  );
}
