import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/50 ${className}`}
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
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
