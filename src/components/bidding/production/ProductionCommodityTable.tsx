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

function typeTone(type: string | null | undefined): string {
  const t = (type || "").toLowerCase();
  if (t.includes("pipe")) return "bg-[#0d9488]/12 text-[#0f766e]";
  if (t.includes("roll") || t.includes("wrap"))
    return "bg-[#ff7b11]/12 text-[#c2410c]";
  if (t.includes("board")) return "bg-[#e11d48]/10 text-[#be123c]";
  return "bg-ink/[0.06] text-ink/65";
}

/**
 * Full commodity table — all columns restored, warm-brand accents.
 */
export function ProductionCommodityTable({
  lines,
}: {
  lines: ProductionReportLine[];
}) {
  const showRecvSf = lines.some((l) => l.qtyReceivedSf != null);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-[18px] border border-dashed border-ink/[0.12] bg-[#f4f6f9] text-sm text-ink/45">
        No commodity lines
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-auto rounded-[18px] border border-ink/[0.08] bg-surface shadow-[0_8px_22px_-16px_rgba(15,23,42,0.2)]">
      <table className="w-full min-w-[1100px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink/[0.08] bg-[#fafbfc] text-[10px] uppercase tracking-[0.06em] text-ink/40">
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
              Type
            </th>
            <th className="min-w-[10rem] px-3 py-2.5 font-semibold">
              Insulation
            </th>
            <th className="px-3 py-2.5 font-semibold">Material</th>
            <th className="px-3 py-2.5 text-right font-semibold">Size</th>
            <th className="px-3 py-2.5 text-right font-semibold">Thick</th>
            <th className="px-3 py-2.5 font-semibold">Wt / Fac</th>
            <th className="px-3 py-2.5 text-right font-semibold">Prod / hr</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty est</th>
            <th className="px-3 py-2.5 text-right font-semibold">Qty recv</th>
            {showRecvSf ? (
              <th className="px-3 py-2.5 text-right font-semibold">Recv SF</th>
            ) : null}
            <th className="px-3 py-2.5 text-right font-semibold">Remain</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              Hrs on site
            </th>
            <th className="px-3 py-2.5 text-right font-semibold">
              Full est hrs
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const roll = isRoll(line);
            const onSite = line.hoursEstimatedFromReceived ?? 0;
            const onSiteEmpty = onSite <= 0;
            const recvEmpty = (line.qtyReceived ?? 0) <= 0;

            return (
              <tr
                key={line.commodityKey}
                className="border-b border-ink/[0.05] last:border-b-0 align-middle transition-colors hover:bg-[#fff8f0]/55"
              >
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-lg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeTone(line.type)}`}
                  >
                    {line.type ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-ink">
                  {line.insulation}
                </td>
                <td className="px-3 py-3 text-ink/65">
                  {line.materialBase ?? "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink/80">
                  {roll ? "—" : fmtQty(line.size)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink/80">
                  {fmtQty(line.thickness)}
                </td>
                <td className="px-3 py-3 text-ink/70">
                  {[line.weight, line.facing].filter(Boolean).join(" / ") ||
                    "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink/70">
                  {fmtQty(line.productionPerHour)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink/80">
                  {fmtQty(line.qtyEstimated)}
                </td>
                <td
                  className={`px-3 py-3 text-right tabular-nums ${
                    recvEmpty ? "text-ink/30" : "text-ink/80"
                  }`}
                >
                  {fmtQty(line.qtyReceived)}
                </td>
                {showRecvSf ? (
                  <td className="px-3 py-3 text-right tabular-nums text-ink/70">
                    {line.qtyReceivedSf != null
                      ? fmtQty(line.qtyReceivedSf)
                      : "—"}
                  </td>
                ) : null}
                <td className="px-3 py-3 text-right tabular-nums text-ink/70">
                  {fmtQty(line.qtyRemain)}
                </td>
                <td
                  className={`px-3 py-3 text-right font-extrabold tabular-nums ${
                    onSiteEmpty ? "text-ink/30" : "text-[#e11d48]"
                  }`}
                >
                  {onSiteEmpty ? "—" : fmtQty(onSite)}
                </td>
                <td className="px-3 py-3 text-right font-extrabold tabular-nums text-[#ff7b11]">
                  {fmtQty(line.hoursEstimated)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
