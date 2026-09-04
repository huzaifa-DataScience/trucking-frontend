"use client";

import Link from "next/link";

/**
 * Specs ↔ Production — Mike track only.
 * FRONTEND_PRODUCTION_REPORT.md
 */
export function SpecsProductionTabNav({
  bidId,
  active,
  productionEnabled = true,
}: {
  bidId: string;
  active: "specs" | "production";
  productionEnabled?: boolean;
}) {
  const specsHref = `/bidding/${bidId}?stage=takeoff`;
  /** Standalone Mike Production detail — not the bid estimate chrome. */
  const productionHref = `/production/${bidId}`;

  const tabClass = (on: boolean, disabled = false) =>
    `inline-flex items-center rounded-xl px-4 py-2.5 text-sm transition ${
      disabled
        ? "cursor-not-allowed font-medium text-ink/30"
        : on
          ? "bg-brand font-semibold text-white shadow-[0_2px_8px_rgba(255,123,17,0.35)]"
          : "font-medium text-ink hover:bg-ink/[0.04]"
    }`;

  return (
    <div
      role="tablist"
      aria-label="Specs and production"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.08] bg-surface/80 p-2 shadow-[0_1px_3px_rgba(1,1,1,0.04)] backdrop-blur-sm"
    >
      <Link
        href={specsHref}
        role="tab"
        aria-selected={active === "specs"}
        className={tabClass(active === "specs")}
      >
        Specs
      </Link>
      {productionEnabled || active === "production" ? (
        <Link
          href={productionHref}
          role="tab"
          aria-selected={active === "production"}
          className={tabClass(active === "production")}
        >
          Production
        </Link>
      ) : (
        <span
          role="tab"
          aria-selected={false}
          aria-disabled
          title="Upload a Mike file and generate Specs first"
          className={tabClass(false, true)}
        >
          Production
        </span>
      )}
    </div>
  );
}
