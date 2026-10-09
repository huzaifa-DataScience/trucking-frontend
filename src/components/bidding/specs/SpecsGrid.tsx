"use client";

import { useEffect, useRef, useState } from "react";
import type {
  SpecArea,
  SpecFacing,
  SpecLine,
  SpecMaterial,
  SpecSystem,
  StructshareOption,
} from "@/lib/bidding/specs-types";
import {
  SPEC_TYPES,
  inferFacingFromText,
  normalizeFacingValue,
  resolveFacingSelectValue,
} from "@/lib/bidding/specs-types";
import { INTAKE_REMOVE_BTN, TrashIcon } from "@/components/bidding/intakeIcons";

function fmtQty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function isRollLine(line: SpecLine): boolean {
  return (
    line.catalogMatchMode === "roll" ||
    line.structshareSfPerRoll != null ||
    line.qtyReceivedSf != null ||
    Boolean(line.qtyReceivedSummary)
  );
}

type EditableKey =
  | "type"
  | "systemName"
  | "areaName"
  | "insulation"
  | "size"
  | "thickness"
  | "weight"
  | "facing"
  | "extraNotes";

export function SpecsGrid({
  lines,
  systems,
  materials,
  areas,
  facings = [],
  canWrite,
  busyId,
  onPatch,
  onDelete,
  onOpenCatalog,
}: {
  lines: SpecLine[];
  systems: SpecSystem[];
  materials: SpecMaterial[];
  areas: SpecArea[];
  facings?: SpecFacing[];
  canWrite: boolean;
  busyId: number | null;
  onPatch: (lineId: number, patch: Partial<SpecLine>) => void;
  onDelete: (lineId: number) => void;
  onOpenCatalog: (line: SpecLine) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded border border-dashed border-[#d5dbe3] bg-[#f8fafc] px-6 py-16 text-center">
        <div className="max-w-md">
          <h3 className="text-[15px] font-semibold text-[#1f2937]">No Specs yet</h3>
          <p className="mt-2 text-[12.5px] text-[#6b7280]">
            Upload a Mike takeoff file to build the Specs sheet.
          </p>
        </div>
      </div>
    );
  }

  const showRollCols = lines.some(isRollLine);

  return (
    <div className="intake-section flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="intake-section-head">Specs qty grid</div>
      {/* Section chrome uses overflow:hidden — scroll must live on the body. */}
      <div
        className="intake-section-body intake-specs-scroll !p-0"
        onMouseOver={(e) => {
          const el = e.target;
          if (
            !(el instanceof HTMLSelectElement) &&
            !(el instanceof HTMLInputElement) &&
            !(el instanceof HTMLTextAreaElement)
          ) {
            return;
          }
          if (el instanceof HTMLSelectElement) {
            const text = el.selectedOptions[0]?.text?.trim() ?? "";
            const empty = !el.value || text === "—" || text === "";
            if (empty) el.removeAttribute("title");
            else el.title = text;
            return;
          }
          const v = String(el.value ?? "").trim();
          if (!v) el.removeAttribute("title");
          else el.title = v;
        }}
        onFocus={(e) => {
          const t = e.target;
          if (t instanceof HTMLElement) t.dispatchEvent(new Event("mouseover", { bubbles: true }));
        }}
        onChange={(e) => {
          const t = e.target;
          if (t instanceof HTMLElement) t.dispatchEvent(new Event("mouseover", { bubbles: true }));
        }}
      >
      <table className="min-w-[1600px] w-full border-collapse text-left text-[12.5px] text-[#374151]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[#e5e7eb] bg-[#f3f1ea] text-[11px] font-semibold uppercase tracking-wide text-[#333333]">
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2">System</th>
            <th className="px-2 py-2">Area</th>
            <th className="sticky left-0 z-[1] bg-[#f3f1ea] px-2 py-2 shadow-[2px_0_0_rgba(0,0,0,0.04)]">
              Insulation
            </th>
            <th className="px-2 py-2">Size</th>
            <th className="px-2 py-2">Thick</th>
            <th className="px-2 py-2">Wt / Facing</th>
            <th className="px-2 py-2">Code</th>
            <th className="px-2 py-2">Area</th>
            <th className="px-2 py-2">Mat</th>
            <th className="px-2 py-2">Prod/Hr</th>
            <th className="px-2 py-2">Qty Est</th>
            <th className="px-2 py-2">Recv</th>
            <th className="px-2 py-2">Unit (Trimble)</th>
            <th className="px-2 py-2">Remain</th>
            <th className="px-2 py-2">Hrs Mike</th>
            <th className="px-2 py-2">Hrs @ recv</th>
            {showRollCols ? (
              <>
                <th className="px-2 py-2">SF / roll</th>
                <th className="px-2 py-2">Recv SF</th>
                <th className="min-w-[8rem] px-2 py-2">Recv summary</th>
              </>
            ) : null}
            <th className="min-w-[14rem] px-2 py-2">
              Structshare options
            </th>
            <th className="px-2 py-2">Notes</th>
            {canWrite ? <th className="px-2 py-2" /> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.05]">
          {lines.map((line) => (
            <SpecsLineRow
              key={line.id}
              line={line}
              systems={systems}
              materials={materials}
              areas={areas}
              facings={facings}
              canWrite={canWrite}
              busy={busyId === line.id}
              showRollCols={showRollCols}
              onPatch={onPatch}
              onDelete={onDelete}
              onOpenCatalog={onOpenCatalog}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function SpecsLineRow({
  line,
  systems,
  materials,
  areas,
  facings,
  canWrite,
  busy,
  showRollCols,
  onPatch,
  onDelete,
  onOpenCatalog,
}: {
  line: SpecLine;
  systems: SpecSystem[];
  materials: SpecMaterial[];
  areas: SpecArea[];
  facings: SpecFacing[];
  canWrite: boolean;
  busy: boolean;
  showRollCols: boolean;
  onPatch: (lineId: number, patch: Partial<SpecLine>) => void;
  onDelete: (lineId: number) => void;
  onOpenCatalog: (line: SpecLine) => void;
}) {
  const [draft, setDraft] = useState({
    type: line.type ?? "",
    systemName: line.systemName,
    areaName: line.areaName ?? "All",
    insulation: line.insulation,
    size: String(line.size),
    thickness: String(line.thickness),
    weight: line.weight ?? "",
    facing:
      normalizeFacingValue(line.facing) ||
      inferFacingFromText(line.structshareItem, line.insulation, line.extraNotes),
    extraNotes: line.extraNotes ?? "",
  });

  useEffect(() => {
    setDraft({
      type: line.type ?? "",
      systemName: line.systemName,
      areaName: line.areaName ?? "All",
      insulation: line.insulation,
      size: String(line.size),
      thickness: String(line.thickness),
      weight: line.weight ?? "",
      facing:
        normalizeFacingValue(line.facing) ||
        inferFacingFromText(line.structshareItem, line.insulation, line.extraNotes),
      extraNotes: line.extraNotes ?? "",
    });
  }, [line]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePatch = (key: EditableKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (!canWrite) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const patch: Partial<SpecLine> = {};
      if (key === "size" || key === "thickness") {
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        patch[key] = n;
      } else if (key === "facing") {
        patch.facing = normalizeFacingValue(value) || null;
      } else if (key === "type" || key === "weight" || key === "extraNotes") {
        patch[key] = value.trim() || null;
      } else {
        patch[key] = value;
      }
      onPatch(line.id, patch);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const remainWarn = line.qtyRemain < 0;
  const hasStructshare = (line.structshareOptions?.length ?? 0) > 0;
  const noMike = line.qtyEstimated === 0 && !hasStructshare;
  const roll = isRollLine(line);

  const facingSelectValue = resolveFacingSelectValue(draft.facing, facings);
  const facingOptions: SpecFacing[] =
    facingSelectValue &&
    !facings.some((f) => f.value.toLowerCase() === facingSelectValue.toLowerCase())
      ? [...facings, { id: -1, value: facingSelectValue, label: facingSelectValue }]
      : facings;

  const cellInput =
    "w-full min-w-[4.5rem] cursor-pointer rounded border border-transparent bg-transparent px-1 py-1 text-[12.5px] text-[#374151] outline-none hover:border-[#cfd5dd] focus:border-[#94a3b8] focus:bg-white disabled:cursor-default disabled:opacity-60";

  return (
    <tr className={`align-top ${busy ? "opacity-60" : ""}`}>
      <td className="px-1 py-1">
        <select
          className={cellInput}
          disabled={!canWrite}
          value={draft.type}
          onChange={(e) => schedulePatch("type", e.target.value)}
        >
          <option value="">—</option>
          {SPEC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-1 py-1">
        <select
          className={cellInput}
          disabled={!canWrite}
          value={draft.systemName}
          onChange={(e) => schedulePatch("systemName", e.target.value)}
        >
          {systems.map((s) => (
            <option key={s.id} value={s.systemName}>
              {s.systemName}
            </option>
          ))}
          {!systems.some((s) => s.systemName === draft.systemName) && draft.systemName ? (
            <option value={draft.systemName}>{draft.systemName}</option>
          ) : null}
        </select>
      </td>
      <td className="px-1 py-1">
        <select
          className={cellInput}
          disabled={!canWrite}
          value={draft.areaName}
          onChange={(e) => schedulePatch("areaName", e.target.value)}
        >
          {areas.map((a) => (
            <option key={a.id} value={a.areaName}>
              {a.areaName}
            </option>
          ))}
          {!areas.some((a) => a.areaName === draft.areaName) && draft.areaName ? (
            <option value={draft.areaName}>{draft.areaName}</option>
          ) : null}
        </select>
      </td>
      <td className="sticky left-0 z-[1] bg-surface px-1 py-1 shadow-[2px_0_0_rgba(0,0,0,0.04)]">
        <select
          className={cellInput}
          disabled={!canWrite}
          value={draft.insulation}
          onChange={(e) => schedulePatch("insulation", e.target.value)}
        >
          {materials.map((m) => (
            <option key={m.id} value={m.description}>
              {m.description}
            </option>
          ))}
          {!materials.some((m) => m.description === draft.insulation) && draft.insulation ? (
            <option value={draft.insulation}>{draft.insulation}</option>
          ) : null}
        </select>
      </td>
      <td className="px-1 py-1">
        <input
          className={`${cellInput} w-16`}
          disabled={!canWrite}
          value={draft.size}
          onChange={(e) => schedulePatch("size", e.target.value)}
        />
      </td>
      <td className="px-1 py-1">
        <input
          className={`${cellInput} w-16`}
          disabled={!canWrite}
          value={draft.thickness}
          onChange={(e) => schedulePatch("thickness", e.target.value)}
        />
      </td>
      <td className="px-1 py-1">
        <div className="flex gap-1">
          <input
            className={`${cellInput} w-14`}
            disabled={!canWrite}
            placeholder="—"
            value={draft.weight}
            onChange={(e) => schedulePatch("weight", e.target.value)}
            title={
              draft.weight
                ? undefined
                : "No weight (normal for pipe) — roll lines may show density"
            }
            aria-label="Weight"
          />
          <select
            className={`${cellInput} min-w-[5.5rem] w-24`}
            disabled={!canWrite}
            value={facingSelectValue}
            onChange={(e) => schedulePatch("facing", e.target.value)}
            aria-label="Facing"
          >
            <option value="">—</option>
            {facingOptions.map((f) => (
              <option key={`${f.id}-${f.value}`} value={f.value}>
                {f.label || f.value}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-2 py-2 text-ink">{line.code ?? "—"}</td>
      <td className="px-2 py-2 text-ink">{line.areaCode ?? "—"}</td>
      <td className="px-2 py-2 text-ink">{line.materialCode ?? "—"}</td>
      <td className="px-2 py-2 text-ink">{fmtQty(line.productionPerHour)}</td>
      <td className="px-2 py-2 font-medium text-ink" title={noMike ? "No Mike match" : undefined}>
        {fmtQty(line.qtyEstimated)}
        {noMike ? <span className="ml-1 text-[9px] text-ink/35">?</span> : null}
      </td>
      {/* Unit (Est) — temporarily hidden
      <td className="px-2 py-2 text-ink">{line.unit ?? "—"}</td>
      */}
      <td className="px-2 py-2 text-ink">{fmtQty(line.qtyReceived)}</td>
      <td className="px-2 py-2 text-ink">{line.trimbleUnit ?? "—"}</td>
      <td
        className={`px-2 py-2 font-semibold ${
          remainWarn ? "text-danger" : "text-ink"
        }`}
      >
        {fmtQty(line.qtyRemain)}
      </td>
      <td className="px-2 py-2 tabular-nums text-ink">
        {fmtQty(line.hoursEstimated)}
      </td>
      <td className="px-2 py-2 tabular-nums text-ink">
        {fmtQty(line.hoursEstimatedFromReceived)}
      </td>
      {showRollCols ? (
        <>
          <td className="px-2 py-2 text-ink">
            {roll ? fmtQty(line.structshareSfPerRoll) : "—"}
          </td>
          <td className="px-2 py-2 text-ink">
            {roll ? fmtQty(line.qtyReceivedSf) : "—"}
          </td>
          <td className="px-2 py-2 text-ink">
            {roll && line.qtyReceivedSummary ? line.qtyReceivedSummary : "—"}
          </td>
        </>
      ) : null}
      <td className="px-1 py-1">
        <StructshareOptionsCell
          options={line.structshareOptions}
          matchMode={line.catalogMatchMode}
          onBrowseCatalog={() => onOpenCatalog(line)}
        />
      </td>
      <td className="px-1 py-1">
        <input
          className={`${cellInput} min-w-[6rem]`}
          disabled={!canWrite}
          value={draft.extraNotes}
          onChange={(e) => schedulePatch("extraNotes", e.target.value)}
        />
      </td>
      {canWrite ? (
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this Spec line?")) onDelete(line.id);
            }}
            className={INTAKE_REMOVE_BTN}
            aria-label="Delete line"
            title="Delete line"
          >
            <TrashIcon />
          </button>
        </td>
      ) : null}
    </tr>
  );
}

/**
 * Collective catalog matches — no cheapest / vendor pick.
 * FRONTEND_BIDDING_SPECS.md 2026-08-09
 */
function StructshareOptionsCell({
  options,
  matchMode,
  onBrowseCatalog,
}: {
  options: StructshareOption[] | null | undefined;
  matchMode?: string | null;
  onBrowseCatalog: () => void;
}) {
  const list = Array.isArray(options) ? options : [];
  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="text-ink/35">—</span>
        <button
          type="button"
          onClick={onBrowseCatalog}
          className="text-[10px] font-semibold text-ink/40 hover:text-brand"
        >
          Catalog
        </button>
      </div>
    );
  }

  const preview = list[0]?.itemName ?? "";
  const more = list.length - 1;

  return (
    <details className="group relative max-w-[18rem]">
      <summary className="cursor-pointer list-none rounded-lg border border-ink/10 bg-canvas px-2 py-1.5 text-[11px] text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-2 font-medium leading-snug">{preview}</span>
        <span className="mt-0.5 block text-[10px] text-ink/45">
          {list.length} item{list.length === 1 ? "" : "s"}
          {matchMode ? ` · ${matchMode}` : ""}
          {more > 0 ? ` · +${more} more` : ""}
        </span>
      </summary>
      <div className="absolute left-0 z-20 mt-1 max-h-48 w-[min(22rem,70vw)] overflow-auto rounded-xl border border-ink/10 bg-surface p-2 shadow-lg">
        <ul className="space-y-1.5 text-[11px] text-ink/80">
          {list.map((o, i) => (
            <li
              key={`${o.itemName}-${i}`}
              className="rounded-md px-1.5 py-1 leading-snug hover:bg-canvas"
            >
              {o.itemName}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onBrowseCatalog}
          className="mt-2 w-full rounded-lg border border-ink/10 px-2 py-1.5 text-[10px] font-semibold text-ink/55 hover:text-brand"
        >
          Open catalog (admin price)
        </button>
      </div>
    </details>
  );
}
