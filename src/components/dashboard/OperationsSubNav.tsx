"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavGroup {
  label: string;
  links: { href: string; label: string }[];
}

const GROUPS: SubNavGroup[] = [
  {
    label: "Dashboards",
    links: [
      { href: "/job", label: "Job Dashboard" },
      { href: "/material", label: "Material Dashboard" },
      { href: "/hauler", label: "Hauler Dashboard" },
    ],
  },
  {
    label: "Audit",
    links: [{ href: "/forensic", label: "Forensic & Audit" }],
  },
];

export function OperationsSubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Operations & reporting sections"
      className="w-full shrink-0 overflow-x-auto sm:w-56 sm:overflow-x-visible"
    >
      <div className="mb-3 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Operations & reporting</p>
      </div>
      <div className="flex gap-4 sm:flex-col sm:gap-5">
        {GROUPS.map((group) => (
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
        ))}
      </div>
    </nav>
  );
}
