import type {
  FinancialsFilters,
  FinancialsQuery,
  JobRow,
  JobsResponse,
  SummaryResponse,
  SummaryRow,
} from "@/lib/project-financials/types";

/** Flip off when the live `/project-financials` API should drive the screens. */
export const PROJECT_FINANCIALS_USE_DEMO = true;

const AS_OF = "2026-10-02T18:00:00.000Z";

const HIDDEN = {
  overhead: null,
  billingsVsExpense: null,
  net: null,
  pctNet: null,
  netWith75Atp: null,
} as const;

export const DEMO_FILTERS: FinancialsFilters = {
  companies: [
    { entityId: 1, company: "GOEL" },
    { entityId: 2, company: "GOEL DC" },
    { entityId: 3, company: "DCB" },
  ],
  views: ["active", "all"],
  alerts: ["fix", "not_in_siteline", "any"],
  pms: ["Dave Rosowski", "Jibri Owens", "Tory Burton"],
};

function job(row: JobRow): JobRow {
  return row;
}

export const DEMO_JOBS: JobRow[] = [
  job({
    jobNumber: "21038",
    name: "Inova Fairfax MOB",
    customer: "Clark Construction",
    city: "Fairfax",
    state: "VA",
    entityId: 1,
    company: "GOEL",
    pm: "Dave Rosowski",
    pmEmail: "dave.rosowski@goelservices.com",
    status: "active",
    contract: {
      amount: 4_250_000,
      approvedCos: 186_400,
      atp: 42_500,
      inReview: 18_200,
      placeholder: 0,
      revised: 4_436_400,
      siteline: 4_436_400,
      difference: 0,
    },
    billing: {
      billed: 2_610_000,
      retainage: 130_500,
      backlog: 1_826_400,
      ar: 214_800,
      pctBilled: 0.588,
      percentComplete: 0.61,
      retentionOnly: false,
    },
    cost: {
      lab: 980_000,
      mat: 410_200,
      sub: 265_000,
      equ: 48_600,
      bur: 312_400,
      ins: 22_100,
      oth: 16_800,
      dis: 4_200,
      total: 2_059_300,
      labHours: 12480,
      laborRate: 78.53,
      laborWithBurden: 1_292_400,
      cashFlow: 550_700,
    },
    recon: { sitelineClearstory: "ok", difference: 0, overUnderBillings: 550_700, alerts: [] },
    sources: { siteline: true, clearstory: true, refJob: true, foundation: true },
  }),
  job({
    jobNumber: "21102",
    name: "Metro Tower core",
    customer: "Hensel Phelps",
    city: "Arlington",
    state: "VA",
    entityId: 1,
    company: "GOEL",
    pm: "Dave Rosowski",
    pmEmail: "dave.rosowski@goelservices.com",
    status: "active",
    contract: {
      amount: 1_875_000,
      approvedCos: 64_200,
      atp: 110_000,
      inReview: 36_400,
      placeholder: 25_000,
      revised: 1_939_200,
      siteline: 1_920_000,
      difference: 19_200,
    },
    billing: {
      billed: 640_500,
      retainage: 32_025,
      backlog: 1_298_700,
      ar: 88_400,
      pctBilled: 0.33,
      percentComplete: 0.29,
      retentionOnly: false,
    },
    cost: {
      lab: 240_000,
      mat: 96_500,
      sub: 40_000,
      equ: 12_200,
      bur: 76_800,
      ins: 6_100,
      oth: 3_400,
      dis: 900,
      total: 475_900,
      labHours: 3100,
      laborRate: 77.42,
      laborWithBurden: 316_800,
      cashFlow: 164_600,
    },
    recon: {
      sitelineClearstory: "fix",
      difference: 19_200,
      overUnderBillings: 164_600,
      alerts: [{ code: "FIX", label: "FIX" }],
    },
    sources: { siteline: true, clearstory: true, refJob: true, foundation: true },
  }),
  job({
    jobNumber: "20881",
    name: "School addition",
    customer: "Whiting-Turner",
    city: "Rockville",
    state: "MD",
    entityId: 3,
    company: "DCB",
    pm: "Jibri Owens",
    pmEmail: "jibri.owens@goelservices.com",
    status: "active",
    contract: {
      amount: 980_000,
      approvedCos: 22_150,
      atp: 0,
      inReview: 8_400,
      placeholder: 0,
      revised: 1_002_150,
      siteline: 1_002_150,
      difference: 0,
    },
    billing: {
      billed: 990_000,
      retainage: 49_500,
      backlog: 12_150,
      ar: 49_500,
      pctBilled: 0.988,
      percentComplete: 1,
      retentionOnly: true,
    },
    cost: {
      lab: 410_000,
      mat: 188_000,
      sub: 72_400,
      equ: 15_200,
      bur: 131_200,
      ins: 9_800,
      oth: 4_100,
      dis: 1_200,
      total: 831_900,
      labHours: 5400,
      laborRate: 75.93,
      laborWithBurden: 541_200,
      cashFlow: 158_100,
    },
    recon: { sitelineClearstory: "ok", difference: 0, overUnderBillings: 158_100, alerts: [] },
    sources: { siteline: true, clearstory: true, refJob: true, foundation: true },
  }),
  job({
    jobNumber: "20944",
    name: "Lab fit-out",
    customer: "DPR",
    city: "Bethesda",
    state: "MD",
    entityId: 3,
    company: "DCB",
    pm: "Jibri Owens",
    pmEmail: "jibri.owens@goelservices.com",
    status: "inactive",
    contract: {
      amount: 640_000,
      approvedCos: 0,
      atp: 0,
      inReview: 0,
      placeholder: 0,
      revised: 640_000,
      siteline: 640_000,
      difference: 0,
    },
    billing: {
      billed: 640_000,
      retainage: 0,
      backlog: 0,
      ar: 0,
      pctBilled: 1,
      percentComplete: 1,
      retentionOnly: false,
    },
    cost: {
      lab: 210_000,
      mat: 140_000,
      sub: 55_000,
      equ: 8_000,
      bur: 67_200,
      ins: 4_400,
      oth: 2_100,
      dis: 600,
      total: 487_300,
      labHours: 2800,
      laborRate: 75,
      laborWithBurden: 277_200,
      cashFlow: 152_700,
    },
    recon: { sitelineClearstory: "ok", difference: 0, overUnderBillings: 152_700, alerts: [] },
    sources: { siteline: true, clearstory: true, refJob: true, foundation: true },
  }),
  job({
    jobNumber: "21145 - 02",
    name: "Hospital wing",
    customer: "Turner",
    city: "Washington",
    state: "DC",
    entityId: 2,
    company: "GOEL DC",
    pm: "Tory Burton",
    pmEmail: "tory.burton@goelservices.com",
    status: "active",
    contract: {
      amount: 6_400_000,
      approvedCos: 510_000,
      atp: 220_000,
      inReview: 74_000,
      placeholder: 40_000,
      revised: 6_910_000,
      siteline: null,
      difference: null,
    },
    billing: {
      billed: 2_150_000,
      retainage: 107_500,
      backlog: 4_760_000,
      ar: 640_200,
      pctBilled: 0.311,
      percentComplete: 0.27,
      retentionOnly: false,
    },
    cost: {
      lab: 0,
      mat: 0,
      sub: 0,
      equ: 0,
      bur: 0,
      ins: 0,
      oth: 0,
      dis: 0,
      total: 0,
      labHours: 0,
      laborRate: null,
      laborWithBurden: 0,
      cashFlow: null,
    },
    recon: {
      sitelineClearstory: "not_in_siteline",
      difference: null,
      overUnderBillings: null,
      alerts: [{ code: "NOT_IN_SITELINE", label: "NOT IN SITELINE" }],
    },
    sources: { siteline: true, clearstory: true, refJob: true, foundation: false },
  }),
  job({
    jobNumber: "20710",
    name: "Parking garage",
    customer: "Balfour Beatty",
    city: "Alexandria",
    state: "VA",
    entityId: 2,
    company: "GOEL DC",
    pm: "Tory Burton",
    pmEmail: "tory.burton@goelservices.com",
    status: "siteline_only",
    contract: {
      amount: 0,
      approvedCos: 0,
      atp: 0,
      inReview: 0,
      placeholder: 0,
      revised: 0,
      siteline: 412_000,
      difference: -412_000,
    },
    billing: {
      billed: 88_400,
      retainage: 4_420,
      backlog: 323_600,
      ar: 22_100,
      pctBilled: 0.215,
      percentComplete: null,
      retentionOnly: false,
    },
    cost: {
      lab: 21_000,
      mat: 8_400,
      sub: 0,
      equ: 1_200,
      bur: 6_720,
      ins: 400,
      oth: 0,
      dis: 0,
      total: 37_720,
      labHours: 280,
      laborRate: 75,
      laborWithBurden: 27_720,
      cashFlow: 50_680,
    },
    recon: {
      sitelineClearstory: "fix",
      difference: -412_000,
      overUnderBillings: 50_680,
      alerts: [{ code: "FIX", label: "FIX" }],
    },
    sources: { siteline: true, clearstory: false, refJob: false, foundation: true },
  }),
];

const DEMO_SUMMARY: SummaryRow[] = [
  {
    pm: "Dave Rosowski",
    activeBillings: 3_250_500,
    backlog: 3_125_100,
    ar: 303_200,
    atp: 152_500,
    atpPctOfBillings: 0.0469,
    openJobs: 2,
    activeJobs: 2,
    retentionOnly: 0,
    totalCost: 2_535_200,
    cashFlow: 715_300,
    fixCount: 0,
    notInSitelineCount: 0,
    ...HIDDEN,
  },
  {
    pm: "Jibri Owens",
    activeBillings: 990_000,
    backlog: 12_150,
    ar: 49_500,
    atp: 0,
    atpPctOfBillings: 0,
    openJobs: 2,
    activeJobs: 1,
    retentionOnly: 1,
    totalCost: 831_900,
    cashFlow: 158_100,
    fixCount: 0,
    notInSitelineCount: 0,
    ...HIDDEN,
  },
  {
    pm: "Tory Burton",
    activeBillings: 2_238_400,
    backlog: 5_083_600,
    ar: 662_300,
    atp: 220_000,
    atpPctOfBillings: 0.0983,
    openJobs: 2,
    activeJobs: 2,
    retentionOnly: 0,
    totalCost: 37_720,
    cashFlow: 50_680,
    fixCount: 0,
    notInSitelineCount: 0,
    ...HIDDEN,
  },
];

function matchesJob(row: JobRow, query: FinancialsQuery): boolean {
  if (query.view === "active" && row.status !== "active") return false;
  if (query.entityId != null && row.entityId !== query.entityId) return false;
  if (query.pm && !`${row.pm ?? ""}`.toLowerCase().includes(query.pm.toLowerCase())) return false;
  if (query.search) {
    const hay = [row.jobNumber, row.name, row.customer, row.pm, row.company]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(query.search.toLowerCase())) return false;
  }
  if (query.alert === "any" && row.recon.alerts.length === 0) return false;
  if (query.alert === "fix" && !row.recon.alerts.some((alert) => alert.code === "FIX")) return false;
  if (query.alert === "not_in_siteline" && !row.recon.alerts.some((alert) => alert.code === "NOT_IN_SITELINE")) {
    return false;
  }
  return true;
}

function alertCounts(jobs: JobRow[]): { fix: number; notInSiteline: number } {
  return {
    fix: jobs.filter((row) => row.recon.alerts.some((alert) => alert.code === "FIX")).length,
    notInSiteline: jobs.filter((row) => row.recon.alerts.some((alert) => alert.code === "NOT_IN_SITELINE")).length,
  };
}

function sumRow(pm: string, rows: SummaryRow[]): SummaryRow {
  const activeBillings = rows.reduce((n, r) => n + r.activeBillings, 0);
  const atp = rows.reduce((n, r) => n + r.atp, 0);
  const cash = rows.reduce((n, r) => n + (r.cashFlow ?? 0), 0);
  return {
    pm,
    activeBillings,
    backlog: rows.reduce((n, r) => n + r.backlog, 0),
    ar: rows.reduce((n, r) => n + r.ar, 0),
    atp,
    atpPctOfBillings: activeBillings ? atp / activeBillings : null,
    openJobs: rows.reduce((n, r) => n + r.openJobs, 0),
    activeJobs: rows.reduce((n, r) => n + r.activeJobs, 0),
    retentionOnly: rows.reduce((n, r) => n + r.retentionOnly, 0),
    totalCost: rows.reduce((n, r) => n + r.totalCost, 0),
    cashFlow: rows.length ? cash : null,
    fixCount: rows.reduce((n, r) => n + r.fixCount, 0),
    notInSitelineCount: rows.reduce((n, r) => n + r.notInSitelineCount, 0),
    ...HIDDEN,
  };
}

export function demoSummary(query: FinancialsQuery): SummaryResponse {
  const jobs = DEMO_JOBS.filter((row) => matchesJob(row, query));
  const pms = new Set(jobs.map((row) => row.pm).filter((pm): pm is string => Boolean(pm)));
  const rows = DEMO_SUMMARY.filter((row) => {
    if (query.pm && !row.pm.toLowerCase().includes(query.pm.toLowerCase())) return false;
    if (query.entityId != null || query.search || query.view === "active" || query.alert) return pms.has(row.pm);
    return true;
  }).map((row) => {
    const mine = jobs.filter((job) => job.pm === row.pm);
    const counts = alertCounts(mine);
    return { ...row, fixCount: counts.fix, notInSitelineCount: counts.notInSiteline };
  });
  return {
    asOf: AS_OF,
    missing: [],
    alerts: alertCounts(jobs),
    rows,
    totals: sumRow("Total", rows),
  };
}

export function demoJobs(query: FinancialsQuery): JobsResponse {
  return {
    asOf: AS_OF,
    missing: [],
    alerts: alertCounts(DEMO_JOBS.filter((row) => matchesJob(row, query))),
    jobs: DEMO_JOBS.filter((row) => matchesJob(row, query)),
  };
}

export function demoJob(jobNumber: string): JobRow | undefined {
  return DEMO_JOBS.find((row) => row.jobNumber === jobNumber);
}
