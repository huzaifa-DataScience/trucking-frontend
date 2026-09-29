"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";

/**
 * Styled replacement for `<input type="time">`. Native time inputs render
 * inconsistent, unstylable browser chrome; this composes react-aria-components'
 * headless ComboBox (editable text + a real click-to-open dropdown of times)
 * so it matches the app's own input tokens and actually opens, unlike a plain
 * segmented field.
 *
 * Value/onChange use the same "HH:mm" 24-hour string format the native input
 * produced, so this drops in wherever `dueTime`-style fields already live.
 */

interface TimeOption {
  id: string; // "HH:mm", 24-hour
  label: string; // "2:30 PM"
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

/** Loosely parse typed time text ("2:30 pm", "14:30", "230pm", "2") into "HH:mm", or null. */
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

const groupClass =
  "flex h-12 w-full min-w-0 cursor-pointer items-center gap-1 rounded-xl border border-[#D0D5DD] bg-surface pl-4 pr-1.5 text-[15px] text-ink transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 dark:border-ink/15";
const inputFieldClass =
  "min-w-0 flex-1 cursor-pointer bg-transparent py-2.5 outline-none placeholder:text-ink/30";
const buttonClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40 outline-none transition hover:bg-ink/5 hover:text-ink/70 focus-visible:ring-2 focus-visible:ring-brand/40";
const popoverClass =
  "max-h-72 min-w-[12rem] overflow-auto rounded-xl border border-ink/10 bg-surface p-1.5 shadow-lg outline-none";
const optionClass =
  "cursor-pointer rounded-lg px-3.5 py-2.5 text-[15px] text-ink outline-none data-[focused]:bg-brand/10 data-[selected]:bg-brand/15 data-[selected]:font-medium";

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
  // `draft` holds in-progress typed text; null means "not editing", so the
  // displayed text derives from `value` during render instead of mirroring
  // props into state via an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fieldWidth, setFieldWidth] = useState<number | null>(null);
  const inputValue = draft ?? (value ? formatTimeLabel(value) : "");

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => {
      setFieldWidth(el.getBoundingClientRect().width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commit = (text: string) => {
    onChange(parseTimeText(text));
    setDraft(null);
  };

  return (
    <ComboBox
      aria-label={ariaLabel ?? "Time"}
      isDisabled={disabled}
      items={TIME_OPTIONS}
      inputValue={inputValue}
      onInputChange={(text) => {
        setDraft(text);
        if (!open) setOpen(true);
      }}
      selectedKey={value ?? null}
      onSelectionChange={(key) => {
        if (key == null) return;
        onChange(String(key));
        setDraft(null);
        setOpen(false);
      }}
      isOpen={open}
      onOpenChange={setOpen}
      menuTrigger="focus"
      allowsCustomValue
      className={`block w-full min-w-0 ${className ?? ""}`}
    >
      <div
        ref={fieldRef}
        className={`${groupClass} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={(e) => {
          if (disabled) return;
          if ((e.target as HTMLElement).closest("button")) return;
          setOpen(true);
          const input = fieldRef.current?.querySelector("input");
          input?.focus();
        }}
      >
        <Input
          className={inputFieldClass}
          placeholder="--:-- --"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
          }}
        />
        <Button className={buttonClass}>
          <ClockIcon />
        </Button>
      </div>
      <Popover
        className={popoverClass}
        placement="bottom start"
        style={fieldWidth != null ? { width: fieldWidth } : undefined}
      >
        <ListBox className="w-full outline-none">
          {(item: TimeOption) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className={optionClass}
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
