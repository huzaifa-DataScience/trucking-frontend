"use client";

import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessLost } from "@/lib/bidding/process-types";

/** Gated Lost screen — only when workflow.showLost */
export function BidLostStage() {
  const { bid, draft, setField, saving, dirty, error, editable } = useProcessDraft();

  if (!bid) return null;

  if (!bid.workflow?.showLost) {
    return (
      <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        <div className="intake-section">
          <div className="intake-section-body text-[12.5px] text-[#4b5563]">
            Lost form appears after Outcome is lost / no_bid / cancelled / postponed. Open the
            Outcome tab and pick one first.
          </div>
        </div>
      </div>
    );
  }

  const lost: ProcessLost = { ...(draft.lost ?? {}) };
  const setLost = (patch: Partial<ProcessLost>) => {
    setField("lost", { ...lost, ...patch });
  };

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header>
        <h2 className="intake-title">Lost / no-bid</h2>
        <p className="mt-1 text-[11px] text-[#9ca3af]">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : editable
                ? "Save to keep changes"
                : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="intake-section min-w-0">
        <div className="intake-section-head">Loss details</div>
        <div className="intake-section-body">
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-2 max-[700px]:grid-cols-1">
            <label className="intake-row">
              <span className="intake-label">Date</span>
              <input
                type="date"
                className="intake-field"
                disabled={!editable}
                value={lost.date?.slice(0, 10) ?? ""}
                onChange={(e) => setLost({ date: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Reason</span>
              <input
                className="intake-field"
                disabled={!editable}
                value={lost.reason ?? ""}
                onChange={(e) => setLost({ reason: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Awarded mechanical</span>
              <input
                className="intake-field"
                disabled={!editable}
                value={lost.awardedMechanical ?? ""}
                onChange={(e) => setLost({ awardedMechanical: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Awarded insulation</span>
              <input
                className="intake-field"
                disabled={!editable}
                value={lost.awardedInsulation ?? ""}
                onChange={(e) => setLost({ awardedInsulation: e.target.value || null })}
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Winning price</span>
              <input
                type="number"
                className="intake-field"
                disabled={!editable}
                value={lost.winningPrice ?? ""}
                onChange={(e) =>
                  setLost({
                    winningPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Our final price</span>
              <input
                type="number"
                className="intake-field"
                disabled={!editable}
                value={lost.ourFinalPrice ?? ""}
                onChange={(e) =>
                  setLost({
                    ourFinalPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="intake-row">
              <span className="intake-label">Difference</span>
              <input
                type="number"
                className="intake-field"
                disabled
                value={lost.difference ?? ""}
                readOnly
              />
            </label>
            <label className="flex items-center gap-2 self-center text-[12.5px] text-[#374151]">
              <input
                type="checkbox"
                disabled={!editable}
                checked={Boolean(lost.possibleRebid)}
                onChange={(e) => setLost({ possibleRebid: e.target.checked })}
              />
              <span className="font-medium">Possible rebid</span>
            </label>
            <label className="intake-row col-span-full">
              <span className="intake-label">Notes</span>
              <textarea
                className="intake-field min-h-[4.5rem] w-full"
                disabled={!editable}
                value={lost.notes ?? ""}
                onChange={(e) => setLost({ notes: e.target.value || null })}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
