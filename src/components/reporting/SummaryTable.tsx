import { Card, CardHeader } from "@/components/ui/Card";

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
              <tr className="border-b border-stone-200 dark:border-stone-700">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="sticky top-0 z-10 whitespace-nowrap bg-stone-50 px-2 py-2 text-left text-xs font-medium text-stone-600 dark:bg-stone-800/50 dark:text-stone-400 sm:px-3"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="whitespace-nowrap px-2 py-2 text-stone-800 dark:text-stone-200 sm:px-3"
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
