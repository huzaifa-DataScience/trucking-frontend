"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  icon: ReactNode;
}[] = [
  {
    value: "awarded",
    label: "Awarded (win)",
    hint: "Opens Post → Awarded / startup",
    tone: "win",
    icon: <TrophyIcon />,
  },
  {
    value: "lost",
    label: "Lost",
    hint: "Opens Post → Lost form",
    tone: "lose",
    icon: <XCircleIcon />,
  },
  {
    value: "no_bid",
    label: "No bid",
    hint: "Opens Post → Lost form",
    tone: "lose",
    icon: <BanIcon />,
  },
  {
    value: "cancelled",
    label: "Cancelled",
    hint: "Opens Post → Lost form",
    tone: "neutral",
    icon: <MinusCircleIcon />,
  },
  {
    value: "postponed",
    label: "Postponed",
    hint: "Opens Post → Lost form",
    tone: "neutral",
    icon: <CalendarIcon />,
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
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <section className="w-full rounded-2xl border border-ink/[0.07] bg-white px-7 py-8 sm:px-10 sm:py-10">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Outcome
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-ink/45">
            Last Pre step. Pick win / lose — change anytime. Post Awarded or Lost
            follows the <span className="font-medium text-ink">current</span>{" "}
            pick; saved fields are not deleted.
          </p>
          <p className="mt-4 text-[15px] text-ink/70">
            Current:{" "}
            <span className="font-semibold text-ink">
              {formatOutcome(current)}
            </span>
          </p>
        </header>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CHOICES.map((c) => {
            const on = current === c.value;
            return (
              <button
                key={c.value}
                type="button"
                disabled={!editable || busy}
                onClick={() => void pick(c.value)}
                className={`relative flex min-h-[120px] items-start gap-4 rounded-2xl border px-5 py-5 text-left transition disabled:opacity-50 ${
                  on
                    ? "border-brand bg-brand/[0.06] shadow-[0_0_0_1px_rgba(255,123,17,0.25)]"
                    : "border-ink/[0.08] bg-white hover:border-ink/18 hover:bg-[#fafafa]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    on
                      ? "bg-brand/15 text-brand"
                      : c.tone === "lose" && c.value === "lost"
                        ? "bg-red-50 text-red-500"
                        : "bg-[#f0f1f4] text-ink/45"
                  }`}
                >
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1 pr-16">
                  <span className="block text-base font-semibold tracking-tight text-ink">
                    {c.label}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-snug text-ink/45">
                    {c.hint}
                  </span>
                </span>
                <span
                  className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.05em] ${
                    c.tone === "win"
                      ? "bg-emerald-50 text-emerald-700"
                      : c.tone === "lose"
                        ? "bg-red-50 text-red-600"
                        : "bg-[#f0f1f4] text-ink/50"
                  }`}
                >
                  {c.tone === "win" ? "Win" : c.tone === "lose" ? "Lose" : "Other"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          {current !== "open" ? (
            <button
              type="button"
              disabled={!editable || busy}
              onClick={() => void clearOpen()}
              className="text-sm font-medium text-ink/45 underline-offset-2 hover:text-ink hover:underline disabled:opacity-40"
            >
              Clear back to Open
            </button>
          ) : null}
          {bid.workflow?.showAward ? (
            <Link
              href={`/bidding/${bid.id}?stage=award`}
              className="inline-flex rounded-xl bg-[#047857] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Open Awarded / startup →
            </Link>
          ) : null}
          {bid.workflow?.showLost ? (
            <Link
              href={`/bidding/${bid.id}?stage=lost`}
              className="inline-flex rounded-xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/25"
            >
              Open Lost form →
            </Link>
          ) : null}
        </div>

        <p className="mt-6 text-sm text-ink/40">
          Complete &amp; Hand Off is off on this tab — change outcome here
          instead.
        </p>
      </section>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6H5a3 3 0 0 0 3 3M17 6h2a3 3 0 0 1-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6 18.4 18.4" strokeLinecap="round" />
    </svg>
  );
}

function MinusCircleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
