import type { ReactNode } from "react";

/**
 * Designed empty state: dashed card + message + optional CTA (UX doc §9).
 */
export function EmptyState({
  message,
  icon,
  action,
  className = "",
}: {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-ink/15 bg-surface/80 px-8 py-16 text-center ${className}`}
    >
      {icon ? <div className="mx-auto mb-3 flex justify-center text-ink/25">{icon}</div> : null}
      <p className="text-sm font-medium text-ink/60">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
