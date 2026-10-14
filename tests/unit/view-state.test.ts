import { describe, expect, it } from "vitest";
import { parseAllowedValue } from "@/lib/routing/view-state";

describe("parseAllowedValue", () => {
  const allowed = ["sell", "invoices", "orders"] as const;

  it("accepts an allowed view", () => {
    expect(parseAllowedValue("invoices", allowed, "sell")).toBe("invoices");
  });

  it("falls back for unknown, missing and repeated values", () => {
    expect(parseAllowedValue("admin", allowed, "sell")).toBe("sell");
    expect(parseAllowedValue(undefined, allowed, "sell")).toBe("sell");
    expect(parseAllowedValue(["sell", "orders"], allowed, "sell")).toBe("sell");
  });
});
