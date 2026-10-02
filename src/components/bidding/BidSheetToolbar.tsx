"use client";

function formatSavedAt(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Save / submit actions — muted compact chrome (matches Intake). */
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
        <div className="ml-auto max-w-xl rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-900">
          <p className="font-semibold">Server verify</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {serverVerifyWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-[#d5dbe3] bg-white p-1.5">
        <p className="hidden text-[11px] text-[#9ca3af] sm:mr-1 sm:block">
          {dirty ? (
            <span className="text-amber-700">Unsaved changes — click Save</span>
          ) : lastSavedAt ? (
            <>Saved {formatSavedAt(lastSavedAt)}</>
          ) : (
            <>Results update on the right after calculate</>
          )}
        </p>
        <div className="hidden h-7 w-px bg-[#e5e7eb] sm:block" aria-hidden />
        <button
          type="button"
          onClick={onPreview}
          disabled={!isEditable}
          className="rounded-md border border-[#cfd5dd] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563] hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#1f2937] disabled:opacity-45"
        >
          Preview calculate
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !isEditable}
          className="rounded-md border border-[#cfd5dd] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563] hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#1f2937] disabled:opacity-45"
        >
          {saving ? "Saving…" : "Save & calculate"}
        </button>
        {status === "draft" ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !isEditable}
            className="rounded-md border border-[#d9d4c8] bg-[#f3f1ea] px-2.5 py-1 text-[11px] font-semibold text-[#5a5340] hover:bg-[#ebe8df] disabled:opacity-45"
          >
            Mark submitted
          </button>
        ) : null}
        <button
          type="button"
          onClick={onVerifyServer}
          disabled={saving}
          className="rounded-md border border-[#cfd5dd] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563] hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#1f2937] disabled:opacity-45"
          title="Run legacy server engine for audit reconciliation"
        >
          Verify on server
        </button>
      </div>
    </div>
  );
}
