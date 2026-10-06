"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BidStageProgressBar } from "@/components/bidding/BidStageProgressBar";
import { BidStatusBadge } from "@/components/bidding/BidStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { useAuth } from "@/contexts/AuthContext";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useCompany } from "@/contexts/CompanyContext";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import type { BidListStatusCounts } from "@/lib/api/endpoints/bidding";
import { updateProfile } from "@/lib/api/endpoints/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatBidDateAndTime, formatDate, formatMoney } from "@/lib/bidding/format";
import { personDisplayName } from "@/lib/bidding/person-label";
import { teamColorForId } from "@/lib/bidding/team-colors";
import { entityBrandForName } from "@/lib/branding/entity-colors";
import { formatOutcome, formatProcessStage, formatWorkType } from "@/lib/bidding/process-types";
import type { BidCaptainLookup, BidListItem, BidStatus, BidTeam } from "@/lib/bidding/types";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { SavedViewTabs, conditionKey } from "@/components/filters/SavedViewTabs";
import {
  rowMatchesGroups,
  loadSavedViews,
  saveSavedViews,
  type FilterCondition,
  type FilterGroup,
  type SavedView,
} from "@/lib/filters/types";
import { BIDDING_FILTER_FIELDS_KEY, BIDDING_SAVED_VIEWS_KEY, FILTER_FIELDS, loadSelectedFilterFields, saveSelectedFilterFields } from "@/lib/bidding/savedViews";
import { newId } from "@/lib/bidding/newId";

type StatusFilter = "all" | BidStatus;
type SortKey =
  | "updated"
  | "name"
  | "estimate"
  | "drawingNumber"
  | "dueDate"
  | "bidDate"
  | "estimator"
  | "captain"
  | "internalBidDate"
  | "takeoffTurnedIn"
  | "status"
  | "stage"
  | "outcome"
  | "workType"
  | "baseBid"
  | "contractAmount"
  | "jobStartDate"
  | "office";
type SortDir = "asc" | "desc";

const BID_PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_BID_PAGE_SIZE = 25;

function sortQuery(key: SortKey): string {
  switch (key) {
    case "name":
      return "bidName";
    case "estimate":
      return "estimateNumber";
    case "stage":
      return "processStage";
    case "outcome":
      return "outcomeStatus";
    case "baseBid":
      return "baseBidAmount";
    case "office":
      return "companyName";
    case "updated":
      return "updated";
    default:
      return key;
  }
}

function BidListPager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink/50">
        {total === 0 ? "0 estimates" : `${start}–${end} of ${total.toLocaleString()}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="bids-page-size">
          Rows per page
        </label>
        <select
          id="bids-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="cs-field h-9 border px-2.5 text-[13px] font-medium text-ink"
        >
          {BID_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="cs-field h-9 border px-3 text-[13px] font-medium text-ink disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-medium text-ink-muted">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="cs-field h-9 border px-3 text-[13px] font-medium text-ink disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "archived", label: "Archived" },
];

const WORK_TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "insulation", label: "Insulation" },
  { value: "demo", label: "Demo" },
  { value: "gc", label: "GC" },
  { value: "masonry", label: "Masonry" },
  { value: "other", label: "Other" },
];

const STAGE_FILTERS = [
  { value: "", label: "All" },
  { value: "intake", label: "Intake" },
  { value: "assignment", label: "Assignment" },
  { value: "estimating_setup", label: "Handoff" },
  { value: "takeoff", label: "Takeoff" },
  { value: "proposal", label: "Proposal" },
  { value: "post_bid", label: "Post-Bid" },
  { value: "result", label: "Outcome" },
];

const OUTCOME_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "awarded", label: "Awarded" },
  { value: "lost", label: "Lost" },
  { value: "no_bid", label: "No bid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "bidDate", label: "Bid date" },
  { value: "name", label: "Name" },
  { value: "office", label: "Company" },
  { value: "captain", label: "Team captain" },
  { value: "stage", label: "Current progress" },
  { value: "outcome", label: "Outcome" },
  { value: "baseBid", label: "Base bid" },
  { value: "status", label: "Record" },
  { value: "updated", label: "Last updated" },
  { value: "estimate", label: "Estimate #" },
  { value: "internalBidDate", label: "Internal bid date" },
  { value: "workType", label: "Work type" },
  { value: "contractAmount", label: "Contract amount" },
  { value: "jobStartDate", label: "Job start date" },
];

const ESTIMATES_FILTER_CATALOG: { key: string; label: string }[] = [
  { key: "search", label: "Search" },
  { key: "processStage", label: "Current progress" },
  { key: "bidDate", label: "Bid date" },
  { key: "captain", label: "Team captain" },
  { key: "entityId", label: "Company" },
  { key: "workType", label: "Work type" },
  { key: "outcome", label: "Outcome" },
  { key: "bidKind", label: "Bid type" },
  { key: "constructionType", label: "Building type" },
];

const DEFAULT_FILTER_KEYS = ["search", "processStage", "bidDate", "captain"];

function defaultSortDir(key: SortKey): SortDir {
  if (
    key === "bidDate" ||
    key === "dueDate" ||
    key === "updated" ||
    key === "jobStartDate" ||
    key === "baseBid" ||
    key === "contractAmount"
  ) {
    return "desc";
  }
  return "asc";
}

function SortableTh({
  label,
  column,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 text-left font-semibold ${
          active ? "text-ink" : "text-ink/50 hover:text-ink"
        }`}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

/** Bordered filter chip with a custom dropdown that always opens below the trigger (native <select> lets the browser decide, which can open upward). */
function FilterSelect({
  prefix,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? prefix}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/50 pl-3 pr-2.5 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none backdrop-blur-md transition hover:bg-white/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        <span className="truncate">
          {prefix}: {current?.label}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel ?? prefix}
          className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-max overflow-hidden rounded-xl border border-ink/10 bg-white p-1.5 shadow-[0_12px_28px_rgba(1,1,1,0.16)]"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected ? "bg-brand/10 font-semibold text-ink" : "font-medium text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                {prefix}: {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Let long emails wrap before @ instead of splitting a word in half. */
function softBreakText(text: string) {
  const parts = text.split("@");
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    <span key={`${index}-${part}`}>
      {index > 0 ? (
        <>
          <wbr />@
        </>
      ) : null}
      {part}
    </span>
  ));
}

export default function BiddingListPage() {
  const { companyId } = useCompany();
  const { user, setUser } = useAuth();
  const { canRead, canWrite } = useBiddingAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [workType, setWorkType] = useState("");
  const [processStage, setProcessStage] = useState("");
  const [outcome, setOutcome] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bidDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [estimatorOptions, setEstimatorOptions] = useState<{ value: string; label: string }[]>([]);
  const [captainLookup, setCaptainLookup] = useState<BidCaptainLookup[]>([]);
  const [teams, setTeams] = useState<BidTeam[]>([]);
  const [bids, setBids] = useState<BidListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeConditionKeys, setActiveConditionKeys] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  /** Show every crew — GET /bids?teamId=all (when user is normally team-scoped). */
  const [showAllTeams, setShowAllTeams] = useState(false);
  /** AE / user: internal takeoff list unless they open the full team table. */
  const [teamTable, setTeamTable] = useState(false);
  const [captainFilter, setCaptainFilter] = useState("");
  const [bidKindFilter, setBidKindFilter] = useState("");
  const [constructionFilter, setConstructionFilter] = useState("");
  const [localBidFrom, setLocalBidFrom] = useState("");
  const [localBidTo, setLocalBidTo] = useState("");
  const [filterKeys, setFilterKeys] = useState<string[]>(DEFAULT_FILTER_KEYS);
  const [crmFieldKeys, setCrmFieldKeys] = useState<string[]>([]);
  const [filterSaveError, setFilterSaveError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_BID_PAGE_SIZE);
  const [serverPaged, setServerPaged] = useState(false);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const serverPagedRef = useRef(serverPaged);
  pageRef.current = page;
  pageSizeRef.current = pageSize;
  serverPagedRef.current = serverPaged;
  const [serverTotal, setServerTotal] = useState(0);
  const [serverCounts, setServerCounts] = useState<BidListStatusCounts | null>(null);
  const filterKeysHydratedFor = useRef<number | null>(null);
  const filterSaveTimer = useRef<number | null>(null);
  const hasLoadedBids = useRef(false);

  /** Scoped per-user so switching accounts on the same browser doesn't leak someone else's saved views. */
  const savedViewsKey = user ? `${BIDDING_SAVED_VIEWS_KEY}:${user.id}` : null;
  const crmFieldsKey = user ? `${BIDDING_FILTER_FIELDS_KEY}:${user.id}` : null;

  useEffect(() => {
    setSavedViews(savedViewsKey ? loadSavedViews(savedViewsKey) : []);
  }, [savedViewsKey]);

  useEffect(() => {
    setCrmFieldKeys(crmFieldsKey ? loadSelectedFilterFields(crmFieldsKey) : []);
  }, [crmFieldsKey]);

  useEffect(() => {
    void biddingApi
      .getBiddingCaptains()
      .then((captains) => {
        setCaptainLookup(captains);
        const names = [
          ...new Set(
            captains
              .map((c) =>
                personDisplayName({
                  firstName: c.firstName,
                  lastName: c.lastName,
                  name: c.name,
                  email: c.email,
                })
              )
              .filter((n) => n.trim())
          ),
        ];
        names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setEstimatorOptions(names.map((name) => ({ value: name, label: name })));
      })
      .catch(() => {
        setCaptainLookup([]);
        setEstimatorOptions([]);
      });
    void biddingApi
      .getBiddingTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const teamNameFor = useCallback(
    (teamId: number | null | undefined) => {
      if (teamId == null || !Number.isFinite(Number(teamId))) return null;
      return teams.find((t) => t.id === Number(teamId))?.teamName ?? null;
    },
    [teams]
  );

  const resolveCaptainLabel = useCallback(
    (raw: string | null | undefined) => {
      const needle = raw?.trim();
      if (!needle) return "—";
      const lower = needle.toLowerCase();
      const hit = captainLookup.find(
        (c) =>
          c.email?.toLowerCase() === lower ||
          c.name?.toLowerCase() === lower ||
          personDisplayName({
            firstName: c.firstName,
            lastName: c.lastName,
            name: c.name,
            email: c.email,
          }).toLowerCase() === lower
      );
      if (hit) {
        return personDisplayName({
          firstName: hit.firstName,
          lastName: hit.lastName,
          name: hit.name,
          email: hit.email,
        });
      }
      return personDisplayName({ name: needle });
    },
    [captainLookup]
  );

  /** Estimator options come from captains, not contacts?role=estimator.
   * Other dynamic selects still come from values already on loaded bids. */
  const dynamicOptions = useMemo(() => {
    const uniqueOptions = (key: keyof BidListItem) => {
      const seen = new Set<string>();
      for (const b of bids) {
        const v = b[key];
        if (typeof v === "string" && v.trim()) seen.add(v.trim());
      }
      return [...seen].sort().map((v) => ({ value: v, label: v }));
    };
    return {
      estimator: estimatorOptions.length > 0 ? estimatorOptions : uniqueOptions("estimator"),
      captain: estimatorOptions.length > 0 ? estimatorOptions : uniqueOptions("captain"),
      bidClerk: uniqueOptions("bidClerk"),
      takeOffPerson: uniqueOptions("takeOffPerson"),
      takeOffPerson2: uniqueOptions("takeOffPerson2"),
      takeOffPerson3: uniqueOptions("takeOffPerson3"),
      clientCompanyName: uniqueOptions("clientCompanyName"),
      contactName: uniqueOptions("contactName"),
      companyName: uniqueOptions("companyName"),
    };
  }, [bids, estimatorOptions]);

  const entityId = companyId ? Number(companyId) : undefined;
  const role = user?.role;
  const isTeamScopedRole =
    role === "captain" ||
    role === "assistant_estimator" ||
    role === "user";
  const hasCrew = user?.teamId != null;
  const promptPickCrew =
    (role === "captain" || role === "assistant_estimator") && !hasCrew;
  const isInternalRole = role === "assistant_estimator" || role === "user";
  const internalList = isInternalRole && !teamTable;
  useEffect(() => {
    if (!user) return;
    if (filterKeysHydratedFor.current === user.id) return;
    filterKeysHydratedFor.current = user.id;
    const saved = user.estimatesFilterKeys;
    setFilterKeys(saved && saved.length > 0 ? saved : DEFAULT_FILTER_KEYS);
  }, [user]);

  useEffect(() => {
    return () => {
      if (filterSaveTimer.current != null) window.clearTimeout(filterSaveTimer.current);
    };
  }, []);

  const showFilter = (key: string) => filterKeys.includes(key);

  const toggleListFilter = (key: string, on: boolean) => {
    setFilterSaveError(null);
    setFilterKeys((prev) => {
      const next = on ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key);
      const saved = next.length > 0 ? next : [...DEFAULT_FILTER_KEYS];
      if (filterSaveTimer.current != null) window.clearTimeout(filterSaveTimer.current);
      filterSaveTimer.current = window.setTimeout(() => {
        void updateProfile({ estimatesFilterKeys: saved })
          .then((updated) => setUser(updated))
          .catch((e) => setFilterSaveError(getApiErrorMessage(e, "Couldn't save filters")));
      }, 400);
      return saved;
    });
  };

  const toggleCrmField = (key: string, on: boolean) => {
    setCrmFieldKeys((prev) => {
      const next = on ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key);
      if (crmFieldsKey) saveSelectedFilterFields(crmFieldsKey, next);
      return next;
    });
  };

  const sidebarDateFilters = useMemo(() => {
    if (filterGroups.length !== 1) return {};
    const condition = filterGroups[0].conditions.find(
      (item) => item.field === "bidDate" && item.op === "between"
    );
    return {
      bidDateFrom: condition?.start || undefined,
      bidDateTo: condition?.end || undefined,
    };
  }, [filterGroups]);

  const listParams = useMemo(
    () => ({
      entityId: entityId && !Number.isNaN(entityId) ? entityId : undefined,
      search: search.trim() || undefined,
      workType: workType || undefined,
      processStage: processStage || undefined,
      outcome: outcome || undefined,
      status: status === "all" ? undefined : status,
      teamId: isTeamScopedRole && showAllTeams ? ("all" as const) : undefined,
      sort: sortQuery(sortKey),
      sortDir,
      view: isInternalRole ? (internalList ? ("internal" as const) : ("all" as const)) : undefined,
      bidDateFrom: localBidFrom || sidebarDateFilters.bidDateFrom,
      bidDateTo: localBidTo || sidebarDateFilters.bidDateTo,
    }),
    [
      entityId,
      search,
      workType,
      processStage,
      outcome,
      status,
      isTeamScopedRole,
      showAllTeams,
      sortKey,
      sidebarDateFilters,
      isInternalRole,
      internalList,
      localBidFrom,
      localBidTo,
      sortDir,
    ]
  );

  /** Sidebar OR-groups, captain, bid type, and building type are still applied in the browser. */
  const needsFullList = useMemo(() => {
    if (captainFilter || bidKindFilter.trim() || constructionFilter.trim()) return true;
    if (filterGroups.length > 1) return true;
    if (filterGroups.length === 1) {
      return filterGroups[0].conditions.some(
        (c) => !(c.field === "bidDate" && c.op === "between")
      );
    }
    return false;
  }, [captainFilter, bidKindFilter, constructionFilter, filterGroups]);

  const listQueryKey = useMemo(
    () =>
      JSON.stringify({
        listParams,
        captainFilter,
        bidKindFilter,
        constructionFilter,
        filterGroups,
        needsFullList,
      }),
    [listParams, captainFilter, bidKindFilter, constructionFilter, filterGroups, needsFullList]
  );
  const listQueryKeyRef = useRef(listQueryKey);
  if (listQueryKeyRef.current !== listQueryKey) {
    listQueryKeyRef.current = listQueryKey;
    if (page !== 1) setPage(1);
  }

  /** Guards against an earlier in-flight fetch resolving after a newer one and
   * clobbering fresher data — e.g. one fired before auth/role context settled. */
  const bidsRequestSeqRef = useRef(0);

  // Backend auto-scopes by JWT teamId; pass teamId=all only when toggled.
  const loadBids = useCallback(async () => {
    const seq = ++bidsRequestSeqRef.current;
    if (hasLoadedBids.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await biddingApi.listBidsPage({
        entityId: listParams.entityId,
        search: listParams.search,
        workType: listParams.workType,
        processStage: listParams.processStage,
        outcome: listParams.outcome,
        teamId: listParams.teamId,
        bidDateFrom: listParams.bidDateFrom,
        bidDateTo: listParams.bidDateTo,
        sort: listParams.sort,
        sortDir: listParams.sortDir,
        view: listParams.view,
        // Status stays client-side while the body is still a full array.
        status: !needsFullList && serverPagedRef.current ? listParams.status : undefined,
        page: needsFullList ? undefined : pageRef.current,
        pageSize: needsFullList ? undefined : pageSizeRef.current,
      });
      if (seq !== bidsRequestSeqRef.current) return; // a newer request superseded this one
      setBids(result.items);
      setServerPaged(result.serverPaged && !needsFullList);
      setServerTotal(result.total);
      setServerCounts(result.counts ?? null);
      if (result.serverPaged && !needsFullList && result.page !== pageRef.current) {
        setPage(result.page);
      }
    } catch (e) {
      if (seq !== bidsRequestSeqRef.current) return;
      setError(getApiErrorMessage(e, "Failed to load bids"));
      setBids([]);
      setServerPaged(false);
      setServerTotal(0);
      setServerCounts(null);
    } finally {
      if (seq === bidsRequestSeqRef.current) {
        hasLoadedBids.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [listParams, needsFullList]);

  // Page clicks hit the network only after the server returns a page envelope.
  // A bare array is sliced in the browser.
  useEffect(() => {
    const t = setTimeout(() => void loadBids(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadBids, search, serverPaged, serverPaged ? page : 0, serverPaged ? pageSize : 0]);

  /**
   * Best-effort: pull bidDate/clientCompanyName out of the sidebar filters for the
   * server export, so it isn't silently narrower than what's on screen. Only when
   * exactly one group is active — multiple OR'd groups can't be losslessly flattened
   * into query params, so those fall back to unfiltered-by-these-two on the server
   * (same as before; the on-screen list/client export still apply them correctly).
   */
  const singleGroupSidebarFilters = () => {
    if (filterGroups.length !== 1) return {};
    const conditions = filterGroups[0].conditions;
    const bidDateCond = conditions.find((c) => c.field === "bidDate" && c.op === "between");
    const companyCond = conditions.find((c) => c.field === "clientCompanyName" && c.op === "is");
    return {
      bidDateFrom: bidDateCond?.start || undefined,
      bidDateTo: bidDateCond?.end || undefined,
      clientCompanyName: companyCond?.value || undefined,
    };
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const blob = await biddingApi.exportBids({
        entityId: listParams.entityId,
        search: listParams.search,
        workType: listParams.workType,
        processStage: listParams.processStage,
        outcome: listParams.outcome,
        status: listParams.status,
        teamId: listParams.teamId,
        ...singleGroupSidebarFilters(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bids.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(getApiErrorMessage(e, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const counts = useMemo(() => {
    const byStatus: Record<BidStatus, number> = { draft: 0, submitted: 0, archived: 0 };
    for (const bid of bids) byStatus[bid.status] += 1;
    return { total: bids.length, ...byStatus };
  }, [bids]);

  const visibleBids = useMemo(() => {
    if (serverPaged) return bids;
    const filtered = (status === "all" ? bids : bids.filter((b) => b.status === status))
      .filter((b) => rowMatchesGroups(b as unknown as Record<string, unknown>, filterGroups))
      .filter((b) => !captainFilter || resolveCaptainLabel(b.captain || b.estimator) === captainFilter)
      .filter((b) => {
        const q = bidKindFilter.trim().toLowerCase();
        return !q || (b.bidKind || "").toLowerCase().includes(q);
      })
      .filter((b) => {
        const q = constructionFilter.trim().toLowerCase();
        return !q || (b.constructionType || "").toLowerCase().includes(q);
      });
    return [...filtered].sort((a, b) => {
      const cmp = (() => {
        switch (sortKey) {
          case "name":
            return (a.bidName ?? "").localeCompare(b.bidName ?? "", undefined, { sensitivity: "base" });
          case "estimate":
            return a.estimateNumber.localeCompare(b.estimateNumber, undefined, { numeric: true });
          case "drawingNumber":
            return (a.drawingNumber ?? "").localeCompare(b.drawingNumber ?? "", undefined, { numeric: true });
          case "dueDate":
            return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
          case "bidDate":
            return (a.bidDate ?? "").localeCompare(b.bidDate ?? "");
          case "estimator":
            return (a.estimator ?? "").localeCompare(b.estimator ?? "", undefined, { sensitivity: "base" });
          case "captain":
            return (a.captain || a.estimator || "").localeCompare(b.captain || b.estimator || "", undefined, {
              sensitivity: "base",
            });
          case "internalBidDate":
            return (a.internalBidDate ?? "").localeCompare(b.internalBidDate ?? "");
          case "takeoffTurnedIn":
            return Number(a.takeoffTurnedIn === true) - Number(b.takeoffTurnedIn === true);
          case "status":
            return a.status.localeCompare(b.status);
          case "stage":
            return (a.processStage ?? "").localeCompare(b.processStage ?? "");
          case "outcome":
            return (a.outcomeStatus ?? "").localeCompare(b.outcomeStatus ?? "");
          case "workType":
            return (a.workType ?? "").localeCompare(b.workType ?? "");
          case "baseBid":
            return (a.baseBidAmount ?? -Infinity) - (b.baseBidAmount ?? -Infinity);
          case "contractAmount":
            return (a.contractAmount ?? -Infinity) - (b.contractAmount ?? -Infinity);
          case "jobStartDate":
            return (a.jobStartDate ?? "").localeCompare(b.jobStartDate ?? "");
          case "office":
            return (a.companyName ?? "").localeCompare(b.companyName ?? "", undefined, { sensitivity: "base" });
          default:
            return a.updatedAt.localeCompare(b.updatedAt);
        }
      })();
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [bids, serverPaged, status, sortKey, sortDir, filterGroups, captainFilter, bidKindFilter, constructionFilter, resolveCaptainLabel]);

  const filteredTotal = serverPaged ? serverTotal : visibleBids.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize) || 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = serverPaged
    ? visibleBids
    : visibleBids.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportToExcel = useCallback(() => {
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(
        visibleBids.map((b) => ({
          "Estimate #": b.estimateNumber,
          "Bid name": b.bidName,
          Contractor: b.clientCompanyName ?? "",
          "Team captain": b.captain ?? "",
          "Contract amount": b.contractAmount ?? "",
          "Cash expense": b.cashExpense ?? "",
          "Job start date": b.jobStartDate ?? "",
          "Job end date": b.jobEndDate ?? "",
          Status: b.status,
          "Work type": formatWorkType(b.workType ?? undefined),
          "Current progress": formatProcessStage(b.processStage ?? undefined),
          Outcome: formatOutcome(b.outcomeStatus ?? undefined),
          "Bid date": b.bidDate ?? "",
          "Internal bid date": b.internalBidDate ?? "",
          "Turned in": b.takeoffTurnedIn ? "Yes" : "",
          Updated: b.updatedAt,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estimates");
      XLSX.writeFile(wb, "estimates-export.xlsx");
    });
  }, [visibleBids]);

  const applyFilterGroups = (groups: FilterGroup[]) => {
    setActiveConditionKeys([]);
    setFilterGroups(groups);
    setFilterOpen(false);
  };

  const saveAsView = (name: string, groups: FilterGroup[]) => {
    const view: SavedView = { id: newId(), name, groups };
    const next = [...savedViews, view];
    setSavedViews(next);
    if (savedViewsKey) saveSavedViews(savedViewsKey, next);
    setFilterOpen(false);
    // Saving only creates the chips — it does not apply the filter to the table.
  };

  const findCondition = (views: SavedView[], key: string): FilterCondition | undefined => {
    const [viewId, conditionId] = key.split("::");
    const view = views.find((v) => v.id === viewId);
    return view?.groups.flatMap((g) => g.conditions).find((c) => c.id === conditionId);
  };

  const groupsForActiveKeys = (keys: string[], views: SavedView[]): FilterGroup[] =>
    keys
      .map((k) => findCondition(views, k))
      .filter((c): c is FilterCondition => Boolean(c))
      .map((c) => ({ id: newId(), conditions: [c] }));

  const toggleCondition = (viewId: string, condition: FilterCondition) => {
    const key = conditionKey(viewId, condition.id);
    setActiveConditionKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setFilterGroups(groupsForActiveKeys(next, savedViews));
      return next;
    });
  };

  const removeSavedView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    if (savedViewsKey) saveSavedViews(savedViewsKey, next);
    setActiveConditionKeys((prev) => {
      const nextKeys = prev.filter((k) => !k.startsWith(`${id}::`));
      if (nextKeys.length !== prev.length) setFilterGroups(groupsForActiveKeys(nextKeys, next));
      return nextKeys;
    });
  };

  const clearView = () => {
    setActiveConditionKeys([]);
    setFilterGroups([]);
  };

  const activeFilterCount = useMemo(() => filterGroups.reduce((n, g) => n + g.conditions.length, 0), [filterGroups]);

  const emptyMessage = useMemo(() => {
    if (error) return error;
    if (search.trim()) return "No bids match your search.";
    if (status !== "all") return "No bids with this status.";
    return "No estimates yet.";
  }, [error, search, status]);

  const toggleStatus = (value: StatusFilter) =>
    setStatus((prev) => (prev === value ? "all" : value));

  const listColumns: { key: SortKey; label: string; width: string }[] = internalList
    ? [
        { key: "estimate", label: "Estimate #", width: "min-w-[7.5rem]" },
        { key: "name", label: "Name", width: "min-w-[14rem]" },
        { key: "internalBidDate", label: "Internal bid date", width: "min-w-[8.5rem]" },
        { key: "takeoffTurnedIn", label: "Turned in", width: "min-w-[5.5rem]" },
      ]
    : [
        { key: "estimate", label: "Estimate #", width: "min-w-[7.5rem]" },
        { key: "name", label: "Name", width: "min-w-[14rem]" },
        { key: "bidDate", label: "Bid date & time", width: "min-w-[8.5rem]" },
        { key: "office", label: "Company", width: "min-w-[8rem]" },
        { key: "captain", label: "Team captain", width: "min-w-[9rem]" },
        { key: "stage", label: "Current progress", width: "min-w-[9.5rem]" },
        { key: "outcome", label: "Outcome", width: "min-w-[5.5rem]" },
        { key: "baseBid", label: "Base bid", width: "min-w-[6.5rem]" },
        { key: "status", label: "Record", width: "min-w-[5.5rem]" },
        { key: "internalBidDate", label: "Internal bid date", width: "min-w-[8.5rem]" },
        { key: "takeoffTurnedIn", label: "Turned in", width: "min-w-[5.5rem]" },
        { key: "updated", label: "Updated", width: "min-w-[6.5rem]" },
      ];

  const tabCount = (value: StatusFilter): number | null => {
    if (serverCounts) return value === "all" ? serverCounts.all : serverCounts[value];
    if (!serverPaged) return value === "all" ? counts.total : counts[value];
    if (value === status) return serverTotal;
    return null;
  };

  const rowHref = (bid: BidListItem) =>
    isInternalRole ? `/bidding/${bid.id}?stage=takeoff` : `/bidding/${bid.id}?stage=intake`;

  const cellText = (bid: BidListItem, key: SortKey): string => {
    switch (key) {
      case "estimate":
        return bid.estimateNumber || "—";
      case "name":
        return bid.bidName || "Untitled estimate";
      case "drawingNumber":
        return bid.drawingNumber || "—";
      case "dueDate":
        return bid.dueDate ? formatDate(bid.dueDate) : "—";
      case "office":
        return bid.companyName || "—";
      case "estimator":
        return bid.estimator || "—";
      case "stage":
        return formatProcessStage(bid.processStage ?? undefined) || "—";
      case "outcome":
        return formatOutcome(bid.outcomeStatus ?? undefined);
      case "baseBid":
        return bid.baseBidAmount != null ? formatMoney(bid.baseBidAmount) : "—";
      case "updated":
        return formatDate(bid.updatedAt.slice(0, 10));
      case "bidDate":
        return formatBidDateAndTime({
          bidDate: bid.bidDate,
          dueDate: bid.dueDate,
          dueTime: bid.dueTime,
        }).label;
      case "captain":
        return resolveCaptainLabel(bid.captain || bid.estimator);
      case "internalBidDate":
        return bid.internalBidDate ? formatDate(bid.internalBidDate.slice(0, 10)) : "—";
      case "takeoffTurnedIn":
        return bid.takeoffTurnedIn ? "Yes" : "—";
      default:
        return "—";
    }
  };

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader
          title="Estimates"
          subtitle="Base Bid estimator — team, wage rates, systems, and live MIKE/PJ totals."
        />
        <RestrictedState
          title="Estimates access required"
          message="You do not have permission to view the bidding list."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 ui-animate-in">
      <PageHeader
        title="Estimates"
        subtitle="Track each estimate from Intake through Outcome. Awarded or Lost bids continue on from their final outcome."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isTeamScopedRole && hasCrew ? (
              <button
                type="button"
                aria-pressed={showAllTeams}
                onClick={() => setShowAllTeams((v) => !v)}
                className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                  showAllTeams
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md hover:bg-white/70 hover:text-ink"
                }`}
                title="GET /bids?teamId=all"
              >
                {showAllTeams ? "All teams" : "My crew"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={exporting || loading}
              onClick={() => void runExport()}
              className={buttonClasses("secondary")}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
            {canWrite ? (
              <Link href="/bidding/new" className={buttonClasses("secondary")}>
                <span className="text-lg leading-none" aria-hidden>
                  +
                </span>
                New bid
              </Link>
            ) : null}
          </div>
        }
      />

      {promptPickCrew ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No estimating crew on your profile yet — Estimates is unscoped until you
          pick one.{" "}
          <Link href="/settings/my-team" className="font-semibold underline underline-offset-2">
            Choose crew in Settings → My team
          </Link>
        </p>
      ) : null}

      <div className="w-fit rounded-2xl border border-white/70 bg-white/45 px-5 py-4 shadow-[0_6px_16px_rgba(255,123,17,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl">
        {loading && bids.length === 0 ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div>
            <p className="text-2xl font-semibold leading-none text-ink">
              {filteredTotal.toLocaleString()}
              {!serverPaged && filteredTotal !== counts.total ? (
                <span className="text-base font-normal text-ink/40"> of {counts.total}</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">
              {status === "all" ? "Estimates shown" : `${STATUS_FILTERS.find((f) => f.value === status)?.label} estimates shown`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Record status: secondary rail owns these on xl+; sticky horizontal strip below xl */}
        <div
          className="sticky top-14 z-20 -mx-4 border-b border-[var(--border-subtle)] bg-canvas px-4 sm:top-[3.75rem] sm:-mx-6 sm:px-6 xl:hidden"
          role="tablist"
          aria-label="Estimate record status"
        >
          <div className="flex flex-nowrap items-center gap-5 overflow-x-auto pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              const count = tabCount(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => (f.value === "all" ? setStatus("all") : toggleStatus(f.value))}
                  aria-pressed={active}
                  className={`relative shrink-0 whitespace-nowrap pb-2.5 text-sm transition focus-visible:outline-none ${
                    active ? "font-semibold text-ink" : "font-medium text-ink-muted hover:text-ink"
                  }`}
                >
                  {f.label}{" "}
                  <span className={count == null || count === 0 ? "text-ink/30" : active ? "text-ink/50" : "text-ink/35"}>
                    {count == null ? "—" : count}
                  </span>
                  {active ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {showFilter("search") ? <div className="w-full sm:mr-auto sm:w-[320px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search name, estimate #, drawing #, architect, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/70 bg-white/50 pl-9 pr-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none backdrop-blur-md transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div> : null}

          <div className="w-44 shrink-0">
            <FilterSelect
              prefix="Sort"
              value={sortKey}
              onChange={(v) => {
                const key = v as SortKey;
                setSortKey(key);
                setSortDir(defaultSortDir(key));
              }}
              options={SORT_OPTIONS}
              ariaLabel="Sort estimates"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/70 bg-white/50 px-3.5 text-sm font-semibold text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition hover:border-brand/30 hover:bg-white/70 hover:text-brand"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          {refreshing ? <span className="text-xs font-medium text-ink/40">Updating</span> : null}

          <button
            type="button"
            onClick={exportToExcel}
            disabled={visibleBids.length === 0}
            title="Export the currently filtered/sorted list to Excel"
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/70 bg-white/50 px-3.5 text-sm font-semibold text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition hover:border-brand/30 hover:bg-white/70 hover:text-brand disabled:pointer-events-none disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {isInternalRole ? (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Estimates chrome">
          <button
            type="button"
            role="tab"
            aria-selected={internalList}
            onClick={() => setTeamTable(false)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              internalList ? "bg-ink text-white" : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
            }`}
          >
            Internal bid list
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!internalList}
            onClick={() => setTeamTable(true)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              !internalList ? "bg-ink text-white" : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
            }`}
          >
            Full team table
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        {showFilter("processStage") ? (
          <label className="flex w-44 flex-col gap-1 text-xs font-semibold text-ink/50">
            Current progress
            <FilterSelect
              prefix="Stage"
              value={processStage}
              onChange={setProcessStage}
              options={STAGE_FILTERS}
              ariaLabel="Current progress"
            />
          </label>
        ) : null}
        {showFilter("bidDate") ? (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink/50">
              Bid date from
              <input
                type="date"
                value={localBidFrom}
                onChange={(e) => setLocalBidFrom(e.target.value)}
                className="h-10 rounded-lg border border-white/70 bg-white/50 px-2 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink/50">
              to
              <input
                type="date"
                value={localBidTo}
                onChange={(e) => setLocalBidTo(e.target.value)}
                className="h-10 rounded-lg border border-white/70 bg-white/50 px-2 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
              />
            </label>
          </div>
        ) : null}
        {showFilter("captain") ? (
          <label className="flex w-48 flex-col gap-1 text-xs font-semibold text-ink/50">
            Team captain
            <FilterSelect
              prefix="Captain"
              value={captainFilter}
              onChange={setCaptainFilter}
              options={[{ value: "", label: "All" }, ...(dynamicOptions.captain ?? [])]}
              ariaLabel="Team captain"
            />
          </label>
        ) : null}
        {showFilter("workType") ? (
          <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-ink/50">
            Work type
            <FilterSelect
              prefix="Work"
              value={workType}
              onChange={setWorkType}
              options={WORK_TYPE_FILTERS}
              ariaLabel="Work type"
            />
          </label>
        ) : null}
        {showFilter("outcome") ? (
          <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-ink/50">
            Outcome
            <FilterSelect
              prefix="Outcome"
              value={outcome}
              onChange={setOutcome}
              options={OUTCOME_FILTERS}
              ariaLabel="Outcome"
            />
          </label>
        ) : null}
        {showFilter("bidKind") ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink/50">
            Bid type
            <input
              value={bidKindFilter}
              onChange={(e) => setBidKindFilter(e.target.value)}
              className="h-10 rounded-lg border border-white/70 bg-white/50 px-2 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
            />
          </label>
        ) : null}
        {showFilter("constructionType") ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink/50">
            Building type
            <input
              value={constructionFilter}
              onChange={(e) => setConstructionFilter(e.target.value)}
              className="h-10 rounded-lg border border-white/70 bg-white/50 px-2 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md"
            />
          </label>
        ) : null}
      </div>

      <SavedViewTabs
        views={savedViews}
        fields={FILTER_FIELDS}
        activeKeys={activeConditionKeys}
        showClear={activeConditionKeys.length > 0 || activeFilterCount > 0}
        onToggleCondition={toggleCondition}
        onRemoveView={removeSavedView}
        onClear={clearView}
      />

      {loading && bids.length === 0 ? (
        <TableSkeleton rows={8} toolbar={false} />
      ) : filteredTotal === 0 ? (
        <EmptyState
          message={emptyMessage}
          action={
            !error && canWrite ? (
              <Link
                href="/bidding/new"
                className="text-sm font-semibold text-ink underline underline-offset-2 hover:text-ink"
              >
                Start a new estimate
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="cs-data-table -mx-4 overflow-x-auto overscroll-x-contain border-y border-[var(--border-subtle)] bg-surface sm:-mx-6 md:mx-0 md:rounded-[var(--radius)] md:border">
          <table className="w-max min-w-full border-collapse text-left">
            <thead>
              <tr>
                {listColumns.map((column) => (
                  <SortableTh
                    key={column.key}
                    label={column.label}
                    column={column.key}
                    active={sortKey === column.key}
                    dir={sortDir}
                    onSort={(key) => {
                      if (sortKey === key) {
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        return;
                      }
                      setSortKey(key);
                      setSortDir(defaultSortDir(key));
                    }}
                    className={`${column.width} whitespace-nowrap px-3 py-2`}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((bid, idx) => {
                const teamColors = teamColorForId(bid.teamId);
                const officeBrand = entityBrandForName(bid.companyName);
                const schedule = formatBidDateAndTime({
                  bidDate: bid.bidDate,
                  dueDate: bid.dueDate,
                  dueTime: bid.dueTime,
                });
                const crewLabel = teamNameFor(bid.teamId);
                return (
                  <tr
                    key={bid.id}
                    className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${idx % 2 === 1 ? "bg-canvas/50" : "bg-white"}`}
                  >
                    {listColumns.map((column) => {
                      const text = cellText(bid, column.key);
                      return (
                        <td
                          key={column.key}
                          title={text}
                          className={`whitespace-nowrap px-3 py-2.5 align-middle text-[13px] ${column.width}`}
                        >
                          {column.key === "estimate" || column.key === "name" ? (
                            <Link
                              href={rowHref(bid)}
                              className="block max-w-[16rem] truncate font-medium text-ink hover:underline"
                            >
                              {softBreakText(text)}
                            </Link>
                          ) : column.key === "status" ? (
                            status === "draft" && bid.status === "draft" ? null : (
                              <BidStatusBadge status={bid.status} />
                            )
                          ) : column.key === "bidDate" ? (
                            <div className="min-w-0">
                              <p className="font-medium text-ink">{schedule.date}</p>
                              {schedule.time ? (
                                <p className="cs-helper">{schedule.time}</p>
                              ) : null}
                            </div>
                          ) : column.key === "office" ? (
                            <span className="inline-flex max-w-[10rem] items-center gap-2 truncate">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${officeBrand.dot}`}
                                aria-hidden
                                title={text}
                              />
                              <span className="truncate">{text}</span>
                            </span>
                          ) : column.key === "captain" ? (
                            <div className="min-w-0 max-w-[11rem]">
                              <p className="truncate">{softBreakText(text)}</p>
                              {bid.teamId != null && crewLabel ? (
                                <p className="cs-helper mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate">
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${teamColors.dot}`}
                                    aria-hidden
                                  />
                                  {crewLabel}
                                </p>
                              ) : null}
                            </div>
                          ) : column.key === "stage" ? (
                            <BidStageProgressBar
                              processStage={bid.processStage}
                              teamId={bid.teamId}
                              compact
                            />
                          ) : (
                            <span className="block max-w-[12rem] truncate">{softBreakText(text)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredTotal > 0 ? (
        <BidListPager
          page={currentPage}
          pageSize={pageSize}
          total={filteredTotal}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <FilterSidebar
        open={filterOpen}
        fields={FILTER_FIELDS}
        title="Filter estimates"
        initialGroups={filterGroups}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilterGroups}
        onSaveAsView={saveAsView}
        dynamicOptions={dynamicOptions}
        listFilters={ESTIMATES_FILTER_CATALOG}
        selectedListFilters={filterKeys}
        onToggleListFilter={toggleListFilter}
        listFilterError={filterSaveError}
        selectedFieldKeys={crmFieldKeys}
        onToggleField={toggleCrmField}
      />
    </div>
  );
}
