import { test, expect } from "@playwright/test";

test("halaman utama terbuka tanpa error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("halaman offline menampilkan pesan dan tombol coba lagi", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByText("Sedang offline")).toBeVisible();
  await expect(page.getByRole("link", { name: "Coba lagi" })).toHaveAttribute("href", "/");
});
