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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header>
        <h2 className="text-base font-semibold text-ink">Outcome</h2>
        <p className="mt-0.5 text-sm text-ink/50">
          Last Pre step. Pick win / lose — change anytime. Post Awarded or Lost
          follows the <span className="font-medium text-ink">current</span>{" "}
          pick; saved fields are not deleted.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Current:{" "}
          <span className="font-semibold text-ink">
            {formatOutcome(current)}
          </span>
        </p>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {CHOICES.map((c) => {
          const on = current === c.value;
          return (
            <button
              key={c.value}
              type="button"
              disabled={!editable || busy}
              onClick={() => void pick(c.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition disabled:opacity-50 ${
                on
                  ? c.tone === "win"
                    ? "border-emerald-600 bg-emerald-50"
                    : c.tone === "lose"
                      ? "border-ink/40 bg-ink/[0.04]"
                      : "border-brand bg-brand/5"
                  : "border-ink/[0.08] bg-surface hover:border-ink/20"
              }`}
            >
              <span className="block text-sm font-semibold text-ink">
                {c.label}
                {on ? " ✓" : ""}
              </span>
              <span className="mt-0.5 block text-xs text-ink/50">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {current !== "open" ? (
        <button
          type="button"
          disabled={!editable || busy}
          onClick={() => void clearOpen()}
          className="w-fit text-xs font-medium text-ink/50 underline-offset-2 hover:text-ink hover:underline disabled:opacity-40"
        >
          Clear back to Open
        </button>
      ) : null}

      {bid.workflow?.showAward ? (
        <Link
          href={`/bidding/${bid.id}?stage=award`}
          className="inline-flex w-fit rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Open Awarded / startup →
        </Link>
      ) : null}
      {bid.workflow?.showLost ? (
        <Link
          href={`/bidding/${bid.id}?stage=lost`}
          className="inline-flex w-fit rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
        >
          Open Lost form →
        </Link>
      ) : null}

      <p className="text-xs text-ink/40">
        Complete &amp; Hand Off is off on this tab — change outcome here instead.
      </p>
    </div>
  );
}
