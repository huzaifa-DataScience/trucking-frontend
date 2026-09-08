"use client";

import { useEffect, useRef } from "react";
import type { TicketDetail } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/tickets/format";

interface TicketDetailModalProps {
  ticket: TicketDetail | null;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ticket) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ticket, onClose]);

  if (!ticket) return null;

  const isImport = ticket.direction === "Import";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_24px_64px_-12px_rgba(1,1,1,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] bg-[#f8f9fb] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Ticket</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              <h2 id="ticket-detail-title" className="truncate text-xl font-bold text-ink">
                {ticket.ticketNumber}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/45 transition hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          <Section title="Shipment">
            <Field label="Job" value={ticket.jobName} />
            <Field label="Company" value={ticket.companyName} />
            <Field
              label="Direction"
              value={
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isImport ? "bg-info-tint text-info" : "bg-brand/10 text-brand-secondary"
                  }`}
                >
                  {ticket.direction}
                </span>
              }
            />
            <Field label="Ticket Date" value={formatDate(ticket.ticketDate)} />
            <Field label="Created At" value={formatDateTime(ticket.createdAt)} />
          </Section>

          <Section title="Route & load">
            <Field label="Destination / Origin" value={ticket.destinationOrigin} />
            <Field label="Hauling Company" value={ticket.haulingCompany} />
            <Field label="Material" value={ticket.material} />
            <Field label="Truck Number" value={ticket.truckNumber} />
            <Field label="Truck Type" value={ticket.truckType} />
            <Field label="Driver" value={ticket.driverName} />
          </Section>

          <Section title="Verification" last={!ticket.photos || ticket.photos.length === 0}>
            <Field
              label="Hauler Ticket #"
              value={
                ticket.haulerTicketNumber === "MISSING" ? (
                  <span className="font-medium text-danger">MISSING</span>
                ) : (
                  ticket.haulerTicketNumber
                )
              }
            />
            <Field label="Signed By" value={ticket.signedBy} />
          </Section>

          {ticket.photos && ticket.photos.length > 0 && (
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                Photo gallery
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ticket.photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-ink/[0.08] bg-[#f8f9fb] px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand-secondary"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M4 8a2 2 0 012-2h1l1.2-1.6A2 2 0 019.8 3.6h4.4a2 2 0 011.6.8L17 6h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="3.2" />
                    </svg>
                    <span className="truncate">{p.type}</span>
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

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "mb-1" : "mb-5"}>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/40">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-ink/[0.07] bg-[#fbfbfc] p-4 sm:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-ink/40">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink" title={typeof value === "string" ? value : undefined}>
        {value ?? "—"}
      </dd>
    </div>
  );
}
