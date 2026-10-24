import { afterEach, describe, expect, it } from "vitest";
import { canOpenOutletRecord, canOpenPath, demoAccounts, readDemoSession, signInDemo, signOutDemo } from "@/features/auth/demo-session";

afterEach(() => {
  signOutDemo();
});

describe("demo access", () => {
  it("signs in only with a listed demo email and password", () => {
    expect(signInDemo("manager@dotcode.demo", "wrong")).toBeNull();
    expect(signInDemo("admin@dotcode.demo", "Demo123!")).toBeNull();
    expect(readDemoSession()).toBeNull();
    expect(signInDemo(" MANAGER@DOTCODE.DEMO ", "Demo123!")).toEqual(demoAccounts[1]);
    expect(readDemoSession()).toEqual(demoAccounts[1]);
    signOutDemo();
    expect(readDemoSession()).toBeNull();
  });

  it("keeps accounting and settings routes owner only", () => {
    const owner = demoAccounts[0];
    const manager = demoAccounts[1];
    for (const path of ["/c/demo-company/reports", "/c/demo-company/accounts", "/c/demo-company/daybook/today", "/c/demo-company/cash-accounts", "/c/demo-company/bill-payments", "/c/demo-company/settings", "/c/demo-company/contacts"]) {
      expect(canOpenPath(owner, path, "demo-company")).toBe(true);
      expect(canOpenPath(manager, path, "demo-company")).toBe(false);
    }
    for (const path of ["/c/demo-company/home", "/c/demo-company/pos", "/c/demo-company/sales/new", "/c/demo-company/stock/purchases/new", "/c/demo-company/stock/products", "/c/demo-company/locations"]) {
      expect(canOpenPath(manager, path, "demo-company")).toBe(true);
    }
    expect(canOpenPath(manager, "/c/demo-company/stock/transfers", "demo-company")).toBe(false);
    expect(canOpenPath(manager, "/c/other-company/sales", "demo-company")).toBe(false);
  });

  it("allows new entries and only assigned outlet records", () => {
    const invoices = [{ id: "main-1", outlet: "Main Outlet" }, { id: "north-1", outlet: "North Outlet" }];
    const orders = [{ id: "main-po", destination: "Main Outlet" }, { id: "north-po", destination: "North Outlet" }];
    expect(canOpenOutletRecord("sales/new", "Main Outlet", invoices, orders)).toBe(true);
    expect(canOpenOutletRecord("stock/purchases/new", "Main Outlet", invoices, orders)).toBe(true);
    expect(canOpenOutletRecord("sales/main-1", "Main Outlet", invoices, orders)).toBe(true);
    expect(canOpenOutletRecord("sales/north-1", "Main Outlet", invoices, orders)).toBe(false);
    expect(canOpenOutletRecord("stock/purchases/north-po", "Main Outlet", invoices, orders)).toBe(false);
    expect(canOpenOutletRecord("sales/main-1", undefined, invoices, orders)).toBe(false);
  });
});
