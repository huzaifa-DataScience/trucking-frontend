import { Card, CardHeader } from "@/components/ui/Card";

const thClass =
  "sticky top-0 z-10 whitespace-nowrap bg-[#f8f9fb] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink/45";
const tdClass = "whitespace-nowrap px-3 py-2.5 text-sm text-ink/85";

export interface SummaryColumn<T> {
  key: keyof T | string;
  label: string;
}

interface SummaryTableProps<T extends Record<string, string | number>> {
  title: string;
  subtitle?: string;
  columns: SummaryColumn<T>[];
  rows: T[];
  className?: string;
}

export function SummaryTable<T extends Record<string, string | number>>({
  title,
  subtitle,
  columns,
  rows,
  className = "",
}: SummaryTableProps<T>) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.08]">
                {columns.map((col) => (
                  <th key={String(col.key)} className={thClass}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-ink/[0.05] transition-colors last:border-0 hover:bg-ink/[0.02]"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={tdClass}
                    >
                      {row[col.key as keyof T] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
