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
  companyId?: string;
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
      <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
        <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Detailed ticket grid ({total} rows)
          </span>
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Export to Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
                <Th>Ticket #</Th>
                <Th>Ticket Date</Th>
                <Th>Created At</Th>
                <Th>Job Name</Th>
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
                  className="border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50"
                >
                  <Td>
                    <button
                      type="button"
                      onClick={() => openDetail(row.ticketNumber)}
                      className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {row.ticketNumber}
                    </button>
                  </Td>
                  <Td>{row.ticketDate}</Td>
                  <Td>{row.createdAt}</Td>
                  <Td>{row.jobName}</Td>
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
        <div className="flex items-center justify-between border-t border-stone-200/80 px-4 py-3 dark:border-stone-800">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={page <= 1}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={page >= totalPages}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-stone-600"
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
    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-stone-600 dark:text-stone-400">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-stone-800 dark:text-stone-200">
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
      className="text-amber-700 hover:underline dark:text-amber-400"
    >
      {label}
    </a>
  );
}
