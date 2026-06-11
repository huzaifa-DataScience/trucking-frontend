import { useEffect, useRef, useState, type ReactNode } from "react";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-brand focus:ring-2 focus:ring-brand/20";

const tableNumberClass =
  "w-full rounded-lg border border-ink/10 px-2 py-1 text-right font-mono text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20";

function formatNumberDisplay(value: number | undefined, allowEmpty: boolean): string {
  if (value == null || Number.isNaN(value)) return allowEmpty ? "" : "0";
  return String(value);
}

function parseNumberInput(text: string, allowEmpty: boolean): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === ".") {
    return allowEmpty ? undefined : 0;
  }
  const n = Number(trimmed);
  if (Number.isNaN(n)) return allowEmpty ? undefined : 0;
  return n;
}

/** Keeps raw text while typing; commits a number on blur (avoids 0.15 → 0 on "."). */
export function BidNumberInput({
  id,
  value,
  onChange,
  allowEmpty = true,
  variant = "default",
  disabled = false,
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  allowEmpty?: boolean;
  variant?: "default" | "table";
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => formatNumberDisplay(value, allowEmpty));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatNumberDisplay(value, allowEmpty));
    }
  }, [value, allowEmpty]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const parsed = parseNumberInput(text, allowEmpty);
        setText(formatNumberDisplay(parsed, allowEmpty));
        onChange(parsed);
      }}
      onChange={(e) => setText(e.target.value)}
      disabled={disabled}
      className={`${variant === "table" ? tableNumberClass : inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
    />
  );
}

export function BidFormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink/70">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-ink/40">{hint}</p> : null}
    </div>
  );
}

export function BidTextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
    />
  );
}

export function BidSelect({
  id,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
