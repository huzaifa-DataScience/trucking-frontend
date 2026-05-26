/** Our-entity ids that have Siteline billing snapshots (Ref_OurEntities). */
const SITELINE_ENTITY_IDS = new Set(["1", "2", "3"]);

/** Matches backend SITELINE_AGING_PRIMARY_ENTITY_ID when header is "All". */
export const DEFAULT_SITELINE_ENTITY_ID = 2;

/**
 * Maps header CompanyContext.companyId to Siteline query param entityId.
 * Returns null for TBD (4) — caller should skip aging APIs.
 */
export function sitelineEntityIdFromContext(
  companyId: string | null | undefined
): number | null {
  if (companyId === "4") return null;
  if (companyId != null && SITELINE_ENTITY_IDS.has(companyId)) {
    return Number(companyId);
  }
  return DEFAULT_SITELINE_ENTITY_ID;
}
