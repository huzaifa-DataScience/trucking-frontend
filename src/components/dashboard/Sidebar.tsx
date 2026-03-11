"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type ViewMode = "operations" | "billings";

const operationsNavItems = [
  { href: "/job", label: "Job Dashboard", icon: "◉" },
  { href: "/material", label: "Material Dashboard", icon: "▣" },
  { href: "/hauler", label: "Hauler Dashboard", icon: "▸" },
  { href: "/forensic", label: "Forensic & Audit", icon: "◈" },
];

const billingNavItems = [
  { href: "/billings", label: "Billings", icon: "§" },
];

const adminNavItems = [
  { href: "/admin/users", label: "User Management", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const currentView: ViewMode = pathname.startsWith("/billings")
    ? "billings"
    : "operations";

  const handleViewChange = (value: ViewMode) => {
    if (value === currentView) return;
    if (value === "operations") {
      router.push("/job");
    } else {
      router.push("/billings");
    }
  };

  const navItems = currentView === "billings" ? billingNavItems : operationsNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-stone-200/80 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
      <div className="flex h-14 items-center gap-2 border-b border-stone-200/80 px-4 dark:border-stone-800">
        <label className="flex w-full items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Workspace
          </span>
          <select
            value={currentView}
            onChange={(e) => handleViewChange(e.target.value as ViewMode)}
            className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm font-semibold text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            aria-label="Select workspace"
          >
            <option value="operations">Construction Logistics</option>
            <option value="billings">Billing</option>
          </select>
        </label>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  : "text-stone-600 hover:bg-stone-200/80 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              <span className="text-base opacity-80" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        {isAdmin && currentView === "operations" && (
          <>
            <div className="my-2 border-t border-stone-200/80 dark:border-stone-800" />
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-500/15 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200"
                      : "text-stone-600 hover:bg-stone-200/80 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  }`}
                >
                  <span className="text-base opacity-80" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="border-t border-stone-200/80 p-3 dark:border-stone-800">
        <p className="px-3 text-xs text-stone-500 dark:text-stone-500">
          {currentView === "billings" ? "Billing Dashboard" : "Reporting Dashboard"}
        </p>
      </div>
    </aside>
  );
}
