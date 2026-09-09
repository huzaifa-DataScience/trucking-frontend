"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "construction-logistics-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  /** Collapsed + inside Clearstory: a second rail shows its modules, so content needs extra offset. */
  const showClearstoryRail = collapsed && pathname.startsWith("/clearstory");

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
      return next;
    });
  };

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-canvas">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div
        className={`flex min-h-dvh min-w-0 flex-col pl-0 transition-[padding] duration-200 ${
          showClearstoryRail ? "sm:pl-64" : collapsed ? "sm:pl-16" : "sm:pl-64"
        }`}
      >
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
