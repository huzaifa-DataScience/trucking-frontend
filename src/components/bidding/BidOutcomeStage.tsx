"use client";

import Link from "next/link";
import { useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  formatOutcome,
  type ProcessOutcome,
} from "@/lib/bidding/process-types";

const CHOICES: {
  value: ProcessOutcome;
  label: string;
  hint: string;
  tone: "win" | "lose" | "neutral";
}[] = [
  {
    value: "awarded",
    label: "Awarded (win)",
    hint: "Opens Post → Awarded / startup",
    tone: "win",
  },
  {
    value: "lost",
    label: "Lost",
    hint: "Opens Post → Lost form",
    tone: "lose",
  },
  {
    value: "no_bid",
    label: "No bid",
    hint: "Opens Post → Lost form",
    tone: "lose",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    hint: "Opens Post → Lost form",
    tone: "neutral",
  },
  {
    value: "postponed",
    label: "Postponed",
    hint: "Opens Post → Lost form",
    tone: "neutral",
  },
];

/**
 * Pre tab 7 — Outcome. Changeable anytime (until archived).
 * Not a header one-shot. BIDDING_FRONTEND_API §0.
 */
export function BidOutcomeStage() {
  const { bid, canWrite, refresh } = useBidSheet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bid) return null;

  const current = (bid.outcomeStatus ||
    bid.process?.outcome ||
    bid.workflow?.outcome ||
    "open") as string;
  const editable =
    canWrite &&
    bid.status !== "archived" &&
    bid.workflow?.outcomeEditable !== false;

  const pick = async (next: ProcessOutcome) => {
    if (!editable || next === current) return;
    setBusy(true);
    setError(null);
    try {
      await biddingApi.setBidOutcome(bid.id, { outcome: next });
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to set outcome"));
    } finally {
      setBusy(false);
    }
  };

  const clearOpen = async () => {
    if (!editable || current === "open") return;
    setBusy(true);
    setError(null);
    try {
      await biddingApi.setBidOutcome(bid.id, { outcome: "open" });
      await refresh();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to clear outcome"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header>
        <h2 className="intake-title">Outcome</h2>
        <p className="intake-sub mt-0.5">
          Last Pre step. Pick win / lose — change anytime. Post Awarded or Lost follows the{" "}
          <span className="font-medium text-[#1f2937]">current</span> pick; saved fields are not
          deleted.
        </p>
        <p className="mt-1.5 text-[12.5px] text-[#4b5563]">
          Current:{" "}
          <span className="font-semibold text-[#1f2937]">{formatOutcome(current)}</span>
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="intake-section min-w-0">
        <div className="intake-section-head">Select outcome</div>
        <div className="intake-section-body">
          <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {CHOICES.map((c) => {
              const on = current === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={!editable || busy}
                  onClick={() => void pick(c.value)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                    on
                      ? c.tone === "win"
                        ? "border-emerald-600/70 bg-emerald-50"
                        : c.tone === "lose"
                          ? "border-[#94a3b8] bg-[#f3f4f6]"
                          : "border-[#d9d4c8] bg-[#f3f1ea]"
                      : "border-[#d5dbe3] bg-white hover:border-[#94a3b8]"
                  }`}
                >
                  <span className="block text-[12.5px] font-semibold text-[#1f2937]">
                    {c.label}
                    {on ? " ✓" : ""}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#6b7280]">{c.hint}</span>
                </button>
              );
            })}
          </div>

          {current !== "open" ? (
            <button
              type="button"
              disabled={!editable || busy}
              onClick={() => void clearOpen()}
              className="mt-3 text-[11px] font-medium text-[#6b7280] underline-offset-2 hover:text-[#1f2937] hover:underline disabled:opacity-40"
            >
              Clear back to Open
            </button>
          ) : null}
        </div>
      </section>

      {(bid.workflow?.showAward || bid.workflow?.showLost) && (
        <div className="flex flex-wrap items-center gap-2">
          {bid.workflow?.showAward ? (
            <Link
              href={`/bidding/${bid.id}?stage=award`}
              className="intake-head-btn bg-[#f3f1ea] text-[#5a5340]"
            >
              Open Awarded / startup →
            </Link>
          ) : null}
          {bid.workflow?.showLost ? (
            <Link href={`/bidding/${bid.id}?stage=lost`} className="intake-head-btn">
              Open Lost form →
            </Link>
          ) : null}
        </div>
      )}

      <p className="text-[11px] text-[#9ca3af]">
        Complete &amp; Hand Off is off on this tab — change outcome here instead.
      </p>
    </div>
  );
}
