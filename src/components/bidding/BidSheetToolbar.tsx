"use client";

export function BidSheetToolbar({
  isEditable,
  saving,
  status,
  onPreview,
  onSave,
  onSubmit,
}: {
  isEditable: boolean;
  saving: boolean;
  status: string;
  onPreview: () => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.08] bg-surface/80 p-2 shadow-[0_1px_3px_rgba(1,1,1,0.04)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onPreview}
        disabled={!isEditable}
        className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04] disabled:opacity-45"
      >
        Preview calculate
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !isEditable}
        className="rounded-xl border border-ink/10 bg-canvas px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/30 hover:bg-brand/[0.04] disabled:opacity-45"
      >
        {saving ? "Saving…" : "Save & calculate"}
      </button>
      {status === "draft" ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !isEditable}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)] transition hover:bg-brand-secondary hover:shadow-[0_4px_14px_rgba(255,123,17,0.4)] disabled:opacity-45"
        >
          Mark submitted
        </button>
      ) : null}
      <div className="hidden h-8 w-px bg-ink/10 sm:block" aria-hidden />
      <p className="hidden text-xs text-ink/40 sm:block">
        Results update on the right after calculate
      </p>
    </div>
  );
}
