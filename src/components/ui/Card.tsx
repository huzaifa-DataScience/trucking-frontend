import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`cs-content-panel min-w-0 p-5 ${className}`}>
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
    <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="cs-section-title">{title}</h3>
        {subtitle ? <p className="cs-helper mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
