import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Card({ children, className = "", id }: CardProps) {
  return (
    <div
      id={id}
      className={`ui-shadow-card min-w-0 rounded-[18px] border border-ink/[0.07] bg-surface px-6 py-[22px] ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-ink/45 dark:text-white/55">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
