"use client";

function formatSavedAt(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Save / submit actions — pinned to the bottom of the bid sheet page. */
export function BidSheetToolbar({
  isEditable,
  saving,
  dirty,
  lastSavedAt,
  status,
  serverVerifyWarnings,
  onPreview,
  onSave,
  onSubmit,
  onVerifyServer,
}: {
  isEditable: boolean;
  saving: boolean;
  dirty?: boolean;
  lastSavedAt?: Date | null;
  status: string;
  serverVerifyWarnings?: string[];
  onPreview: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onVerifyServer: () => void;
}) {
  return (
    <div className="space-y-2">
      {serverVerifyWarnings && serverVerifyWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
          <p className="font-semibold">Server verify</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {serverVerifyWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
        <button
          type="button"
          onClick={onVerifyServer}
          disabled={saving}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.04] disabled:opacity-45"
          title="Run legacy server engine for audit reconciliation"
        >
          Verify on server
        </button>
        <div className="hidden h-8 w-px bg-ink/10 sm:block" aria-hidden />
        <p className="hidden text-xs text-ink/40 sm:block">
          {dirty ? (
            <span className="text-amber-700">Unsaved changes — auto-saving…</span>
          ) : lastSavedAt ? (
            <>Saved {formatSavedAt(lastSavedAt)}</>
          ) : (
            <>Results update on the right after calculate</>
          )}
        </p>
      </div>
    </div>
  );
}
