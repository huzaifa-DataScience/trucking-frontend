"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        className={`inline-flex items-center gap-1 text-left text-[12px] font-medium ${
          active ? "text-ink" : "text-ink-muted hover:text-ink"
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
        className="cs-field flex h-9 w-full items-center justify-between gap-2 border px-2.5 text-[13px] font-medium text-ink outline-none transition hover:bg-canvas focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
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
          className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-max overflow-hidden rounded-xl border border-ink/[0.12] bg-white p-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)]"
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

function parseStatusParam(raw: string | null): StatusFilter {
  if (raw === "draft" || raw === "submitted" || raw === "archived") return raw;
  return "all";
}

function BiddingListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyId } = useCompany();
  const { user, setUser } = useAuth();
  const { canRead, canWrite } = useBiddingAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(() =>
    parseStatusParam(searchParams.get("status"))
  );
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
  const filterKeysHydratedFor = useRef<number | null>(null);
  const filterSaveTimer = useRef<number | null>(null);
  const hasLoadedBids = useRef(false);

  /** Keep list status in sync with the secondary rail (`?status=`). */
  useEffect(() => {
    setStatus(parseStatusParam(searchParams.get("status")));
  }, [searchParams]);

  const writeStatusToUrl = useCallback(
    (next: StatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("status");
      else params.set("status", next);
      const qs = params.toString();
      router.replace(qs ? `/bidding?${qs}` : "/bidding", { scroll: false });
    },
    [router, searchParams]
  );

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
              .filter((n) => n.trim() && n !== "Unknown")
          ),
        ];
        names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setEstimatorOptions(names.map((name) => ({ value: name, label: name })));
      })
      .catch(() => {
        setCaptainLookup([]);
        setEstimatorOptions([]);
      });
  }, []);

  useEffect(() => {
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
      sort: sortKey === "bidDate" ? "bidDate" : undefined,
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
    ]
  );

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
      const list = await biddingApi.listBids({
        entityId: listParams.entityId,
        search: listParams.search,
        workType: listParams.workType,
        processStage: listParams.processStage,
        outcome: listParams.outcome,
        teamId: listParams.teamId,
        bidDateFrom: listParams.bidDateFrom,
        bidDateTo: listParams.bidDateTo,
        sort: listParams.sort,
        view: listParams.view,
      });
      if (seq !== bidsRequestSeqRef.current) return; // a newer request superseded this one
      setBids(list);
    } catch (e) {
      if (seq !== bidsRequestSeqRef.current) return;
      setError(getApiErrorMessage(e, "Failed to load bids"));
      setBids([]);
    } finally {
      if (seq === bidsRequestSeqRef.current) {
        hasLoadedBids.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [listParams]);

  useEffect(() => {
    const t = setTimeout(() => void loadBids(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadBids, search]);

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
    const filtered = (status === "all" ? bids : bids.filter((b) => b.status === status))
      .filter((b) => rowMatchesGroups(b as unknown as Record<string, unknown>, filterGroups))
      .filter(
        (b) =>
          !captainFilter ||
          resolveCaptainLabel(b.captain || b.estimator) === captainFilter
      )
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
  }, [bids, status, sortKey, sortDir, filterGroups, captainFilter, bidKindFilter, constructionFilter, resolveCaptainLabel]);

  const exportToExcel = useCallback(() => {
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(
        visibleBids.map((b) => ({
          "Estimate #": b.estimateNumber,
          "Bid name": b.bidName,
          Contractor: b.clientCompanyName ?? "",
          "Team captain": resolveCaptainLabel(b.captain || b.estimator),
          "Bid date": formatBidDateAndTime({
            bidDate: b.bidDate,
            dueDate: b.dueDate,
            dueTime: b.dueTime,
          }).label,
          "Contract amount": b.contractAmount ?? "",
          "Cash expense": b.cashExpense ?? "",
          "Job start date": b.jobStartDate ?? "",
          "Job end date": b.jobEndDate ?? "",
          Status: b.status,
          "Work type": formatWorkType(b.workType ?? undefined),
          "Current progress": formatProcessStage(b.processStage ?? undefined),
          Outcome: formatOutcome(b.outcomeStatus ?? undefined),
          "Internal bid date": b.internalBidDate ?? "",
          "Turned in": b.takeoffTurnedIn ? "Yes" : "",
          Updated: b.updatedAt,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estimates");
      XLSX.writeFile(wb, "estimates-export.xlsx");
    });
  }, [visibleBids, resolveCaptainLabel]);

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

  const toggleStatus = (value: StatusFilter) => {
    setStatus((prev) => {
      const next = prev === value ? "all" : value;
      writeStatusToUrl(next);
      return next;
    });
  };

  const selectStatus = (value: StatusFilter) => {
    setStatus(value);
    writeStatusToUrl(value);
  };

  const statusFilterButtons = (layout: "tabs" | "rail") =>
    STATUS_FILTERS.map((f) => {
      const active = status === f.value;
      const count = f.value === "all" ? counts.total : counts[f.value];
      if (layout === "rail") {
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => selectStatus(f.value)}
            aria-pressed={active}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition ${
              active
                ? "bg-brand/10 font-semibold text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                : "font-medium text-ink/55 hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            <span>{f.label}</span>
            <span className={count === 0 ? "text-ink/30" : active ? "text-ink/50" : "text-ink/35"}>
              {count}
            </span>
          </button>
        );
      }
      return (
        <button
          key={f.value}
          type="button"
          onClick={() => (f.value === "all" ? selectStatus("all") : toggleStatus(f.value))}
          aria-pressed={active}
          className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
            active ? "font-semibold text-ink" : "font-medium text-ink/55 hover:text-ink"
          }`}
        >
          {f.label}{" "}
          <span className={count === 0 ? "text-ink/30" : active ? "text-ink/50" : "text-ink/35"}>
            {count}
          </span>
          {active ? (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
          ) : null}
        </button>
      );
    });

  const listColumns: { key: SortKey; label: string; width: string }[] = internalList
    ? [
        { key: "estimate", label: "Estimate #", width: "w-[18%]" },
        { key: "name", label: "Name", width: "w-[42%]" },
        { key: "internalBidDate", label: "Internal bid date", width: "w-[22%]" },
        { key: "takeoffTurnedIn", label: "Turned in", width: "w-[18%]" },
      ]
    : [
        { key: "estimate", label: "Estimate #", width: "w-[10%]" },
        { key: "name", label: "Name", width: "w-[18%]" },
        { key: "bidDate", label: "Bid date & time", width: "w-[11%]" },
        { key: "office", label: "Company", width: "w-[10%]" },
        { key: "captain", label: "Team captain", width: "w-[11%]" },
        { key: "stage", label: "Current progress", width: "w-[13%]" },
        { key: "outcome", label: "Outcome", width: "w-[8%]" },
        { key: "baseBid", label: "Base bid", width: "w-[8%]" },
        { key: "status", label: "Record", width: "w-[8%]" },
        { key: "internalBidDate", label: "Internal bid date", width: "w-[10%]" },
        { key: "takeoffTurnedIn", label: "Turned in", width: "w-[7%]" },
        { key: "updated", label: "Updated", width: "w-[8%]" },
      ];

  const rowHref = (bid: BidListItem) => {
    const stage = isInternalRole ? "takeoff" : "intake";
    return `/bidding/${bid.id}?stage=${stage}&status=${encodeURIComponent(bid.status)}`;
  };

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
      <div className="flex min-h-0 flex-1 flex-col gap-4">
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
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 ui-animate-in">
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
                    ? "border-brand/30 bg-brand-tint text-ink"
                    : "cs-field border text-ink/70 hover:bg-canvas/60 hover:text-ink"
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

      <div className="cs-stat-card w-fit border border-[var(--border-subtle)] bg-surface px-4 py-3">
        {loading && bids.length === 0 ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div>
            <p className="text-[22px] font-semibold leading-none text-ink">
              {visibleBids.length}
              {visibleBids.length !== counts.total ? (
                <span className="text-[14px] font-normal text-ink-muted"> of {counts.total}</span>
              ) : null}
            </p>
            <p className="cs-label mt-1.5">
              {status === "all" ? "Estimates shown" : `${STATUS_FILTERS.find((f) => f.value === status)?.label} estimates shown`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Smaller screens: keep horizontal tabs, sticky under the top bar */}
        <div
          className="sticky top-14 z-20 -mx-4 border-b border-ink/[0.08] bg-white px-4 sm:top-[3.75rem] sm:-mx-6 sm:px-6 lg:hidden"
          role="tablist"
          aria-label="Estimate record status"
        >
          <div className="flex flex-wrap items-center gap-5 pt-1">
            {statusFilterButtons("tabs")}
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
                className="cs-field h-9 w-full border pl-9 pr-3 text-[13px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
            className="cs-field flex h-9 shrink-0 items-center gap-2 border px-3 text-[13px] font-medium text-ink-muted transition hover:border-brand/40 hover:bg-canvas hover:text-ink"
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
            className="cs-field flex h-9 shrink-0 items-center gap-2 border px-3 text-[13px] font-medium text-ink-muted transition hover:border-brand/40 hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-40"
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
              internalList ? "bg-ink text-white" : "cs-field border text-ink/70"
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
              !internalList ? "bg-ink text-white" : "cs-field border text-ink/70"
            }`}
          >
            Full team table
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        {showFilter("processStage") ? (
          <label className="flex w-44 flex-col gap-1 text-xs font-medium text-ink-muted">
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
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              Bid date from
              <input
                type="date"
                value={localBidFrom}
                onChange={(e) => setLocalBidFrom(e.target.value)}
                className="cs-field h-9 border px-2 text-[13px] text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              to
              <input
                type="date"
                value={localBidTo}
                onChange={(e) => setLocalBidTo(e.target.value)}
                className="cs-field h-9 border px-2 text-[13px] text-ink"
              />
            </label>
          </div>
        ) : null}
        {showFilter("captain") ? (
          <label className="flex w-48 flex-col gap-1 text-xs font-medium text-ink-muted">
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
          <label className="flex w-40 flex-col gap-1 text-xs font-medium text-ink-muted">
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
          <label className="flex w-40 flex-col gap-1 text-xs font-medium text-ink-muted">
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
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
            Bid type
            <input
              value={bidKindFilter}
              onChange={(e) => setBidKindFilter(e.target.value)}
              className="cs-field h-9 border px-2 text-[13px] text-ink"
            />
          </label>
        ) : null}
        {showFilter("constructionType") ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
            Building type
            <input
              value={constructionFilter}
              onChange={(e) => setConstructionFilter(e.target.value)}
              className="cs-field h-9 border px-2 text-[13px] text-ink"
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
      ) : visibleBids.length === 0 ? (
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
        <div className="cs-data-table overflow-x-auto rounded-[var(--radius)] border border-[var(--border-subtle)] bg-surface">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
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
              {visibleBids.map((bid, idx) => {
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
                      className="truncate px-3 py-2.5 align-middle"
                    >
                      {column.key === "estimate" || column.key === "name" ? (
                        <Link href={rowHref(bid)} className="block truncate font-medium text-ink hover:underline">
                          {softBreakText(text)}
                        </Link>
                      ) : column.key === "status" ? (
                        status === "draft" && bid.status === "draft" ? null : <BidStatusBadge status={bid.status} />
                      ) : column.key === "bidDate" ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{schedule.date}</p>
                          {schedule.time ? (
                            <p className="cs-helper truncate">{schedule.time}</p>
                          ) : null}
                        </div>
                      ) : column.key === "office" ? (
                        <span className="inline-flex max-w-full items-center gap-2 truncate">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${officeBrand.dot}`}
                            aria-hidden
                            title={text}
                          />
                          <span>{text}</span>
                        </span>
                      ) : column.key === "captain" ? (
                        <div className="min-w-0">
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
                        softBreakText(text)
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

export default function BiddingListPage() {
  return (
    <Suspense fallback={null}>
      <BiddingListPageInner />
    </Suspense>
  );
}
