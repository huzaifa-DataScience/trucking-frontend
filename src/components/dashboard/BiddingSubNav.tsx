"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/bidding", label: "Bidding sheet" },
  { href: "/bidding/new", label: "New bid" },
];

export function BiddingSubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <nav aria-label="Bidding sections" className="w-full shrink-0 overflow-x-auto sm:w-56 sm:overflow-x-visible">
      <div className="mb-3 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Bidding</p>
      </div>
      <div className="flex gap-0.5 sm:flex-col">
        {LINKS.map(({ href, label }) => {
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
    </nav>
  );
}
