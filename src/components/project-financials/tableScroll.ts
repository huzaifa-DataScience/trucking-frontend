/** Contained scroll for wide / tall financials tables. */
export const FINANCIALS_TABLE_SCROLL =
  "max-h-[min(70vh,calc(100dvh-16rem))] overflow-auto overscroll-contain";

/**
 * Sticky header cells inside FINANCIALS_TABLE_SCROLL. Solid (#e2f0fb is the old 18% brand blue over white,
 * so it looks the same) so rows never show through, and above the pinned first column (z-10) of BOM rows.
 * Each cell paints the row's background itself: a pinned row's own background isn't reliably painted
 * across columns scrolled in from the right, which left those headers white.
 */
export const FINANCIALS_TABLE_STICKY_HEAD = "sticky top-0 z-[20] bg-[#e2f0fb] [&>*]:bg-inherit";
