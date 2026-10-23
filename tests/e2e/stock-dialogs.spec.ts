import { expect, test } from "@playwright/test";

test("product dialog uses a full-viewport modal backdrop and remains usable on mobile", async ({ page }) => {
  await page.goto("/c/demo/stock/products");
  await page.getByRole("button", { name: "Add Product" }).click();
  const dialog = page.getByRole("dialog", { name: "Register new product" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  expect((await dialog.boundingBox())?.width).toBeGreaterThan(600);
  await expect(dialog.getByRole("textbox", { name: "Product name" })).toBeFocused();

  await page.setViewportSize({ width: 390, height: 760 });
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await expect(dialog.getByRole("button", { name: "Save product" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Add Product" }).click();
  await dialog.getByRole("textbox", { name: "Product name" }).fill("Sony WH-1000XM5 Headphones");
  await dialog.getByRole("textbox", { name: "SKU code" }).fill("SNY-WH1000-BLK");
  await dialog.getByRole("radio", { name: /Serialized/ }).check();
  await dialog.getByRole("button", { name: "Save product" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "SNY-WH1000-BLK" })).toBeVisible();
});

test("transfer dialog clearly shows the route and still dispatches a transfer", async ({ page }) => {
  await page.goto("/c/demo/stock/transfers");
  await page.getByRole("button", { name: "Initiate Transfer" }).click();
  const dialog = page.getByRole("dialog", { name: "Initiate transfer" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
  await expect(dialog.getByRole("combobox", { name: "From location" })).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "To location" })).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "Units to dispatch" }).fill("2");
  await dialog.getByRole("button", { name: "Dispatch transfer" }).click();
  await expect(dialog.getByRole("alert")).toContainText("one serial or barcode for each");
  await dialog.getByRole("textbox", { name: "Anker 65W GaN Fast Charger unit 1 serial or barcode" }).fill("ANK-TEST-001");
  await dialog.getByRole("textbox", { name: "Anker 65W GaN Fast Charger unit 2 serial or barcode" }).fill("ANK-TEST-002");
  await dialog.getByRole("button", { name: "Dispatch transfer" }).click();
  await expect(dialog).toHaveCount(0);
  const row = page.getByRole("link", { name: /View transfer TR-0199 for Anker/ });
  await expect(row).toContainText("2 units");
  await row.click();
  await expect(page.getByRole("heading", { name: "TR-0199" })).toBeVisible();
  await expect(page.getByText("ANK-TEST-001")).toBeVisible();
  await page.getByRole("link", { name: "Back to transfers" }).click();
  await page.getByRole("link", { name: "Stock Balances" }).click();
  await page.getByRole("link", { name: /View stock details for Anker 65W GaN Fast Charger at Main Warehouse/ }).click();
  await expect(page.getByRole("link", { name: "View Transfer shipment reservation TR-0199" })).toBeVisible();
});
