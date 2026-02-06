"use client";

import type { TicketDetail } from "@/lib/types";

interface TicketDetailModalProps {
  ticket: TicketDetail | null;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  if (!ticket) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-900">
          <h2 id="ticket-detail-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Ticket {ticket.ticketNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Close
          </button>
        </div>
        <div className="p-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Ticket Date" value={ticket.ticketDate} />
            <DetailItem label="Created At" value={ticket.createdAt} />
            <DetailItem label="Job" value={ticket.jobName} />
            <DetailItem label="Direction" value={ticket.direction} />
            <DetailItem label="Destination / Origin" value={ticket.destinationOrigin} />
            <DetailItem label="Hauling Company" value={ticket.haulingCompany} />
            <DetailItem label="Material" value={ticket.material} />
            <DetailItem label="Truck Number" value={ticket.truckNumber} />
            <DetailItem label="Truck Type" value={ticket.truckType} />
            <DetailItem label="Driver" value={ticket.driverName} />
            <DetailItem label="Hauler Ticket #" value={ticket.haulerTicketNumber} />
            <DetailItem label="Signed By" value={ticket.signedBy} />
          </dl>

          {ticket.photos && ticket.photos.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
                Photo gallery
              </h3>
              <div className="flex flex-wrap gap-3">
                {ticket.photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:border-stone-700 dark:bg-stone-800 dark:text-amber-400 dark:hover:bg-stone-700"
                  >
                    <span aria-hidden>📷</span>
                    {p.type}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-900 dark:text-stone-100">{value ?? "—"}</dd>
    </div>
  );
}
