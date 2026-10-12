"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatDate } from "@/lib/bidding/format";
import { formatOutcome, formatProcessStage } from "@/lib/bidding/process-types";
import {
  calendarBidHref,
  itemWhenLabel,
  SOURCE_META,
  type CalendarItem,
} from "@/lib/calendar/calendar";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-ink/45">{label}</dt>
      <dd className="whitespace-pre-wrap text-ink">{value}</dd>
    </div>
  );
}

/** Everything known about one calendar item, including the bid it belongs to. */
export function CalendarItemPanel({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: CalendarItem | null;
  onClose: () => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => void;
}) {
  if (!item) return null;
  const meta = SOURCE_META[item.source];
  const bid = item.bid;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-item-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_16px_40px_-12px_rgba(1,1,1,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 sm:px-6">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
            {meta.label}
          </span>
          <h3 id="calendar-item-title" className="mt-2 text-base font-semibold text-ink">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-ink/60">{itemWhenLabel(item)}</p>

          <dl className="mt-4 divide-y divide-ink/[0.06]">
            <Row label="Location" value={item.location} />
            <Row label="Notes" value={item.description} />
            {item.details.map((d) => (
              <Row key={`${d.label}-${d.value}`} label={d.label} value={d.value} />
            ))}
          </dl>

          {bid ? (
            <section className="mt-4 border border-[var(--border-subtle)] bg-canvas/60 px-4 py-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                Estimate
              </h4>
              <p className="mt-1 text-sm font-semibold text-ink">
                {bid.estimateNumber}
                {bid.bidName ? ` · ${bid.bidName}` : ""}
              </p>
              <dl className="mt-1">
                <Row label="Contractor" value={bid.clientCompanyName} />
                <Row label="Stage" value={formatProcessStage(bid.processStage)} />
                <Row
                  label="Outcome"
                  value={
                    bid.outcomeStatus && bid.outcomeStatus !== "open"
                      ? formatOutcome(bid.outcomeStatus)
                      : null
                  }
                />
                <Row
                  label="Bid due"
                  value={
                    bid.dueDate
                      ? `${formatDate(bid.dueDate)}${bid.dueTime ? ` at ${bid.dueTime}` : ""}`
                      : null
                  }
                />
                <Row label="Team" value={bid.teamName} />
                <Row label="Captain" value={bid.captain} />
                <Row
                  label="Your role"
                  value={bid.roles.length ? bid.roles.join(", ") : null}
                />
              </dl>
              <Link
                href={calendarBidHref(bid)}
                className={`${buttonClasses("outline", "sm")} mt-3`}
              >
                Open estimate
              </Link>
            </section>
          ) : null}
        </div>

        <div className="flex justify-between gap-2 border-t border-ink/[0.06] px-5 py-3.5 sm:px-6">
          <div className="flex gap-2">
            {item.editable ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              </>
            ) : null}
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
