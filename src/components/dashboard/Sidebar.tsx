"use client";

import { useEffect, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel, isAdminPanelRole, canSeeWfs } from "@/lib/auth/roles";
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
import { userFullName } from "@/lib/auth/user-name";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { useChatUnreadTotal } from "@/hooks/useChatUnreadTotal";
import { ChatUnreadBadge } from "@/components/workforce/chat/ChatUnreadBadge";
import { BID_HANDOFF_STAGES } from "@/lib/bidding/process-types";
import { BID_STAGE_ICONS } from "@/components/bidding/BidStageIcons";
import { TogalConnectRail } from "@/components/bidding/TogalConnectRail";

type ViewMode =
  | "operations"
  | "billings"
  | "dashboard"
  | "bidding"
  | "mike"
  | "messages"
  | "calendar"
  | "workforce"
  | "wfs"
  | "settings"
  /** System /admin — primary nav only, no workspace secondary rail. */
  | "admin";

const WORKSPACE_STORAGE_KEY = "construction-logistics-workspace";

/** Secondary rail width on xl+ (compact enterprise child nav). */
export const SIDEBAR_SECONDARY_PX = 232;
export const SIDEBAR_SECONDARY_W = "w-[232px]";
export const SIDEBAR_SECONDARY_COLLAPSED_PX = 48;
export const SIDEBAR_SECONDARY_COLLAPSED_W = "w-12";
export const SECONDARY_COLLAPSED_KEY =
  "construction-logistics-secondary-collapsed";

/** Primary rail widths — documented for secondary offset math (w-64 / w-16). */
// SIDEBAR_PRIMARY_EXPANDED_PX = 256; SIDEBAR_PRIMARY_COLLAPSED_PX = 64;

function viewFromPathname(pathname: string): ViewMode {
  if (pathname.startsWith("/admin")) return "admin";
  // Account (photo/password) lives with personal Settings, not Ops.
  if (pathname.startsWith("/settings") || pathname.startsWith("/account")) return "settings";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/workforce")) return "workforce";
  if (pathname.startsWith("/wfs")) return "wfs";
  if (
    pathname.startsWith("/mike") ||
    pathname.startsWith("/estimation-files") ||
    pathname.startsWith("/production") ||
    pathname.startsWith("/specs")
  ) {
    return "mike";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/notifications")) {
    return "dashboard";
  }
  if (pathname.startsWith("/bidding")) return "bidding";
  if (pathname.startsWith("/billings") || pathname.startsWith("/clearstory")) return "billings";
  return "operations";
}

function defaultHrefForView(view: ViewMode): string {
  if (view === "billings") return "/billings";
  if (view === "dashboard") return "/dashboard";
  if (view === "bidding") return "/bidding";
  if (view === "mike") return "/estimation-files";
  if (view === "messages") return "/messages";
  if (view === "calendar") return "/calendar";
  if (view === "workforce") return "/workforce";
  if (view === "wfs") return "/wfs";
  if (view === "settings") return "/settings/profile";
  if (view === "admin") return "/admin/users";
  return "/job";
}

/** Open bid detail (`/bidding/:id`), not list / new / all. */
export function bidDetailIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/bidding\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  const id = m[1]!;
  if (id === "new" || id === "all") return null;
  return id;
}

type SidebarNavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  activePathPrefix?: string;
  /** Match pathname === href only (no children). */
  exact?: boolean;
  /** If set, item is hidden when `can(user, permission)` is false. */
  permission?: string;
  /** Bidding keys use legacy canBidding fallback. */
  biddingPermission?: "bidding:read" | "bidding:write" | "bidding:summary";
};

function workspaceShowsSecondaryRail(view: ViewMode, pathname: string, canSeeBillings: boolean): boolean {
  // System admin pages use the primary System links only — no Ops sub-rail.
  if (view === "admin" || pathname.startsWith("/admin")) return false;
  // Open bid uses a fixed sheet secondary rail (same width) — still reserve space.
  if (bidDetailIdFromPath(pathname)) return true;
  if (pathname.startsWith("/clearstory")) return canSeeBillings;
  if (view === "billings") return canSeeBillings;
  if (view === "operations") return true;
  if (view === "bidding") return true;
  if (view === "mike") return true;
  if (view === "messages") return true;
  if (view === "calendar") return true;
  if (view === "workforce") return true;
  if (view === "dashboard") return true;
  if (view === "wfs") return true;
  if (view === "settings") return true;
  return false;
}

/**
 * Content offset for primary (+ optional secondary on xl+).
 * Keep in sync with Sidebar widths (w-64 / w-16 + 232 / 48 secondary).
 */
export function dashboardMainOffsetClass(
  pathname: string,
  collapsed: boolean,
  secondaryCollapsed = false
): string {
  const view = viewFromPathname(pathname);
  // Optimistic: assume secondary when path implies a workspace that uses one.
  // Billings visibility is gated inside Sidebar; offset still reserves space on billings routes.
  const hasSecondary = workspaceShowsSecondaryRail(view, pathname, true);

  // Mobile: overlay drawer — no permanent padding
  // sm–md: primary only (accordion hosts children)
  // xl+: primary + secondary (either rail may collapse)
  if (!hasSecondary) {
    return collapsed ? "sm:pl-16" : "sm:pl-64";
  }
  const primary = collapsed ? "sm:pl-16" : "sm:pl-64";
  const secCollapsed = secondaryCollapsed;
  // Primary (256 / 64) + secondary (232 / 48)
  // expanded+expanded 488 · collapsed+expanded 296 · expanded+collapsed 304 · both 112
  const withSecondary = secCollapsed
    ? collapsed
      ? "xl:pl-[112px]"
      : "xl:pl-[304px]"
    : collapsed
      ? "xl:pl-[296px]"
      : "xl:pl-[488px]";
  return `${primary} ${withSecondary}`;
}

function displayName(user: AuthUser | null): string {
  return userFullName(user);
}

function itemIsActive(
  pathname: string,
  item: Pick<SidebarNavItem, "href" | "activePathPrefix" | "exact">
): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/workforce") return pathname === "/workforce";
  if (item.activePathPrefix) {
    return (
      pathname === item.activePathPrefix ||
      pathname.startsWith(`${item.activePathPrefix}/`)
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  {
    href: "/project-financials",
    label: "Project financials",
    Icon: NavIconInvoice,
    activePathPrefix: "/project-financials",
  },
];

const dashboardNavItems: SidebarNavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    Icon: NavIconChart,
    exact: true,
    biddingPermission: "bidding:read",
  },
  {
    href: "/notifications",
    label: "Notifications",
    Icon: NavIconBell,
    exact: true,
    biddingPermission: "bidding:read",
  },
];

const calendarNavItems: SidebarNavItem[] = [
  {
    href: "/calendar",
    label: "Calendar",
    Icon: NavIconCalendar,
    exact: true,
  },
];

const wfsNavItems: SidebarNavItem[] = [
  {
    href: "/wfs",
    label: "Overview",
    Icon: NavIconInvoice,
    exact: true,
    // Visibility is role-gated (super_admin only) — not wfs:read.
  },
];

const biddingNavItems: SidebarNavItem[] = [
  {
    href: "/bidding",
    label: "Bids",
    Icon: NavIconTable,
    exact: true,
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

const messagesNavItems: SidebarNavItem[] = [
  {
    href: "/messages",
    label: "Inbox",
    Icon: NavIconChat,
    activePathPrefix: "/messages",
    permission: PERMISSIONS.connecteamRead,
  },
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

const settingsNavItems: SidebarNavItem[] = [
  {
    href: "/settings/profile",
    label: "My Profile",
    Icon: NavIconUsers,
    exact: true,
  },
  {
    href: "/account",
    label: "Account",
    Icon: NavIconCog,
    exact: true,
  },
  {
    href: "/settings/my-team",
    label: "My team",
    Icon: NavIconUsers,
    biddingPermission: "bidding:read",
  },
];

const SETTINGS_RAIL_SECTIONS: {
  title: string;
  links: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[];
}[] = [
  {
    title: "General",
    links: [
      { href: "/settings/profile", label: "My Profile", Icon: NavIconUsers },
      { href: "/account", label: "Account", Icon: NavIconCog },
    ],
  },
  {
    title: "Team",
    links: [{ href: "/settings/my-team", label: "My team", Icon: NavIconUsers }],
  },
];

const BID_STATUS_FILTERS: {
  value: "all" | "draft" | "submitted" | "archived";
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "All", Icon: NavIconLayers },
  { value: "draft", label: "Draft", Icon: NavIconProposal },
  { value: "submitted", label: "Submitted", Icon: NavIconTable },
  { value: "archived", label: "Archived", Icon: NavIconClock },
];

/**
 * FRONTEND_RBAC.md — admin / super_admin see every workspace item
 * (except WFS — super_admin only). Do not hide other chrome on missing keys.
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
  { value: "dashboard", label: "Dashboard", Icon: NavIconChart },
  { value: "wfs", label: "WFS", Icon: NavIconInvoice },
  { value: "operations", label: "Ops", Icon: NavIconTruck },
  { value: "billings", label: "Billing", Icon: NavIconInvoice },
  { value: "bidding", label: "Estimates", Icon: NavIconProposal },
  { value: "mike", label: "Mike", Icon: NavIconTable },
  { value: "messages", label: "Messages", Icon: NavIconChat },
  { value: "calendar", label: "Calendar", Icon: NavIconCalendar },
  { value: "workforce", label: "Workforce", Icon: NavIconClock },
  { value: "settings", label: "Settings", Icon: NavIconCog },
];

const WORKSPACE_FULL_LABELS: Record<ViewMode, string> = {
  operations: "Operations & reporting",
  billings: "Billing",
  dashboard: "Dashboard",
  wfs: "WFS",
  bidding: "Estimates",
  mike: "Mike",
  messages: "Messages",
  calendar: "Calendar",
  workforce: "Workforce",
  settings: "Settings",
  admin: "System",
};

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapsed,
  secondaryCollapsed = false,
  onToggleSecondaryCollapsed,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Desktop-only (lg+) manual collapse to an icon-only rail; unrelated to the mobile drawer. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** xl+ workspace sub-menu (Bids / Record status / …) collapse. */
  secondaryCollapsed?: boolean;
  onToggleSecondaryCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, user, logout } = useAuth();
  const chatUnreadTotal = useChatUnreadTotal();

  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (user?.role !== "assistant_estimator") return;
    const hidden =
      pathname.startsWith("/job") ||
      pathname.startsWith("/material") ||
      pathname.startsWith("/hauler") ||
      pathname.startsWith("/forensic") ||
      pathname.startsWith("/billings") ||
      pathname.startsWith("/clearstory");
    if (hidden) router.replace("/bidding");
  }, [user?.role, pathname, router]);

  const currentView: ViewMode = viewFromPathname(pathname);
  const seesAllChrome = isAdminPanelRole(user?.role);
  const showWfs = canSeeWfs(user?.role);

  const hideOpsReportingBilling = user?.role === "assistant_estimator";

  const canSeeBillings =
    seesAllChrome ||
    !user?.permissions?.length ||
    can(user, PERMISSIONS.clearstoryRead) ||
    can(user, PERMISSIONS.sitelineRead);

  /** Primary collapse is independent of the secondary rail. */
  const iconOnly = collapsed && !mobileOpen;
  const lgLabel = collapsed ? "sm:hidden" : "";
  const lgLabelInline = collapsed ? "sm:hidden" : "";
  const lgLabelFlex = `flex ${collapsed ? "sm:hidden" : ""}`;

  const visibleWorkspaces = WORKSPACES.filter(({ value }) => {
    // FRONTEND_WFS.md — never show WFS via admin chrome; super_admin only.
    if (value === "wfs") return showWfs;
    if (seesAllChrome) return true;
    if (value === "operations") {
      if (hideOpsReportingBilling) return false;
      return operationsNavItems.some((i) => navItemVisible(user, i));
    }
    if (value === "billings") return !hideOpsReportingBilling && canSeeBillings;
    if (value === "dashboard") {
      return dashboardNavItems.some((i) => navItemVisible(user, i));
    }
    if (value === "bidding" || value === "mike") {
      return canBidding(user, "bidding:read");
    }
    if (value === "settings") {
      return (
        canBidding(user, "bidding:read") &&
        (user?.role === "captain" ||
          user?.role === "assistant_estimator" ||
          user?.role === "bid_clerk" ||
          user?.role === "user" ||
          isAdminPanelRole(user?.role))
      );
    }
    if (value === "messages") {
      return messagesNavItems.some((i) => navItemVisible(user, i));
    }
    if (value === "calendar") return true;
    if (value === "workforce") {
      return workforceNavItems.some((i) => navItemVisible(user, i));
    }
    return true;
  });

  const handleViewChange = (value: ViewMode) => {
    // Re-clicking Billing while inside Clearstory should return to /billings.
    if (value === currentView) {
      if (value === "billings" && pathname.startsWith("/clearstory")) {
        router.push("/billings");
      }
      return;
    }
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    router.push(defaultHrefForView(value));
  };

  function itemsForView(view: ViewMode): SidebarNavItem[] {
    if (view === "admin") return [];
    if (view === "messages") return messagesNavItems;
    if (view === "calendar") return calendarNavItems;
    if (view === "workforce") return workforceNavItems;
    if (view === "mike") return mikeNavItems;
    if (view === "dashboard") return dashboardNavItems;
    if (view === "wfs") return wfsNavItems;
    if (view === "settings") return settingsNavItems;
    if (view === "billings") {
      return canSeeBillings
        ? [{ href: "/billings", label: "Billing", Icon: NavIconInvoice } as SidebarNavItem]
        : [];
    }
    if (view === "bidding") return biddingNavItems;
    return operationsNavItems;
  }

  // Admin layout roles always get System links (Users + Settings).
  const visibleAdminNav = isAdmin ? adminNavItems : [];

  const logoHref =
    currentView === "billings"
      ? pathname.startsWith("/clearstory")
        ? "/clearstory/projects"
        : "/billings"
      : defaultHrefForView(currentView);

  const inClearstory = pathname.startsWith("/clearstory");
  const activeBidId = bidDetailIdFromPath(pathname);
  const activeBidStage = searchParams.get("stage") ?? "intake";
  const bidListStatus = searchParams.get("status") ?? "all";
  const secondaryItems = itemsForView(currentView).filter((i) => navItemVisible(user, i));
  // Bid detail owns its own fixed secondary rail — don't double-render the workspace one.
  const showSecondaryRail =
    workspaceShowsSecondaryRail(currentView, pathname, canSeeBillings) && !activeBidId;

  const navLinkClass = (active: boolean) =>
    `flex h-12 items-center gap-3 rounded-md px-2.5 font-[family-name:var(--font-geist-sans)] text-[var(--text-nav)] font-medium leading-none transition-colors ${
      iconOnly ? "justify-center" : "justify-start px-3"
    } ${
      active
        ? "bg-[var(--sidebar-active)] font-semibold text-white"
        : "text-white hover:bg-white/[0.06] hover:text-white"
    }`;

  const accordionSubLinkClass = (active: boolean) =>
    `flex h-11 items-center gap-2.5 rounded-md font-[family-name:var(--font-geist-sans)] text-[var(--text-nav-sm)] font-medium leading-none transition-colors ${
      iconOnly ? "justify-center px-2" : "pl-3.5 pr-3"
    } ${
      active
        ? "bg-[var(--sidebar-active)] font-semibold text-white"
        : "text-white hover:bg-white/[0.05] hover:text-white"
    }`;

  /** Secondary rail — neutral type; brand reserved for active indicator. */
  const secondaryLinkClass = (active: boolean, child = false) =>
    `flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md font-[family-name:var(--font-geist-sans)] text-[var(--text-nav-sm)] font-normal leading-snug transition-colors duration-150 ${
      secondaryCollapsed
        ? "h-9 w-9 min-h-9 justify-center px-0 py-0"
        : child
          ? "px-3 py-2.5 pl-5"
          : "px-3 py-2.5"
    } ${
      active
        ? secondaryCollapsed
          ? "bg-brand-tint font-medium text-ink"
          : "bg-brand-tint font-medium text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
        : "text-ink hover:bg-canvas hover:text-ink"
    }`;

  const secondaryLeft = collapsed && !mobileOpen ? "left-16" : "left-64";
  const showSecondaryChrome = showSecondaryRail;
  const isEstimatesList = currentView === "bidding" && !activeBidId && pathname === "/bidding";

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
        className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col border-r border-white/[0.06] bg-sidebar text-white transition-[width,transform] duration-200 sm:translate-x-0 ${
          collapsed ? "sm:w-16" : "sm:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 ${
            collapsed ? "h-16 sm:h-auto sm:flex-col sm:justify-center sm:gap-2 sm:py-4" : "h-16"
          }`}
        >
          <Link
            href={logoHref}
            className="flex min-w-0 items-center gap-3 rounded-lg outline-none ring-brand/0 focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Home"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.45)]">
              <AppLogo height={22} />
            </span>
            <span className={`min-w-0 flex-col ${lgLabelFlex}`}>
              <span className="truncate text-[18px] font-semibold leading-tight text-white">
                Goel App
              </span>
              <span className="mt-0.5 text-[13px] leading-tight text-white/70">GOEL Services</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] p-2 text-white/55 transition hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white sm:flex"
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
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-white/60 transition hover:bg-white/[0.08] hover:text-white sm:hidden"
            aria-label="Close navigation menu"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="ui-scroll-dark flex-1 space-y-6 overflow-y-auto px-3 pb-5 pt-5">
          <div>
            <p className={`mb-2.5 px-3 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-white ${lgLabel}`}>
              Workspace
            </p>
            <div className="space-y-1">
              {visibleWorkspaces.map(({ value, Icon }) => {
                const isActiveWorkspace = currentView === value;
                /** Accordion below lg; lg+ children live in the light secondary rail. */
                const isExpanded = isActiveWorkspace;
                const items = itemsForView(value).filter((i) => navItemVisible(user, i));
                const hasChildren =
                  workspaceShowsSecondaryRail(value, pathname, canSeeBillings) &&
                  (items.length > 0 || value === "billings");
                return (
                  <div key={value} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleViewChange(value)}
                      title={WORKSPACE_FULL_LABELS[value]}
                      aria-expanded={isExpanded}
                      aria-current={isActiveWorkspace ? "page" : undefined}
                      className={`relative flex h-12 w-full items-center gap-3 rounded-md px-2.5 font-[family-name:var(--font-geist-sans)] text-[var(--text-nav)] font-medium leading-none transition-colors ${
                        iconOnly ? "justify-center" : "justify-start px-3"
                      } ${
                        isActiveWorkspace
                          ? "bg-[var(--sidebar-active)] font-semibold text-white"
                          : "text-white hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0 text-white" />
                      <span className={`flex-1 truncate text-left ${lgLabelInline}`}>
                        {WORKSPACE_FULL_LABELS[value]}
                      </span>
                      {value === "messages" && chatUnreadTotal > 0 && !iconOnly ? (
                        <ChatUnreadBadge count={chatUnreadTotal} />
                      ) : null}
                      {value === "messages" && chatUnreadTotal > 0 && iconOnly ? (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden />
                      ) : null}
                    </button>

                    {/* Below xl: nest children under the active workspace (accordion) — same as before. */}
                    {isExpanded && hasChildren ? (
                      <div
                        className={`mt-1 space-y-0.5 xl:hidden ${
                          iconOnly ? "" : "ml-3 border-l border-white/[0.12] pl-2.5"
                        }`}
                      >
                        {items.map(({ href, label, Icon: ItemIcon, activePathPrefix, exact }) => {
                          const active = itemIsActive(pathname, { href, activePathPrefix, exact });
                          return (
                            <Link key={href} href={href} className={accordionSubLinkClass(active)} title={label}>
                              <ItemIcon
                                className={`h-4 w-4 shrink-0 text-white`}
                              />
                              <span className={`flex-1 ${lgLabelInline}`}>{label}</span>
                              {href === "/messages" && chatUnreadTotal > 0 ? (
                                <ChatUnreadBadge count={chatUnreadTotal} />
                              ) : null}
                            </Link>
                          );
                        })}

                        {value === "billings" && canSeeBillings ? (
                          <div>
                            <Link
                              href="/clearstory/projects"
                              className={accordionSubLinkClass(inClearstory)}
                              title="Clearstory"
                            >
                              <NavIconLayers
                                className="h-4 w-4 shrink-0 text-white"
                              />
                              <span className={`flex-1 ${lgLabelInline}`}>Clearstory</span>
                            </Link>
                            {inClearstory ? (
                              <div className={`mt-0.5 ${lgLabel}`}>
                                <div className="ml-2 space-y-0.5 border-l border-white/[0.1] pl-2.5">
                                  {clearstorySubItems.map(({ href, label, Icon: CsIcon }) => {
                                    const active = pathname === href || pathname.startsWith(`${href}/`);
                                    return (
                                      <Link
                                        key={href}
                                        href={href}
                                        className={`flex items-center gap-2 rounded-md py-2 pl-2.5 pr-2.5 font-[family-name:var(--font-geist-sans)] text-[var(--text-nav-sm)] font-medium leading-none transition-colors ${
                                          active
                                            ? "bg-[var(--sidebar-active)] font-semibold text-white"
                                            : "text-white hover:bg-white/[0.05] hover:text-white"
                                        }`}
                                      >
                                        <CsIcon
                                          className="h-4 w-4 shrink-0 text-white"
                                        />
                                        <span className="flex-1">{label}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {visibleAdminNav.length > 0 && (
            <div>
              <p className={`mb-2.5 px-3 font-[family-name:var(--font-geist-sans)] text-[14px] font-medium text-white ${lgLabel}`}>
                System
              </p>
              <div className="space-y-1">
                {visibleAdminNav.map(({ href, label, Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link key={href} href={href} className={navLinkClass(active)} title={label}>
                      <Icon
                        className="h-5 w-5 shrink-0 text-white"
                      />
                      <span className={lgLabelInline}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className={`mt-auto border-t border-white/[0.08] p-3 ${collapsed ? "" : "sm:p-4"}`}>
          <div
            className={`flex flex-col items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 ${
              collapsed ? "" : "sm:flex-row sm:gap-3 sm:p-3"
            }`}
          >
            <div
              className="shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
              title={displayName(user)}
            >
              <AvatarCircle user={user} />
            </div>
            <div className={`min-w-0 flex-1 ${lgLabel}`}>
              <p className="truncate text-[13px] font-semibold text-white/95">{displayName(user)}</p>
              <p className="truncate text-[11px] text-white/50">
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

      {/* Workspace secondary rail — xl+; collapsible to a thin strip */}
      {showSecondaryChrome ? (
        <aside
          className={`workspace-secondary-rail fixed top-0 z-30 hidden h-dvh max-xl:!hidden shrink-0 flex-col border-r border-[var(--border-subtle)] bg-white transition-[left,width,min-width,max-width] duration-200 xl:flex ${secondaryLeft} ${
            secondaryCollapsed
              ? `${SIDEBAR_SECONDARY_COLLAPSED_W} min-w-12 max-w-12`
              : `${SIDEBAR_SECONDARY_W} min-w-[232px] max-w-[232px]`
          }`}
          aria-label={`${WORKSPACE_FULL_LABELS[currentView]} sections`}
          data-collapsible="true"
          data-collapsed={secondaryCollapsed ? "true" : "false"}
        >
          {/* Align with primary logo row; avoid repeating “Estimates” */}
          <div
            className={`flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] ${
              secondaryCollapsed ? "justify-center px-1" : "justify-between gap-2 px-3"
            }`}
          >
            {!secondaryCollapsed ? (
              currentView === "bidding" ? (
                <span className="sr-only">Estimates navigation</span>
              ) : (
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                  {WORKSPACE_FULL_LABELS[currentView]}
                </p>
              )
            ) : null}
            <button
              type="button"
              onClick={onToggleSecondaryCollapsed}
              title={secondaryCollapsed ? "Expand sub menu" : "Collapse sub menu"}
              aria-label={secondaryCollapsed ? "Expand sub menu" : "Collapse sub menu"}
              aria-expanded={!secondaryCollapsed}
              className={`inline-flex cursor-pointer shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-canvas text-ink transition hover:border-ink/20 hover:bg-[#eef1f5] ${
                secondaryCollapsed ? "h-9 w-9 shadow-sm" : "h-8 w-8 text-ink-muted"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  secondaryCollapsed ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                aria-hidden
              >
                <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <nav
            className={`flex flex-1 flex-col overflow-y-auto ${
              secondaryCollapsed
                ? "items-center gap-0.5 px-1 pb-4 pt-3"
                : "gap-7 px-4 pb-6 pt-5"
            }`}
          >
            {currentView === "settings" ? (
              SETTINGS_RAIL_SECTIONS.map((section, sectionIdx) => (
                <div key={section.title} className={secondaryCollapsed ? "w-full space-y-0.5" : ""}>
                  {!secondaryCollapsed && sectionIdx > 0 ? (
                    <hr className="mb-6 border-0 border-t border-[var(--border-subtle)]" />
                  ) : null}
                  {!secondaryCollapsed ? (
                    <p className="cs-rail-section">{section.title}</p>
                  ) : null}
                  <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                    {section.links.map(({ href, label, Icon }) => {
                      const active = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={secondaryLinkClass(active, true)}
                          title={label}
                          aria-label={label}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!secondaryCollapsed ? (
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (currentView === "billings" || inClearstory) && canSeeBillings ? (
              <>
                <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                  <Link
                    href="/billings"
                    className={secondaryLinkClass(
                      pathname === "/billings" || pathname.startsWith("/billings/")
                    )}
                    title="Billing"
                    aria-label="Billing"
                  >
                    <NavIconInvoice className="h-4 w-4 shrink-0" />
                    {!secondaryCollapsed ? (
                      <span className="min-w-0 flex-1 truncate">Billing</span>
                    ) : null}
                  </Link>
                </div>
                <div className={secondaryCollapsed ? "mt-1 flex w-full flex-col items-center gap-0.5" : ""}>
                  {!secondaryCollapsed ? (
                    <>
                      <hr className="mb-6 border-0 border-t border-[var(--border-subtle)]" />
                      <p className="cs-rail-section">Clearstory</p>
                    </>
                  ) : null}
                  <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                    {clearstorySubItems.map(({ href, label, Icon }) => {
                      const active = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={secondaryLinkClass(active, true)}
                          title={label}
                          aria-label={label}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!secondaryCollapsed ? (
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : currentView === "bidding" ? (
              <>
                <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                  {secondaryItems.map((item) => {
                    const isNewBid = item.href === "/bidding/new";
                    const active =
                      item.href === "/bidding" && activeBidId
                        ? true
                        : itemIsActive(pathname, item);
                    const showAsActive = Boolean(
                      active && !(item.href === "/bidding" && activeBidId)
                    );
                    const Icon = item.Icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={secondaryLinkClass(showAsActive, isNewBid)}
                        title={item.label}
                        aria-label={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!secondaryCollapsed ? (
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                {isEstimatesList ? (
                  <div className={secondaryCollapsed ? "mt-1 flex w-full flex-col items-center gap-0.5" : ""}>
                    {!secondaryCollapsed ? (
                      <>
                        <hr className="mb-6 border-0 border-t border-[var(--border-subtle)]" />
                        <p className="cs-rail-section">Record status</p>
                      </>
                    ) : null}
                    <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                      {BID_STATUS_FILTERS.map((f) => {
                        const active = bidListStatus === f.value;
                        const href =
                          f.value === "all" ? "/bidding" : `/bidding?status=${f.value}`;
                        const Icon = f.Icon;
                        return (
                          <Link
                            key={f.value}
                            href={href}
                            className={secondaryLinkClass(active, true)}
                            title={f.label}
                            aria-label={f.label}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!secondaryCollapsed ? (
                              <span className="min-w-0 flex-1 truncate">{f.label}</span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                {secondaryItems.map((item) => {
                  const active = itemIsActive(pathname, item);
                  const Icon = item.Icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={secondaryLinkClass(active)}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!secondaryCollapsed ? (
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      ) : null}
                      {!secondaryCollapsed &&
                      item.href === "/messages" &&
                      chatUnreadTotal > 0 ? (
                        <ChatUnreadBadge count={chatUnreadTotal} />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Bid stages — only when workspace secondary shows an open bid (rare; sheet usually owns this) */}
            {currentView === "bidding" && activeBidId ? (
              <div className={secondaryCollapsed ? "mt-1 flex w-full flex-col items-center gap-0.5" : ""}>
                {!secondaryCollapsed ? (
                  <>
                    <hr className="mb-6 border-0 border-t border-[var(--border-subtle)]" />
                    <p className="cs-rail-section">Bid stages</p>
                  </>
                ) : null}
                <div className={secondaryCollapsed ? "flex flex-col items-center gap-0.5" : "space-y-1"}>
                  {BID_HANDOFF_STAGES.map((s) => {
                    const active = activeBidStage === s.id;
                    const statusQs =
                      bidListStatus && bidListStatus !== "all"
                        ? `&status=${encodeURIComponent(bidListStatus)}`
                        : "";
                    const Icon = BID_STAGE_ICONS[s.id];
                    return (
                      <Link
                        key={s.id}
                        href={`/bidding/${activeBidId}?stage=${s.id}${statusQs}`}
                        className={secondaryLinkClass(active, true)}
                        title={s.label}
                        aria-label={s.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!secondaryCollapsed ? (
                          <span className="min-w-0 flex-1 truncate">{s.label}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {currentView === "bidding" ? (
              <div className={`mt-auto w-full ${secondaryCollapsed ? "" : "-mx-2"}`}>
                <TogalConnectRail collapsed={secondaryCollapsed} />
              </div>
            ) : null}
          </nav>
        </aside>
      ) : null}
    </>
  );
}
