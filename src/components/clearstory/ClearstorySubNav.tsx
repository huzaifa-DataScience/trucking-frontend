"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_LINKS: { href: string; label: string }[] = [
  { href: "/clearstory/projects", label: "Projects" },
  { href: "/clearstory/cor", label: "Change Orders" },
  { href: "/clearstory/tags", label: "Tags" },
  { href: "/clearstory/directory/customers", label: "Customers" },
  { href: "/clearstory/directory/contracts", label: "Contracts" },
  { href: "/clearstory/company", label: "Company" },
];

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: "/clearstory/directory", label: "Directory" },
  { href: "/clearstory/change-notifications", label: "Notifications" },
  { href: "/clearstory/rates", label: "Rates" },
  { href: "/clearstory/ops", label: "Ops" },
];

export function ClearstorySubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (pathname === href) return true;
    /** Api-payload explorer only — not /directory/customers or /contracts. */
    if (href === "/clearstory/directory") return false;
    return pathname.startsWith(`${href}/`);
  };

  return (
    <div className="border-b border-ink/[0.08] pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Clearstory</p>
          <p className="mt-0.5 text-xs text-ink/45">Pick a module to browse synced Clearstory data.</p>
        </div>
      </div>

      <nav aria-label="Clearstory primary modules" className="mt-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-ink/[0.1] bg-[#f6f7f9] p-1.5">
          {PRIMARY_LINKS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  active
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink/60 hover:bg-white/70 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav aria-label="Clearstory secondary links" className="mt-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {SECONDARY_LINKS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`font-semibold transition ${
                  active ? "text-ink" : "text-ink/50 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
