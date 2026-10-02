"use client";

export type BidSheetTab = "sheet" | "files" | "company";

const TABS: { id: BidSheetTab; label: string }[] = [
  { id: "sheet", label: "Bidding sheet" },
  { id: "files", label: "Images / CSV" },
  { id: "company", label: "Company data" },
];

/** Section switcher — muted compact chrome (matches Intake). */
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
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#d5dbe3] bg-white p-1.5"
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
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12.5px] transition disabled:opacity-45 ${
              isActive
                ? "bg-peach-fill font-semibold text-ink ring-1 ring-peach-border"
                : "font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
            }`}
          >
            {t.label}
            {badge ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none ${
                  isActive ? "bg-ink/80 text-white" : "bg-[#e5e7eb] text-[#6b7280]"
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
