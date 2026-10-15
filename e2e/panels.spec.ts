import { test, expect } from "@playwright/test";

const slug = process.env.E2E_SLUG;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

// Label persis dari navItems di src/app/page.tsx
const panels = [
  "Katalog & Stok",
  "Terminal Kasir POS",
  "Pelanggan & Member",
  "Jaringan HNI",
  "Bonus & Leaderboard",
  "Laporan Penjualan",
  "Laba Rugi (P&L)",
  "Rekap PV Bulanan",
  "Voucher Promo",
  "Katalog Publik",
  "Log WhatsApp",
];

test("semua panel terbuka tanpa error, dan laba-rugi bisa diunduh", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!slug || !email || !password, "Isi .env.e2e dulu");

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await test.step("login", async () => {
    await page.goto("/");
    await page.getByLabel("Slug toko").fill(slug!);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Masuk ke Toko" }).click();
    await expect(page.getByText("Pemilik Toko")).toBeVisible({ timeout: 15_000 });
  });

  for (const label of panels) {
    await test.step(`buka panel: ${label}`, async () => {
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.waitForLoadState("networkidle");
      // Pesan error panel/dashboard memakai class "feedback error"
      await expect(page.locator(".feedback.error")).toHaveCount(0);
    });
  }

  await test.step("unduh laporan laba-rugi", async () => {
    await page.getByRole("button", { name: "Laba Rugi (P&L)", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh Excel (.xlsx)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^laba-rugi-.*\.xlsx$/);
  });

  // Console error dicetak untuk diperiksa manual, tidak membuat tes gagal
  if (consoleErrors.length) console.log("console.error terdeteksi:\n" + consoleErrors.join("\n"));
  expect(pageErrors).toEqual([]);
});
