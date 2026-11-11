import { afterEach, describe, expect, it } from "vitest";
import { canOpenPath, demoAccounts, readDemoSession, signInDemo, signOutDemo } from "@/features/auth/demo-session";

afterEach(() => {
  signOutDemo();
});

describe("demo access", () => {
  it("signs in only with a listed demo email and password", () => {
    expect(signInDemo("cashier@kadam.demo", "wrong")).toBeNull();
    expect(signInDemo("admin@kadam.demo", "Demo123!")).toBeNull();
    expect(readDemoSession()).toBeNull();
    expect(signInDemo(" CASHIER@KADAM.DEMO ", "Demo123!")).toEqual(demoAccounts[1]);
    expect(readDemoSession()).toEqual(demoAccounts[1]);
    signOutDemo();
    expect(readDemoSession()).toBeNull();
  });

  it("keeps money, purchases, reports and settings owner only", () => {
    const [owner, cashier] = demoAccounts;
    for (const path of ["reports", "money", "purchases", "purchases/new", "parties", "settings", "sales/new", "products/new", "products/stride-runner/edit"]) {
      expect(canOpenPath(owner, `/c/demo-company/${path}`, "demo-company")).toBe(true);
      expect(canOpenPath(cashier, `/c/demo-company/${path}`, "demo-company")).toBe(false);
    }
    for (const path of ["home", "pos", "sales", "sales/sale-1", "products", "products/stride-runner", "stock"]) {
      expect(canOpenPath(cashier, `/c/demo-company/${path}`, "demo-company")).toBe(true);
    }
    expect(canOpenPath(cashier, "/c/other-company/sales", "demo-company")).toBe(false);
  });
});
