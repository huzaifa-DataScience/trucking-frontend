import type { ReactNode } from "react";
import { entityBrandForName } from "@/lib/branding/entity-colors";
import { AuthFeatureCarousel } from "@/components/auth/AuthFeatureCarousel";

/** Same font stack as the Estimates bid pages (.intake-compact in globals.css). */
const AUTH_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const COMPANIES = ["GOEL", "GOEL DC", "DCB"];

/** Trimmed GOEL logo (no stray edge line); shown at or below its 244×135 size so it stays crisp. */
function AuthLogo({ height }: { height: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static, already-optimised PNG; next/image adds nothing here
    <img
      src="/logo_clean.png"
      alt="GOEL"
      width={Math.round((height * 244) / 135)}
      height={height}
      // self-start + flex-none: the brand panel is a flex column and would otherwise stretch the logo sideways.
      className="block w-auto max-w-full flex-none self-start object-contain"
      style={{ height }}
    />
  );
}

function CompanyChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {COMPANIES.map((name) => {
        const b = entityBrandForName(name);
        return (
          <span
            key={name}
            className={`inline-flex h-[34px] items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-semibold ${b.bg} ${b.text} ${b.border}`}
          >
            <span className={`h-2 w-2 rounded-full ${b.dot}`} aria-hidden />
            {name}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Auth layout (option A): light brand panel on the left (logo, what the app is, a rotating feature
 * card, the group's companies) and the form on the right. On small screens the panel collapses
 * to the logo and company chips above the form.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid min-h-screen bg-canvas text-[13px] tracking-[0.01em] text-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
      style={{ fontFamily: AUTH_FONT }}
    >
      <aside
        className="relative hidden flex-col justify-center overflow-hidden border-r border-[var(--border-subtle)] bg-[linear-gradient(165deg,#ffffff_0%,#f6f8fb_60%,#eef3fa_100%)] px-9 py-10 lg:flex"
        aria-label="About the app"
      >
        <div
          className="pointer-events-none absolute -bottom-[120px] -right-[120px] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(232,137,58,0.16),transparent_70%)]"
          aria-hidden
        />
        {/* One block, vertically centred and width-capped, so nothing drifts to the far top / bottom on tall screens. */}
        <div className="relative z-[1] mx-auto flex w-full max-w-[600px] flex-col gap-8">
          <AuthLogo height={88} />
          <div>
            <h2 className="max-w-[22ch] text-[34px] font-semibold leading-[1.15] text-[#333333]">
              One platform for jobs, billing, and bids.
            </h2>
            <p className="mt-3 max-w-[54ch] text-[15.5px] leading-[1.55] text-[#6b7280]">
              Operations dashboards, Siteline and Clearstory reconciliation, and live bid estimating, built for
              construction logistics teams.
            </p>
          </div>
          <AuthFeatureCarousel />
          <div>
            <p className="mb-2.5 text-[13px] text-[#6b7280]">One login for</p>
            <CompanyChips />
          </div>
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <AuthLogo height={56} />
          <CompanyChips />
        </div>
        {children}
      </main>
    </div>
  );
}
