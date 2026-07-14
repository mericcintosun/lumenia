/**
 * Shared helpers for the landing sections. Kept tiny — only cross-section utilities live here;
 * section-specific constants/helpers stay co-located with their section component.
 */

/** Clamp a number into [lo, hi]. Used by the scrub hero and the how-it-works scroll story. */
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
