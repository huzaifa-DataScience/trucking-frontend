"use client";

import { useState } from "react";

/** Copy from FRONTEND_MIKE_RULES.md — Mike stacking only */
const MIKE_RULES = [
  {
    id: "one-takeoff",
    title: "One takeoff per bid",
    body: "All Mike CSVs on a bid append into one takeoff. Qty Est and Hours use every Mike row on the bid.",
  },
  {
    id: "match-modes",
    title: "Pipe vs Roll",
    body: "Pipe materials stack by size × thickness × material family. Roll materials (Duct Wrap) stack by thickness × family × weight × facing — size is ignored.",
  },
  {
    id: "roll-stack",
    title: "Roll stacking",
    body: "For roll lines, different duct sizes with the same thick, wt, and facing merge into one Spec line. Many size rows with the same Qty Est means Specs need Regenerate.",
  },
  {
    id: "pipe-stack",
    title: "Pipe stacking",
    body: "For pipe lines, Mike quantities add when size, thickness, and material family match.",
  },
  {
    id: "qty-est",
    title: "Qty Estimated",
    body: "Qty Estimated is the sum of Mike quantities in that Spec stack. The UI only displays the API value.",
  },
  {
    id: "hours-pph",
    title: "Hours & Production / Hour",
    body: "Hours Mike = sum of Mike hours in the stack. Production / Hour = total qty ÷ total hours for that stack.",
  },
  {
    id: "phrase-map",
    title: "Mike material phrases",
    body: "Short Mike phrases are mapped automatically (e.g. Ductwrap and 2 3# FSK → Duct Wrap roll; bare Fiberglass → Fiberglass with ASJ; FoamGlas w/ ASJ → Foamglas + ASJ, not Fiberglass).",
  },
  {
    id: "wt-facing",
    title: "Weight & facing (rolls)",
    body: "On roll lines, density (wt) and facing (e.g. FSK) define the stack. Different wt or facing = different Spec lines.",
  },
  {
    id: "type-order",
    title: "Type order",
    body: "Auto Spec lines prefer order Duct → HVAC → Plumbing when discipline is known from Mike.",
  },
  {
    id: "regenerate",
    title: "Regenerate after Mike changes",
    body: "After new Mike uploads, Specs auto-rebuild. Use Regenerate Specs if the grid looks stale.",
  },
  {
    id: "zero-qty",
    title: "Zero Qty Est",
    body: "Zero Qty Est means no Mike match for that size/insulation (or roll wt/facing). Check the Spec fields or regenerate.",
  },
  {
    id: "decimals",
    title: "Decimals",
    body: "Show qty, hours, and PPH with 2 decimal places.",
  },
  {
    id: "wt-null",
    title: "Wt on pipe",
    body: "Pipe Specs usually have no weight (null). Show a dash — never leave the Wt placeholder text in the cell. Roll lines can show density like 0.75 or 3.",
  },
  {
    id: "recv-not-mike",
    title: "Recv zeros vs Mike",
    body: "Recv and Hrs @ Recv at 0 mean Trimble has no match yet. If Qty Est and Hrs Mike are filled, Mike is fine — that is not a takeoff bug.",
  },
] as const;

/**
 * Specs Rules side panel — FRONTEND_MIKE_RULES.md
 */
export function MikeRulesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(MIKE_RULES[0]?.id ?? null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Close rules"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mike-rules-title"
        className="flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/[0.06] px-5 py-4">
          <div>
            <h2
              id="mike-rules-title"
              className="text-lg font-semibold text-ink"
            >
              Mike rules
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              How Qty Est, Hours, and stacking work. Numbers come from the API —
              do not recalculate in the browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ink/50 hover:bg-canvas hover:text-ink"
          >
            Close
          </button>
        </header>

        <div className="ui-scroll-light min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 rounded-xl border border-ink/[0.06] bg-canvas/50 px-3 py-2 text-[11px] text-ink/50">
            Tip: Regenerate Specs after a new Mike upload so stacks refresh.
          </p>
          <ul className="space-y-2">
            {MIKE_RULES.map((rule) => {
              const expanded = openId === rule.id;
              return (
                <li
                  key={rule.id}
                  className="rounded-xl border border-ink/[0.08] bg-canvas/30"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId(expanded ? null : rule.id)
                    }
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="text-sm font-semibold text-ink">
                      {rule.title}
                    </span>
                    <span className="text-ink/40" aria-hidden>
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                  {expanded ? (
                    <p className="border-t border-ink/[0.06] px-3 py-2.5 text-sm leading-relaxed text-ink/65">
                      {rule.body}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
