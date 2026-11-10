import { useSyncExternalStore } from "react";

export type CurrencyCode = "USD" | "PKR";

const currencyMeta: Record<CurrencyCode, { symbol: string; locale: string; name: string }> = {
  USD: { symbol: "$", locale: "en-US", name: "US Dollar" },
  PKR: { symbol: "Rs ", locale: "en-US", name: "Pakistani Rupee" },
};

/** Currency used on the server and before the browser locale is known. */
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

let detected: CurrencyCode | undefined;

/**
 * Picks the display currency from the device: PKR when the browser time zone is
 * Pakistan's or the preferred locale's region is PK, otherwise USD. Amounts are
 * only relabelled — no exchange-rate conversion is applied.
 */
export function detectCurrency(): CurrencyCode {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  if (detected) return detected;
  let isPakistan = false;
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    isPakistan = timeZone === "Asia/Karachi";
  } catch { /* Ignore environments without Intl time zone support. */ }
  if (!isPakistan) {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    // Region-tagged Pakistani locales (en-PK, ur-PK) or Urdu without a region.
    isPakistan = languages.some((language) => /-PK\b/i.test(language) || /^ur$/i.test(language));
  }
  detected = isPakistan ? "PKR" : "USD";
  return detected;
}

/** Clears the cached detection so it re-reads the device settings (used by tests). */
export function resetCurrencyDetection() {
  detected = undefined;
}

export const currencySymbol =(currency: CurrencyCode = detectCurrency()) => currencyMeta[currency].symbol.trim();
export const currencyName = (currency: CurrencyCode) => currencyMeta[currency].name;

export type FormatMoneyOptions = { maximumFractionDigits?: number; signed?: boolean };

/** Formats an amount with the active currency symbol, e.g. "$1,250" or "Rs 1,250". */
export function formatMoney(
  amount: string | number,
  currency: CurrencyCode = detectCurrency(),
  { maximumFractionDigits = 2, signed = false }: FormatMoneyOptions = {},
) {
  const value = Number(amount);
  const meta = currencyMeta[currency];
  const digits = new Intl.NumberFormat(meta.locale, { maximumFractionDigits, minimumFractionDigits: 0 }).format(Math.abs(value));
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}${meta.symbol}${digits}`;
}

const subscribe = () => () => {};

/** Active display currency; renders USD on the server, then the detected currency in the browser. */
export function useCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, detectCurrency, () => DEFAULT_CURRENCY);
}

/** Hook returning a formatter bound to the active currency, safe to use during render. */
export function useMoney() {
  const currency = useCurrency();
  return (amount: string | number, options?: FormatMoneyOptions) => formatMoney(amount, currency, options);
}
