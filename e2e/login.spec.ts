import { test, expect } from "@playwright/test";

const slug = process.env.E2E_SLUG;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("login", () => {
  test("password salah menampilkan pesan error", async ({ page }) => {
    test.skip(!slug || !email, "Isi .env.e2e dulu");

    await page.goto("/");
    await page.getByLabel("Slug toko").fill(slug!);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill("password-salah-123");
    await page.getByRole("button", { name: "Masuk ke Toko" }).click();

    await expect(page.locator("p.feedback.error")).toBeVisible();
    await expect(page.locator("p.feedback.error")).not.toHaveText("Failed to fetch");
    await expect(page.getByLabel("Slug toko")).toBeVisible();
  });

  test("login berhasil membuka dashboard", async ({ page }) => {
    test.skip(!slug || !email || !password, "Isi .env.e2e dulu");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByLabel("Slug toko").fill(slug!);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Masuk ke Toko" }).click();

    // Form login hilang = sudah masuk ke dashboard
    await expect(page.getByLabel("Slug toko")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("p.feedback.error")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
