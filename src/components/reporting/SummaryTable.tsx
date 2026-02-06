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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-3 py-2 text-left font-medium text-stone-600 dark:text-stone-400"
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
                    className="px-3 py-2 text-stone-800 dark:text-stone-200"
                  >
                    {row[col.key as keyof T] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
