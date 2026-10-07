"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import {
  SECONDARY_COLLAPSED_KEY,
  Sidebar,
  dashboardMainOffsetClass,
} from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "construction-logistics-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
        setSecondaryCollapsed(localStorage.getItem(SECONDARY_COLLAPSED_KEY) === "1");
      } catch {
        /* ignore */
      }
    };
    sync();
    window.addEventListener("sidebar-collapsed-change", sync);
    window.addEventListener("secondary-collapsed-change", sync);
    return () => {
      window.removeEventListener("sidebar-collapsed-change", sync);
      window.removeEventListener("secondary-collapsed-change", sync);
    };
  }, []);

  const toggleCollapsed = () => {
    // Keep side effects out of setState updaters (Strict Mode may invoke them twice).
    let next = !collapsed;
    try {
      next = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "1";
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setCollapsed(next);
    window.dispatchEvent(new Event("sidebar-collapsed-change"));
  };

  const toggleSecondaryCollapsed = () => {
    let next = !secondaryCollapsed;
    try {
      next = localStorage.getItem(SECONDARY_COLLAPSED_KEY) !== "1";
      localStorage.setItem(SECONDARY_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setSecondaryCollapsed(next);
    window.dispatchEvent(new Event("secondary-collapsed-change"));
  };

  const mainOffset = dashboardMainOffsetClass(
    pathname,
    collapsed,
    secondaryCollapsed
  );

  return (
    <div className="glass-app min-h-dvh w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          secondaryCollapsed={secondaryCollapsed}
          onToggleSecondaryCollapsed={toggleSecondaryCollapsed}
        />
      </Suspense>
      <div
        className={`flex min-h-dvh min-w-0 flex-col pl-0 transition-[padding] duration-200 ${mainOffset}`}
      >
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 bg-transparent px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
