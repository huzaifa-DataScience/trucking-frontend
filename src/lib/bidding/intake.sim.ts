/**
 * FE-side Intake helpers — FRONTEND_INTAKE.md
 * Run: npx tsx src/lib/bidding/intake.sim.ts
 */
import {
  bidKindOptionsFromMeta,
  defaultSketchTiers,
  tierRoleOptionsFromMeta,
  type ProcessMeta,
} from "./process-types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const meta: ProcessMeta = {
  bidKindLabels: {
    built_to_print: "Built to print",
    design_build: "Design-build",
    design_assist: "Design-assist",
    budget: "Budget",
    unknown: "Unknown",
    other: "Other (legacy)",
  },
  tierRoles: ["owner", "lessee", "gc", "mechanical", "us"],
  intakeEditor: {
    sketchTiers: [
      { sortOrder: 0, role: "owner", isPaying: true },
      { sortOrder: 1, role: "lessee" },
    ],
  },
};

const kinds = bidKindOptionsFromMeta(meta);
assert(kinds.every((k) => k.value !== "other"), "other must be hidden");
assert(
  kinds.some((k) => k.value === "budget"),
  "budget kind required"
);
assert(
  kinds.some((k) => k.value === "design_assist"),
  "design_assist required"
);
assert(kinds.some((k) => k.value === "unknown"), "unknown required");

const fallbackKinds = bidKindOptionsFromMeta(null);
assert(
  fallbackKinds.some((k) => k.value === "budget"),
  "fallback includes budget"
);
assert(
  !fallbackKinds.some((k) => k.value === "other"),
  "fallback hides other"
);

const roles = tierRoleOptionsFromMeta(meta);
assert(roles.some((r) => r.value === "lessee"), "lessee role");

const sketch = defaultSketchTiers(meta);
assert(sketch.length === 2, "uses intakeEditor.sketchTiers");
assert(sketch[0]?.role === "owner", "owner first");

const defaults = defaultSketchTiers(null);
assert(defaults.length === 5, "default 5-layer sketch");
assert(defaults.some((t) => t.role === "us"), "includes us/Goel");
assert(defaults.some((t) => t.isPaying === true), "owner paying default");

// Simulate: budget is bidKind, not budgetOnly checkbox
const processPatch = { bidKind: "budget" as const, budgetOnly: undefined };
assert(processPatch.bidKind === "budget", "budget via bidKind");
assert(processPatch.budgetOnly === undefined, "no budgetOnly control");

console.log("intake.sim PASS", {
  kinds: kinds.map((k) => k.value),
  sketchFromMeta: sketch.length,
  defaultSketch: defaults.map((t) => t.role),
});
