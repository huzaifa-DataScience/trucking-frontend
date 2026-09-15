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
        background: "rgba(1, 1, 1, 0.45)",
        boxSizing: "border-box",
      }}
    >
      <div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-2xl"
        style={{ maxHeight: "min(88dvh, 900px)" }}
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
              {loading && pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-ink/45"
                  >
                    Loading contacts…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
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
