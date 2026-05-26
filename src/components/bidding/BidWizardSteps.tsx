"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BidWizardStepId } from "@/lib/bidding/types";

const STEPS: { id: BidWizardStepId; label: string; short: string; path: string }[] = [
  { id: "startup", label: "Project startup", short: "Startup", path: "startup" },
  { id: "base-bid", label: "Base bid", short: "Base bid", path: "base-bid" },
  { id: "labor", label: "Labor & burden", short: "Labor", path: "labor" },
  { id: "review", label: "Review & proposal", short: "Review", path: "review" },
];

export function BidWizardSteps({ bidId }: { bidId: string }) {
  const pathname = usePathname();
  const current = pathname.split("/").pop() ?? "startup";

  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-2xl border border-ink/[0.08] bg-surface p-1.5 shadow-[0_1px_2px_rgba(1,1,1,0.04)]"
      aria-label="Bid wizard steps"
    >
      {STEPS.map((step, i) => {
        const active = current === step.path;
        const done =
          STEPS.findIndex((s) => s.path === current) > i ||
          (current === "review" && step.path !== "review");
        const href = `/bidding/${bidId}/${step.path}`;

        return (
          <div key={step.id} className="flex items-center">
            {i > 0 ? (
              <span className="mx-0.5 hidden h-px w-4 bg-ink/10 sm:block" aria-hidden />
            ) : null}
            <Link
              href={href}
              className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-ink text-white shadow-sm"
                  : done
                    ? "text-ink/70 hover:bg-ink/[0.04]"
                    : "text-ink/45 hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : done
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-ink/[0.06] text-ink/40 group-hover:bg-ink/10"
                }`}
              >
                {done && !active ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
