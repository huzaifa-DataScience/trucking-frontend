"use client";

export function BidSheetAlerts({
  error,
  warnings,
  hasComputed,
  isEditable,
  status,
  saving,
  onReopen,
}: {
  error: string | null;
  warnings: string[];
  hasComputed: boolean;
  isEditable: boolean;
  status: string;
  saving: boolean;
  onReopen: () => void;
}) {
  if (!error && warnings.length === 0 && hasComputed && isEditable) return null;

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div
          className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-semibold">Check system columns (Excel rows 19–21)</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-800/90">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasComputed ? (
        <div className="rounded-lg border border-dashed border-[#d9d4c8] bg-[#f3f1ea]/50 px-4 py-3 text-[13px] text-[#4b5563]">
          Fill the form, then <strong className="text-[#1f2937]">Preview calculate</strong> — live totals
          appear in the results panel.
        </div>
      ) : null}

      {!isEditable ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d5dbe3] bg-[#f3f4f6]/60 px-4 py-3 text-[13px] text-[#4b5563]">
          <span>
            Bid is <strong className="text-[#1f2937]">{status}</strong> — inputs locked.
          </span>
          <button
            type="button"
            onClick={onReopen}
            disabled={saving}
            className="rounded-md border border-[#d9d4c8] bg-[#f3f1ea] px-3 py-1.5 text-[12px] font-medium text-[#333333] hover:bg-[#ebe8df] disabled:opacity-50"
          >
            Reopen as draft
          </button>
        </div>
      ) : null}
    </div>
  );
}
