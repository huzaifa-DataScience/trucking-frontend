#!/usr/bin/env node
/**
 * Reads BiddingSheet.xlsx Base Bid (IDC6098) and compares to client engine via tsx.
 * Run: npm run verify:bidding-excel
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "BiddingSheet.xlsx");

const wb = XLSX.readFile(xlsxPath, { cellDates: true });
const sheet = wb.Sheets["Base Bid"];
const cell = (addr) => {
  const c = sheet[addr];
  if (!c) return null;
  return c.v ?? null;
};

const excel = {
  mike: cell("H48"),
  pj: cell("H47"),
  hours: cell("H37"),
  i45: cell("I45"),
  i46: cell("I46"),
  i47: cell("I47"),
  i48: cell("I48"),
  c45: cell("C45"),
  d45: cell("D45"),
};

const run = spawnSync(
  "npx",
  ["tsx", "-e", `
    import { calculateBaseBid } from './src/lib/bidding/engine/calculate.ts';
    import { IDC6098_GOLDEN_BID, IDC6098_ENGINE_LOOKUPS } from './src/lib/bidding/engine/fixtures/idc6098-golden.ts';
    const r = calculateBaseBid(IDC6098_GOLDEN_BID, IDC6098_ENGINE_LOOKUPS);
    console.log(JSON.stringify({ computed: r.computed, systems: r.systemsComputed.filter(s=>s.used) }));
  `],
  { cwd: root, encoding: "utf8" }
);

if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(1);
}

const { computed, systems } = JSON.parse(
  run.stdout.trim().split("\n").pop()
);

const tol = 0.02;
const checks = [
  ["MIKE H48", computed["baseBid.mikeEstimate"], excel.mike],
  ["PJ H47", computed["baseBid.pjEstimate"], excel.pj],
  ["Hours H37", computed["labor.totalHours"], excel.hours],
  ["I45", computed["baseBid.costPerHourBeforeMargin"], excel.i45],
  ["I46", computed["baseBid.marginPerHour"], excel.i46],
  ["I47", computed["baseBid.costPerHourPj"], excel.i47],
  ["I48", computed["baseBid.costPerHourMike"], Math.round(excel.i48 * 100) / 100],
  ["Duct1 C45", systems.find((s) => s.key === "duct1")?.subtotal, excel.c45],
  ["Hydronic1 D45", systems.find((s) => s.key === "hydronic1")?.subtotal, excel.d45],
];

let failed = 0;
for (const [label, actual, expected] of checks) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`${ok ? "✓" : "✗"} ${label}: engine=${actual} excel=${expected}`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
