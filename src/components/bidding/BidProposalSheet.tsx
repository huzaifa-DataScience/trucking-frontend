"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useProcessDraft } from "@/hooks/useProcessDraft";
import { useBidSheet } from "@/contexts/BidSheetContext";
import type { ProcessMeta, ProposalSheet, ProposalSheetCopy } from "@/lib/bidding/process-types";
import {
  boilerplateLines,
  bucketDefs,
  emptyCopy,
  exceptionDefs,
  formatProposalMoney,
  hydrateProposalSheetFromBid,
  letterheadForEntity,
  lumpTotal,
  normalizeProposalSheet,
  showCertPage,
} from "@/lib/bidding/proposal-sheet";
import { BidProposalLetter } from "@/components/bidding/BidProposalLetter";
import {
  INTAKE_ADD_BTN,
  INTAKE_REMOVE_BTN,
  PlusIcon,
  TrashIcon,
} from "@/components/bidding/intakeIcons";

function moneyInput(raw: string): number | null {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Proposal letter editor + print preview — FRONTEND_PROPOSAL.md */
export function BidProposalSheet() {
  const { bid, draft, setField, editable } = useProcessDraft();
  const { lookups } = useBidSheet();
  const [meta, setMeta] = useState<ProcessMeta | null>(null);
  const [previewCopyId, setPreviewCopyId] = useState<string | "sheet">("sheet");
  const hydratedBidId = useRef<string | null>(null);

  useEffect(() => {
    void biddingApi
      .getProcessMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const sheet = useMemo(
    () => normalizeProposalSheet(draft.proposalSheet, meta),
    [draft.proposalSheet, meta]
  );
  const buckets = useMemo(() => bucketDefs(meta), [meta]);
  const exDefs = useMemo(() => exceptionDefs(meta), [meta]);
  const boilerplate = useMemo(() => boilerplateLines(meta), [meta]);
  const cert = showCertPage(meta);

  const entityLabel =
    lookups.ourEntities.find((e) => e.id === bid?.ourEntityId)?.name ||
    bid?.companyName ||
    "—";
  const estimatorLabel =
    draft.assignment?.assistantEstimator ||
    draft.assignment?.captain ||
    "—";
  const letterhead = useMemo(
    () => letterheadForEntity(entityLabel, meta),
    [entityLabel, meta]
  );

  const applyHydration = () => {
    if (!bid || !editable) return;
    const normalized = normalizeProposalSheet(draft.proposalSheet, meta);
    const { sheet: filled, changed } = hydrateProposalSheetFromBid(
      normalized,
      draft.proposalSheet,
      bid,
      draft,
      meta
    );
    if (changed) {
      setField("proposalSheet", normalizeProposalSheet(filled, meta));
    }
  };

  // Auto-fill empty cover / prices / copies once per bid from intake + calculator.
  useEffect(() => {
    if (!bid || !meta || !editable) return;
    if (hydratedBidId.current === bid.id) return;
    hydratedBidId.current = bid.id;
    applyHydration();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per bid id
  }, [bid?.id, meta, editable]);

  const patchSheet = (partial: Partial<ProposalSheet>) => {
    const next = normalizeProposalSheet({ ...sheet, ...partial }, meta);
    setField("proposalSheet", next);
  };

  const updateLine = (bucket: string, field: "systems" | "quantity" | "price", value: string) => {
    const lines = (sheet.lines ?? []).map((line) => {
      if (line.bucket !== bucket) return line;
      if (field === "price") return { ...line, price: moneyInput(value) };
      return { ...line, [field]: value };
    });
    patchSheet({ lines });
  };

  const updateAlternate = (
    index: number,
    field: "description" | "quantity" | "price",
    value: string
  ) => {
    const alternates = [...(sheet.alternates ?? [])];
    const row = { ...(alternates[index] ?? {}) };
    if (field === "price") row.price = moneyInput(value);
    else row[field] = value;
    alternates[index] = row;
    patchSheet({ alternates });
  };

  const setException = (key: string, included: boolean | null) => {
    const exceptions = (sheet.exceptions ?? []).map((row) =>
      row.key === key ? { ...row, included } : row
    );
    if (!exceptions.some((r) => r.key === key)) {
      exceptions.push({ key, included });
    }
    patchSheet({ exceptions });
  };

  const updateCopy = (id: string, patch: Partial<ProposalSheetCopy>) => {
    const copies = (sheet.copies ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c));
    patchSheet({ copies });
  };

  const addCopy = () => {
    const copies = [...(sheet.copies ?? []), emptyCopy()];
    patchSheet({ copies });
    const last = copies[copies.length - 1];
    if (last) setPreviewCopyId(last.id);
  };

  const removeCopy = (id: string) => {
    const copies = (sheet.copies ?? []).filter((c) => c.id !== id);
    patchSheet({ copies });
    if (previewCopyId === id) setPreviewCopyId("sheet");
  };

  const previewCopy =
    previewCopyId === "sheet"
      ? null
      : (sheet.copies ?? []).find((c) => c.id === previewCopyId) ?? null;

  if (!bid) return null;

  const masterTotal = lumpTotal(
    sheet,
    buckets.map((b) => b.value),
    null
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="intake-section min-w-0">
        <div className="intake-section-head-bar">
          <h3 className="text-[13px] font-semibold text-ink">Proposal letter</h3>
          {editable ? (
            <button
              type="button"
              className="intake-head-btn"
              onClick={() => applyHydration()}
              title="Fill empty fields from intake, assignment, wage, GCs, and calculator systems"
            >
              Fill from bid
            </button>
          ) : null}
        </div>
        <div className="intake-section-body flex flex-col gap-1 text-[12.5px] text-ink/55">
          <p>
            Client-facing letter for {letterhead.companyName}. Empty cover fields, recipient copies,
            and bucket prices auto-fill from intake / assignment / calculator — then you edit. Print
            preview matches the Goel/DCB package.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="intake-section min-w-0">
            <h3 className="intake-section-head">Cover</h3>
            <div className="intake-section-body grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <ReadOnly label="Estimate #" value={bid.estimateNumber} />
              <ReadOnly label="Bid name" value={bid.bidName || "—"} />
              <ReadOnly label="Our company" value={entityLabel} />
              <ReadOnly label="Estimator" value={estimatorLabel} />
              {(
                [
                  ["revision", "Revision"],
                  ["proposalDate", "Proposal date"],
                  ["drawings", "Drawings"],
                  ["specifications", "Specifications"],
                  ["wageScale", "Wage scale"],
                  ["addenda", "Addenda"],
                  ["mechanicalDesigner", "Mechanical designer"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-ink/45">{label}</span>
                  <input
                    className="intake-field w-full"
                    disabled={!editable}
                    value={String(sheet[key] ?? "")}
                    onChange={(e) => patchSheet({ [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="intake-section min-w-0">
            <h3 className="intake-section-head">Breakdown</h3>
            <div className="intake-section-body overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-ink/10 text-[11px] text-ink/45">
                    <th className="py-1.5 pr-2 font-medium">Bucket</th>
                    <th className="py-1.5 pr-2 font-medium">Systems</th>
                    <th className="py-1.5 pr-2 font-medium">Qty</th>
                    <th className="py-1.5 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => {
                    const line =
                      (sheet.lines ?? []).find((l) => l.bucket === b.value) ?? {
                        bucket: b.value,
                        systems: "",
                        quantity: "",
                        price: null,
                      };
                    return (
                      <tr key={b.value} className="border-b border-ink/[0.06]">
                        <td className="py-1.5 pr-2 align-top font-medium text-ink">{b.label}</td>
                        <td className="py-1.5 pr-2">
                          <input
                            className="intake-field w-full min-w-[6rem]"
                            disabled={!editable}
                            value={line.systems ?? ""}
                            onChange={(e) => updateLine(b.value, "systems", e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            className="intake-field w-full min-w-[3.5rem]"
                            disabled={!editable}
                            value={line.quantity ?? ""}
                            onChange={(e) => updateLine(b.value, "quantity", e.target.value)}
                          />
                        </td>
                        <td className="py-1.5">
                          <input
                            className="intake-field w-full min-w-[4.5rem]"
                            disabled={!editable}
                            inputMode="decimal"
                            value={line.price ?? ""}
                            onChange={(e) => updateLine(b.value, "price", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[12px] font-semibold text-ink">
                Lump total: {formatProposalMoney(masterTotal)}
              </p>
            </div>
          </section>

          <section className="intake-section min-w-0">
            <div className="intake-section-head-bar">
              <h3 className="text-[13px] font-semibold text-ink">Alternates</h3>
              {editable ? (
                <button
                  type="button"
                  className={INTAKE_ADD_BTN}
                  onClick={() =>
                    patchSheet({
                      alternates: [
                        ...(sheet.alternates ?? []),
                        { description: "", quantity: null, price: null },
                      ],
                    })
                  }
                >
                  <PlusIcon />
                  Add
                </button>
              ) : null}
            </div>
            <div className="intake-section-body flex flex-col gap-2">
              {(sheet.alternates ?? []).length === 0 ? (
                <p className="text-[12.5px] text-ink/45">None — not in the lump total above.</p>
              ) : (
                (sheet.alternates ?? []).map((alt, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1fr)_5rem_5.5rem_auto] items-center gap-2"
                  >
                    <input
                      className="intake-field w-full"
                      disabled={!editable}
                      placeholder="Description"
                      value={alt.description ?? ""}
                      onChange={(e) => updateAlternate(i, "description", e.target.value)}
                    />
                    <input
                      className="intake-field w-full"
                      disabled={!editable}
                      placeholder="Qty"
                      value={alt.quantity ?? ""}
                      onChange={(e) => updateAlternate(i, "quantity", e.target.value)}
                    />
                    <input
                      className="intake-field w-full"
                      disabled={!editable}
                      placeholder="Price"
                      inputMode="decimal"
                      value={alt.price ?? ""}
                      onChange={(e) => updateAlternate(i, "price", e.target.value)}
                    />
                    {editable ? (
                      <button
                        type="button"
                        className={INTAKE_REMOVE_BTN}
                        aria-label="Remove alternate"
                        onClick={() =>
                          patchSheet({
                            alternates: (sheet.alternates ?? []).filter((_, j) => j !== i),
                          })
                        }
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          {exDefs.length > 0 ? (
            <section className="intake-section min-w-0">
              <h3 className="intake-section-head">Exception report</h3>
              <div className="intake-section-body flex flex-col gap-1.5">
                <div className="mb-1 grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                  <span>Item</span>
                  <span className="text-center">Incl.</span>
                  <span className="text-center">Not incl.</span>
                </div>
                {exDefs.map((ex) => {
                  const row = (sheet.exceptions ?? []).find((r) => r.key === ex.key);
                  const v = row?.included;
                  return (
                    <div
                      key={ex.key}
                      className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-1 border-b border-ink/[0.05] py-1 text-[12px]"
                    >
                      <span className="min-w-0 truncate text-ink" title={ex.label}>
                        {ex.label}
                      </span>
                      <button
                        type="button"
                        disabled={!editable}
                        className={`rounded border px-1 py-1 text-center text-[11px] font-bold tabular-nums ${
                          v === true
                            ? "border-emerald-600/40 bg-emerald-50 text-emerald-800"
                            : "border-ink/10 bg-white text-ink/25 hover:border-ink/25"
                        }`}
                        onClick={() => setException(ex.key, v === true ? null : true)}
                      >
                        {v === true ? "X" : "·"}
                      </button>
                      <button
                        type="button"
                        disabled={!editable}
                        className={`rounded border px-1 py-1 text-center text-[11px] font-bold tabular-nums ${
                          v === false
                            ? "border-rose-600/40 bg-rose-50 text-rose-800"
                            : "border-ink/10 bg-white text-ink/25 hover:border-ink/25"
                        }`}
                        onClick={() => setException(ex.key, v === false ? null : false)}
                      >
                        {v === false ? "X" : "·"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="intake-section min-w-0">
            <h3 className="intake-section-head">Special notes</h3>
            <div className="intake-section-body">
              <textarea
                className="intake-field min-h-[6rem] w-full resize-y"
                disabled={!editable}
                maxLength={8000}
                placeholder="Optional job-specific notes (printed after the breakdown)…"
                value={sheet.specialNotes ?? ""}
                onChange={(e) => patchSheet({ specialNotes: e.target.value || null })}
              />
            </div>
          </section>

          <section className="intake-section min-w-0">
            <div className="intake-section-head-bar">
              <h3 className="text-[13px] font-semibold text-ink">Copies (recipients)</h3>
              {editable ? (
                <button type="button" className={INTAKE_ADD_BTN} onClick={addCopy}>
                  <PlusIcon />
                  Add copy
                </button>
              ) : null}
            </div>
            <div className="intake-section-body flex flex-col gap-3">
              {(sheet.copies ?? []).length === 0 ? (
                <p className="text-[12.5px] text-ink/45">
                  No recipient copies yet. Add one company per outbound proposal.
                </p>
              ) : (
                (sheet.copies ?? []).map((copy) => (
                  <CopyEditor
                    key={copy.id}
                    copy={copy}
                    buckets={buckets}
                    alternates={sheet.alternates ?? []}
                    editable={editable}
                    selected={previewCopyId === copy.id}
                    onSelect={() => setPreviewCopyId(copy.id)}
                    onChange={(patch) => updateCopy(copy.id, patch)}
                    onRemove={() => removeCopy(copy.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-3 xl:self-start">
          <section className="intake-section min-w-0 overflow-hidden">
            <div className="intake-section-head-bar">
              <h3 className="text-[13px] font-semibold text-ink">Letter preview</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="intake-field appearance-none text-[12px]"
                  value={previewCopyId}
                  onChange={(e) =>
                    setPreviewCopyId(e.target.value === "sheet" ? "sheet" : e.target.value)
                  }
                >
                  <option value="sheet">Master sheet</option>
                  {(sheet.copies ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.toCompany || c.toName || c.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="intake-head-btn"
                  onClick={() => window.print()}
                >
                  Print
                </button>
              </div>
            </div>
            <div className="intake-section-body !bg-[#e8e6e1] !p-3 sm:!p-4">
              <div className="proposal-letter-stage max-h-[min(78vh,56rem)] overflow-y-auto overflow-x-auto">
                <BidProposalLetter
                  sheet={sheet}
                  buckets={buckets}
                  boilerplate={boilerplate}
                  exDefs={exDefs}
                  cert={cert || letterhead.kind === "dcb"}
                  letterhead={letterhead}
                  copy={previewCopy}
                  estimateNumber={bid.estimateNumber}
                  bidName={bid.bidName || "Untitled"}
                  estimatorLabel={estimatorLabel}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-ink/45">{label}</p>
      <p className="mt-1 truncate text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}

function CopyEditor({
  copy,
  buckets,
  alternates,
  editable,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  copy: ProposalSheetCopy;
  buckets: { value: string; label: string }[];
  alternates: { description?: string | null }[];
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<ProposalSheetCopy>) => void;
  onRemove: () => void;
}) {
  const showQty =
    copy.showQuantities === true ? "yes" : copy.showQuantities === false ? "no" : "";

  return (
    <div
      className={`rounded-lg border p-3 ${
        selected ? "border-brand/40 bg-brand/[0.03]" : "border-ink/10 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-[12.5px] font-semibold text-brand hover:underline"
          onClick={onSelect}
        >
          Preview this copy
        </button>
        {editable ? (
          <button type="button" className={INTAKE_REMOVE_BTN} aria-label="Remove copy" onClick={onRemove}>
            <TrashIcon />
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {(
          [
            ["toName", "To name"],
            ["toCompany", "Company"],
            ["toEmail", "Email"],
            ["toPhone", "Phone"],
            ["toAddress", "Address"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={`flex min-w-0 flex-col gap-1 ${key === "toAddress" ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""}`}>
            <span className="text-[11px] font-medium text-ink/45">{label}</span>
            <input
              className="intake-field w-full"
              disabled={!editable}
              value={String(copy[key] ?? "")}
              onChange={(e) => onChange({ [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium text-ink/45">Show quantities</span>
          <select
            className="intake-field appearance-none"
            disabled={!editable}
            value={showQty}
            onChange={(e) =>
              onChange({
                showQuantities:
                  e.target.value === "yes" ? true : e.target.value === "no" ? false : null,
              })
            }
          >
            <option value="">Not chosen</option>
            <option value="yes">Yes</option>
            <option value="no">No — lump only</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-[11px] font-medium text-ink/45">
        Price overrides (blank = sheet price)
      </p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {buckets.map((b) => (
          <label key={b.value} className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] text-ink/50">{b.label}</span>
            <input
              className="intake-field w-full"
              disabled={!editable}
              inputMode="decimal"
              value={copy.prices?.[b.value] ?? ""}
              onChange={(e) =>
                onChange({
                  prices: {
                    ...(copy.prices ?? {}),
                    [b.value]: moneyInput(e.target.value),
                  },
                })
              }
            />
          </label>
        ))}
      </div>
      {alternates.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {alternates.map((alt, i) => (
            <label key={i} className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[11px] text-ink/50">
                Alt: {alt.description || `#${i + 1}`}
              </span>
              <input
                className="intake-field w-full max-w-[10rem]"
                disabled={!editable}
                inputMode="decimal"
                value={copy.alternatePrices?.[i] ?? ""}
                onChange={(e) => {
                  const next = [...(copy.alternatePrices ?? [])];
                  while (next.length <= i) next.push(null);
                  next[i] = moneyInput(e.target.value);
                  onChange({ alternatePrices: next });
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
