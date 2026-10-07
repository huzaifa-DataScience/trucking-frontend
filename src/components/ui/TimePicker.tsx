"use client";

import { useState } from "react";
import { Button, ComboBox, Input, ListBox, ListBoxItem, Popover } from "react-aria-components";

/**
 * Styled replacement for `<input type="time">`.
 * Value/onChange use "HH:mm" 24-hour strings (same as native time inputs).
 *
 * Visual chrome lives only on the outer `intake-field` surface (same as DatePicker).
 * The inner input is borderless — global glass-app input rules are overridden in CSS.
 */

interface TimeOption {
  id: string;
  label: string;
}

const TIME_OPTIONS: TimeOption[] = buildTimeOptions();

function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const id = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    options.push({ id, label: formatTimeLabel(id) });
  }
  return options;
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function parseTimeText(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;
  const match = /^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/.exec(trimmed);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const period = match[3];
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const fallbackFieldClass =
  "h-8 rounded-md border border-[#cfd5dd] bg-white px-2 text-[13.5px]";
const buttonClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#6b7280] outline-none transition hover:bg-[#f3f4f6] hover:text-[#1f2937]";
const popoverClass =
  "max-h-64 w-[--trigger-width] min-w-40 overflow-auto rounded-md border border-[#d5dbe3] bg-white p-1 shadow-lg outline-none";
const optionClass =
  "cursor-pointer rounded px-2.5 py-1.5 text-[12.5px] text-[#374151] outline-none data-[focused]:bg-brand-tint data-[selected]:bg-brand-tint data-[selected]:font-medium data-[selected]:text-ink";

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TimePicker({
  value,
  onChange,
  disabled,
  className,
  ariaLabel,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputValue = draft ?? (value ? formatTimeLabel(value) : "");

  const commit = (text: string) => {
    onChange(parseTimeText(text));
    setDraft(null);
  };

  // Same surface pattern as DatePicker: one bordered control, no nested input chrome.
  const fieldClass = [
    "intake-time-field",
    "flex w-full min-w-0 items-center gap-1 text-[#374151] outline-none transition",
    "focus-within:border-[#94a3b8] focus-within:shadow-[0_0_0_2px_rgba(148,163,184,0.28)]",
    className || fallbackFieldClass,
    disabled ? "cursor-not-allowed opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ComboBox
      aria-label={ariaLabel ?? "Time"}
      isDisabled={disabled}
      items={TIME_OPTIONS}
      inputValue={inputValue}
      onInputChange={setDraft}
      value={value ?? null}
      onChange={(key) => {
        if (key == null) return;
        onChange(String(key));
        setDraft(null);
      }}
      menuTrigger="focus"
      allowsCustomValue
      className="intake-time-picker w-full min-w-0"
    >
      <div className={fieldClass}>
        <Input
          className="intake-time-input min-w-0 flex-1"
          placeholder="--:-- --"
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
          }}
        />
        <Button className={buttonClass}>
          <ClockIcon />
        </Button>
      </div>
      <Popover className={popoverClass}>
        <ListBox>
          {(item: TimeOption) => (
            <ListBoxItem id={item.id} textValue={item.label} className={optionClass}>
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
