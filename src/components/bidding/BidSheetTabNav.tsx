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
      className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]"
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
            className={`-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 pt-1 text-sm transition disabled:opacity-45 ${
              isActive
                ? "border-ink font-semibold text-ink"
                : "border-transparent font-medium text-ink/55 hover:text-ink"
            }`}
          >
            {t.label}
            {badge ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none ${
                  isActive ? "bg-ink text-white" : "bg-ink/[0.08] text-ink/50"
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
