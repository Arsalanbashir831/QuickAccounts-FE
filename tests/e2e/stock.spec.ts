import { expect, test } from "@playwright/test";

test("opens stock details across locations from the stock sheet", async ({ page }) => {
  await page.goto("/c/demo/stock?view=stock");
  await expect(page.getByRole("heading", { name: "Stock Sheet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Reserved for Shipment" })).toBeVisible();
  await page.getByRole("link", { name: "View stock details for Redmi Note 13 Pro (12/512GB) at Main Outlet" }).click();
  await expect(page).toHaveURL(/\/c\/demo\/stock\/XIA-RN13-BLU$/);
  await expect(page.getByRole("heading", { name: "Stock by Location" })).toBeVisible();
  await page.getByRole("link", { name: "View Unshipped invoice reservation DOT-1046" }).click();
  await expect(page).toHaveURL(/\/c\/demo\/stock\/XIA-RN13-BLU\/reservations\/invoice-inv-3-0$/);
  await expect(page.getByRole("link", { name: "Open invoice" })).toHaveAttribute("href", "/c/demo/sales/inv-3");
  await page.getByRole("link", { name: "Back to product stock" }).click();
  await page.getByRole("link", { name: "View Main Warehouse stock details" }).click();
  await expect(page).toHaveURL(/\/c\/demo\/stock\/XIA-RN13-BLU\/locations\/xia-warehouse$/);
});

test("opens RMA replacement and rejected-return reservation details", async ({ page }) => {
  await page.goto("/c/demo/stock/SAM-A55-BLK");
  await page.getByRole("link", { name: "View Warranty replacement reservation RMA-0082" }).click();
  await expect(page.getByRole("heading", { name: "RMA-0082" })).toBeVisible();
  await expect(page.getByText("Approved · Replacement issued")).toBeVisible();
  await page.goto("/c/demo/stock/XIA-RN13-BLU");
  await page.getByRole("link", { name: "View Rejected warranty return reservation RMA-0080" }).click();
  await expect(page.getByText("Customer-held return")).toBeVisible();
});

test("opens transfer shipment reservation and source transfer with serialized units", async ({ page }) => {
  await page.goto("/c/demo/stock/ANK-65W-WHT");
  await page.getByRole("link", { name: "View Transfer shipment reservation TR-0198" }).click();
  await expect(page.getByRole("heading", { name: "TR-0198" })).toBeVisible();
  await expect(page.getByText("North Outlet", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open transfer" }).click();
  await expect(page.getByRole("heading", { name: "TR-0198" })).toBeVisible();
  await expect(page.getByText("ANK-TR-0198-001")).toBeVisible();
});
