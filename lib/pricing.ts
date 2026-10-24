import { inr } from "./utils";

/**
 * How a stay's price is said, everywhere it is said.
 *
 * Groups decide per head. "₹34,999 a night" stops a group of ten scrolling;
 * "about ₹3,500 each" is the same number put the way they will split it —
 * plain arithmetic on the published price, never a discount or an invention.
 */
export interface PriceLine {
  /** "From", or something narrower such as "Weekends". */
  label: string;
  amount: string;
  /** "≈ ₹3,500 per guest for 10", or null when no group size is set. */
  perHead: string | null;
  /** "≈ ₹3,500 each" — for tight spaces like the mobile bar. */
  perHeadShort: string | null;
}

export function priceLine(p: {
  startingPrice: number | null;
  priceLabel?: string | null;
  priceGroupSize?: number | null;
}): PriceLine | null {
  if (p.startingPrice === null) return null;
  const group = p.priceGroupSize && p.priceGroupSize > 1 ? p.priceGroupSize : null;
  const each = group ? inr(Math.round(p.startingPrice / group / 50) * 50) : null;
  return {
    label: p.priceLabel?.trim() || "From",
    amount: inr(p.startingPrice),
    perHead: each ? `≈ ${each} per guest for ${group}` : null,
    perHeadShort: each ? `≈ ${each} each, for ${group}` : null,
  };
}
