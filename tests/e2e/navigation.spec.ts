import { expect, test } from "@playwright/test";

test("signs in as owner and opens the demo workspace", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/access");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every sale, unit and payment stays connected." })).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Copy owner@dotcode.demo" }).click();
  await expect(page.getByRole("status")).toHaveText("owner@dotcode.demo copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("owner@dotcode.demo");
  await page.getByRole("button", { name: "Use owner@dotcode.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByRole("heading", { name: "Good morning" })).toBeVisible();
});

test("outlet manager can work in their outlet but cannot open accounting", async ({ page }) => {
  await page.goto("/access");
  await page.getByRole("button", { name: "Use manager@dotcode.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByRole("heading", { name: /Welcome, Outlet Manager/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Welcome, Outlet Manager/ })).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("link", { name: "Chart of Accounts" })).toHaveCount(0);
  await page.goto("/c/demo-company/accounts");
  await expect(page.getByRole("heading", { name: "This area is for the owner" })).toBeVisible();
  await page.goto("/c/demo-company/sales/new");
  await expect(page.getByRole("heading", { name: "New Invoice" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Selling from outlet or warehouse" })).toHaveValue("Main Outlet");
  await expect(page.getByRole("combobox", { name: "Selling from outlet or warehouse" })).toBeDisabled();
  await page.goto("/c/demo-company/stock/products");
  await expect(page.getByRole("heading", { name: "Stock Sheet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Cost Price" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Product" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Main Warehouse/ })).toHaveCount(0);
});
