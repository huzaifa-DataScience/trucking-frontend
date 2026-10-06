import { type ReactNode } from "react";
import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href?: string;
}

/** Compact page title block under the top bar. */
export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
              {breadcrumbs.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 ? (
                    <span aria-hidden className="text-ink-soft">
                      /
                    </span>
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="font-medium text-ink-muted transition-colors hover:text-ink hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="cs-page-title">{title}</h1>
        {subtitle ? <p className="cs-helper mt-1 max-w-2xl">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
