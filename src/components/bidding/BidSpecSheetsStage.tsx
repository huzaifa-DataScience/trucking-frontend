"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidSpecSheetsSection } from "@/components/bidding/BidSpecSheetsSection";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta, SpecSheet } from "@/lib/bidding/process-types";

const EMPTY_SPEC_SHEETS: SpecSheet[] = [];

/** Chrome tab after Setup — dropdown Spec sheet rules. */
export function BidSpecSheetsStage() {
  const {
    bid,
    draft,
    setField,
    setSpecSheets,
    saving,
    error,
    editable,
  } = useProcessDraft();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);

  useEffect(() => {
    void biddingApi.getProcessMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  if (!bid) return null;

  const sheets = (draft.specSheets as SpecSheet[] | undefined) ?? EMPTY_SPEC_SHEETS;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Spec sheets</h2>
          <p className="mt-0.5 text-sm text-ink/50">
            Which spec PDFs apply + allowed insulation rules before takeoff.
            Not the Mike Specs qty grid.
          </p>
          <p className="mt-1 text-xs text-ink/40">
            {saving ? "Saving…" : editable ? "Draft autosaves" : "Read only"}
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-tint/40 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <BidSpecSheetsSection
        sheets={sheets}
        insulationSpecs={draft.insulationSpecs}
        buyAmerican={draft.buyAmerican}
        meta={meta}
        editable={editable}
        showInsulationSpecs
        onSheetsChange={setSpecSheets}
        onInsulationSpecsChange={(next) => setField("insulationSpecs", next)}
        onBuyAmericanChange={(next) => setField("buyAmerican", next)}
      />
    </div>
  );
}
