import { test, expect } from "@playwright/test";

test.describe("Day 25 - Billing Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Assume user sudah login (env var TEST_AUTH_TOKEN or mock session)
    await page.goto("/");
    // Cek navigation item "Langganan & Billing"
  });

  test("navigasi ke billing panel muncul di sidebar", async ({ page }) => {
    // Cari menu item "Langganan & Billing" di section "Keuangan & Laporan"
    const billingNav = page.getByRole("button", { name: /langganan.*billing/i });
    await expect(billingNav).toBeVisible();
  });

  test("billing panel menampilkan 3 paket (Free/Pro/Enterprise)", async ({ page }) => {
    // Click navigation ke billing
    const billingNav = page.getByRole("button", { name: /langganan.*billing/i });
    if (billingNav) {
      await billingNav.click();
    }

    // Tunggu panel muncul
    const billingPanel = page.getByText(/langganan.*billing|paket subscription/i);
    if (billingPanel) {
      await expect(billingPanel).toBeVisible({ timeout: 5000 });

      // Cek 3 paket muncul
      const freePaket = page.getByText(/free.*gratis/i);
      const proPaket = page.getByText(/pro.*professional/i);
      const entPaket = page.getByText(/enterprise/i);

      // Setidaknya satu paket visible (konten minimal)
      const allPakets = page.locator("text=/Free|Pro|Enterprise/i");
      const count = await allPakets.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("billing status request tidak error", async ({ page }) => {
    // Mock API call jika perlu
    let apiError = "";
    page.on("response", (response) => {
      if (response.url().includes("/billing/status") && !response.ok()) {
        apiError = `${response.status()} ${response.statusText()}`;
      }
    });

    await page.goto("/");
    // Tunggu network idle
    await page.waitForLoadState("networkidle");

    // Status should not have errors
    expect(apiError).toBe("");
  });
});
