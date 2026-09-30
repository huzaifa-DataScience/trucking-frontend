import { type ReactNode } from "react";
import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href?: string;
}

/** Executive-style page title block (hero row under the top bar). */
export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** For pages ≥ 2 levels deep (UX doc §3.2), e.g. Bidding / IDC6098. */
  breadcrumbs?: Breadcrumb[];
  /** Tighter title/subtitle stack (bid sheet chrome). */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end sm:justify-between ${
        compact ? "gap-1 sm:gap-3" : "gap-2 sm:gap-4"
      }`}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className={compact ? "mb-1" : "mb-1.5"}>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink/45">
              {breadcrumbs.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 ? (
                    <span aria-hidden className="text-ink/25">
                      /
                    </span>
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="font-medium transition-colors hover:text-ink"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink/60">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1
          className={
            compact
              ? "text-lg font-bold tracking-tight text-ink sm:text-xl sm:leading-tight"
              : "text-xl font-bold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight"
          }
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={
              compact
                ? "mt-0.5 max-w-2xl text-sm leading-snug text-ink/50"
                : "mt-1 max-w-2xl text-sm leading-relaxed text-ink/50 sm:mt-1.5"
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
