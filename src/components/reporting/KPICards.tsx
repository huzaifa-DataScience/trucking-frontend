import { Card } from "@/components/ui/Card";

export interface KPICardItem {
  label: string;
  value: string | number;
}

interface KPICardsProps {
  items: KPICardItem[];
}

export function KPICards({ items }: KPICardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {item.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
