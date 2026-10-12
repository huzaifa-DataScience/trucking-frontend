"use client";

export type BidSheetTab = "letter" | "sheet" | "files" | "company";

const TABS: { id: BidSheetTab; label: string }[] = [
  { id: "letter", label: "Proposal letter" },
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
                ? "bg-[#f3f1ea] font-semibold text-[#333333] ring-1 ring-[#d9d4c8]"
                : "font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
            }`}
          >
            {t.label}
            {badge ? (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none ${
                  isActive ? "bg-white/80 text-[#333333]" : "bg-[#e5e7eb] text-[#6b7280]"
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
