import type { Page } from "@playwright/test";

// Atom: login helper — ทำ 1 อย่างเท่านั้น
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("input[name='email']").pressSequentially(email);
  await page.locator("input[name='password']").pressSequentially(password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(/\/(dashboard|home)/);
}
