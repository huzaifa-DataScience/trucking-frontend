"use client";

export type BidSheetTab = "sheet" | "files" | "company";

const TABS: { id: BidSheetTab; label: string }[] = [
  { id: "sheet", label: "Bidding sheet" },
  { id: "files", label: "Images / CSV" },
  { id: "company", label: "Company data" },
];

/** Section switcher — same chrome as `BidSheetToolbar` action bar. */
export function BidSheetTabNav({
  active,
  onChange,
  attachmentCount,
}: {
  active: BidSheetTab;
  onChange: (tab: BidSheetTab) => void;
  attachmentCount?: number;
}) {
  return (
    <div
      role="tablist"
      aria-label="Bid sheet sections"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.08] bg-surface/80 p-2 shadow-[0_1px_3px_rgba(1,1,1,0.04)] backdrop-blur-sm"
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        const badge =
          t.id === "files" && attachmentCount && attachmentCount > 0
            ? attachmentCount
            : null;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-45 ${
              isActive
                ? "bg-brand font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)]"
                : "font-medium text-ink hover:bg-ink/[0.04]"
            }`}
          >
            {t.label}
            {badge ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none ${
                  isActive ? "bg-white/25 text-white" : "bg-ink/[0.08] text-ink/50"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
