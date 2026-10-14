import { test, expect } from "@playwright/test";

const slug = process.env.E2E_SLUG;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("dashboard: login, buka terminal POS, lalu logout", async ({ page }) => {
  test.skip(!slug || !email || !password, "Isi .env.e2e dulu");

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  // Login
  await page.goto("/");
  await page.getByLabel("Slug toko").fill(slug!);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Masuk ke Toko" }).click();

  // Dashboard terbuka: peran owner tampil di header
  await expect(page.getByText("Pemilik Toko")).toBeVisible({ timeout: 15_000 });

  // Buka panel POS (tombol hanya ada kalau POS belum aktif)
  const openPos = page.getByRole("button", { name: "Buka Terminal POS" });
  if (await openPos.count()) {
    await openPos.click();
    await expect(openPos).toBeHidden();
  }
  await page.waitForLoadState("networkidle");

  // Logout kembali ke form login
  await page.getByTitle("Keluar dari akun").click();
  await expect(page.getByLabel("Slug toko")).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
});
