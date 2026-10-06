"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-brand bg-brand text-white hover:bg-brand-secondary hover:border-brand-secondary focus-visible:outline-brand",
  /** Outline CTA — bluish border + label. */
  secondary:
    "border border-brand bg-surface text-brand hover:bg-brand-tint focus-visible:outline-brand",
  outline:
    "border border-[var(--border-subtle)] bg-surface text-ink hover:bg-canvas focus-visible:outline-brand",
  ghost: "border-transparent text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-brand",
  danger:
    "border border-danger bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-3.5 text-[13px]",
};

/**
 * Shared button classes — use directly on <Link> elements that should look like buttons.
 */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border font-medium leading-none shadow-none transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${buttonClasses(variant, size)} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
