import { useSyncExternalStore } from "react";

export type CurrencyCode = "PKR";

const meta = { symbol: "Rs ", locale: "en-PK", name: "Pakistani Rupee" } as const;

/** The business currency. Single-store footwear shops in this edition trade in rupees. */
export const DEFAULT_CURRENCY: CurrencyCode = "PKR";

export const detectCurrency = (): CurrencyCode => DEFAULT_CURRENCY;
/** Kept for test compatibility; currency is fixed. */
export function resetCurrencyDetection() {}

export const currencySymbol = () => meta.symbol.trim();
export const currencyName = () => meta.name;

export type FormatMoneyOptions = { maximumFractionDigits?: number; signed?: boolean };

/** Formats an amount in rupees, e.g. "Rs 6,499". */
export function formatMoney(
  amount: string | number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  { maximumFractionDigits = 0, signed = false }: FormatMoneyOptions = {},
) {
  const value = Number(amount);
  const digits = new Intl.NumberFormat(meta.locale, { maximumFractionDigits, minimumFractionDigits: 0 }).format(Math.abs(value));
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}${currency === "PKR" ? meta.symbol : ""}${digits}`;
}

const subscribe = () => () => {};

export function useCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, detectCurrency, () => DEFAULT_CURRENCY);
}

/** Hook returning the rupee formatter. */
export function useMoney() {
  return (amount: string | number, options?: FormatMoneyOptions) => formatMoney(amount, DEFAULT_CURRENCY, options);
}
