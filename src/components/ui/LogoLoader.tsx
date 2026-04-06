import { AppLogo } from "@/components/ui/AppLogo";

type LogoLoaderProps = {
  size?: number;
  className?: string;
};

/** Pulsing logo while data loads (same asset as `AppLogo`). */
export function LogoLoader({ size = 32, className = "" }: LogoLoaderProps) {
  return (
    <span
      className={`inline-flex animate-pulse items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <AppLogo height={size} alt="" />
    </span>
  );
}
