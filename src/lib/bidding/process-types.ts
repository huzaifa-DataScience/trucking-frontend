/** Bid lifecycle `process` — FRONTEND_BIDDING_LIFECYCLE.md / BIDDING_FRONTEND_API §0 */

/** PDF handoff stages (bar). Awarded/Lost are gated screens, not stages. */
export type ProcessStage =
  | "intake"
  | "assignment"
  | "estimating_setup"
  | "takeoff"
  | "proposal"
  | "post_bid"
  /** Legacy values remapped on read by BE; FE still accepts. */
  | "first_input"
  | "estimating"
  | "intelligence"
  | "awarded"
  | "production";

export type ProcessOutcome =
  | "open"
  | "awarded"
  | "lost"
  | "no_bid"
  | "cancelled"
  | "postponed";

export type WorkType =
  | "demo"
  | "insulation"
  | "gc"
  | "masonry"
  | "other"
  | null;

export type BidKind =
  | "built_to_print"
  | "design_build"
  | "design_assist"
  | "budget"
  | "unknown"
  /** Legacy — do not offer on new forms */
  | "other"
  | null;

export type ClearanceType = "us_citizen" | "us_person" | "real_id" | null;

export type TakeoffRole =
  | "duct1"
  | "duct2"
  | "hydronic1"
  | "hydronic2"
  | "plumbing1"
  | "plumbing2"
  | "vrf"
  | "equipment"
  | "other";

export interface ProcessParty {
  name?: string | null;
  company?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ProcessAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface ProcessEntityRule {
  jurisdiction?: "dc" | "md" | "other" | null;
  isGovernment?: boolean | null;
  firstSource?: "new" | "old" | null;
  prevailingWage?: boolean | null;
  isBaltimore?: boolean | null;
  isPrivateOrFederal?: boolean | null;
  suggestedOurEntity?: "goel_dc" | "dcb" | "goel_services" | null;
}

export interface ProcessCompetitor {
  name?: string | null;
  amount?: number | null;
  source?: string | null;
  confidence?: string | null;
  atBid?: boolean | null;
}

export interface ProcessIntelligence {
  followUpOwner?: string | null;
  nextFollowUpDate?: string | null;
  expectedAwardDate?: string | null;
  bafoRequested?: boolean | null;
  revisedProposalRequired?: boolean | null;
  mechanicalUnableToGetPricing?: boolean | null;
  customerFeedback?: string | null;
  currentProjectStatus?: string | null;
  competitors?: ProcessCompetitor[];
  notes?: string | null;
}

export interface ProcessAssignment {
  pursue?: boolean | null;
  priority?: string | null;
  /** From GET /lookups/bidding/teams */
  teamId?: number | null;
  captain?: string | null;
  assistantEstimator?: string | null;
  bidClerk?: string | null;
  internalEstimateDue?: string | null;
  internalReviewDue?: string | null;
}

export interface ProcessTakeoffVersion {
  version?: number | null;
  createdBy?: string | null;
  createdAt?: string | null;
  reason?: string | null;
  quantity?: number | null;
  hoursSpent?: number | null;
  csvAttachmentId?: number | null;
  pdfAttachmentId?: number | null;
}

export interface ProcessTakeoffAssignment {
  role?: TakeoffRole | string | null;
  assigneeName?: string | null;
  assignedAt?: string | null;
  dueAt?: string | null;
  status?: string | null;
  hoursSpent?: number | null;
  notes?: string | null;
  finalQuantity?: number | null;
  reviewedBy?: string | null;
  versions?: ProcessTakeoffVersion[];
}

export interface ProcessTechnicalReview {
  preparedBy?: string | null;
  reviewedBy?: string | null;
  reviewDate?: string | null;
  approvedForTakeoff?: boolean | null;
  comments?: string | null;
}

/**
 * Spec sheet rules — FRONTEND_SPEC_SHEET.md (Setup, not Takeoff qty grid).
 * Dropdown rows; not FortuneSheet / free-text grid.
 */
export type SpecSheetKind = "duct" | "hydronic" | "plumbing" | "equipment";

export type SpecSheetSizeMode = "nps" | "circumference" | "any";

export type SpecSheetDuctShape =
  | "rectangular"
  | "square"
  | "round"
  | "oval";

export type SpecSheetInsulationFamily =
  | "fiberglass"
  | "elastomeric"
  | "polyiso"
  | "phenolic"
  | "mineral_wool"
  | "calcium_silicate"
  | "foamglas"
  | "fire_rated_duct_wrap"
  | "closed_cell_polyethylene"
  | "other";

export interface SpecSheetInsulationLayer {
  id: string;
  materialName: string | null;
  materialCode: string | null;
  thicknessIn: number | null;
}

export interface SpecSheetRow {
  id: string;
  systemName: string | null;
  systemCode: string | null;
  unit: string | null;
  areaName: string | null;
  areaCode: string | null;
  sizeMin: number | null;
  sizeMax: number | null;
  sizeMode: SpecSheetSizeMode | null;
  ductShape: SpecSheetDuctShape | null;
  insulationFamily: SpecSheetInsulationFamily | null;
  /**
   * Extra insulation columns beyond the default.
   * null = default **1** insulation (always shown). Options are 2 / 3 / 4 only — never 1.
   */
  insulationLayerCount: number | null;
  /** One pick per insulation layer (length matches insulationLayerCount when set). */
  insulationLayers: SpecSheetInsulationLayer[];
  /** Legacy / primary mirror of insulationLayers[0] for API compat. */
  materialName: string | null;
  materialCode: string | null;
  thicknessIn: number | null;
  weight: number | null;
  facing: string | null;
  jacket: string | null;
  manufacturersAllowed: string[];
  manufacturerPreferred: string | null;
  accessories: string | null;
  specSection: string | null;
  specParagraph: string | null;
  otherNote: string | null;
  notes: string | null;
}

export interface SpecSheet {
  id: string;
  kind: SpecSheetKind;
  title: string;
  specNumber: string | null;
  rows: SpecSheetRow[];
  footerNote: string | null;
  imageAttachmentIds: number[];
}

export interface SpecSheetTemplateMeta {
  id: SpecSheetKind | string;
  label?: string;
  empty?: SpecSheet;
}

export interface SpecSheetMetaOption {
  id: string;
  label?: string;
}

export interface SpecSheetEditorMeta {
  /** Prefer `'kind'` — call spec-systems?kind=… Do not substring-filter names. */
  filterSystemsBy?: "kind" | string;
  /** Cascade field order from process-meta (informational). */
  cascade?: unknown;
  /**
   * Insulation families (`insulationFamily`) from process-meta.
   * Exact ids: fiberglass, elastomeric, polyiso, phenolic, mineral_wool,
   * calcium_silicate, foamglas, fire_rated_duct_wrap, closed_cell_polyethylene, other.
   */
  families?: SpecSheetMetaOption[] | string[];
  /**
   * Layer-2 field coverings (`jacket`) — not facings.
   * Exact ids: none, aluminum_016, aluminum_020, aluminum_024, stainless, pvc, canvas, sound_lag, other.
   */
  coverings?: SpecSheetMetaOption[] | string[];
  /**
   * Manufacturer ids for `manufacturersAllowed` / `manufacturerPreferred`.
   * Exact ids: owens_corning, johns_manville, knauf, manson, other.
   */
  manufacturers?: SpecSheetMetaOption[] | string[];
  /** Duct shapes when kind=duct — rectangular | square | round | oval. */
  ductShapes?: SpecSheetMetaOption[] | string[];
  /**
   * Intentionally [] on process-meta — after insulation pick use that material
   * row's sizes/thicknesses only. Never use as a global NPS fallback.
   */
  sizes?: number[];
  /** Intentionally [] — use material.thicknesses after pick. */
  thicknesses?: number[];
  /** Leftover fallback only if API has no kind filter. */
  systemKindHints?: Partial<Record<SpecSheetKind, string[]>>;
  [key: string]: unknown;
}

export interface ProcessAward {
  jobNumber?: string | null;
  pm?: string | null;
  me?: string | null;
  ops?: string | null;
  awardDate?: string | null;
  finalContractAmount?: number | null;
  primeContractor?: string | null;
  mechanicalContractor?: string | null;
  performingOurEntityId?: number | null;
}

export interface ProcessStartup {
  formOfContract?: string | null;
  contractPrice?: number | null;
  laborBudget?: number | null;
  materialBudget?: number | null;
  equipmentBudget?: number | null;
  bondCost?: number | null;
  otherBudget?: number | null;
  totalManhours?: number | null;
  avgLaborRate?: number | null;
  projectedStart?: string | null;
  projectedCompletion?: string | null;
  certifiedPayroll?: boolean | null;
  taxExemption?: boolean | null;
  travelParking?: string | null;
  scheduleReceived?: boolean | null;
  sovReceived?: boolean | null;
  specialInstructions?: string | null;
}

export interface ProcessLost {
  date?: string | null;
  awardedMechanical?: string | null;
  awardedInsulation?: string | null;
  winningPrice?: number | null;
  ourFinalPrice?: number | null;
  difference?: number | null;
  reason?: string | null;
  notes?: string | null;
  possibleRebid?: boolean | null;
  relatedOpportunityId?: number | null;
}

export interface ProcessContractTier {
  sortOrder: number;
  role?: string | null;
  company?: string | null;
  relationship?: string | null;
  contactName?: string | null;
  projectManager?: string | null;
  superintendent?: string | null;
  foreman?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Already awarded / still bidding — research; unknown at invite OK */
  hasTheJob?: boolean | null;
  /** This layer asked us for the bid */
  invitedUs?: boolean | null;
  /** Owner or lessee paying */
  isPaying?: boolean | null;
  isBonded?: boolean | null;
  bondNumber?: string | null;
  bondingCompany?: string | null;
  noticeTo?: string | null;
}

export interface ProcessDocumentLink {
  url: string;
  label?: string | null;
  source?: string | null;
}

export interface ProcessInvitationAddendum {
  number?: string | null;
  receivedAt?: string | null;
  attachmentIds?: number[];
  notes?: string | null;
}

export interface ProcessInvitation {
  id?: string;
  receivedAt?: string | null;
  contact?: ProcessInviteContact | null;
  links?: ProcessDocumentLink[];
  attachmentIds?: number[];
  /** Addenda from this inviter — arrays replace on save */
  addenda?: ProcessInvitationAddendum[];
  notes?: string | null;
}

export interface ProcessWhoElseBidding {
  researched?: boolean | null;
  notes?: string | null;
}

export interface ProcessGcOrMech extends ProcessParty {
  hasTheJob?: boolean | null;
  receivedProposalBy?: string | null;
  stillBidding?: boolean | null;
}

export interface ProcessInviteContact {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Full process object from GET /bids/:id (empty defaults filled). */
export interface BidProcess {
  stage?: ProcessStage | null;
  outcome?: ProcessOutcome | null;
  workType?: WorkType;
  bidKind?: BidKind;
  drawingName?: string | null;
  /** Title-block owner/architect # — duplicate key */
  ownerProjectNumber?: string | null;
  /** Engineer of Record — mechanical (title-block #) — duplicate key */
  mechanicalEngineerProjectNumber?: string | null;
  invitationReceivedAt?: string | null;
  inviteContact?: ProcessInviteContact | null;
  /** Prefer this over inviteContact / invitationReceivedAt */
  invitations?: ProcessInvitation[];
  /**
   * When invitations.length < 2, researched must be true to hand off.
   * Call GC/architect/ME — do not ask the inviter.
   */
  whoElseBidding?: ProcessWhoElseBidding | null;
  /** Owner / federal drawing sets (many) */
  documentLinks?: ProcessDocumentLink[];
  projectAddress?: ProcessAddress | null;
  dueTime?: string | null;
  pla?: boolean | null;
  wageDecisionId?: number | null;
  constructionType?: string | null;
  constructionSubtype?: string | null;
  mbePreference?: string | null;
  owner?: ProcessParty | null;
  architect?: ProcessParty | null;
  mechanicalEngineer?: ProcessParty | null;
  clearance?: ClearanceType;
  entityRule?: ProcessEntityRule | null;
  dueDate?: string | null;
  dateSubmitted?: string | null;
  amountSubmitted?: number | null;
  amendments?: unknown[];
  generalContractors?: ProcessGcOrMech[];
  mechanicals?: ProcessGcOrMech[];
  assignment?: ProcessAssignment | null;
  takeoffAssignments?: ProcessTakeoffAssignment[];
  labor?: {
    apprenticeship?: boolean | null;
    certifiedPayroll?: boolean | null;
    calculatedLaborRate?: number | null;
  } | null;
  ocipCcip?: { coversGl?: boolean | null; coversWc?: boolean | null } | null;
  lifts?: { needed?: boolean | null; addMoney?: number | null } | null;
  parking?: { paidToWorkers?: boolean | null; total?: number | null } | null;
  schedule?: Record<string, unknown> | null;
  relatedBidId?: number | null;
  relatedBidNote?: string | null;
  budgetOnly?: boolean | null;
  proposalIteration?: number | null;
  insulationSpecs?: Record<string, unknown> | null;
  /** Project-level Buy American — FRONTEND_SPEC_SHEET.md */
  buyAmerican?: boolean | null;
  /** Bid-level A+ — Setup only, not a spec-sheet column. FRONTEND_SPEC_SHEET.md */
  aPlus?: boolean | null;
  /** Client insulation schedules (Setup) — FRONTEND_SPEC_SHEET.md */
  specSheets?: SpecSheet[];
  technicalReview?: ProcessTechnicalReview | null;
  estimateReview?: Record<string, unknown> | null;
  proposalVersions?: unknown[];
  submission?: Record<string, unknown> | null;
  intelligence?: ProcessIntelligence | null;
  award?: ProcessAward | null;
  startup?: ProcessStartup | null;
  contractTiers?: ProcessContractTier[];
  bond?: {
    governmentOwned?: boolean | null;
    lastLaborDate?: string | null;
    billed100Percent?: boolean | null;
    claimDueDate?: string | null;
    notes?: string | null;
  } | null;
  lost?: ProcessLost | null;
  breadcrumbs?: { at?: string; text?: string }[];
  [key: string]: unknown;
}

/** Gates from GET /bids/:id — do not invent. */
export interface BidWorkflow {
  stage?: ProcessStage | string | null;
  outcome?: ProcessOutcome | string | null;
  canComplete?: boolean;
  completeBlockedReason?: string | null;
  canReturn?: boolean;
  /** Always true — last Pre tab */
  showOutcomeTab?: boolean;
  /** Always true until archived */
  outcomeEditable?: boolean;
  showAward?: boolean;
  showLost?: boolean;
  takeoffComparisons?: unknown;
  [key: string]: unknown;
}

export interface ProcessMetaEnumOption {
  value: string;
  label?: string;
}

export interface ProcessMeta {
  stages?: ProcessMetaEnumOption[] | string[];
  outcomes?: ProcessMetaEnumOption[] | string[];
  workTypes?: ProcessMetaEnumOption[] | string[];
  bidKinds?: ProcessMetaEnumOption[] | string[];
  bidKindLabels?: Record<string, string>;
  tierRoles?: ProcessMetaEnumOption[] | string[];
  intakeEditor?: {
    sketchTiers?: ProcessContractTier[];
    cascade?: string[];
    [key: string]: unknown;
  };
  clearances?: ProcessMetaEnumOption[] | string[];
  attachmentLabels?: string[] | Record<string, string>;
  hqExampleTiers?: ProcessContractTier[];
  defaults?: Record<string, unknown>;
  specSheetTemplates?: SpecSheetTemplateMeta[];
  specSheetEditor?: SpecSheetEditorMeta;
  [key: string]: unknown;
}

export interface WageDecision {
  id: number;
  decisionNumber?: string | null;
  label?: string | null;
  jurisdiction?: string | null;
  county?: string | null;
  category?: string | null;
  wage?: number | null;
  fringe?: number | null;
  asOf?: string | null;
  [key: string]: unknown;
}

/** UI chrome stages — Spec sheets after Setup, before Takeoff. */
export type BidChromeStage =
  | "intake"
  | "assignment"
  | "estimating_setup"
  | "spec_sheets"
  | "takeoff"
  | "proposal"
  | "post_bid"
  | "result"
  | "award"
  | "lost"
  | "production";

/** Pre strip — Spec sheets after Setup; Outcome last. */
export const BID_HANDOFF_STAGES: {
  id: Exclude<BidChromeStage, "award" | "lost" | "production">;
  label: string;
  short: string;
}[] = [
  { id: "intake", label: "Intake", short: "1 Intake" },
  { id: "assignment", label: "Assignment", short: "2 Assignment" },
  { id: "estimating_setup", label: "Setup", short: "3 Setup" },
  { id: "spec_sheets", label: "Spec sheets", short: "4 Spec sheets" },
  { id: "takeoff", label: "Takeoff", short: "5 Takeoff" },
  { id: "proposal", label: "Proposal", short: "6 Proposal" },
  { id: "post_bid", label: "Post-Bid", short: "7 Post-Bid" },
  { id: "result", label: "Outcome", short: "8 Outcome" },
];

const LEGACY_STAGE: Record<string, BidChromeStage> = {
  first_input: "intake",
  estimating: "estimating_setup",
  intelligence: "post_bid",
  awarded: "award",
  production: "production",
  outcome: "result",
};

const LEGACY_TAB: Record<string, BidChromeStage> = {
  setup: "intake",
  estimate: "proposal",
  specs: "takeoff",
  "spec-sheets": "spec_sheets",
  spec_sheets: "spec_sheets",
  intel: "post_bid",
  outcome: "result",
  result: "result",
  award: "award",
  production: "production",
};

/** Normalize BE/legacy stage → chrome stage id. */
export function normalizeProcessStage(
  raw: string | null | undefined
): BidChromeStage {
  const s = (raw || "").toLowerCase();
  if (
    s === "intake" ||
    s === "assignment" ||
    s === "estimating_setup" ||
    s === "spec_sheets" ||
    s === "takeoff" ||
    s === "proposal" ||
    s === "post_bid" ||
    s === "result" ||
    s === "award" ||
    s === "lost" ||
    s === "production"
  ) {
    return s;
  }
  return LEGACY_STAGE[s] ?? "intake";
}

/**
 * Parse `?stage=` (preferred) or legacy `?tab=`.
 * Falls back to bid's current process stage when URL empty.
 */
export function parseChromeStage(
  stageParam: string | null | undefined,
  tabParam?: string | null,
  bidStage?: string | null
): BidChromeStage {
  const fromStage = (stageParam || "").toLowerCase();
  if (fromStage) {
    if (LEGACY_TAB[fromStage]) return LEGACY_TAB[fromStage];
    return normalizeProcessStage(fromStage);
  }
  const fromTab = (tabParam || "").toLowerCase();
  if (fromTab && LEGACY_TAB[fromTab]) return LEGACY_TAB[fromTab];
  return normalizeProcessStage(bidStage);
}

export function formatWorkType(w: string | null | undefined): string {
  if (!w) return "—";
  return w.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatProcessStage(s: string | null | undefined): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    intake: "Intake",
    assignment: "Assignment",
    estimating_setup: "Setup",
    spec_sheets: "Spec sheets",
    takeoff: "Takeoff",
    proposal: "Proposal",
    post_bid: "Post-Bid",
    result: "Outcome",
    outcome: "Outcome",
    award: "Awarded",
    lost: "Lost",
    production: "Production",
    first_input: "Intake",
    estimating: "Setup",
    intelligence: "Post-Bid",
    awarded: "Awarded",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

export function formatOutcome(o: string | null | undefined): string {
  if (!o) return "Open";
  return o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function asOptions(
  raw: ProcessMetaEnumOption[] | string[] | undefined,
  fallback: string[]
): { value: string; label: string }[] {
  if (!raw || raw.length === 0) {
    return fallback.map((v) => ({
      value: v,
      label: formatWorkType(v),
    }));
  }
  return raw.map((item) =>
    typeof item === "string"
      ? { value: item, label: formatWorkType(item) }
      : {
          value: item.value,
          label: item.label || formatWorkType(item.value),
        }
  );
}

export function workTypeOptionsFromMeta(meta: ProcessMeta | null) {
  return asOptions(meta?.workTypes, [
    "demo",
    "insulation",
    "gc",
    "masonry",
    "other",
  ]);
}

export function stageOptionsFromMeta(meta: ProcessMeta | null) {
  return asOptions(meta?.stages, [
    "intake",
    "assignment",
    "estimating_setup",
    "takeoff",
    "proposal",
    "post_bid",
  ]);
}

export function outcomeOptionsFromMeta(meta: ProcessMeta | null) {
  return asOptions(meta?.outcomes, [
    "open",
    "awarded",
    "lost",
    "no_bid",
    "cancelled",
    "postponed",
  ]);
}

export function clearanceOptionsFromMeta(meta: ProcessMeta | null) {
  return asOptions(meta?.clearances, ["us_citizen", "us_person", "real_id"]);
}

export function bidKindOptionsFromMeta(meta: ProcessMeta | null) {
  /** FRONTEND_INTAKE.md — do not offer legacy `other` on new forms. */
  const required = [
    "built_to_print",
    "design_build",
    "design_assist",
    "budget",
    "unknown",
  ];
  const labels = meta?.bidKindLabels ?? {};
  const fromMeta = asOptions(meta?.bidKinds, required).map((o) => o.value);
  const values = [...new Set([...required, ...fromMeta])].filter(
    (v) => v !== "other"
  );
  return values.map((value) => ({
    value,
    label:
      (typeof labels[value] === "string" && labels[value]) ||
      formatWorkType(value),
  }));
}

export function tierRoleOptionsFromMeta(meta: ProcessMeta | null) {
  return asOptions(meta?.tierRoles, [
    "owner",
    "lessee",
    "cm",
    "gc",
    "first_tier",
    "mechanical",
    "us",
    "other",
  ]);
}

export function defaultSketchTiers(
  meta: ProcessMeta | null
): ProcessContractTier[] {
  const fromMeta = meta?.intakeEditor?.sketchTiers;
  if (Array.isArray(fromMeta) && fromMeta.length) {
    return fromMeta.map((t, i) => ({
      sortOrder: t.sortOrder ?? i,
      role: t.role ?? null,
      company: t.company ?? null,
      hasTheJob: t.hasTheJob ?? null,
      invitedUs: t.invitedUs ?? false,
      isPaying: t.isPaying ?? false,
    }));
  }
  return [
    {
      sortOrder: 0,
      role: "owner",
      company: null,
      hasTheJob: null,
      invitedUs: false,
      isPaying: true,
    },
    {
      sortOrder: 1,
      role: "lessee",
      company: null,
      hasTheJob: null,
      invitedUs: false,
      isPaying: false,
    },
    {
      sortOrder: 2,
      role: "gc",
      company: null,
      hasTheJob: null,
      invitedUs: false,
      isPaying: false,
    },
    {
      sortOrder: 3,
      role: "mechanical",
      company: null,
      hasTheJob: null,
      invitedUs: false,
      isPaying: false,
    },
    {
      sortOrder: 4,
      role: "us",
      company: "Goel",
      hasTheJob: false,
      invitedUs: false,
      isPaying: false,
    },
  ];
}

/** @deprecated use parseChromeStage */
export function parseLifecycleTab(
  raw: string | null | undefined
): BidChromeStage {
  return parseChromeStage(raw, raw, null);
}
