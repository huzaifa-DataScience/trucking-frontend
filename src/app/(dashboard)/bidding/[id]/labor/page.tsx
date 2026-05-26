"use client";

import Link from "next/link";
import { use } from "react";
import { ComputedField } from "@/components/bidding/ComputedField";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { formatMoney } from "@/lib/bidding/mock-data";

const LABOR_ROWS = [
  { role: "Foreman", count: 1, hours: 120, rate: 42.5, total: 5100 },
  { role: "Journeyman", count: 4, hours: 480, rate: 37.29, total: 17900 },
  { role: "Apprentice", count: 2, hours: 200, rate: 22.0, total: 4400 },
];

export default function BidLaborPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="bid-animate-in space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <ComputedField label="Labor rate (loaded)" value={formatMoney(89.91)} emphasis />
        <ComputedField label="FUTA / SUTA burden" value="12.4%" hint="From VRF and Lists payroll table" />
        <ComputedField label="Total labor hours" value="800" />
      </div>

      <Card>
        <CardHeader
          title="Labor lines"
          subtitle="Port of Labor Costs Worksheet — burden recalculates when wage or headcount changes."
        />
        <div className="overflow-x-auto rounded-xl border border-ink/[0.06]">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink/[0.06] bg-[#f8f9fb] text-left text-[10px] font-semibold uppercase tracking-wider text-ink/40">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Headcount</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.06]">
              {LABOR_ROWS.map((row) => (
                <tr key={row.role} className="transition hover:bg-brand/[0.02]">
                  <td className="px-4 py-3 font-medium text-ink">{row.role}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink/70">{row.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink/70">{row.hours}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink/70">${row.rate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-ink">
                    {formatMoney(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ink/[0.02] font-semibold">
                <td className="px-4 py-3 text-ink" colSpan={4}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono text-ink">
                  {formatMoney(LABOR_ROWS.reduce((s, r) => s + r.total, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink/40">
          Full worksheet has ~953 formulas — implement row-by-row in backend calc engine.
        </p>
      </Card>

      <div className="flex justify-between">
        <Link href={`/bidding/${id}/base-bid`} className="text-sm font-medium text-ink/50 hover:text-ink">
          ← Base bid
        </Link>
        <Link
          href={`/bidding/${id}/review`}
          className="inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
        >
          Review proposal →
        </Link>
      </div>
    </div>
  );
}
