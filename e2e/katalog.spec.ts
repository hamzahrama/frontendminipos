import { test, expect } from "@playwright/test";

const slug = process.env.E2E_SLUG;

test("katalog publik terbuka dan menampilkan toko", async ({ page }) => {
  test.skip(!slug, "Isi .env.e2e dulu");

  const response = await page.goto(`/katalog/${slug}`);
  expect(response?.status()).toBe(200);

  await expect(page.getByText("Katalog toko", { exact: true })).toBeVisible();
  await expect(page.getByText("Katalog belum tersedia")).toHaveCount(0);
  await expect(page).toHaveTitle(/^Katalog /);
});
