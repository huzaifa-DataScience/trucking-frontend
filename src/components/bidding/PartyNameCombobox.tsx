"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import type { ProcessParty } from "@/lib/bidding/process-types";

function partyFromLookup(p: BidPartyLookup): ProcessParty {
  return {
    name: p.name || null,
    company: p.company ?? null,
    contactName: p.contactName ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
  };
}

/** Modal browser/picker for the saved-parties directory — CRM-style "+" to add/select from a list. */
function PartyPickerModal({
  open,
  label,
  options,
  onClose,
  onPick,
  onAddNew,
}: {
  open: boolean;
  label: string;
  options: BidPartyLookup[];
  onClose: () => void;
  onPick: (party: BidPartyLookup) => void;
  onAddNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options
      .filter((o) => `${o.name} ${o.company ?? ""} ${o.email ?? ""}`.toLowerCase().includes(q))
      .slice(0, 100);
  }, [options, query]);

  const exactHit = options.some((o) => o.name.trim().toLowerCase() === query.trim().toLowerCase());

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">Select {label.toLowerCase()}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink/40 transition hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="border-b border-ink/[0.08] p-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" aria-hidden>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved contacts…"
              className="h-10 w-full rounded-lg border border-ink/10 bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink/45">No saved contacts match.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={String(o.id)}
                type="button"
                onClick={() => onPick(o)}
                className="flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition hover:bg-brand/[0.06]"
              >
                <span className="text-sm font-medium text-ink">{o.name}</span>
                {(o.company || o.email) && (
                  <span className="text-xs text-ink/45">{[o.company, o.email].filter(Boolean).join(" · ")}</span>
                )}
              </button>
            ))
          )}
        </div>

        {query.trim() && !exactHit ? (
          <div className="border-t border-ink/[0.08] p-3">
            <button
              type="button"
              onClick={() => onAddNew(query.trim())}
              className="flex w-full items-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-secondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add “{query.trim()}” as new
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Name field: pick an existing party from the directory, or type a new one.
 * Selecting a hit fills company / contact / email / phone. The "+" button opens
 * a modal browser of the full directory (CRM-style) as an alternative to the
 * inline type-ahead dropdown.
 */
export function PartyNameCombobox({
  value,
  options,
  disabled,
  inputClass,
  labelClass,
  label = "Name",
  placeholder = "Search or type new…",
  showPicker = false,
  onChangeName,
  onPickExisting,
}: {
  value: string;
  options: BidPartyLookup[];
  disabled?: boolean;
  inputClass: string;
  labelClass: string;
  label?: string;
  placeholder?: string;
  /** Show the "+" modal-picker button. Only meant for the Contact name field. */
  showPicker?: boolean;
  onChangeName: (name: string) => void;
  onPickExisting: (party: ProcessParty) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = `${o.name} ${o.company ?? ""} ${o.email ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [options, query]);

  const exactHit = options.find(
    (o) => o.name.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const commitTyped = (raw: string) => {
    const name = raw.trim();
    onChangeName(name);
    if (!name) return;
    const hit = options.find(
      (o) => o.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (hit) onPickExisting(partyFromLookup(hit));
  };

  return (
    <div className="relative flex flex-col gap-1" ref={wrapRef}>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          className={inputClass}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChangeName(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            // slight delay so option click registers
            window.setTimeout(() => commitTyped(query), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0] && query.trim()) {
                const hit =
                  filtered.find(
                    (o) =>
                      o.name.trim().toLowerCase() === query.trim().toLowerCase()
                  ) ?? filtered[0];
                onPickExisting(partyFromLookup(hit));
                setQuery(hit.name);
                setOpen(false);
              } else {
                commitTyped(query);
                setOpen(false);
              }
            }
          }}
        />
        {showPicker && !disabled ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPickerOpen(true);
            }}
            title={`Browse saved ${label.toLowerCase()}s`}
            aria-label={`Browse saved ${label.toLowerCase()}s`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm transition hover:bg-brand-secondary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
      {open && !disabled && (filtered.length > 0 || query.trim()) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-xl border border-ink/10 bg-surface py-1 shadow-lg"
        >
          {filtered.map((o) => (
            <li key={String(o.id)}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPickExisting(partyFromLookup(o));
                  setQuery(o.name);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-ink">{o.name}</span>
                {(o.company || o.email) && (
                  <span className="text-xs text-ink/45">
                    {[o.company, o.email].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            </li>
          ))}
          {query.trim() && !exactHit ? (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-medium text-brand hover:bg-brand/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChangeName(query.trim());
                  setOpen(false);
                }}
              >
                Use “{query.trim()}” as new
              </button>
            </li>
          ) : null}
          {filtered.length === 0 && !query.trim() ? (
            <li className="px-3 py-2 text-xs text-ink/45">No saved parties yet</li>
          ) : null}
        </ul>
      ) : null}

      <PartyPickerModal
        open={pickerOpen}
        label={label}
        options={options}
        onClose={() => setPickerOpen(false)}
        onPick={(o) => {
          onPickExisting(partyFromLookup(o));
          setQuery(o.name);
          setPickerOpen(false);
        }}
        onAddNew={(name) => {
          onChangeName(name);
          setQuery(name);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
