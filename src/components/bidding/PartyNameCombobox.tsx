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

/**
 * Name field: pick an existing party from the directory, or type a new one.
 * Selecting a hit fills company / contact / email / phone.
 */
export function PartyNameCombobox({
  value,
  options,
  disabled,
  inputClass,
  labelClass,
  label = "Name",
  placeholder = "Search or type new…",
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
  onChangeName: (name: string) => void;
  onPickExisting: (party: ProcessParty) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
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
    </div>
  );
}
