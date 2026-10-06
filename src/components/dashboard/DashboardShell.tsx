"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar, dashboardMainOffsetClass } from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "construction-logistics-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sidebar-collapsed-change"));
      }
      return next;
    });
  };

  const mainOffset = dashboardMainOffsetClass(pathname, collapsed);

  return (
    <div className="glass-app min-h-dvh w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
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
