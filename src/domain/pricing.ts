import type { SaleLine } from "./types";

export type CartLineInput = Omit<SaleLine, "unitNet"> & {
  /** Required for returned lines: the per-unit amount the customer originally paid. */
  unitNet?: number;
};

export interface PricedSale {
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Prices a bill. The discount applies only to sold lines and is spread over
 * them by value, so each line knows the price actually charged (`unitNet`).
 * Returned lines are refunded at the price originally paid. Prices are treated
 * as shelf prices: tax-inclusive when `taxInclusive`, otherwise tax is added.
 * Totals are rounded to whole rupees.
 */
export function priceSale(
  inputs: readonly CartLineInput[],
  requestedDiscount: number,
  taxRatePercent: number,
  taxInclusive: boolean,
): PricedSale {
  const soldGross = inputs.reduce((sum, line) => sum + (line.qty > 0 ? line.qty * line.price : 0), 0);
  const discount = Math.min(Math.max(0, Math.round(requestedDiscount || 0)), Math.round(soldGross));
  const discountRatio = soldGross > 0 ? discount / soldGross : 0;

  const lines: SaleLine[] = inputs.map((line) => ({
    ...line,
    unitNet: line.qty > 0 ? round2(line.price * (1 - discountRatio)) : round2(line.unitNet ?? line.price),
  }));

  // Sold lines at list price, returned lines at their refund value, so that
  // subtotal − discount = amount charged before any added tax.
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.qty * (line.qty > 0 ? line.price : line.unitNet), 0));
  const charged = lines.reduce((sum, line) => sum + line.qty * line.unitNet, 0);
  const rate = Math.max(0, taxRatePercent) / 100;
  const tax = Math.round(taxInclusive ? (charged * rate) / (1 + rate) : charged * rate);
  const total = Math.round(taxInclusive ? charged : charged + tax);

  return { lines, subtotal, discount, tax, total };
}

export const formatPercent = (value: number, digits = 0) =>
  `${Number.isFinite(value) ? (value * 100).toFixed(digits) : "0"}%`;
