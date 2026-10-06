export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-tint text-success border-success-border",
  warning: "bg-warning-tint text-warning border-warning-border",
  danger: "bg-danger-tint text-danger border-danger-border",
  info: "bg-info-tint text-info border-info-border",
  neutral: "bg-canvas text-ink-muted border-[var(--border-subtle)]",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink-soft",
};

/**
 * Semantic status pill: tint background + dark text + dot + label.
 */
export function StatusPill({
  tone,
  label,
  className = "",
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded border px-2 text-[12px] font-medium leading-none ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden />
      {label}
    </span>
  );
}
