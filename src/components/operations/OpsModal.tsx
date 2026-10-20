"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** App-standard overlay dialog (TicketDetailModal chrome). */
export function OpsModal({
  open,
  title,
  eyebrow,
  onClose,
  children,
  footer,
  footerNote,
  wide,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Small note on the left of the footer buttons. */
  footerNote?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_24px_64px_-12px_rgba(1,1,1,0.35)] ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        {/* Thin light-blue bar, like the app's confirm dialogs and form section bars. */}
        <div className="flex items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.05)] bg-brand-tint py-2 pl-5 pr-3 sm:pl-6">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 id={titleId} className="truncate text-[14px] font-semibold text-ink">
              {title}
            </h2>
            {eyebrow ? <span className="shrink-0 text-[12px] text-ink/55">{eyebrow}</span> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink/50 transition hover:bg-white/70 hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/[0.07] bg-[#f8f9fb] px-5 py-3 sm:px-6">
            {footerNote ? <p className="mr-auto min-w-0 text-[12px] text-ink/45">{footerNote}</p> : null}
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
