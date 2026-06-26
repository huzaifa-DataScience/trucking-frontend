import type { ReactNode } from "react";
import { AppLogo } from "@/components/ui/AppLogo";

/**
 * Split-screen auth layout (UX doc §6.10):
 * left brand panel (hidden on mobile), right form column on canvas.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_7fr]">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            "linear-gradient(160deg, #0a0a0a 0%, #141210 55%, #241408 100%)",
        }}
        aria-hidden
      >
        <div className="ui-dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--brand) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--brand-secondary) 0%, transparent 70%)",
          }}
        />

        <div className="relative rounded-2xl bg-white/95 p-3 shadow-lg" style={{ width: "fit-content" }}>
          <AppLogo height={40} />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            One platform for jobs, billing, and bids.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Operations dashboards, Siteline and Clearstory reconciliation, and live bid
            estimating — built for construction logistics teams.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            {[
              "Job, material, and hauler visibility in real time",
              "Aging and reconciliation gaps surfaced automatically",
              "Bid sheets with live MIKE/PJ totals",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">Construction Logistics</p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-canvas px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <AppLogo height={48} />
          <p className="text-center text-sm font-medium text-ink/60">Construction Logistics</p>
        </div>
        {children}
      </main>
    </div>
  );
}
