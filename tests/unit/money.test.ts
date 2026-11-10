import { afterEach, describe, expect, it, vi } from "vitest";
import { detectCurrency, formatMoney, resetCurrencyDetection } from "@/lib/format/money";

const stubDevice = (timeZone: string, languages: string[]) => {
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...resolvedOptions.call(this), timeZone };
  });
  vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);
  resetCurrencyDetection();
};

afterEach(() => {
  vi.restoreAllMocks();
  resetCurrencyDetection();
});

describe("display currency", () => {
  it("uses PKR for devices on Pakistan time", () => {
    stubDevice("Asia/Karachi", ["en-US"]);
    expect(detectCurrency()).toBe("PKR");
  });

  it("uses PKR for Pakistani locales outside Pakistan time", () => {
    stubDevice("Asia/Dubai", ["ur-PK", "en"]);
    expect(detectCurrency()).toBe("PKR");
  });

  it("falls back to USD elsewhere", () => {
    stubDevice("America/New_York", ["en-US"]);
    expect(detectCurrency()).toBe("USD");
  });
});

describe("formatMoney", () => {
  it("relabels the same amount without converting it", () => {
    expect(formatMoney(184500, "USD")).toBe("$184,500");
    expect(formatMoney(184500, "PKR")).toBe("Rs 184,500");
  });

  it("formats negatives, signs, and fractions", () => {
    expect(formatMoney(-1250.5, "PKR")).toBe("-Rs 1,250.5");
    expect(formatMoney(46750, "USD", { signed: true })).toBe("+$46,750");
    expect(formatMoney(0, "PKR")).toBe("Rs 0");
  });
});
