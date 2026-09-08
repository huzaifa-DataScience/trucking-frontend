"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavGroup {
  label: string;
  links: { href: string; label: string }[];
}

const CLEARSTORY_GROUPS: SubNavGroup[] = [
  {
    label: "Modules",
    links: [
      { href: "/clearstory/projects", label: "Projects" },
      { href: "/clearstory/cor", label: "Change Orders" },
      { href: "/clearstory/tags", label: "T&M Tags" },
    ],
  },
  {
    label: "Directory",
    links: [
      { href: "/clearstory/directory/customers", label: "Customers" },
      { href: "/clearstory/directory/contracts", label: "Contracts" },
      { href: "/clearstory/directory", label: "Lookup" },
    ],
  },
  {
    label: "Configuration",
    links: [
      { href: "/clearstory/rates", label: "Rates" },
      { href: "/clearstory/company", label: "Company" },
    ],
  },
  {
    label: "Admin",
    links: [
      { href: "/clearstory/change-notifications", label: "Change Notifications" },
      { href: "/clearstory/ops", label: "Ops" },
    ],
  },
];

/** Shared sub-nav for the whole Billings workspace (Billings + Clearstory) —
 * rendered on /billings and every /clearstory/* page, so "Billings" is always
 * one click away. Clearstory's module groups only expand while you're inside
 * Clearstory, to avoid cluttering the plain Billings page with them. */
export function BillingWorkspaceSubNav() {
  const pathname = usePathname();
  const inClearstory = pathname.startsWith("/clearstory");

  const isActive = (href: string) => {
    if (pathname === href) return true;
    /** Api-payload explorer only — not /directory/customers or /contracts. */
    if (href === "/clearstory/directory") return false;
    return pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Billings and Clearstory sections"
      className="w-full shrink-0 overflow-x-auto sm:w-56 sm:overflow-x-visible"
    >
      <div className="mb-3 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Billings</p>
      </div>
      <div className="flex gap-4 sm:flex-col sm:gap-5">
        <div className="flex gap-0.5 sm:flex-col">
          <Link
            href="/billings"
            className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              isActive("/billings") ? "bg-ink/[0.06] text-ink" : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            Billings
          </Link>
          <Link
            href="/clearstory/projects"
            className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              inClearstory ? "bg-ink/[0.06] text-ink" : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            Clearstory
          </Link>
        </div>

        {inClearstory
          ? CLEARSTORY_GROUPS.map((group) => (
              <div key={group.label} className="shrink-0 sm:shrink">
                <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink/35">
                  {group.label}
                </p>
                <div className="flex gap-0.5 sm:flex-col">
                  {group.links.map(({ href, label }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                          active ? "bg-ink/[0.06] text-ink" : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          : null}
      </div>
    </nav>
  );
}
