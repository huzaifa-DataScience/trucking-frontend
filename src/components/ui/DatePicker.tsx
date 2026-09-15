"use client";

import { parseDate, type CalendarDate } from "@internationalized/date";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
} from "react-aria-components";

/**
 * Styled replacement for `<input type="date">`, same rationale as TimePicker:
 * native date inputs render inconsistent, unstylable browser chrome. This
 * composes react-aria-components' DatePicker (typed segments + a real
 * click-to-open calendar popup — not the bare segmented DateField, which has
 * no popup at all), styled with the app's own tokens.
 *
 * Value/onChange use the same "YYYY-MM-DD" string format the native input
 * produced (parses/serializes via @internationalized/date), so it drops in
 * wherever startDate/endDate-style fields already live.
 */

function parseDateValue(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

const segmentClass =
  "rounded px-0.5 tabular-nums outline-none focus:bg-brand/15 focus:text-ink data-[placeholder]:text-ink/30";
const triggerButtonClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink/40 outline-none transition hover:bg-ink/5 hover:text-ink/70 focus-visible:ring-2 focus-visible:ring-brand/40";
const popoverClass =
  "w-auto overflow-auto rounded-xl border border-ink/10 bg-surface p-3 shadow-lg outline-none";
const navButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg text-ink/50 outline-none transition hover:bg-ink/5 hover:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-30";
const cellClass =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm text-ink outline-none data-[outside-month]:text-ink/25 data-[hovered]:bg-brand/10 data-[selected]:bg-brand data-[selected]:text-white data-[unavailable]:pointer-events-none data-[unavailable]:text-ink/20 data-[today]:font-semibold";

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
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

export function DatePicker({
  value,
  onChange,
  disabled,
  className,
  ariaLabel,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  className: string;
  ariaLabel?: string;
}) {
  return (
    <AriaDatePicker
      value={parseDateValue(value)}
      onChange={(date) => onChange(date ? date.toString() : "")}
      isDisabled={disabled}
      aria-label={ariaLabel ?? "Date"}
    >
      <Group
        className={`flex items-center gap-1 border border-ink/10 bg-surface text-ink outline-none transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${className}`}
      >
        <DateInput className="flex flex-1 items-center gap-0.5">
          {(segment) => <DateSegment segment={segment} className={segmentClass} />}
        </DateInput>
        <Button className={triggerButtonClass}>
          <CalendarIcon />
        </Button>
      </Group>
      <Popover className={popoverClass}>
        <Dialog className="outline-none">
          <Calendar>
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
                  <CalendarHeaderCell className="pb-1 text-xs font-medium text-ink/40">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => <CalendarCell date={date} className={cellClass} />}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
