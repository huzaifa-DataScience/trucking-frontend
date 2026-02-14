/**
 * API configuration – single source of truth for backend base URL.
 * Uses NEXT_PUBLIC_ so it's available in the browser.
 */

const FALLBACK_BASE = "http://localhost:3001";

export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_BASE;
  const finalUrl = url || FALLBACK_BASE;
  // Debug: Log the URL being used (remove in production)
  if (typeof window !== "undefined") {
    console.log("[API Config] Base URL:", finalUrl, "| Env var:", process.env.NEXT_PUBLIC_API_BASE_URL);
  }
  return finalUrl;
}

/** Base URL for the NestJS backend (no trailing slash). Resolved at call time for correct env. */
export function getApiUrl(path: string, searchParams?: Record<string, string | number | undefined>): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${pathNorm}`;
  if (!searchParams) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== "" && value !== "all") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}
