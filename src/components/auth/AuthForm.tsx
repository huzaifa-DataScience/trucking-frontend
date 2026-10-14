"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

/** Shared pieces for the auth pages: card, labelled field with icon, error box, primary button. */

export function AuthCard({
  title,
  subtitle,
  wide = false,
  compact = false,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  /** Tighter padding and fields so long forms (Create account) fit the screen height. */
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-compact={compact || undefined}
      className={`group/authcard ui-animate-in w-full ${wide ? "max-w-[680px]" : "max-w-[580px]"} rounded-[22px] relative overflow-hidden border border-white bg-[linear-gradient(150deg,#e6f1fe_0%,#f6faff_38%,#fff7ef_68%,#ffe9d6_100%)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#1e88e5,#e8893a)] before:content-[''] ${compact ? "px-10 py-8" : "p-12"} shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-18px_rgba(30,136,229,0.28)]`}
    >
      <h1 className="text-[32px] font-semibold group-data-[compact]/authcard:text-[26px] leading-[1.2] text-[#333333]">{title}</h1>
      {subtitle ? <p className="mt-2 text-[16px] text-[#6b7280] group-data-[compact]/authcard:mt-1 group-data-[compact]/authcard:text-[14.5px]">{subtitle}</p> : null}
      {children}
    </div>
  );
}

const ICONS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  company: <path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6" />,
};

type FieldProps = {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Shown next to the label, e.g. "optional". */
  note?: string;
  /** Under the input. */
  hint?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/** Label (12.5px grey, as on the Estimates pages) + 40px input with a leading icon; passwords get Show/Hide. */
export function AuthField({ id, label, icon, note, hint, type = "text", ...input }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-baseline gap-1.5 text-[15px] font-medium leading-[1.2] text-[#6b7280] group-data-[compact]/authcard:mb-1.5 group-data-[compact]/authcard:text-[13.5px]"
      >
        {label}
        {note ? <span className="font-normal text-ink-soft">{note}</span> : null}
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          {ICONS[icon]}
        </svg>
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          className={`h-[54px] w-full rounded-[12px] border border-[#d1d5db] bg-white pl-12 text-[16px] group-data-[compact]/authcard:h-11 group-data-[compact]/authcard:text-[15px] leading-[1.25] text-[#374151] outline-none transition-[border-color,box-shadow] focus:border-brand focus:shadow-[0_0_0_3px_rgba(30,136,229,0.15)] autofill:shadow-[inset_0_0_0_1000px_#fff] autofill:[-webkit-text-fill-color:#374151] autofill:focus:shadow-[inset_0_0_0_1000px_#fff,0_0_0_3px_rgba(30,136,229,0.15)] ${
            isPassword ? "pr-16" : "pr-3"
          }`}
          {...input}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 group-data-[compact]/authcard:h-8 rounded-[8px] px-3 text-[14px] font-medium text-ink-muted hover:bg-[#f3f4f6] hover:text-ink"
          >
            {show ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {hint}
    </div>
  );
}

export function AuthError({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[13.5px] text-red-800"
      role="alert"
    >
      <svg
        className="mt-px h-4 w-4 shrink-0 text-red-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children ? <p className="mt-0.5 text-red-700">{children}</p> : null}
      </div>
    </div>
  );
}

export function AuthSubmit({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand text-[16px] group-data-[compact]/authcard:h-11 group-data-[compact]/authcard:text-[15px] font-semibold text-white transition-colors hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </button>
  );
}

/** 4-step bar, one step per password-policy requirement: 8+ chars, upper + lower case, a number, a symbol. All green = accepted. */
export function PasswordStrength({ password }: { password: string }) {
  const score = !password
    ? 0
    : [
        password.length >= 8,
        /[a-z]/.test(password) && /[A-Z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
      ].filter(Boolean).length;
  const color = score <= 1 ? "bg-red-500" : score < 4 ? "bg-amber-500" : "bg-green-600";
  return (
    <div className="mt-[7px] flex gap-1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-1 flex-1 rounded-sm ${i < score ? color : "bg-[#f3f4f6]"}`} />
      ))}
    </div>
  );
}

export const authHintClass = "mt-2 text-[14px] leading-[1.4] text-[#6b7280]";
