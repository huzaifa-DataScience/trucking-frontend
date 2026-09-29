"use client";

import { useEffect, useState, type ReactNode } from "react";

export type JumpNavItem = {
  id: string;
  label: string;
  /** Badge (rail) / trailing number (chips). */
  count?: number;
  /** Rail only: second line under the label. */
  caption?: string;
  /** Rail only: badge colour. `danger` = red, `warning` = orange, else a plain number. */
  tone?: "danger" | "warning" | "neutral";
  /** Rail only: items with the same group are listed under that heading. */
  group?: string;
};

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/** Tracks which section is in the reading band just under the sticky header. */
function useActiveSection(ids: string[]): [string | null, (id: string) => void] {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join("|");

  useEffect(() => {
    const els = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = els.find((el) => visible.has(el.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-72px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return [active, setActive];
}

const BADGE: Record<NonNullable<JumpNavItem["tone"]>, string> = {
  danger: "bg-red-700 text-white",
  warning: "bg-brand/15 text-orange-800",
  neutral: "text-ink/45",
};

/**
 * In-page section menu for long pages.
 * `rail`: sticky left column on wide screens (title, grouped items, footer slot).
 * `chips`: scrollable chip row for narrower screens.
 */
export function DashboardJumpNav({
  items,
  variant,
  title,
  subtitle,
  footer,
}: {
  items: JumpNavItem[];
  variant: "rail" | "chips";
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  const [active, setActive] = useActiveSection(items.map((i) => i.id));

  if (items.length < 2) return null;

  const onPick = (id: string) => {
    setActive(id);
    scrollToSection(id);
  };

  if (variant === "chips") {
    return (
      <nav aria-label="Jump to section" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onPick(it.id)}
              aria-current={on ? "true" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                on ? "border-ink bg-ink text-white" : "border-ink/10 bg-surface text-ink/65 hover:text-ink"
              }`}
            >
              {it.label}
              {it.count != null ? (
                <span className={`tabular-nums ${on ? "text-white/70" : it.tone === "danger" ? "text-red-700" : "text-ink/35"}`}>
                  {it.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  const groups: { name: string; items: JumpNavItem[] }[] = [];
  for (const it of items) {
    const name = it.group ?? "";
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(it);
    else groups.push({ name, items: [it] });
  }

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[5.25rem] hidden max-h-[calc(100dvh-6.5rem)] flex-col gap-6 self-start overflow-y-auto border-r border-ink/[0.08] py-1 lg:flex"
    >
      {title ? (
        <div className="flex flex-col gap-0.5 pr-5">
          <p className="text-lg font-bold tracking-tight text-ink">{title}</p>
          {subtitle ? <p className="text-xs text-ink/50">{subtitle}</p> : null}
        </div>
      ) : null}

      {groups.map((g) => (
        <div key={g.name || "_"} className="flex flex-col gap-1">
          {g.name ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">{g.name}</p>
          ) : null}
          {g.items.map((it) => {
            const on = active === it.id;
            const tone = it.tone ?? "neutral";
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onPick(it.id)}
                aria-current={on ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-l-xl border-r-[3px] py-2.5 pl-3 pr-5 text-left transition ${
                  on ? "border-brand bg-surface" : "border-transparent hover:bg-surface/60"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className={`truncate text-sm ${on ? "font-semibold text-ink" : "font-medium text-ink/75"}`}>
                    {it.label}
                  </span>
                  {it.caption ? (
                    <span className={`truncate text-xs ${tone === "danger" ? "text-red-800" : "text-ink/50"}`}>
                      {it.caption}
                    </span>
                  ) : null}
                </span>
                {it.count != null ? (
                  <span
                    className={`shrink-0 tabular-nums ${
                      tone === "neutral"
                        ? `text-xs ${BADGE.neutral}`
                        : `min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold ${BADGE[tone]}`
                    }`}
                  >
                    {it.count.toLocaleString()}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      {footer ? <div className="flex flex-col gap-2 pr-5">{footer}</div> : null}
    </nav>
  );
}
