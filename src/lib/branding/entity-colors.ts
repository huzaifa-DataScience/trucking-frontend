/** Our-entity brand colors — DCB blue, Goel orange, Goel DC green. */

export type EntityBrandTokens = {
  hex: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
};

const GOEL: EntityBrandTokens = {
  hex: "#e8893a",
  bg: "bg-[#fdf3e9]",
  text: "text-[#a15c1a]",
  border: "border-[#f0c396]",
  dot: "bg-[#e8893a]",
};

const GOEL_DC: EntityBrandTokens = {
  hex: "#059669",
  bg: "bg-[#ecfdf5]",
  text: "text-[#047857]",
  border: "border-[#a7f3d0]",
  dot: "bg-[#059669]",
};

const DCB: EntityBrandTokens = {
  hex: "#5bade8",
  bg: "bg-[#e8f4fc]",
  text: "text-[#1e6a9a]",
  border: "border-[#5bade8]/40",
  dot: "bg-[#5bade8]",
};

const FALLBACK: EntityBrandTokens = {
  hex: "#6b7280",
  bg: "bg-ink/[0.04]",
  text: "text-ink/60",
  border: "border-ink/15",
  dot: "bg-ink/30",
};

function norm(name: string | null | undefined): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function entityBrandForName(name: string | null | undefined): EntityBrandTokens {
  const n = norm(name);
  if (!n) return FALLBACK;
  if (n.includes("delaware") || n === "dcb" || n.includes("cornerstone") || n.startsWith("dcb")) {
    return DCB;
  }
  if (n.includes("goel dc") || n.includes("goeldc") || n === "goel dc") {
    return GOEL_DC;
  }
  if (n.includes("goel")) {
    return GOEL;
  }
  return FALLBACK;
}

export const ENTITY_BRAND_HEX = {
  goel: GOEL.hex,
  dcb: DCB.hex,
  goelDc: GOEL_DC.hex,
} as const;
