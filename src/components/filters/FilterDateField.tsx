"use client";

import { useState } from "react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from "react-aria-components";

/**
 * A plain click-anywhere-to-open date field for the filter panel — unlike `ui/DatePicker`
 * (typed mm/dd/yyyy segments, a small trigger icon), this is a single button showing the
 * picked date as plain text (blank when unset) that opens the calendar popup on any click,
 * matching the reference CRM's date filter fields.
 */

function parseDateValue(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function formatDisplay(date: CalendarDate): string {
  const jsDate = new Date(date.year, date.month - 1, date.day);
  return jsDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const popoverClass = "w-auto overflow-auto rounded-xl border border-ink/10 bg-surface p-3 shadow-lg outline-none";
const navButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg text-ink/50 outline-none transition hover:bg-ink/5 hover:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-30";
const cellClass =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm text-ink outline-none data-[outside-month]:text-ink/25 data-[hovered]:bg-brand/10 data-[selected]:bg-brand data-[selected]:text-white data-[unavailable]:pointer-events-none data-[unavailable]:text-ink/20 data-[today]:font-semibold";

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterDateField({
  value,
  onChange,
  disabled,
  ariaLabel,
  className = "h-10 w-full",
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseDateValue(value);

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        aria-label={ariaLabel ?? "Date"}
        isDisabled={disabled}
        className={`flex items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3 text-left text-sm text-ink outline-none transition hover:border-ink/20 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${className}`}
      >
        <CalendarIcon />
        <span className={`min-w-0 flex-1 truncate ${parsed ? "" : "text-ink/30"}`}>
          {parsed ? formatDisplay(parsed) : ""}
        </span>
      </Button>
      <Popover className={popoverClass}>
        <Dialog className="outline-none">
          <Calendar
            value={parsed}
            onChange={(date) => {
              onChange(date ? date.toString() : "");
              setOpen(false);
            }}
          >
            <header className="mb-2 flex items-center justify-between">
              <Button slot="previous" className={navButtonClass}>
                <ChevronLeft />
              </Button>
              <Heading className="text-sm font-semibold text-ink" />
              <Button slot="next" className={navButtonClass}>
                <ChevronRight />
              </Button>
            </header>
            <CalendarGrid className="border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-1 text-xs font-medium text-ink/40">{day}</CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>{(date) => <CalendarCell date={date} className={cellClass} />}</CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
