import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format/money";

describe("formatMoney", () => {
  it("formats rupees without decimals by default", () => {
    expect(formatMoney(6499)).toBe("Rs 6,499");
    expect(formatMoney(1250.4)).toBe("Rs 1,250");
  });

  it("puts the sign before the symbol", () => {
    expect(formatMoney(-1500)).toBe("-Rs 1,500");
    expect(formatMoney(200, "PKR", { signed: true })).toBe("+Rs 200");
  });
});
