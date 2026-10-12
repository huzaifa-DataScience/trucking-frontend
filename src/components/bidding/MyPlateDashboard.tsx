"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RestrictedState } from "@/components/ui/RestrictedState";
import { buttonClasses } from "@/components/ui/Button";
import { useBiddingAccess } from "@/hooks/useBiddingAccess";
import { useBiddingLookups } from "@/hooks/useBiddingLookups";
import { PERMISSIONS } from "@/lib/auth/permissions";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  formatProcessStage,
  type MyPlateColumn,
  type MyPlateGroup,
  type MyPlateResponse,
  type MyPlateRow,
} from "@/lib/bidding/process-types";
import { formatDate } from "@/lib/bidding/format";

/** Columns we never show as table cells — surfaced as badges / actions instead. */
const META_COLUMN_KEYS = new Set([
  "isNew",
  "thisWeek",
  "canEdit",
  "takeoffAssigned",
  "takeoffReceived",
]);

const DEFAULT_COLUMNS: MyPlateColumn[] = [
  { key: "estimateNumber", label: "Project #" },
  { key: "bidName", label: "Name" },
  { key: "dueDate", label: "Due" },
  { key: "processStage", label: "Stage" },
  { key: "teamId", label: "Team" },
];

function normalizeColumns(
  columns: MyPlateGroup["columns"] | undefined
): MyPlateColumn[] {
  if (!columns || columns.length === 0) return DEFAULT_COLUMNS;
  const mapped = columns.map((c) =>
    typeof c === "string"
      ? {
          key: c,
          label: c
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
        }
      : { key: c.key, label: c.label || c.key }
  );
  const visible = mapped.filter((c) => !META_COLUMN_KEYS.has(c.key));
  return visible.length > 0 ? visible : DEFAULT_COLUMNS;
}

function rowHref(row: MyPlateRow): string {
  const stage = String(row.processStage ?? "intake").trim() || "intake";
  return `/bidding/${row.id}?stage=${encodeURIComponent(stage)}`;
}

function cellText(
  row: MyPlateRow,
  key: string,
  teamLabel: (id: number | null | undefined) => string
): string {
  if (key === "teamId" || key === "team") {
    return teamLabel(
      typeof row.teamId === "number" ? row.teamId : Number(row.teamId) || null
    );
  }
  if (key === "bidName" || key === "project" || key === "drawingName") {
    return String(row.bidName || row.drawingName || "—");
  }
  if (key === "bidDate") {
    const raw = String(row.bidDate ?? "");
    return raw ? formatDate(raw.slice(0, 10)) : "—";
  }
  if (key === "dueDate") {
    const raw = String(row.dueDate ?? "");
    return raw ? formatDate(raw.slice(0, 10)) : "—";
  }
  if (key === "processStage") {
    return formatProcessStage(String(row.processStage ?? "")) || "—";
  }
  if (key === "isNew") return row.isNew ? "New" : "";
  if (key === "thisWeek") return row.thisWeek ? "This week" : "";
  if (key === "canEdit") return row.canEdit === false ? "View" : "Edit";
  if (key === "takeoffAssigned") return row.takeoffAssigned ? "Sent" : "";
  if (key === "takeoffReceived") return row.takeoffReceived ? "Back" : "";
  const v = row[key];
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "";
  return String(v);
}

function primaryLabel(row: MyPlateRow): string {
  return (
    String(row.bidName || row.drawingName || row.estimateNumber || "").trim() ||
    `Bid #${row.id}`
  );
}

function CountStrip({
  counts,
}: {
  counts: NonNullable<MyPlateResponse["counts"]>;
}) {
  const items = (
    [
      ["due", "Due"],
      ["upcoming", "Upcoming"],
      ["assigned", "Assigned"],
    ] as const
  ).filter(([key]) => counts[key] != null);

  if (items.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-stretch divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] bg-surface"
      role="group"
      aria-label="Queue counts"
    >
      {items.map(([key, label]) => (
        <div key={key} className="min-w-[5.5rem] flex-1 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">
            {counts[key]}
          </p>
        </div>
      ))}
    </div>
  );
}

function RowBadges({ row }: { row: MyPlateRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {row.isNew ? (
        <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
          New
        </span>
      ) : null}
      {row.thisWeek ? (
        <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink/55">
          This week
        </span>
      ) : null}
      {row.takeoffAssigned ? (
        <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink/55">
          Takeoff sent
        </span>
      ) : null}
      {row.takeoffReceived ? (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
          Takeoff back
        </span>
      ) : null}
    </span>
  );
}

function QueueTable({
  group,
  teamLabel,
}: {
  group: MyPlateGroup;
  teamLabel: (id: number | null | undefined) => string;
}) {
  const columns = normalizeColumns(group.columns);
  const rows = group.rows ?? [];

  if (rows.length === 0) {
    return (
      <p className="border border-dashed border-ink/15 bg-surface px-4 py-10 text-center text-sm text-ink/45">
        Nothing in this queue right now.
      </p>
    );
  }

  const nameColIdx = columns.findIndex((c) =>
    ["bidName", "project", "drawingName", "name"].includes(c.key)
  );
  const badgeColIdx = nameColIdx >= 0 ? nameColIdx : 0;

  return (
    <div className="cs-data-table -mx-4 overflow-x-auto overscroll-x-contain border-y border-[var(--border-subtle)] bg-surface sm:-mx-0 sm:rounded-[var(--radius)] sm:border">
      <table className="w-max min-w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink/45"
              >
                {col.label}
              </th>
            ))}
            <th className="w-20 whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const canEdit = row.canEdit !== false;
            const href = rowHref(row);
            return (
              <tr
                key={String(row.id)}
                className={`border-b border-[var(--border-subtle)] transition-colors hover:bg-canvas ${
                  idx % 2 === 1 ? "bg-canvas/50" : "bg-white"
                }`}
              >
                {columns.map((col, colIdx) => {
                  const text = cellText(row, col.key, teamLabel);
                  const showBadges = colIdx === badgeColIdx;
                  const isLink = colIdx === 0 || colIdx === nameColIdx;
                  const cell = isLink ? (
                    <Link
                      href={href}
                      className="truncate font-medium text-ink hover:underline"
                      title={colIdx === nameColIdx ? primaryLabel(row) : undefined}
                    >
                      {colIdx === 0 && text === "—" ? `#${row.id}` : text}
                    </Link>
                  ) : (
                    <span className="block max-w-[12rem] truncate">{text}</span>
                  );
                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-2.5 align-middle text-[13px] text-ink/80"
                    >
                      {showBadges ? (
                        <div className="flex min-w-0 max-w-[18rem] flex-col gap-1">
                          {cell}
                          <RowBadges row={row} />
                        </div>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 align-middle">
                  <Link
                    href={href}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {canEdit ? "Open" : "View"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MyPlateDashboard() {
  const { canRead } = useBiddingAccess();
  const lookups = useBiddingLookups();
  const [plate, setPlate] = useState<MyPlateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const teamLabel = useCallback(
    (id: number | null | undefined) => {
      if (id == null || Number.isNaN(Number(id))) return "—";
      const hit = lookups.teams.find((t) => t.id === Number(id));
      return hit?.teamName || `Team #${id}`;
    },
    [lookups.teams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await biddingApi.getDashboard();
      setPlate(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Couldn’t load your dashboard"));
      setPlate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => plate?.groups ?? [], [plate]);

  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupId(null);
      return;
    }
    setActiveGroupId((prev) =>
      prev && groups.some((g) => g.id === prev) ? prev : groups[0]!.id
    );
  }, [groups]);

  const activeGroup =
    groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;
  const counts = plate?.counts;

  if (!canRead) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <PageHeader
          title="Dashboard"
          subtitle="Bids that need your attention."
        />
        <RestrictedState
          title="Bidding access required"
          message="You do not have permission to view bidding."
          permission={PERMISSIONS.biddingRead}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 ui-animate-in">
      <PageHeader
        title={plate?.title || "Dashboard"}
        subtitle={
          plate?.hint?.trim() ||
          "Your queues — open a bid to continue where you left off."
        }
        action={
          <Link href="/bidding" className={buttonClasses("outline", "sm")}>
            All estimates
          </Link>
        }
      />

      {error ? (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-brand hover:underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading && !plate ? (
        <div className="flex flex-col gap-5">
          <div className="flex divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] bg-surface">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex-1 px-4 py-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-2 h-6 w-8" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {counts ? <CountStrip counts={counts} /> : null}

          <div className="flex min-w-0 flex-col gap-4">
            {groups.length === 0 ? (
              <EmptyState
                message={
                  plate?.hint ||
                  "No queues for your role yet. Ask an admin to confirm your login role."
                }
                action={
                  <Link
                    href="/bidding"
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Browse estimates
                  </Link>
                }
              />
            ) : (
              <>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="tablist"
                  aria-label="Your queues"
                >
                  {groups.map((group) => {
                    const n = group.rows?.length ?? 0;
                    const selected = group.id === activeGroup?.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveGroupId(group.id)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? "bg-ink text-white"
                            : "border border-white/70 bg-white/50 text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md hover:border-brand/30 hover:text-brand"
                        }`}
                      >
                        {group.title}
                        <span
                          className={`ml-1.5 tabular-nums ${
                            selected ? "text-white/70" : "text-ink/40"
                          }`}
                        >
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeGroup ? (
                  <QueueTable group={activeGroup} teamLabel={teamLabel} />
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
