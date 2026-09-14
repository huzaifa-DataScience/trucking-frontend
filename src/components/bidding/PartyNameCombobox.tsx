"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BidPartyLookup } from "@/lib/api/endpoints/biddingParties";
import type { ProcessParty } from "@/lib/bidding/process-types";

const PAGE_SIZE = 10;

function partyFromLookup(p: BidPartyLookup): ProcessParty {
  return {
    name: p.name || null,
    company: p.company ?? null,
    contactName: p.contactName ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
  };
}

function nameWithStatus(o: BidPartyLookup): { label: string; tags: string[] } {
  const tags: string[] = [];
  if (o.doNotContact) tags.push("do not contact");
  if (o.inactive) tags.push("Inactive");
  if (o.status?.trim() && !tags.some((t) => t.toLowerCase() === o.status!.trim().toLowerCase())) {
    tags.push(o.status.trim());
  }
  return { label: o.name, tags };
}

/** CRM-style Company Address Book — table, search, pagination, row "+" to select. */
function AddressBookModal({
  open,
  title,
  options,
  onClose,
  onPick,
  onAddNew,
}: {
  open: boolean;
  title: string;
  options: BidPartyLookup[];
  onClose: () => void;
  onPick: (party: BidPartyLookup) => void;
  onAddNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPage(1);
    }
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
    if (!q) return options;
    return options.filter((o) => {
      const hay = [
        o.name,
        o.company,
        o.contactName,
        o.email,
        o.phone,
        o.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const exactHit = options.some(
    (o) => o.name.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const pageButtons = useMemo(() => {
    const max = totalPages;
    const cur = safePage;
    if (max <= 5) return Array.from({ length: max }, (_, i) => i + 1);
    if (cur <= 3) return [1, 2, 3, 4];
    if (cur >= max - 2) return [max - 3, max - 2, max - 1, max];
    return [cur - 1, cur, cur + 1, cur + 2];
  }, [safePage, totalPages]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand px-5 py-3.5">
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.08] px-4 py-3">
          <span className="inline-flex items-center rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand">
            Email Address Book
          </span>
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
              aria-hidden
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="h-10 w-full rounded-lg border border-ink/15 bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-sm">
              <tr className="border-b border-ink/[0.08] text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Company name</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Phone number</th>
                <th className="w-14 px-2 py-2.5" aria-label="Add" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-ink/45"
                  >
                    No contacts match.
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => {
                  const { label, tags } = nameWithStatus(o);
                  return (
                    <tr
                      key={String(o.id)}
                      className="border-b border-ink/[0.05] transition hover:bg-brand/[0.04]"
                    >
                      <td className="px-4 py-2.5 align-middle text-ink">
                        {tags.length > 0 ? (
                          <span className="text-ink/50">
                            ({tags.join(", ")}){" "}
                          </span>
                        ) : null}
                        <span className="font-medium">{label}</span>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-ink/75">
                        {o.company || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-ink/75">
                        {o.email || "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-ink/75">
                        {o.phone || "—"}
                      </td>
                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          title="Add this contact"
                          aria-label={`Add ${label}`}
                          onClick={() => onPick(o)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:bg-brand-secondary"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            aria-hidden
                          >
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {query.trim() && !exactHit ? (
          <div className="border-t border-ink/[0.08] px-4 py-2">
            <button
              type="button"
              onClick={() => onAddNew(query.trim())}
              className="text-sm font-semibold text-brand transition hover:underline"
            >
              Use “{query.trim()}” as new
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-ink/[0.08] px-4 py-3">
          {(
            [
              ["First", 1],
              ["Prev", Math.max(1, safePage - 1)],
            ] as const
          ).map(([label, target]) => (
            <button
              key={label}
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(target)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-ink/60 transition hover:bg-ink/[0.05] disabled:opacity-35"
            >
              {label}
            </button>
          ))}
          {pageButtons.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`min-w-8 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                n === safePage
                  ? "bg-brand text-white"
                  : "text-ink/65 hover:bg-ink/[0.05]"
              }`}
            >
              {n}
            </button>
          ))}
          {(
            [
              ["Next", Math.min(totalPages, safePage + 1)],
              ["Last", totalPages],
            ] as const
          ).map(([label, target]) => (
            <button
              key={label}
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(target)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-ink/60 transition hover:bg-ink/[0.05] disabled:opacity-35"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-end border-t border-ink/[0.08] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Name / company / contact field with typeahead + CRM "+" address book.
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
  addressBookTitle,
  addressBookOptions,
  inputValueFromParty,
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
  /** Show the "+" address-book button */
  showPicker?: boolean;
  /** Modal header — defaults to "Company Address Book" */
  addressBookTitle?: string;
  /** Full directory for the modal (defaults to `options`) */
  addressBookOptions?: BidPartyLookup[];
  /** What to put in the input after a pick (default: party.name) */
  inputValueFromParty?: (party: ProcessParty) => string;
  onChangeName: (name: string) => void;
  onPickExisting: (party: ProcessParty) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const resolveInput = (party: ProcessParty) =>
    (inputValueFromParty?.(party) ?? party.name ?? "").trim();

  const bookOptions = addressBookOptions ?? options;

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
        const hay = `${o.name} ${o.company ?? ""} ${o.email ?? ""} ${o.phone ?? ""}`.toLowerCase();
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
                setQuery(resolveInput(partyFromLookup(hit)));
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
            title="Open address book"
            aria-label={`Open address book for ${label}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:bg-brand-secondary"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
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
                  const party = partyFromLookup(o);
                  onPickExisting(party);
                  setQuery(resolveInput(party));
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

      <AddressBookModal
        open={pickerOpen}
        title={addressBookTitle ?? "Company Address Book"}
        options={bookOptions}
        onClose={() => setPickerOpen(false)}
        onPick={(o) => {
          const party = partyFromLookup(o);
          onPickExisting(party);
          setQuery(resolveInput(party));
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
