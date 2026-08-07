import { expect, test, type Page } from "@playwright/test";

const publicRoutes = ["/login", "/convite/token-invalido"] as const;

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));

  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} public responsive contract`, () => {
    test.use({ colorScheme });

    for (const route of publicRoutes) {
      test(`${route} stays inside the viewport`, async ({ page }) => {
        await page.goto(route);
        await expectNoPageOverflow(page);
      });
    }

    test("mobile login actions keep touch-sized targets", async ({ page }) => {
      test.skip(test.info().project.name !== "mobile");
      await page.goto("/login");

      const targets = page.locator(
        'button:visible, a[href="/auth/recuperar"]:visible, nav a:visible',
      );
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);

      for (let index = 0; index < count; index += 1) {
        const box = await targets.nth(index).boundingBox();
        expect(box, `target ${index} has a box`).not.toBeNull();
        expect(box?.height ?? 0, `target ${index} height`).toBeGreaterThanOrEqual(44);
      }
    });
  });
}
