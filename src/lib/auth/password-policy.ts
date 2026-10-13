/**
 * Rule for new passwords (sign up, reset, change). Sign in does not check it,
 * so older 6-character passwords still work until the user changes them.
 * Keep in sync with STRONG_PASSWORD in the backend auth DTOs.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_RULE_HINT = "At least 8 characters, with uppercase, lowercase, a number and a symbol";

/** Error message when `password` breaks the rule, otherwise null. */
export function passwordPolicyError(password: string): string | null {
  return STRONG_PASSWORD.test(password)
    ? null
    : "Password must be at least 8 characters and include uppercase, lowercase, a number and a symbol";
}
