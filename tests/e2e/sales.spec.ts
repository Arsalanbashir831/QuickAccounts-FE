import { expect, test } from "@playwright/test";

test("posts a sale preview with item details and a matching A4 invoice", async ({ page }) => {
  await page.goto("/c/demo-company/sales");
  await expect(page.getByRole("link", { name: "Invoices", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Post Sale", exact: true })).toBeVisible();
  await expect(page.getByText("Quotes & Orders")).toHaveCount(0);

  await page.getByRole("link", { name: "Post Sale", exact: true }).click();
  await expect(page).toHaveURL(/view=sell/);
  await expect(page.getByRole("heading", { name: "Cart Line Items" })).toBeVisible();
  const confirm = page.getByRole("button", { name: /Confirm Sale/ });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Increase quantity of Anker 65W GaN Fast Charger" }).click();
  await expect(page.locator("#serial-p3-2")).toBeVisible();
  await page.locator("#serial-p3-0").fill("ANK-001");
  await page.locator("#serial-p3-1").fill("ANK-002");
  await page.locator("#serial-p3-2").fill("ANK-003");
  await expect(page.getByText(/3 of 3 captured/)).toBeVisible();
  await page.locator("#price-p1").fill("110000");
  await page.getByLabel("Additional invoice notes").selectOption("thank-you");
  await expect(confirm).toBeEnabled();

  await confirm.click();
  await page.getByRole("button", { name: "Preview / Print Invoice" }).click();
  const invoice = page.frameLocator("iframe[title^='Invoice DOT-INV-']");
  await expect(invoice.getByText("PKR 110,000").first()).toBeVisible();
  await expect(invoice.getByText("Serial / barcode: ANK-001, ANK-002, ANK-003")).toBeVisible();
  await expect(invoice.getByText(/Thank you for your purchase/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
});
