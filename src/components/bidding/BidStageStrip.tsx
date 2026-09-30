"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useBidSheet } from "@/contexts/BidSheetContext";
import {
  BID_HANDOFF_STAGES,
  type BidChromeStage,
  type BidWorkflow,
} from "@/lib/bidding/process-types";

type StageTone = "brand" | "award" | "lost";

type StageTab = {
  id: string;
  label: string;
  href: string;
  tone?: StageTone;
};

function toneClass(tone: StageTone): string {
  if (tone === "award") return "bg-emerald-600";
  if (tone === "lost") return "bg-ink";
  return "bg-brand";
}

/** Centered pill stage strip with a sliding active highlight. */
export function BidStageStrip({
  bidId,
  active,
  processStage: _processStage,
  workflow,
}: {
  bidId: string;
  active: BidChromeStage;
  processStage?: string | null;
  workflow?: BidWorkflow | null;
}) {
  const router = useRouter();
  const { confirmLeaveUnsaved } = useBidSheet();
  const showOutcome = workflow?.showOutcomeTab !== false;

  const tabs: StageTab[] = [
    ...BID_HANDOFF_STAGES.filter((s) => s.id !== "result" || showOutcome).map(
      (s) => ({
        id: s.id,
        label: s.label,
        href: `/bidding/${bidId}?stage=${s.id}`,
      })
    ),
    ...(workflow?.showAward
      ? ([
          {
            id: "award",
            label: "Awarded",
            href: `/bidding/${bidId}?stage=award`,
            tone: "award" as const,
          },
          {
            id: "production",
            label: "Production",
            href: `/production/${bidId}`,
          },
        ] satisfies StageTab[])
      : []),
    ...(workflow?.showLost
      ? ([
          {
            id: "lost",
            label: "Lost",
            href: `/bidding/${bidId}?stage=lost`,
            tone: "lost" as const,
          },
        ] satisfies StageTab[])
      : []),
  ];

  const [pendingId, setPendingId] = useState<string | null>(null);
  const highlightId = pendingId ?? active;
  const activeTone: StageTone =
    tabs.find((t) => t.id === highlightId)?.tone ?? "brand";

  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const measure = useCallback(() => {
    const list = listRef.current;
    const btn = btnRefs.current.get(highlightId);
    if (!list || !btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left,
      width: btnRect.width,
      ready: true,
    });
  }, [highlightId]);

  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, tabs.length]);

  useLayoutEffect(() => {
    const btn = btnRefs.current.get(highlightId);
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
    // Re-measure after scroll settles into view
    const t = window.setTimeout(measure, 320);
    return () => window.clearTimeout(t);
  }, [highlightId, measure]);

  useLayoutEffect(() => {
    setPendingId(null);
  }, [active]);

  const go = (tab: StageTab) => {
    if (tab.id === active && !pendingId) return;
    setPendingId(tab.id);
    void (async () => {
      if (!(await confirmLeaveUnsaved())) {
        setPendingId(null);
        return;
      }
      router.push(tab.href);
    })();
  };

  const highlightIndex = tabs.findIndex((t) => t.id === highlightId);
  const indicatorRound =
    highlightIndex <= 0
      ? "rounded-l-[10px] rounded-r-none"
      : highlightIndex >= tabs.length - 1
        ? "rounded-r-[10px] rounded-l-none"
        : "rounded-none";

  return (
    <nav aria-label="Bid workflow stages" className="w-full pb-1">
      <div className="w-full overflow-x-auto rounded-[12px] shadow-[0_8px_28px_-10px_rgba(1,1,1,0.22)]">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Bid stage"
          className="relative flex w-full min-w-max items-center justify-between bg-white p-1 sm:min-w-0"
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 top-1 bottom-1 shadow-[0_6px_16px_-4px_rgba(255,123,17,0.45)] transition-[transform,width,background-color,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${toneClass(activeTone)} ${indicatorRound} ${
              indicator.ready ? "opacity-100" : "opacity-0"
            }`}
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />

          {tabs.map((t, i) => {
            const isActive = highlightId === t.id;
            return (
              <div key={t.id} className="relative flex min-w-0 flex-1 items-center justify-center">
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 transition-opacity duration-200 ${
                      isActive || highlightId === tabs[i - 1]?.id
                        ? "opacity-0"
                        : "bg-ink/12 opacity-100"
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  ref={(el) => {
                    if (el) btnRefs.current.set(t.id, el);
                    else btnRefs.current.delete(t.id);
                  }}
                  onClick={() => go(t)}
                  className={`relative z-[1] inline-flex w-full items-center justify-center px-2.5 py-2 text-[12px] font-semibold transition-colors duration-200 sm:px-3 sm:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    isActive
                      ? "text-white"
                      : "text-ink/65 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
