"use client";

import { useCallback, useState } from "react";
import type { TicketRow, TicketDetail } from "@/lib/types";
import { TicketDetailModal } from "./TicketDetailModal";

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
}: TicketGridProps) {
  const [clientPage, setClientPage] = useState(0);
  const [detailTicketLocal, setDetailTicketLocal] = useState<TicketDetail | null>(null);

  const isServerPagination = totalFromServer != null && onPageChange != null;
  const total = isServerPagination ? totalFromServer : tickets.length;
  const page = isServerPagination ? pageFromServer : clientPage + 1;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const pageTickets = isServerPagination ? tickets : tickets.slice(clientPage * pageSize, (clientPage + 1) * pageSize);

  const detailTicket = detailTicketProp ?? detailTicketLocal;
  const setDetailTicket = onCloseDetail != null ? (t: TicketDetail | null) => (t ? undefined : onCloseDetail()) : setDetailTicketLocal;
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
      <div className="rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.06)]">
        <div className="flex flex-col gap-3 border-b border-ink/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-sm font-semibold text-ink">Detailed ticket grid ({total} rows)</span>
          <button
            type="button"
            onClick={exportExcel}
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-secondary sm:w-auto"
          >
            Export to Excel
          </button>
        </div>
        <div className="overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.08] bg-[#f8f9fb]">
                <Th>Ticket #</Th>
                <Th>Ticket Date</Th>
                <Th>Created At</Th>
                <Th>Job Name</Th>
                <Th>Company</Th>
                <Th>Import/Export</Th>
                <Th>Destination / Origin</Th>
                <Th>Hauling Company</Th>
                <Th>Material</Th>
                <Th>Truck #</Th>
                <Th>Truck Type</Th>
                <Th>Driver Name</Th>
                <Th>Hauler Ticket #</Th>
                <Th>Signed By</Th>
                <Th>Physical Ticket</Th>
                <Th>Truck Photo 1</Th>
                <Th>Truck Photo 2</Th>
                <Th>Asbestos Photo</Th>
                <Th>Scrap Photo</Th>
              </tr>
            </thead>
            <tbody>
              {pageTickets.map((row) => (
                <tr
                  key={row.ticketNumber}
                  className="border-b border-ink/[0.05] hover:bg-ink/[0.02]"
                >
                  <Td>
                    <button
                      type="button"
                      onClick={() => openDetail(row.ticketNumber)}
                      className="font-semibold text-brand hover:text-brand-secondary hover:underline"
                    >
                      {row.ticketNumber}
                    </button>
                  </Td>
                  <Td>{row.ticketDate}</Td>
                  <Td>{row.createdAt}</Td>
                  <Td>{row.jobName}</Td>
                  <Td>{row.companyName ?? "—"}</Td>
                  <Td>{row.direction}</Td>
                  <Td>{row.destinationOrigin}</Td>
                  <Td>{row.haulingCompany}</Td>
                  <Td>{row.material}</Td>
                  <Td>{row.truckNumber}</Td>
                  <Td>{row.truckType}</Td>
                  <Td>{row.driverName}</Td>
                  <Td>
                    {row.haulerTicketNumber === "MISSING" ? (
                      <span className="font-medium text-red-600 dark:text-red-400">MISSING</span>
                    ) : (
                      row.haulerTicketNumber
                    )}
                  </Td>
                  <Td>{row.signedBy}</Td>
                  <Td>{row.photoTicket ? <PhotoLink url={row.photoTicket} label="Ticket" /> : ""}</Td>
                  <Td>{row.photoTruck1 ? <PhotoLink url={row.photoTruck1} label="Truck 1" /> : ""}</Td>
                  <Td>{row.photoTruck2 ? <PhotoLink url={row.photoTruck2} label="Truck 2" /> : ""}</Td>
                  <Td>{row.photoAsbestos ? <PhotoLink url={row.photoAsbestos} label="Asbestos" /> : ""}</Td>
                  <Td>{row.photoScrap ? <PhotoLink url={row.photoScrap} label="Scrap" /> : ""}</Td>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="sticky top-0 z-10 whitespace-nowrap bg-[#f8f9fb] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink/45">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-ink/85">
      {children}
    </td>
  );
}

function PhotoLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-secondary hover:underline dark:text-brand"
    >
      {label}
    </a>
  );
}
