"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

/** Right-sliding sidebar drawer shared by the bid sheet's Activity/Notes floating panels. Closed by default. */
export function BidSidebarDrawer({
  open,
  onClose,
  title,
  badge,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/35 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[24rem] max-w-[92vw] flex-col border-l border-ink/[0.08] bg-surface shadow-[-12px_0_40px_-12px_rgba(1,1,1,0.3)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {badge}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="rounded-lg p-1.5 text-ink/40 transition hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}

/** Floating round trigger button — stacked bottom-right so it never collides with the app's real left nav. */
export function BidFloatingButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(1,1,1,0.25)] transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-ink/10 bg-surface text-ink/75 hover:border-ink/20 hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
