import { expect, test } from "@playwright/test";

test("opens Access and the demo workspace", async ({ page }) => {
  await page.goto("/access");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("link", { name: "Open demo workspace" }).click();
  await expect(page.getByRole("heading", { name: "Good morning" })).toBeVisible();
});
