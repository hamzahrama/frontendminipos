import { test, expect } from "@playwright/test";

const slug = process.env.E2E_SLUG;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("kasir: bayar tunai satu produk sampai transaksi tersimpan", async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(!slug || !email || !password, "Isi .env.e2e dulu");

  await page.goto("/");
  await page.getByLabel("Slug toko").fill(slug!);
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Masuk ke Toko" }).click();
  await expect(page.getByText("Pemilik Toko")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Terminal Kasir POS", exact: true }).click();
  await page.getByText("Minyak Herba Sinergi", { exact: true }).first().click();
  await page.getByPlaceholder("Jumlah uang tunai...").fill("100000");

  // Jika CORS memblokir permintaan, respons ini tidak pernah datang dan tes gagal.
  const checkout = page.waitForResponse(
    (r) => r.url().endsWith("/transactions") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Selesaikan Pembayaran/ }).click();
  const response = await checkout;
  expect(response.status()).toBe(201);

  await expect(page.getByText("Transaksi Berhasil Disimpan!")).toBeVisible();
});
