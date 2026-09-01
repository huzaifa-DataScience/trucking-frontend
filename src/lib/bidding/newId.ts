/**
 * Stable unique ids for process array items (FRONTEND_BIDDING_CONTEXT.md).
 * Do not call crypto.randomUUID() raw — it throws on HTTP / non-secure origins.
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // Secure-context requirement (e.g. plain HTTP LAN) — fall through.
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
