"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app confirmation dialog — not `window.confirm`. */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmClass =
    variant === "danger"
      ? "border-danger/40 bg-danger text-white hover:bg-danger/90"
      : "border-brand bg-brand text-white hover:border-brand-secondary hover:bg-brand-secondary";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
      style={{ fontFamily: 'var(--font-geist-sans), "Roboto", system-ui, sans-serif' }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-subtle)] bg-brand-tint px-4 py-2.5">
          <h3
            id="confirm-modal-title"
            className="text-[13px] font-semibold tracking-wide text-ink"
          >
            {title}
          </h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{message}</p>
        </div>
        <div className="flex justify-end gap-1.5 border-t border-[var(--border-subtle)] bg-canvas px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--border-subtle)] bg-white px-3 py-1 text-[11px] font-semibold text-ink-muted transition hover:border-[#94a3b8] hover:bg-canvas hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md border px-3 py-1 text-[11px] font-semibold transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
