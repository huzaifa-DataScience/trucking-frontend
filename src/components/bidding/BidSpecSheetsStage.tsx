"use client";

import { useEffect, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { BidHubFiles } from "@/components/bidding/BidHubFiles";
import { BidSpecSheetsSection } from "@/components/bidding/BidSpecSheetsSection";
import { TogalProjectBar } from "@/components/bidding/TogalPanels";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import type { ProcessMeta, SpecSheet } from "@/lib/bidding/process-types";

const EMPTY_SPEC_SHEETS: SpecSheet[] = [];

/** Chrome tab after Setup — dropdown Spec sheet rules. */
export function BidSpecSheetsStage() {
  const {
    bid,
    draft,
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
    <div className="intake-compact flex min-h-0 flex-1 flex-col gap-4 overflow-auto sm:gap-6">
      <header>
        <h2 className="intake-title">Spec sheets</h2>
        <p className="intake-sub">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : editable
                ? "Save to keep changes"
                : "Read only"}
        </p>
      </header>

      <TogalProjectBar />

      {error ? (
        <p className="rounded border border-danger/25 bg-danger-tint/40 px-3 py-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      <BidHubFiles
        title="Specs / manuals"
        attachments={(bid.attachments ?? []).filter((a) => a.label === "specifications")}
      />

      <BidSpecSheetsSection
        sheets={sheets}
        meta={meta}
        editable={editable}
        onSheetsChange={setSpecSheets}
      />
    </div>
  );
}
