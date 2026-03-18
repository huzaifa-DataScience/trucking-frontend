/**
 * Auth feature flag.
 *
 * Auth is now always enabled per FRONTEND_AUTH.md. This flag is kept only for
 * backwards compatibility and should not be used in new code.
 */
export const AUTH_DISABLED = false;

/** @deprecated Auth bypass is no longer supported. */
export const BYPASS_AUTH = AUTH_DISABLED;

