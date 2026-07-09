/**
 * One component for all RBAC denials (UX doc §10):
 * lock icon + what is restricted + the permission key (so admins can act on screenshots).
 */
export function RestrictedState({
  title = "Access restricted",
  message,
  permission,
  className = "",
}: {
  title?: string;
  message: string;
  /** Permission key shown in mono, e.g. "bidding:summary". */
  permission?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-ink/[0.08] bg-surface p-6 text-center shadow-[0_1px_3px_rgba(1,1,1,0.05)] ${className}`}
    >
      <span
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink/[0.05] text-ink/40"
        aria-hidden
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/55">{message}</p>
      {permission ? (
        <p className="mt-2 font-mono text-[11px] text-ink/40">{permission}</p>
      ) : null}
      <p className="mt-3 text-xs text-ink/45">Contact your administrator to request access.</p>
    </div>
  );
}
