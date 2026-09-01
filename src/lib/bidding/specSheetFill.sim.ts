/**
 * Spec sheet fill stability — simulates rapid field fills + stale parent props.
 * Run: npx tsx src/lib/bidding/specSheetFill.sim.ts
 */
import {
  emptySpecSheetRow,
  normalizeSpecSheets,
  specSheetsFingerprint,
} from "./specSheetMap";
import type { SpecSheet } from "./process-types";

function mergeIncomingSheets(
  local: SpecSheet[],
  incoming: SpecSheet[]
): SpecSheet[] {
  const byId = new Map(incoming.map((s) => [s.id, s]));
  return local.map((ls) => {
    const ss = byId.get(ls.id);
    if (!ss) return ls;
    const rowById = new Map(ss.rows.map((r) => [r.id, r]));
    return {
      ...ls,
      rows: ls.rows.map((lr) => {
        const sr = rowById.get(lr.id);
        if (!sr) return lr;
        return {
          ...lr,
          systemCode: lr.systemCode ?? sr.systemCode,
          areaCode: lr.areaCode ?? sr.areaCode,
          materialCode: lr.materialCode ?? sr.materialCode,
          unit: lr.unit ?? sr.unit,
        };
      }),
    };
  });
}

/** Mirror of BidSpecSheetsSection props-sync rules after the wipe fix. */
function applyPropsSync(
  local: SpecSheet[],
  lastEmittedFp: string,
  sheetsProp: SpecSheet[]
): { local: SpecSheet[]; lastEmittedFp: string } {
  const incoming = normalizeSpecSheets(sheetsProp);
  const inFp = specSheetsFingerprint(incoming);
  if (inFp === lastEmittedFp) return { local, lastEmittedFp };

  const localFp = specSheetsFingerprint(local);
  if (inFp === localFp) return { local, lastEmittedFp: inFp };

  if (incoming.length === 0 && local.length > 0) {
    return { local, lastEmittedFp };
  }

  if (local.length === 0 && incoming.length > 0) {
    return { local: incoming, lastEmittedFp: inFp };
  }

  const localIds = new Set(local.map((s) => s.id));
  const merged = mergeIncomingSheets(local, incoming);
  const extras = incoming.filter((s) => !localIds.has(s.id));
  const next = extras.length > 0 ? [...merged, ...extras] : merged;
  const nextFp = specSheetsFingerprint(next);
  if (nextFp === localFp) return { local, lastEmittedFp: inFp };
  return { local: next, lastEmittedFp: nextFp };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const row = emptySpecSheetRow();
  let local: SpecSheet[] = normalizeSpecSheets([
    {
      id: "s1",
      kind: "plumbing",
      title: "Plumbing",
      specNumber: null,
      rows: [row],
      footerNote: null,
      imageAttachmentIds: [],
    },
  ]);
  let lastEmittedFp = specSheetsFingerprint(local);
  let parentProps = structuredClone(local);

  const commit = (patch: Partial<(typeof row)>) => {
    const next = local.map((s) => ({
      ...s,
      rows: s.rows.map((r) => (r.id === row.id ? { ...r, ...patch } : r)),
    }));
    local = next;
    lastEmittedFp = specSheetsFingerprint(next);
    // Parent lags 1 tick (stale props still old) — then catches up
  };

  // Rapid fills like a user tabbing through the row
  commit({ systemName: "Domestic Hot Water", systemCode: "DHW", unit: "LF" });
  // Stale parent still empty-ish mid-edit
  ({ local, lastEmittedFp } = applyPropsSync(local, lastEmittedFp, parentProps));
  commit({ areaName: "Exposed", areaCode: "E" });
  commit({ materialName: "Fiberglass with ASJ", materialCode: "FGA" });
  commit({ sizeMin: 0, sizeMax: 1.5 });
  // Materials finished loading → parent re-render with STALE props
  ({ local, lastEmittedFp } = applyPropsSync(local, lastEmittedFp, parentProps));
  commit({ thicknessIn: 1 });
  commit({ facing: "ASJ" });
  commit({ jacket: "PVC" });
  // Parent finally receives last emit
  parentProps = structuredClone(local);
  ({ local, lastEmittedFp } = applyPropsSync(local, lastEmittedFp, parentProps));
  // Server echo adds nothing new but different reference
  ({ local, lastEmittedFp } = applyPropsSync(
    local,
    lastEmittedFp,
    structuredClone(local)
  ));
  // Partial parent missing second sheet must NOT wipe
  local = [
    ...local,
    {
      id: "s2",
      kind: "duct",
      title: "Duct",
      specNumber: null,
      rows: [emptySpecSheetRow()],
      footerNote: null,
      imageAttachmentIds: [],
    },
  ];
  lastEmittedFp = specSheetsFingerprint(local);
  ({ local, lastEmittedFp } = applyPropsSync(local, lastEmittedFp, [
    local[0]!,
  ]));

  const r = local[0]!.rows[0]!;
  assert(r.systemName === "Domestic Hot Water", "system wiped");
  assert(r.areaName === "Exposed", "area wiped");
  assert(r.materialName === "Fiberglass with ASJ", "material wiped");
  assert(r.sizeMin === 0, "sizeMin wiped");
  assert(r.sizeMax === 1.5, "sizeMax wiped");
  assert(r.thicknessIn === 1, "thickness wiped");
  assert(r.facing === "ASJ", "facing wiped");
  assert(r.jacket === "PVC", "jacket wiped");
  assert(r.unit === "LF", "unit wiped");
  assert(local.length === 2, "second sheet wiped by partial props");

  // Empty props must not clear local
  ({ local, lastEmittedFp } = applyPropsSync(local, lastEmittedFp, []));
  assert(local.length === 2, "empty props wiped sheets");

  console.log("specSheetFill.sim PASS", {
    system: r.systemName,
    size: `${r.sizeMin}-${r.sizeMax}`,
    thick: r.thicknessIn,
    facing: r.facing,
    jacket: r.jacket,
    sheets: local.length,
  });
}

main();
