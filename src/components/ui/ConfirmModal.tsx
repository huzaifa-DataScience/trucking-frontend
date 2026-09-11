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
      ? "bg-danger text-white hover:bg-danger/90"
      : "bg-brand text-white hover:bg-brand/90";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_16px_40px_-12px_rgba(1,1,1,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 sm:px-6">
          <h3
            id="confirm-modal-title"
            className="text-base font-semibold text-ink"
          >
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink/[0.06] px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.04]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
