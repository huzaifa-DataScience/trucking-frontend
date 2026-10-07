"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as biddingPartiesApi from "@/lib/api/endpoints/biddingParties";
import type {
  BidPartyLookup,
  BidPartyRole,
} from "@/lib/api/endpoints/biddingParties";
import type { ProcessParty } from "@/lib/bidding/process-types";

const PAGE_SIZE = 10;

/** Stable viewport-fixed host — escapes transformed ancestors (e.g. bid-animate-in). */
function getModalRoot(): HTMLElement {
  const id = "app-viewport-modal-root";
  let root = document.getElementById(id);
  if (!root) {
    root = document.createElement("div");
    root.id = id;
    Object.assign(root.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      width: "100vw",
      height: "100dvh",
      zIndex: "99999",
      pointerEvents: "none",
    });
    document.documentElement.appendChild(root);
  }
  return root;
}

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
  if (
    o.status?.trim() &&
    !tags.some((t) => t.toLowerCase() === o.status!.trim().toLowerCase())
  ) {
    tags.push(o.status.trim());
  }
  return { label: o.name, tags };
}

/** CRM address book — portal to body so it stays in the viewport (not page scroll). */
function AddressBookModal({
  open,
  title,
  role,
  seedOptions,
  onClose,
  onPick,
  onAddNew,
}: {
  open: boolean;
  title: string;
  role?: BidPartyRole | string;
  seedOptions: BidPartyLookup[];
  onClose: () => void;
  onPick: (party: BidPartyLookup) => void;
  onAddNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BidPartyLookup[]>(seedOptions);
  const [total, setTotal] = useState(seedOptions.length);
  const [loading, setLoading] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const fetchGen = useRef(0);

  useEffect(() => {
    setPortalRoot(getModalRoot());
  }, []);

  // Keep the portal layer glued to the *visible* viewport (not document middle).
  useEffect(() => {
    if (!open || !portalRoot) return;
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        Object.assign(portalRoot.style, {
          top: "0px",
          left: "0px",
          width: "100vw",
          height: "100dvh",
        });
        return;
      }
      Object.assign(portalRoot.style, {
        top: `${vv.offsetTop}px`,
        left: `${vv.offsetLeft}px`,
        width: `${vv.width}px`,
        height: `${vv.height}px`,
      });
    };
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, portalRoot]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPage(1);
    setRows(seedOptions);
    setTotal(seedOptions.length);
  }, [open, seedOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const t = window.setTimeout(() => setDebouncedQ(q), q ? 200 : 0);
    return () => window.clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    if (!open || !role) return;
    setPage(1);
  }, [open, role, debouncedQ]);

  // Server page: GET /lookups/bidding/parties?role=&q=&page=&pageSize=
  useEffect(() => {
    if (!open || !role) return;
    const gen = ++fetchGen.current;
    setLoading(true);
    void biddingPartiesApi
      .getBiddingPartiesPage({
        role,
        q: debouncedQ || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (fetchGen.current !== gen) return;
        setRows(res.items);
        setTotal(res.total);
      })
      .finally(() => {
        if (fetchGen.current === gen) setLoading(false);
      });
  }, [open, role, debouncedQ, page]);

  const filtered = useMemo(() => {
    // Role-backed: `rows` is the current server page.
    if (role) return rows;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const hay = [o.name, o.company, o.contactName, o.email, o.phone, o.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, role]);

  const totalPages = Math.max(
    1,
    Math.ceil((role ? total : filtered.length) / PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const pageRows = role
    ? filtered
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exactHit = rows.some(
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

  if (!open || !portalRoot) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        pointerEvents: "auto",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.4)",
        boxSizing: "border-box",
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#d5dbe3] bg-white shadow-xl"
        style={{ maxHeight: "min(88dvh, 900px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-subtle)] bg-brand-tint px-4 py-2.5">
          <h3 className="text-[13px] font-semibold tracking-wide text-ink">
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-canvas px-4 py-2.5">
          <span className="inline-flex items-center rounded-md border border-brand/25 bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-ink">
            Email Address Book
          </span>
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <span
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              aria-hidden
            >
              <svg
                className="h-3.5 w-3.5"
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
              className="h-8 w-full rounded-md border border-[#cfd5dd] bg-white pl-8 pr-2.5 text-[13.5px] text-[#374151] outline-none transition focus:border-[#94a3b8] focus:shadow-[0_0_0_2px_rgba(148,163,184,0.28)]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-[12.5px] text-[#374151]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6] text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Company name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone number</th>
                <th className="w-12 px-2 py-2" aria-label="Add" />
              </tr>
            </thead>
            <tbody>
              {loading && pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-[12.5px] text-[#9ca3af]"
                  >
                    Loading contacts…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-[12.5px] text-[#9ca3af]"
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
                      className="border-b border-[var(--border-subtle)] transition hover:bg-brand-tint/50"
                    >
                      <td className="px-3 py-2 align-middle">
                        {tags.length > 0 ? (
                          <span className="text-[#9ca3af]">({tags.join(", ")}) </span>
                        ) : null}
                        <span className="font-medium text-ink">{label}</span>
                      </td>
                      <td className="px-3 py-2 align-middle text-ink-muted">
                        {o.company || "—"}
                      </td>
                      <td className="px-3 py-2 align-middle text-ink-muted">
                        {o.email || "—"}
                      </td>
                      <td className="px-3 py-2 align-middle text-ink-muted">
                        {o.phone || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center align-middle">
                        <button
                          type="button"
                          title="Add this contact"
                          aria-label={`Add ${label}`}
                          onClick={() => onPick(o)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand/30 bg-brand-tint text-brand transition hover:bg-brand hover:text-white"
                        >
                          <svg
                            className="h-3.5 w-3.5"
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
          <div className="border-t border-[#e5e7eb] px-4 py-2">
            <button
              type="button"
              onClick={() => onAddNew(query.trim())}
              className="text-[12.5px] font-semibold text-[#333333] transition hover:underline"
            >
              Use “{query.trim()}” as new
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-[#e5e7eb] bg-[#f8fafc] px-4 py-2.5">
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
              className="rounded-md border border-transparent px-2 py-1 text-[11px] font-medium text-[#6b7280] transition hover:border-[#cfd5dd] hover:bg-white disabled:opacity-35"
            >
              {label}
            </button>
          ))}
          {pageButtons.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`min-w-7 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                n === safePage
                  ? "border border-brand/30 bg-brand-tint text-ink"
                  : "border border-transparent text-[#6b7280] hover:border-[#cfd5dd] hover:bg-white"
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
              className="rounded-md border border-transparent px-2 py-1 text-[11px] font-medium text-[#6b7280] transition hover:border-[#cfd5dd] hover:bg-white disabled:opacity-35"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#e5e7eb] px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#cfd5dd] bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-[#4b5563] transition hover:border-[#94a3b8] hover:bg-[#f1f5f9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
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
  partyRole,
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
  showPicker?: boolean;
  addressBookTitle?: string;
  addressBookOptions?: BidPartyLookup[];
  inputValueFromParty?: (party: ProcessParty) => string;
  /** When set, typeahead + address book call GET /lookups/bidding/parties?role=&q= */
  partyRole?: BidPartyRole | string;
  onChangeName: (name: string) => void;
  onPickExisting: (party: ProcessParty) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [remoteOptions, setRemoteOptions] = useState<BidPartyLookup[] | null>(
    null
  );
  const typeaheadGen = useRef(0);

  const resolveInput = (party: ProcessParty) =>
    (inputValueFromParty?.(party) ?? party.name ?? "").trim();

  const bookOptions = addressBookOptions ?? options;
  const listOptions = remoteOptions ?? options;

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

  // Server typeahead while typing (intake doc).
  useEffect(() => {
    if (!partyRole || disabled) return;
    const q = query.trim();
    if (!q) {
      setRemoteOptions(null);
      return;
    }
    const gen = ++typeaheadGen.current;
    const t = window.setTimeout(() => {
      void biddingPartiesApi
        .getBiddingParties({ role: partyRole, q })
        .then((list) => {
          if (typeaheadGen.current !== gen) return;
          setRemoteOptions(list);
        });
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, partyRole, disabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (partyRole && remoteOptions) {
      return remoteOptions.slice(0, 40);
    }
    if (!q) return listOptions.slice(0, 40);
    return listOptions
      .filter((o) => {
        const hay =
          `${o.name} ${o.company ?? ""} ${o.email ?? ""} ${o.phone ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [listOptions, query, partyRole, remoteOptions]);

  const exactHit = listOptions.find(
    (o) => o.name.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const commitTyped = (raw: string) => {
    const name = raw.trim();
    onChangeName(name);
    if (!name) return;
    const hit = listOptions.find(
      (o) => o.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (hit) onPickExisting(partyFromLookup(hit));
  };

  return (
    <div className="relative intake-row" ref={wrapRef}>
      <span className={labelClass}>{label}</span>
      <div className="relative min-w-0">
        <div className="flex min-w-0 items-center gap-1">
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#cfd5dd] bg-[#f3f4f6] text-[#4b5563] transition hover:border-[#94a3b8] hover:bg-[#eef2f7]"
            >
              <svg
                className="h-3.5 w-3.5"
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
            className="absolute left-0 right-0 top-full z-30 mt-0.5 max-h-48 overflow-auto rounded border border-[#cfd5dd] bg-white py-1 shadow-md"
          >
            {filtered.map((o) => (
              <li key={String(o.id)}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-1.5 text-left text-[12.5px] hover:bg-[#eef2f7]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const party = partyFromLookup(o);
                    onPickExisting(party);
                    setQuery(resolveInput(party));
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-[#1f2937]">{o.name}</span>
                  {(o.company || o.email) && (
                    <span className="text-[11px] text-[#9ca3af]">
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
                  className="w-full px-3 py-1.5 text-left text-[12.5px] font-medium text-[#4b5563] hover:bg-[#eef2f7]"
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
              <li className="px-3 py-1.5 text-[11px] text-[#9ca3af]">No saved parties yet</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <AddressBookModal
        open={pickerOpen}
        title={addressBookTitle ?? "Company Address Book"}
        role={partyRole}
        seedOptions={bookOptions}
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
