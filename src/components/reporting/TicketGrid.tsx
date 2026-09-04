"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicketRow, TicketDetail } from "@/lib/types";
import { TicketDetailModal } from "./TicketDetailModal";
import { formatDate, formatDateTime } from "@/lib/tickets/format";

interface TicketGridProps {
  tickets: TicketRow[];
  /** When provided, use server-side pagination. */
  total?: number;
  /** 1-based page (for server-side). */
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  companyId?: string | null;
  /** When provided, parent fetches detail (e.g. from API) and passes detailTicket + onCloseDetail. */
  onOpenDetail?: (ticketNumber: string) => void;
  detailTicket?: TicketDetail | null;
  onCloseDetail?: () => void;
  /** When provided, Export button calls this (e.g. backend export blob). Otherwise client-side xlsx. */
  onExportClick?: () => void;
  /** Server-side sort: current column key + direction, and a handler to change it. */
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  onSortChange?: (column: string) => void;
  /** Server-side free-text search. */
  search?: string;
  onSearchChange?: (value: string) => void;
  /** True while a sort/search/page change is refetching (shows a subtle indicator, keeps existing rows visible). */
  refreshing?: boolean;
}

const DEFAULT_PAGE_SIZE = 50;

export function TicketGrid({
  tickets,
  total: totalFromServer,
  page: pageFromServer = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  companyId: _companyId,
  onOpenDetail,
  detailTicket: detailTicketProp,
  onCloseDetail,
  onExportClick,
  sortBy,
  sortDir,
  onSortChange,
  search,
  onSearchChange,
  refreshing,
}: TicketGridProps) {
  const [clientPage, setClientPage] = useState(0);
  const [detailTicketLocal, setDetailTicketLocal] = useState<TicketDetail | null>(null);
  const [searchDraft, setSearchDraft] = useState(search ?? "");

  useEffect(() => {
    setSearchDraft(search ?? "");
  }, [search]);

  useEffect(() => {
    if (!onSearchChange) return;
    const handle = setTimeout(() => {
      if (searchDraft !== (search ?? "")) onSearchChange(searchDraft);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const isServerPagination = totalFromServer != null && onPageChange != null;
  const total = isServerPagination ? totalFromServer : tickets.length;
  const page = isServerPagination ? pageFromServer : clientPage + 1;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const pageTickets = isServerPagination ? tickets : tickets.slice(clientPage * pageSize, (clientPage + 1) * pageSize);

  const detailTicket = detailTicketProp ?? detailTicketLocal;
  const closeDetail = useCallback(() => {
    if (onCloseDetail) onCloseDetail();
    else setDetailTicketLocal(null);
  }, [onCloseDetail]);

  const openDetail = useCallback(
    (ticketNumber: string) => {
      if (onOpenDetail) {
        onOpenDetail(ticketNumber);
        return;
      }
      setDetailTicketLocal(null);
    },
    [onOpenDetail]
  );

  const exportExcel = useCallback(() => {
    if (onExportClick) {
      onExportClick();
      return;
    }
    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(
        tickets.map((t) => ({
          "Ticket #": t.ticketNumber,
          "Ticket Date": t.ticketDate,
          "Created At": t.createdAt,
          Job: t.jobName,
          Company: t.companyName ?? "",
          Direction: t.direction,
          "Destination/Origin": t.destinationOrigin,
          "Hauling Company": t.haulingCompany,
          Material: t.material,
          "Truck #": t.truckNumber,
          "Truck Type": t.truckType,
          Driver: t.driverName,
          "Hauler Ticket #": t.haulerTicketNumber,
          "Signed By": t.signedBy,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, "tickets-export.xlsx");
    });
  }, [tickets, onExportClick]);

  const goPrev = () => {
    if (isServerPagination) onPageChange!(Math.max(1, page - 1));
    else setClientPage((p) => Math.max(0, p - 1));
  };
  const goNext = () => {
    if (isServerPagination) onPageChange!(Math.min(totalPages, page + 1));
    else setClientPage((p) => Math.min(totalPages - 1, p + 1));
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
        {refreshing ? (
          <div className="absolute left-0 right-0 top-0 z-30 h-0.5 overflow-hidden bg-brand/15" aria-hidden>
            <div className="h-full w-1/3 animate-[ticket-grid-loading_1s_ease-in-out_infinite] bg-brand" />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 border-b border-ink/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <span className="text-sm font-semibold text-ink">Detailed ticket grid ({total} rows)</span>
            <p className="mt-0.5 text-xs text-ink/45">Click any row to see driver, signature, and photos.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {onSearchChange ? (
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search ticket #, job, hauler, material…"
                  className="w-full rounded-xl border border-ink/15 bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/35 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  aria-label="Search tickets"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={exportExcel}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-secondary"
            >
              Export to Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.08] bg-[#f8f9fb]">
                <Th sticky sortKey="ticketNumber" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Ticket #</Th>
                <Th sortKey="ticketDate" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Ticket Date</Th>
                <Th sortKey="createdAt" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Created At</Th>
                <Th sortKey="jobName" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Job Name</Th>
                <Th>Company</Th>
                <Th sortKey="direction" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Import/Export</Th>
                <Th sortKey="destinationOrigin" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Destination / Origin</Th>
                <Th sortKey="haulingCompany" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Hauling Company</Th>
                <Th sortKey="material" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Material</Th>
                <Th sortKey="truckNumber" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Truck #</Th>
                <Th sortKey="truckType" activeSort={sortBy} sortDir={sortDir} onSort={onSortChange}>Truck Type</Th>
                <Th><span className="sr-only">Open details</span></Th>
              </tr>
            </thead>
            <tbody>
              {pageTickets.map((row) => (
                <tr
                  key={row.ticketNumber}
                  className="group cursor-pointer border-b border-ink/[0.05] hover:bg-ink/[0.02]"
                  onClick={() => openDetail(row.ticketNumber)}
                >
                  <Td sticky>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(row.ticketNumber);
                      }}
                      className="font-semibold text-brand hover:text-brand-secondary hover:underline"
                    >
                      {row.ticketNumber}
                    </button>
                  </Td>
                  <Td>{formatDate(row.ticketDate)}</Td>
                  <Td>{formatDateTime(row.createdAt)}</Td>
                  <Td>{row.jobName}</Td>
                  <Td>{row.companyName ?? "—"}</Td>
                  <Td>{row.direction}</Td>
                  <Td>{row.destinationOrigin}</Td>
                  <Td>{row.haulingCompany}</Td>
                  <Td>{row.material}</Td>
                  <Td>{row.truckNumber}</Td>
                  <Td>{row.truckType}</Td>
                  <Td>
                    <svg className="h-4 w-4 shrink-0 text-ink/25 transition group-hover:text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-ink/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs font-medium text-ink/45">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={page <= 1}
              className="rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={page >= totalPages}
              className="rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.03] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <TicketDetailModal ticket={detailTicket ?? null} onClose={closeDetail} />
    </>
  );
}

function Th({
  children,
  sticky,
  sortKey,
  activeSort,
  sortDir,
  onSort,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  sortKey?: string;
  activeSort?: string;
  sortDir?: "ASC" | "DESC";
  onSort?: (column: string) => void;
}) {
  const sortable = Boolean(sortKey && onSort);
  const isActive = sortable && activeSort === sortKey;

  return (
    <th
      className={`top-0 z-10 whitespace-nowrap bg-[#f8f9fb] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink/45 ${
        sticky ? "sticky left-0 z-20 shadow-[1px_0_0_0_rgba(1,1,1,0.08)]" : "sticky"
      }`}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(sortKey!)}
          className={`flex items-center gap-1 transition hover:text-ink ${isActive ? "text-ink" : ""}`}
        >
          {children}
          <svg
            className={`h-3 w-3 shrink-0 transition ${isActive ? "text-brand" : "text-ink/25"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            {isActive && sortDir === "ASC" ? (
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Td({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2.5 text-sm text-ink/85 ${
        sticky ? "sticky left-0 z-10 bg-surface shadow-[1px_0_0_0_rgba(1,1,1,0.06)] group-hover:bg-[#fafafb]" : ""
      }`}
    >
      {children}
    </td>
  );
}
