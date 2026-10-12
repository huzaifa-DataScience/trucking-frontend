import type { ReactNode } from "react";

/** Soft count / KPI strip shared by Estimates, Projects, Billing. */
export function CountCard({
  value,
  label,
  tile = false,
  className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  /** Stretch to grid cell width (detail KPIs). */
  tile?: boolean;
  className?: string;
}) {
  return (
    <div className={`cs-count-card ${tile ? "cs-count-card--tile" : ""} ${className}`.trim()}>
      <p className="cs-count-card__value">{value}</p>
      <p className="cs-count-card__label">{label}</p>
    </div>
  );
}
