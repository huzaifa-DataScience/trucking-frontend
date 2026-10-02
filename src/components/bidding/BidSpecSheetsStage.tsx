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
    dirty,
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
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header>
        <h2 className="intake-title">Spec sheets</h2>
        <p className="intake-sub mt-0.5">
          Which spec PDFs apply + allowed insulation rules before takeoff.
          Not the Mike Specs qty grid.
        </p>
        <p className="intake-sub mt-0.5">
          {saving ? "Saving…" : dirty ? "Unsaved changes" : editable ? "Save to keep changes" : "Read only"}
        </p>
      </header>

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <BidSpecSheetsSection
        sheets={sheets}
        insulationSpecs={draft.insulationSpecs}
        buyAmerican={draft.buyAmerican}
        aPlus={draft.aPlus}
        meta={meta}
        editable={editable}
        showInsulationSpecs
        onSheetsChange={setSpecSheets}
        onInsulationSpecsChange={(next) => setField("insulationSpecs", next)}
        onBuyAmericanChange={(next) => setField("buyAmerican", next)}
        onAPlusChange={(next) => setField("aPlus", next)}
      />
    </div>
  );
}
