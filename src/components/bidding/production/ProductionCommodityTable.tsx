"use client";

import type { ProductionReportLine } from "@/lib/bidding/production-types";

function fmtQty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isRoll(line: ProductionReportLine): boolean {
  return line.catalogMatchMode === "roll" || line.qtyReceivedSf != null;
}

export function ProductionCommodityTable({
  lines,
}: {
  lines: ProductionReportLine[];
}) {
  const showRecvSf = lines.some((l) => l.qtyReceivedSf != null);

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
      <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-ink/[0.08] text-[10px] uppercase tracking-wide text-ink/40">
            <th className="px-2 py-2.5 font-semibold">Type</th>
            <th className="min-w-[10rem] px-2 py-2.5 font-semibold">Insulation</th>
            <th className="px-2 py-2.5 font-semibold">Material</th>
            <th className="px-2 py-2.5 font-semibold">Size</th>
            <th className="px-2 py-2.5 font-semibold">Thick</th>
            <th className="px-2 py-2.5 font-semibold">Wt / Fac</th>
            <th className="px-2 py-2.5 font-semibold">Prod / hr</th>
            <th className="px-2 py-2.5 font-semibold">Qty est</th>
            <th className="px-2 py-2.5 font-semibold">Qty recv</th>
            {showRecvSf ? (
              <th className="px-2 py-2.5 font-semibold">Recv SF</th>
            ) : null}
            <th className="px-2 py-2.5 font-semibold">Hrs material on site</th>
            <th className="px-2 py-2.5 font-semibold">Full estimate (hrs)</th>
            <th className="px-2 py-2.5 font-semibold">Qty remain</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.05]">
          {lines.map((line) => {
            const roll = isRoll(line);
            return (
              <tr key={line.commodityKey} className="align-top">
                <td className="px-2 py-2 text-ink">{line.type ?? "—"}</td>
                <td className="px-2 py-2 font-medium text-ink">
                  {line.insulation}
                </td>
                <td className="px-2 py-2 text-ink/70">
                  {line.materialBase ?? "—"}
                </td>
                <td className="px-2 py-2 text-ink">
                  {roll ? "—" : fmtQty(line.size)}
                </td>
                <td className="px-2 py-2 text-ink">{fmtQty(line.thickness)}</td>
                <td className="px-2 py-2 text-ink">
                  {[line.weight, line.facing].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-2 py-2 tabular-nums text-ink">
                  {fmtQty(line.productionPerHour)}
                </td>
                <td className="px-2 py-2 tabular-nums text-ink">
                  {fmtQty(line.qtyEstimated)}
                </td>
                <td className="px-2 py-2 tabular-nums text-ink">
                  {fmtQty(line.qtyReceived)}
                </td>
                {showRecvSf ? (
                  <td className="px-2 py-2 tabular-nums text-ink">
                    {line.qtyReceivedSf != null
                      ? fmtQty(line.qtyReceivedSf)
                      : "—"}
                  </td>
                ) : null}
                <td className="px-2 py-2 font-semibold tabular-nums text-ink">
                  {fmtQty(line.hoursEstimatedFromReceived)}
                </td>
                <td className="px-2 py-2 tabular-nums text-ink">
                  {fmtQty(line.hoursEstimated)}
                </td>
                <td className="px-2 py-2 tabular-nums text-ink">
                  {fmtQty(line.qtyRemain)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
