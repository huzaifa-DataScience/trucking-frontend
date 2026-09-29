"use client";

function formatSavedAt(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.07] bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_-10px_rgba(1,1,1,0.2)] backdrop-blur-md">
        <p
          className={`mr-auto text-xs ${
            dirty ? "font-semibold text-amber-700" : "text-ink/45"
          }`}
        >
          {dirty ? (
            "Unsaved changes"
          ) : lastSavedAt ? (
            <>Saved {formatSavedAt(lastSavedAt)} · Totals on the right after you calculate</>
          ) : (
            <>Totals appear on the right after you calculate</>
          )}
        </p>
        <button
          type="button"
          onClick={onVerifyServer}
          disabled={saving}
          className="rounded-[10px] border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-brand/45 hover:text-[#c2410c] disabled:opacity-45"
          title="Run the server calculation to double-check the totals"
        >
          Verify on server
        </button>
        <button
          type="button"
          onClick={onPreview}
          disabled={!isEditable}
          className="rounded-[10px] border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-brand/45 hover:text-[#c2410c] disabled:opacity-45"
        >
          Preview calculate
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || (isEditable === false && status === "archived")}
          className="rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f26620] disabled:opacity-45"
        >
          {saving
            ? "Saving…"
            : isEditable
              ? "Save & calculate"
              : "Save cover sheet"}
        </button>
        {status === "draft" ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !isEditable}
            className="rounded-[10px] bg-ink px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-45"
          >
            Mark submitted
          </button>
        ) : null}
      </div>
    </div>
  );
}
