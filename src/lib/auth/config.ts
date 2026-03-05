/**
 * Auth bypass flag for local testing.
 *
 * - Default: bypass is ON (no login required).
 * - To re-enable real auth, set NEXT_PUBLIC_BYPASS_AUTH="false" in .env.local and restart dev server.
 */
export const BYPASS_AUTH =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false"
    : true;

