import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`ui-shadow-card rounded-2xl border border-ink/[0.06] bg-surface p-5 ${className}`}
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
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-ink/55 dark:text-white/55">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
