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
      : "border-[#d9d4c8] bg-[#f3f1ea] text-[#5a5340] hover:bg-[#ebe8df]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
      style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-[#d5dbe3] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#e5e7eb] bg-[#f3f1ea] px-4 py-2.5">
          <h3
            id="confirm-modal-title"
            className="text-[13px] font-semibold tracking-wide text-[#5a5340]"
          >
            {title}
          </h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-[#4b5563]">{message}</p>
        </div>
        <div className="flex justify-end gap-1.5 border-t border-[#e5e7eb] bg-[#f8fafc] px-4 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#cfd5dd] bg-white px-3 py-1 text-[11px] font-semibold text-[#4b5563] transition hover:border-[#94a3b8] hover:bg-[#f1f5f9]"
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
