import { expect, test } from "@playwright/test";

test("owner signs in, sells a size at the POS and sees it in sales", async ({ page }) => {
  await page.goto("/access");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Use owner@kadam.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByText("Sales today")).toBeVisible();
  await expect(page.getByRole("link", { name: "Customers & Suppliers" })).toBeVisible();

  await page.goto("/c/demo-company/pos");
  await page.getByRole("button", { name: /Stride Runner Pro/ }).first().click();
  const picker = page.getByRole("dialog", { name: "Stride Runner Pro" });
  await picker.getByRole("button", { name: /^42/ }).click();
  await picker.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("1 item", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exact" }).click();
  await page.getByRole("button", { name: /^Charge/ }).click();
  const receipt = page.getByRole("dialog", { name: /Receipt KF-/ });
  await expect(receipt).toBeVisible();
  const title = await receipt.getAttribute("aria-label");
  await receipt.getByRole("button", { name: "Done" }).click();

  await page.goto("/c/demo-company/sales/walk-in?view=sales");
  await expect(page.getByRole("link", { name: title!.replace("Receipt ", "") })).toBeVisible();
});

test("cashier can sell and check stock but not open money or reports", async ({ page }) => {
  await page.goto("/access");
  await page.getByRole("button", { name: "Use cashier@kadam.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page.getByRole("link", { name: /Open POS/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Money" })).toHaveCount(0);
  await page.goto("/c/demo-company/money");
  await expect(page.getByRole("heading", { name: "This area is for the owner" })).toBeVisible();
  await page.goto("/c/demo-company/products");
  await expect(page.getByRole("columnheader", { name: "Cost" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add style" })).toHaveCount(0);
});

test("exchange for a dearer pair: customer pays the difference", async ({ page }) => {
  await page.goto("/access");
  await page.getByRole("button", { name: "Use owner@kadam.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(/home/);

  // Original sale: Breeze Slide, Rs 1,299
  await page.goto("/c/demo-company/pos");
  await page.getByRole("button", { name: /Breeze Slide/ }).click();
  const slidePicker = page.getByRole("dialog", { name: "Breeze Slide" });
  await slidePicker.getByRole("button", { name: /^42/ }).click();
  await slidePicker.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: /^Charge/ }).click();
  const receipt = page.getByRole("dialog", { name: /Receipt KF-/ });
  const number = (await receipt.getAttribute("aria-label"))!.replace("Receipt ", "");
  await receipt.getByRole("button", { name: "Done" }).click();

  // Exchange it for a Stride Runner Pro
  await page.getByRole("tab", { name: "Return / exchange" }).click();
  await page.getByRole("textbox", { name: "Receipt number" }).fill(number);
  await page.getByRole("button", { name: /Return Breeze Slide 42/ }).click();
  await page.getByRole("button", { name: /^Exchange/ }).click();
  await page.getByRole("textbox", { name: "Search styles for exchange" }).fill("Stride Runner");
  await page.getByRole("button", { name: /Stride Runner Pro/ }).click();
  await page.getByRole("dialog", { name: "Stride Runner Pro" }).getByRole("button", { name: /^42/ }).click();
  await expect(page.getByText("Difference to collect")).toBeVisible();
  await expect(page.getByRole("button", { name: "Collect Rs 5,200 & complete" })).toBeEnabled();
  await page.screenshot({ path: "test-results/exchange.png", fullPage: true });
  await page.getByRole("button", { name: "Collect Rs 5,200 & complete" }).click();
  const exchangeReceipt = page.getByRole("dialog", { name: /Receipt KF-/ });
  await expect(exchangeReceipt.getByText(/Exchange completed/)).toBeVisible();
});

test("exchange for any cheaper product: shop gives back the difference", async ({ page }) => {
  await page.goto("/access");
  await page.getByRole("button", { name: "Use owner@kadam.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(/home/);

  // Original sale: Stride Runner Pro, Rs 6,499
  await page.goto("/c/demo-company/pos");
  await page.getByRole("button", { name: /Stride Runner Pro/ }).click();
  const picker = page.getByRole("dialog", { name: "Stride Runner Pro" });
  await picker.getByRole("button", { name: /^41/ }).click();
  await picker.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: /^Charge/ }).click();
  const receipt = page.getByRole("dialog", { name: /Receipt KF-/ });
  const number = (await receipt.getAttribute("aria-label"))!.replace("Receipt ", "");
  await receipt.getByRole("button", { name: "Done" }).click();

  // Swap for a Breeze Slide (Rs 1,299) + socks (Rs 499), chosen by browsing — no typing
  await page.getByRole("tab", { name: "Return / exchange" }).click();
  await page.getByRole("textbox", { name: "Receipt number" }).fill(number);
  await page.getByRole("button", { name: /Return Stride Runner Pro 41/ }).click();
  await page.getByRole("button", { name: /^Exchange/ }).click();
  await page.getByRole("button", { name: "Sandals & Slides", exact: true }).click();
  await page.getByRole("button", { name: /Breeze Slide/ }).click();
  await page.getByRole("dialog", { name: "Breeze Slide" }).getByRole("button", { name: /^42/ }).click();
  await page.getByRole("button", { name: "Accessories", exact: true }).click();
  await page.getByRole("button", { name: /Cotton Ankle Socks/ }).click();
  await page.getByRole("dialog", { name: /Cotton Ankle Socks/ }).getByRole("button", { name: /^\+1/ }).click();

  await expect(page.getByText("Difference to give back")).toBeVisible();
  await expect(page.getByText("Rs 4,701").first()).toBeVisible(); // 6,499 − (1,299 + 499)
  await page.screenshot({ path: "test-results/exchange-cheaper.png", fullPage: true });
  await page.getByRole("button", { name: "Give back Rs 4,701 & complete" }).click();
  await expect(page.getByRole("dialog", { name: /Receipt KF-/ }).getByText(/refund Rs 4,701/)).toBeVisible();
});

test("wholesale return: credit note against an invoice goes on the shop's khata", async ({ page }) => {
  await page.goto("/access");
  await page.getByRole("button", { name: "Use owner@kadam.demo" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(/home/);

  await page.getByRole("link", { name: "Sales & Returns" }).click();
  await expect(page.getByRole("link", { name: "Walk-in Customers" })).toBeVisible();
  await page.getByRole("link", { name: "Wholesale Customers" }).click();
  await expect(page.getByRole("heading", { name: "Wholesale customers" })).toBeVisible();
  await page.screenshot({ path: "test-results/wholesale-list.png", fullPage: true });

  await page.getByRole("link", { name: "Wholesale return" }).click();
  await page.getByRole("combobox", { name: "Shop" }).selectOption("cus-alnoor");
  await page.getByRole("button", { name: /pairs can come back/ }).first().click();
  await page.getByRole("button", { name: "Return all" }).click();
  await expect(page.getByText("Credit to shop")).toBeVisible();
  await page.screenshot({ path: "test-results/wholesale-return.png", fullPage: true });
  await page.getByRole("button", { name: /Save & print credit note/ }).click();
  await expect(page.getByRole("dialog", { name: /Print KF-/ })).toBeVisible();
  const html = await page.getByTitle(/Invoice KF-/).getAttribute("srcdoc");
  expect(html).toContain("Credit note");
});
