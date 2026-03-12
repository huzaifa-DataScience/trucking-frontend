/**
 * When true, sign-in is disabled: all routes are accessible without login (guest mode).
 * When false, normal auth applies: middleware and RequireAuth enforce login.
 *
 * To turn sign-in back on, see ENABLE_SIGNIN.md.
 */
export const AUTH_DISABLED =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true"
    : true;

/** @deprecated Use AUTH_DISABLED. */
export const BYPASS_AUTH = AUTH_DISABLED;

