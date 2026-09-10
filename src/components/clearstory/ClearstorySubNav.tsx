"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Core operational objects a user moves through day to day. */
const PRIMARY_LINKS: { href: string; label: string }[] = [
  { href: "/clearstory/projects", label: "Projects" },
  { href: "/clearstory/cor", label: "Change Orders" },
  { href: "/clearstory/directory/customers", label: "Customers" },
  { href: "/clearstory/directory/contracts", label: "Contracts" },
];

/** Supporting / configuration data — used less often, tucked under "More". */
const MORE_LINKS: { href: string; label: string }[] = [
  { href: "/clearstory/tags", label: "Tags" },
  { href: "/clearstory/directory", label: "Directory" },
  { href: "/clearstory/rates", label: "Rates" },
  { href: "/clearstory/ops", label: "Ops" },
  { href: "/clearstory/company", label: "Company" },
  { href: "/clearstory/change-notifications", label: "Notifications" },
];

export function ClearstorySubNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    /** Api-payload explorer only — not /directory/customers or /contracts. */
    if (href === "/clearstory/directory") return false;
    return pathname.startsWith(`${href}/`);
  };

  const moreActive = MORE_LINKS.some((l) => isActive(l.href));

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Clearstory</p>
          <p className="mt-0.5 text-xs text-ink/45">Pick a module to browse synced Clearstory data.</p>
        </div>
      </div>

      <nav aria-label="Clearstory modules" className="mt-3.5">
        <div className="flex flex-wrap items-center gap-5 border-b border-ink/[0.08]">
          {PRIMARY_LINKS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative pb-2.5 text-sm transition focus-visible:outline-none ${
                  active ? "font-semibold text-ink" : "font-medium text-ink/55 hover:text-ink"
                }`}
              >
                {label}
                {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
              </Link>
            );
          })}

          <div
            className="relative"
            ref={moreRef}
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`relative flex items-center gap-1 pb-2.5 text-sm transition focus-visible:outline-none ${
                moreActive ? "font-semibold text-ink" : "font-medium text-ink/55 hover:text-ink"
              }`}
            >
              More
              <svg
                className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {moreActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>

            {moreOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-ink/[0.08] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(1,1,1,0.18)]"
              >
                {MORE_LINKS.map(({ href, label }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-brand/10 font-semibold text-ink"
                          : "font-medium text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}
