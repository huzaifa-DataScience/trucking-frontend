"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/ui/AppLogo";
import {
  NavIconLayout,
  NavIconCube,
  NavIconTruck,
  NavIconShield,
  NavIconProposal,
  NavIconPlus,
  NavIconInvoice,
  NavIconLayers,
  NavIconUsers,
  NavIconCog,
} from "@/components/dashboard/DashboardNavIcons";
import type { AuthUser } from "@/lib/auth/types";

type ViewMode = "operations" | "billings" | "bidding";

const WORKSPACE_STORAGE_KEY = "construction-logistics-workspace";

function viewFromPathname(pathname: string): ViewMode {
  if (pathname.startsWith("/bidding")) return "bidding";
  if (pathname.startsWith("/billings") || pathname.startsWith("/clearstory")) return "billings";
  return "operations";
}

function defaultHrefForView(view: ViewMode): string {
  if (view === "billings") return "/billings";
  if (view === "bidding") return "/bidding";
  return "/job";
}

type SidebarNavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  activePathPrefix?: string;
};

function userInitials(user: AuthUser | null): string {
  if (!user) return "?";
  const f = user.firstName?.[0];
  const l = user.lastName?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  const parts = user.displayName?.split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

function displayName(user: AuthUser | null): string {
  if (!user) return "User";
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

const operationsNavItems: SidebarNavItem[] = [
  { href: "/job", label: "Job Dashboard", Icon: NavIconLayout },
  { href: "/material", label: "Material Dashboard", Icon: NavIconCube },
  { href: "/hauler", label: "Hauler Dashboard", Icon: NavIconTruck },
  { href: "/forensic", label: "Forensic & Audit", Icon: NavIconShield },
];

const biddingNavItems: SidebarNavItem[] = [
  { href: "/bidding", label: "Bidding sheet", Icon: NavIconProposal, activePathPrefix: "/bidding" },
  { href: "/bidding/new", label: "New estimate", Icon: NavIconPlus },
];

const billingNavItems: SidebarNavItem[] = [
  { href: "/billings", label: "Billings", Icon: NavIconInvoice },
  {
    href: "/clearstory/projects",
    label: "Clearstory",
    Icon: NavIconLayers,
    activePathPrefix: "/clearstory",
  },
];

const adminNavItems: SidebarNavItem[] = [
  { href: "/admin/users", label: "User Management", Icon: NavIconUsers },
  { href: "/admin/settings", label: "Settings", Icon: NavIconCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, user, logout } = useAuth();

  const currentView: ViewMode = viewFromPathname(pathname);

  const handleViewChange = (value: ViewMode) => {
    if (value === currentView) return;
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    router.push(defaultHrefForView(value));
  };

  const navItems =
    currentView === "billings"
      ? billingNavItems
      : currentView === "bidding"
        ? biddingNavItems
        : operationsNavItems;

  const navSectionLabel =
    currentView === "billings" ? "Billing" : currentView === "bidding" ? "Bidding" : "Overview";

  const logoHref =
    currentView === "billings"
      ? pathname.startsWith("/clearstory")
        ? "/clearstory/projects"
        : "/billings"
      : defaultHrefForView(currentView);

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-brand/10 text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
        : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink"
    }`;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-ink/[0.08] bg-surface">
      <div className="border-b border-ink/[0.08] px-4 pb-4 pt-5">
        <Link
          href={logoHref}
          className="flex flex-col items-center gap-2 rounded-xl outline-none ring-brand/0 focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Home"
        >
          <AppLogo height={44} />
          <span className="text-center text-xs font-semibold tracking-tight text-ink">
            Construction Logistics
          </span>
        </Link>
        <div className="mt-4">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink/40">
            Workspace
          </p>
          <select
            value={currentView}
            onChange={(e) => handleViewChange(e.target.value as ViewMode)}
            className="w-full rounded-xl border border-ink/10 bg-[#f8f9fb] px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-label="Select workspace"
          >
            <option value="operations">Operations & reporting</option>
            <option value="billings">Billing</option>
            <option value="bidding">Bidding sheet</option>
          </select>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink/40">
            {navSectionLabel}
          </p>
          <div className="space-y-0.5">
            {navItems.map(({ href, label, Icon, activePathPrefix }) => {
              const active = activePathPrefix
                ? pathname === activePathPrefix || pathname.startsWith(`${activePathPrefix}/`)
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} className={navLinkClass(active)}>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-ink/40"}`}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {isAdmin && currentView === "operations" && (
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink/40">
              System
            </p>
            <div className="space-y-0.5">
              {adminNavItems.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href} className={navLinkClass(active)}>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-ink/40"}`}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-ink/[0.08] p-3">
        <div className="flex items-center gap-3 rounded-xl border border-ink/[0.06] bg-[#f8f9fb] p-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)" }}
            aria-hidden
          >
            {userInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{displayName(user)}</p>
            <p className="truncate text-xs text-ink/45">
              {isAdmin ? "Administrator" : "Team member"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-lg p-2 text-ink/45 transition hover:bg-white hover:text-ink"
            title="Log out"
            aria-label="Log out"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
