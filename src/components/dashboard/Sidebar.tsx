"use client";

import { useEffect, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel, isAdminPanelRole } from "@/lib/auth/roles";
import { can, canBidding, PERMISSIONS } from "@/lib/auth/permissions";
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
  NavIconClock,
  NavIconCalendar,
  NavIconTimeList,
  NavIconSun,
  NavIconChat,
  NavIconTable,
  NavIconChart,
  NavIconTag,
  NavIconBell,
} from "@/components/dashboard/DashboardNavIcons";
import type { AuthUser } from "@/lib/auth/types";
import { useChatUnreadTotal } from "@/hooks/useChatUnreadTotal";
import { ChatUnreadBadge } from "@/components/workforce/chat/ChatUnreadBadge";

type ViewMode = "operations" | "billings" | "bidding" | "mike" | "workforce";

const WORKSPACE_STORAGE_KEY = "construction-logistics-workspace";

function viewFromPathname(pathname: string): ViewMode {
  if (pathname.startsWith("/workforce")) return "workforce";
  if (
    pathname.startsWith("/mike") ||
    pathname.startsWith("/estimation-files") ||
    pathname.startsWith("/production") ||
    pathname.startsWith("/specs")
  ) {
    return "mike";
  }
  if (pathname.startsWith("/bidding")) return "bidding";
  if (pathname.startsWith("/billings") || pathname.startsWith("/clearstory")) return "billings";
  return "operations";
}

function defaultHrefForView(view: ViewMode): string {
  if (view === "billings") return "/billings";
  if (view === "bidding") return "/bidding";
  if (view === "mike") return "/estimation-files";
  if (view === "workforce") return "/workforce";
  return "/job";
}

type SidebarNavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  activePathPrefix?: string;
  /** If set, item is hidden when `can(user, permission)` is false. */
  permission?: string;
  /** Bidding keys use legacy canBidding fallback. */
  biddingPermission?: "bidding:read" | "bidding:write" | "bidding:summary";
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
  {
    href: "/job",
    label: "Job Dashboard",
    Icon: NavIconLayout,
    permission: PERMISSIONS.jobDashboardRead,
  },
  {
    href: "/material",
    label: "Material Dashboard",
    Icon: NavIconCube,
    permission: PERMISSIONS.materialDashboardRead,
  },
  {
    href: "/hauler",
    label: "Hauler Dashboard",
    Icon: NavIconTruck,
    permission: PERMISSIONS.haulerDashboardRead,
  },
  {
    href: "/forensic",
    label: "Forensic & Audit",
    Icon: NavIconShield,
    permission: PERMISSIONS.forensicRead,
  },
];

const biddingNavItems: SidebarNavItem[] = [
  {
    href: "/bidding",
    label: "Estimates",
    Icon: NavIconProposal,
    activePathPrefix: "/bidding",
    biddingPermission: "bidding:read",
  },
  {
    href: "/bidding/new",
    label: "New bid",
    Icon: NavIconPlus,
    biddingPermission: "bidding:write",
  },
];

const mikeNavItems: SidebarNavItem[] = [
  {
    href: "/estimation-files",
    label: "Estimation files",
    Icon: NavIconTable,
    activePathPrefix: "/estimation-files",
    biddingPermission: "bidding:read",
  },
  {
    href: "/production",
    label: "Production",
    Icon: NavIconChart,
    activePathPrefix: "/production",
    biddingPermission: "bidding:read",
  },
];

const clearstorySubItems: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { href: "/clearstory/projects", label: "Projects", Icon: NavIconLayout },
  { href: "/clearstory/cor", label: "CORs", Icon: NavIconProposal },
  { href: "/clearstory/rates", label: "Rates", Icon: NavIconInvoice },
  { href: "/clearstory/directory", label: "Directory", Icon: NavIconUsers },
  { href: "/clearstory/tags", label: "Tags", Icon: NavIconTag },
  { href: "/clearstory/notifications", label: "Notifications", Icon: NavIconBell },
  { href: "/clearstory/settings", label: "Settings", Icon: NavIconCog },
];

const workforceNavItems: SidebarNavItem[] = [
  {
    href: "/workforce",
    label: "Overview",
    Icon: NavIconLayout,
    activePathPrefix: "/workforce",
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/my-day",
    label: "My day",
    Icon: NavIconSun,
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/chat",
    label: "Team chat",
    Icon: NavIconChat,
    activePathPrefix: "/workforce/chat",
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/time",
    label: "Time & attendance",
    Icon: NavIconTimeList,
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/schedule",
    label: "Schedule",
    Icon: NavIconCalendar,
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/time-off",
    label: "Time off",
    Icon: NavIconClock,
    permission: PERMISSIONS.connecteamRead,
  },
  {
    href: "/workforce/crew",
    label: "Crew",
    Icon: NavIconUsers,
    permission: PERMISSIONS.connecteamWrite,
  },
];

const adminNavItems: SidebarNavItem[] = [
  {
    href: "/admin/users",
    label: "User Management",
    Icon: NavIconUsers,
    permission: PERMISSIONS.adminUsers,
  },
  { href: "/admin/settings", label: "Settings", Icon: NavIconCog },
];

/**
 * FRONTEND_RBAC.md — admin / super_admin see every workspace item;
 * do not hide chrome on missing permission keys.
 */
function navItemVisible(
  user: AuthUser | null,
  item: Pick<SidebarNavItem, "permission" | "biddingPermission">
): boolean {
  if (isAdminPanelRole(user?.role)) return true;
  if (item.biddingPermission) {
    return canBidding(user, item.biddingPermission);
  }
  if (item.permission) {
    // Empty permissions = pre-RBAC JWT → keep ops/workforce visible.
    if (!user?.permissions?.length) return true;
    return can(user, item.permission);
  }
  return true;
}

const WORKSPACES: { value: ViewMode; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { value: "operations", label: "Ops", Icon: NavIconTruck },
  { value: "billings", label: "Billing", Icon: NavIconInvoice },
  { value: "bidding", label: "Estimates", Icon: NavIconProposal },
  { value: "mike", label: "Mike", Icon: NavIconTable },
  { value: "workforce", label: "Workforce", Icon: NavIconClock },
];

const WORKSPACE_FULL_LABELS: Record<ViewMode, string> = {
  operations: "Operations & reporting",
  billings: "Billing",
  bidding: "Estimates",
  mike: "Mike",
  workforce: "Workforce",
};

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Desktop-only (lg+) manual collapse to an icon-only rail; unrelated to the mobile drawer. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, user, logout } = useAuth();
  const chatUnreadTotal = useChatUnreadTotal();
  /** The mobile drawer always shows full labels regardless of the persisted desktop collapse preference. */
  const iconOnly = collapsed && !mobileOpen;
  /** Visible everywhere except when manually collapsed (sm+), where labels hide entirely. */
  const lgLabel = collapsed ? "sm:hidden" : "";
  const lgLabelInline = collapsed ? "sm:hidden" : "";
  const lgLabelFlex = `flex ${collapsed ? "sm:hidden" : ""}`;

  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const currentView: ViewMode = viewFromPathname(pathname);
  const seesAllChrome = isAdminPanelRole(user?.role);

  const canSeeBillings =
    seesAllChrome ||
    !user?.permissions?.length ||
    can(user, PERMISSIONS.clearstoryRead) ||
    can(user, PERMISSIONS.sitelineRead);

  const visibleWorkspaces = seesAllChrome
    ? WORKSPACES
    : WORKSPACES.filter(({ value }) => {
        if (value === "operations") {
          return operationsNavItems.some((i) => navItemVisible(user, i));
        }
        if (value === "billings") return canSeeBillings;
        if (value === "bidding" || value === "mike") {
          return canBidding(user, "bidding:read");
        }
        if (value === "workforce") {
          return workforceNavItems.some((i) => navItemVisible(user, i));
        }
        return true;
      });

  const handleViewChange = (value: ViewMode) => {
    if (value === currentView) return;
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    router.push(defaultHrefForView(value));
  };

  function itemsForView(view: ViewMode): SidebarNavItem[] {
    if (view === "workforce") return workforceNavItems;
    if (view === "mike") return mikeNavItems;
    if (view === "billings") {
      return canSeeBillings
        ? [{ href: "/billings", label: "Billing", Icon: NavIconInvoice } as SidebarNavItem]
        : [];
    }
    if (view === "bidding") return biddingNavItems;
    return operationsNavItems;
  }

  // Admin layout roles always get System links (Users + Settings).
  const visibleAdminNav = isAdmin
    ? adminNavItems
    : [];

  const logoHref =
    currentView === "billings"
      ? pathname.startsWith("/clearstory")
        ? "/clearstory/projects"
        : "/billings"
      : defaultHrefForView(currentView);

  const inClearstory = pathname.startsWith("/clearstory");

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
      iconOnly ? "justify-center" : "justify-start px-2.5"
    } ${
      active
        ? "bg-brand/10 text-white shadow-[inset_2px_0_0_0_var(--brand)]"
        : "text-white/65 hover:bg-white/[0.05] hover:text-white"
    }`;

  const subLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg py-1.5 text-[13px] font-medium transition-colors ${
      iconOnly ? "justify-center px-2" : "pl-9 pr-3"
    } ${
      active
        ? "bg-brand/10 text-white shadow-[inset_2px_0_0_0_var(--brand)]"
        : "text-white/60 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0c] transition-[width,transform] duration-200 sm:translate-x-0 ${
          collapsed ? "sm:w-16" : "sm:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
      <div
        className={`flex items-center justify-between border-b border-white/[0.07] px-3 lg:px-4 ${
          collapsed ? "h-16 sm:h-auto sm:flex-col sm:justify-center sm:gap-1.5 sm:py-3" : "h-16"
        }`}
      >
        <Link
          href={logoHref}
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none ring-brand/0 focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/95 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]">
            <AppLogo height={20} />
          </span>
          <span className={`min-w-0 flex-col ${lgLabelFlex}`}>
            <span className="truncate text-[13px] font-semibold leading-tight text-white/95">
              Construction Logistics
            </span>
            <span className="text-[10.5px] leading-tight text-white/50">GOEL Services</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/55 transition hover:border-white/[0.14] hover:bg-white/[0.09] hover:text-white sm:flex"
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            aria-hidden
          >
            <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white sm:hidden"
          aria-label="Close navigation menu"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav className="ui-scroll-dark flex-1 space-y-6 overflow-y-auto px-2 py-4 lg:px-3">
        <div>
          <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 ${lgLabel}`}>
            Workspace
          </p>
          <div className="space-y-1">
            {visibleWorkspaces.map(({ value, Icon }) => {
              const isActiveWorkspace = currentView === value;
              /** "Operations & reporting" stays expanded at all times; other workspaces expand only when active. */
              const isExpanded = isActiveWorkspace || value === "operations";
              const items = itemsForView(value).filter((i) => navItemVisible(user, i));
              return (
                <div key={value}>
                  <button
                    type="button"
                    onClick={() => handleViewChange(value)}
                    title={WORKSPACE_FULL_LABELS[value]}
                    aria-expanded={isExpanded}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                      iconOnly ? "justify-center" : "justify-start px-2.5"
                    } ${
                      isActiveWorkspace
                        ? "bg-white/[0.06] text-white"
                        : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <Icon className={`h-[1.15rem] w-[1.15rem] shrink-0 ${isActiveWorkspace ? "text-brand" : "text-white/50"}`} />
                    <span className={`flex-1 truncate text-left ${lgLabelInline}`}>
                      {WORKSPACE_FULL_LABELS[value]}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${lgLabel} ${isExpanded ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isExpanded && (items.length > 0 || value === "billings") ? (
                    <div className="mt-0.5 space-y-0.5">
                      {items.map(({ href, label, Icon: ItemIcon, activePathPrefix }) => {
                        const active =
                          href === "/workforce"
                            ? pathname === "/workforce"
                            : activePathPrefix
                              ? pathname === activePathPrefix ||
                                pathname.startsWith(`${activePathPrefix}/`)
                              : pathname === href || pathname.startsWith(`${href}/`);
                        return (
                          <Link key={href} href={href} className={subLinkClass(active)} title={label}>
                            <ItemIcon className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-white/55"}`} />
                            <span className={`flex-1 ${lgLabelInline}`}>{label}</span>
                            {href === "/workforce/chat" && chatUnreadTotal > 0 ? (
                              <ChatUnreadBadge count={chatUnreadTotal} />
                            ) : null}
                          </Link>
                        );
                      })}

                      {value === "billings" && canSeeBillings && (
                        <div>
                          <Link
                            href="/clearstory/projects"
                            className={subLinkClass(inClearstory)}
                            aria-expanded={inClearstory}
                            title="Clearstory"
                          >
                            <NavIconLayers
                              className={`h-4 w-4 shrink-0 ${inClearstory ? "text-brand" : "text-white/55"}`}
                            />
                            <span className={`flex-1 ${lgLabelInline}`}>Clearstory</span>
                            <svg
                              className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${lgLabel} ${inClearstory ? "rotate-90" : ""}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden
                            >
                              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                          {inClearstory && (
                            <div className={`mt-0.5 ${lgLabel}`}>
                              <div className="ml-[1.15rem] space-y-0.5 border-l border-white/[0.08] pl-3">
                                {clearstorySubItems.map(({ href, label, Icon }) => {
                                  const active = pathname === href || pathname.startsWith(`${href}/`);
                                  return (
                                    <Link
                                      key={href}
                                      href={href}
                                      className={`flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-3 text-[12.5px] font-medium transition-colors ${
                                        active
                                          ? "bg-brand/10 text-white shadow-[inset_2px_0_0_0_var(--brand)]"
                                          : "text-white/55 hover:bg-white/[0.05] hover:text-white"
                                      }`}
                                    >
                                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-white/50"}`} />
                                      <span className="flex-1">{label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {visibleAdminNav.length > 0 && (
          <div>
            <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 ${lgLabel}`}>
              System
            </p>
            <div className="space-y-0.5">
              {visibleAdminNav.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href} className={navLinkClass(active)} title={label}>
                    <Icon
                      className={`h-[1.15rem] w-[1.15rem] shrink-0 ${active ? "text-brand" : "text-white/50"}`}
                    />
                    <span className={lgLabelInline}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className={`border-t border-white/[0.07] p-2 ${collapsed ? "" : "sm:p-3"}`}>
        <div
          className={`flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2 ${
            collapsed ? "" : "sm:flex-row sm:gap-3 sm:p-3"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,123,17,0.35)] ${
              collapsed ? "" : "sm:h-10 sm:w-10"
            }`}
            style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-secondary) 100%)" }}
            title={displayName(user)}
            aria-hidden
          >
            {userInitials(user)}
          </div>
          <div className={`min-w-0 flex-1 ${lgLabel}`}>
            <p className="truncate text-sm font-semibold text-white/90">{displayName(user)}</p>
            <p className="truncate text-xs text-white/55">
              {roleLabel(user?.role ?? "user")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
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

      {/* Collapsed + inside Clearstory: a persistent second rail for its modules — more reliable
          than a hover flyout, and mirrors a dedicated-workspace pattern (icon rail + module list). */}
      {iconOnly && inClearstory ? (
        <aside className="fixed left-16 top-0 z-30 hidden h-dvh w-48 flex-col overflow-y-auto border-r border-white/[0.06] bg-[#111114] px-2 py-4 sm:flex">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Clearstory</p>
          <div className="space-y-0.5">
            {clearstorySubItems.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-brand/10 text-white shadow-[inset_2px_0_0_0_var(--brand)]"
                      : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-white/50"}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </aside>
      ) : null}
    </>
  );
}
