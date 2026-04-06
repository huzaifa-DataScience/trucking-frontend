type AppLogoProps = {
  /** Display height in CSS pixels; width scales with the image aspect ratio. */
  height?: number;
  className?: string;
  alt?: string;
};

/**
 * Mark from `public/logo_transparent.png` — sidebar, auth, and branded chrome.
 */
export function AppLogo({
  height = 40,
  className = "",
  alt = "Company logo",
}: AppLogoProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <img
        src="/logo_transparent.png"
        alt={alt}
        className="w-auto max-w-[min(100%,11rem)] object-contain object-left"
        style={{ height: `${height}px`, width: "auto" }}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
