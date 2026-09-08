"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-canvas">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-dvh min-w-0 flex-col pl-0 sm:pl-16 lg:pl-64">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
