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
 *
 * On small screens, tapping anywhere in the field opens the calendar (native
 * date inputs do this). The icon alone was too easy to miss / miss-hit.
 */

function parseDateValue(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

const popoverClass =
  "z-[400] w-auto overflow-auto rounded-xl border border-ink/10 bg-surface p-3 shadow-lg outline-none";
const navButtonClass =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-ink/50 outline-none transition hover:bg-ink/5 hover:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-30";
const cellClass =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded text-[12.5px] text-[#374151] outline-none data-[outside-month]:text-[#d1d5db] data-[hovered]:bg-[#f3f1ea] data-[selected]:bg-[#333333] data-[selected]:text-white data-[unavailable]:pointer-events-none data-[unavailable]:text-[#d1d5db] data-[today]:font-semibold";

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
  const [open, setOpen] = useState(false);

  const openCalendar = () => {
    if (disabled) return;
    setOpen(true);
  };

  return (
    <AriaDatePicker
      value={parseDateValue(value)}
      onChange={(date) => onChange(date ? date.toString() : "")}
      isDisabled={disabled}
      isOpen={open}
      onOpenChange={setOpen}
      aria-label={ariaLabel ?? "Date"}
    >
      <Group
        className={`relative flex min-w-0 max-w-full cursor-pointer items-center gap-0.5 overflow-hidden text-[#374151] outline-none transition focus-within:border-[#94a3b8] focus-within:shadow-[0_0_0_2px_rgba(148,163,184,0.28)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${className}`}
        onClick={(e) => {
          // Whole-field tap opens the calendar (critical on touch / small screens).
          // Use click (not pointerdown) so the open isn't immediately treated as
          // an outside-interact that closes the popover on the same gesture.
          if (disabled) return;
          const t = e.target as HTMLElement | null;
          if (t?.closest("button")) return;
          openCalendar();
        }}
      >
        <DateInput className="flex min-w-0 flex-1 items-center gap-px overflow-hidden font-[inherit] text-[12px] leading-none sm:gap-0.5 sm:text-[13.5px]">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="max-w-full shrink rounded px-px tabular-nums outline-none focus:bg-[#e5e7eb] focus:text-[#1f2937] data-[placeholder]:text-[#9ca3af] data-[type=literal]:px-0 data-[type=literal]:text-[#c0c5ce] sm:px-0.5"
            />
          )}
        </DateInput>
        <Button
          // Native <label> wrappers re-activate this control and close the popover
          // on the same click — stop that bubble without blocking Aria press.
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#6b7280] outline-none transition hover:bg-[#f3f4f6] hover:text-[#1f2937] focus-visible:ring-2 focus-visible:ring-[#94a3b8]/40 sm:h-7 sm:w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarIcon />
        </Button>
      </Group>
      <Popover
        className={popoverClass}
        placement="bottom start"
        offset={8}
        shouldFlip
        // Portaled above intake overflow / bottom dock so the calendar is visible on phones.
        style={{ zIndex: 400 }}
      >
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
