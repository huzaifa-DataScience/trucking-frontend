"use client";

import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessLost } from "@/lib/bidding/process-types";

/** Gated Lost screen — only when workflow.showLost */
export function BidLostStage() {
  const {
    bid,
    draft,
    setField,
    saving,
    error,
    editable,
    inputClass,
    labelClass,
  } = useProcessDraft();

  if (!bid) return null;

  if (!bid.workflow?.showLost) {
    return (
      <div className="rounded-2xl border border-ink/[0.08] bg-surface p-6 text-sm text-ink/60">
        Lost form appears after Outcome is lost / no_bid / cancelled / postponed.
        Open the Outcome tab and pick one first.
      </div>
    );
  }

  const lost: ProcessLost = { ...(draft.lost ?? {}) };
  const setLost = (patch: Partial<ProcessLost>) => {
    setField("lost", { ...lost, ...patch });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Lost / no-bid</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Capture why we did not win. Difference auto-fills when both prices are
          present.
        </p>
        <p className="mt-1 text-xs text-ink/40">
          {saving ? "Saving…" : editable ? "Draft autosaves" : "Read only"}
        </p>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            className={inputClass}
            disabled={!editable}
            value={lost.date?.slice(0, 10) ?? ""}
            onChange={(e) => setLost({ date: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Reason</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={lost.reason ?? ""}
            onChange={(e) => setLost({ reason: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Awarded mechanical</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={lost.awardedMechanical ?? ""}
            onChange={(e) =>
              setLost({ awardedMechanical: e.target.value || null })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Awarded insulation</span>
          <input
            className={inputClass}
            disabled={!editable}
            value={lost.awardedInsulation ?? ""}
            onChange={(e) =>
              setLost({ awardedInsulation: e.target.value || null })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Winning price</span>
          <input
            type="number"
            className={inputClass}
            disabled={!editable}
            value={lost.winningPrice ?? ""}
            onChange={(e) =>
              setLost({
                winningPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Our final price</span>
          <input
            type="number"
            className={inputClass}
            disabled={!editable}
            value={lost.ourFinalPrice ?? ""}
            onChange={(e) =>
              setLost({
                ourFinalPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Difference</span>
          <input
            type="number"
            className={inputClass}
            disabled
            value={lost.difference ?? ""}
            readOnly
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(lost.possibleRebid)}
            onChange={(e) => setLost({ possibleRebid: e.target.checked })}
          />
          <span className="text-sm text-ink/80">Possible rebid</span>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            disabled={!editable}
            value={lost.notes ?? ""}
            onChange={(e) => setLost({ notes: e.target.value || null })}
          />
        </label>
      </section>
    </div>
  );
}
