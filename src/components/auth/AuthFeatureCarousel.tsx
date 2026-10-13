"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Slide = { kicker: string; icon: ReactNode; title: string; text: string; points: string[] };

const svg = (children: ReactNode) => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    {children}
  </svg>
);

/** What the app does, one area per slide (features from the app's own menus). No live figures: this page is public. */
const SLIDES: Slide[] = [
  {
    kicker: "Operations",
    icon: svg(
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
        <circle cx="7" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </>,
    ),
    title: "Job, material, and hauler visibility in real time",
    text: "See what's moving on every job as it happens.",
    points: ["Job, Material and Hauler dashboards", "Forensic & audit checks", "Project financials by job"],
  },
  {
    kicker: "Billing & reconciliation",
    icon: svg(<path d="M4 19h16M7 16V9M12 16V5M17 16v-4" strokeLinecap="round" />),
    title: "Aging and reconciliation gaps surfaced automatically",
    text: "A/R from Siteline, matched against Clearstory.",
    points: [
      "A/R by age, from current to 120+ days",
      "Past-due pay apps by project and PM",
      "Projects billed in Siteline but missing in Clearstory",
    ],
  },
  {
    kicker: "Estimates",
    icon: svg(
      <>
        <path d="M14 3H6v18h12V7z" strokeLinejoin="round" />
        <path d="M14 3v4h4M9 13h6M9 17h4" strokeLinecap="round" />
      </>,
    ),
    title: "Bid sheets with live MIKE/PJ totals",
    text: "Every bid from intake to handoff, with totals that update as you work.",
    points: [
      "Intake, assignment, takeoff and handoff",
      "Proposal letters and spec sheets",
      "Estimation files and production hours",
    ],
  },
  {
    kicker: "Change orders",
    icon: svg(
      <>
        <path d="M3 12V4h8l10 10-8 8z" strokeLinejoin="round" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </>,
    ),
    title: "Change orders and T&M tags in one view",
    text: "Synced from Clearstory, by status and project.",
    points: [
      "CORs from in review to CO issued",
      "T&M tags awaiting signature",
      "Rates, contracts and customer directory",
    ],
  },
  {
    kicker: "Workforce",
    icon: svg(
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path
          d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.7 2.6 3 5.2"
          strokeLinecap="round"
        />
      </>,
    ),
    title: "Crews, time and schedules",
    text: "Everyone's day in one place, from the field to the office.",
    points: ["My day, schedule and time off", "Time & attendance", "Crew, messages and calendar"],
  },
];

const INTERVAL_MS = 5000;

/**
 * Feature card that changes every 5 seconds, with round dots to show / pick the slide.
 * Pauses while hovered or focused; does not auto-advance for users who prefer reduced motion.
 */
export function AuthFeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      if (!reduceMotion.current) setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return (
    <div onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume} className="flex flex-col gap-4">
      {/* All slides share one grid cell, so the card is as tall as its tallest slide (no jump, no empty space). */}
      <div className="grid" aria-live="polite">
        {SLIDES.map((s, i) => {
          const state = i === index ? "on" : "off";
          return (
            <section
              key={s.kicker}
              id={`auth-slide-${i}`}
              role="tabpanel"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}: ${s.kicker}`}
              aria-hidden={state === "off"}
              className={`flex flex-col gap-3 [grid-area:1/1] rounded-2xl border border-[var(--border-subtle)] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
                state === "on" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[18px] opacity-0"
              }`}
            >
              <span className="inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-brand-secondary">
                <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-[var(--border-subtle)] bg-white">
                  {s.icon}
                </span>
                {s.kicker}
              </span>
              <h3 className="text-[18px] font-semibold leading-snug text-[#333333]">{s.title}</h3>
              <p className="text-[14px] leading-[1.5] text-[#6b7280]">{s.text}</p>
              <ul className="mt-1 flex flex-col gap-2">
                {s.points.map((p) => (
                  <li
                    key={p}
                    className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2.5 text-[14px] leading-[1.45] text-[#374151]"
                  >
                    <svg
                      className="mt-[3px] h-4 w-4 text-green-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      aria-hidden
                    >
                      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5" role="tablist" aria-label="Slides">
        {SLIDES.map((s, i) => (
          <button
            key={s.kicker}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls={`auth-slide-${i}`}
            aria-label={s.kicker}
            onClick={() => setIndex(i)}
            className={`relative h-2 rounded-full transition-[width,background-color] duration-200 after:absolute after:-inset-2 after:content-[''] motion-reduce:transition-none ${
              i === index ? "w-[26px] bg-brand" : "w-2 bg-ink/[0.18] hover:bg-ink/[0.35]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
