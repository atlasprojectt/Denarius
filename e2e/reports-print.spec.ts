import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email ?? "");
  await page.getByLabel("Senha").fill(password ?? "");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, "Configure E2E_EMAIL e E2E_PASSWORD para o tenant seed.");
  await signIn(page);
});

test("reports stay legible in both screen themes", async ({ page }) => {
  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();

  for (const dark of [false, true]) {
    await page.evaluate((enabled) => {
      document.documentElement.classList.toggle("dark", enabled);
    }, dark);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("the on-demand report prints like a closed month, with the partial notice", async ({
  page,
}) => {
  await page.goto("/relatorios");
  await page.getByRole("link", { name: "Gerar relatório atual" }).click();
  await page.waitForURL("**/relatorios/agora");
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

  // Same fixed template, plus the notice that the month has not closed.
  const order = await page
    .locator("[data-report-section]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-report-section")));
  expect(order).toEqual([
    "title",
    "partial",
    "summary",
    "position",
    "composition",
    "teams",
    "attention",
    "annex",
  ]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.emulateMedia({ media: "print" });
  const printStyles = await page.evaluate(() => ({
    sidebar: getComputedStyle(
      document.querySelector('[data-slot="sidebar-container"]')!,
    ).display,
    printControl: getComputedStyle(
      document.querySelector("[data-print-control]")!,
    ).display,
    runningHeader: getComputedStyle(
      document.querySelector(".report-running-header")!,
    ).display,
    runningFooter: getComputedStyle(
      document.querySelector(".report-running-footer")!,
    ).display,
    footerPosition: getComputedStyle(
      document.querySelector(".report-running-footer")!,
    ).position,
    markVisible: !!document.querySelector(".report-running-footer svg"),
    background: getComputedStyle(document.documentElement).backgroundColor,
  }));

  expect(printStyles.sidebar).toBe("none");
  expect(printStyles.printControl).toBe("none");
  expect(printStyles.runningHeader).toBe("block");
  expect(printStyles.background).toBe("rgb(255, 255, 255)");
  // The Denarius mark repeats on every sheet: fixed inside @page's bottom lane.
  expect(printStyles.runningFooter).toBe("flex");
  expect(printStyles.footerPosition).toBe("fixed");
  expect(printStyles.markVisible).toBe(true);
});

test("the frozen template keeps order and print drops app chrome", async ({ page }) => {
  await page.goto("/relatorios");
  const reportLink = page.locator('a[href^="/relatorios/20"]').first();
  test.skip(
    (await reportLink.count()) === 0,
    "A migration de period_snapshot ainda não tem um mês fechado para imprimir.",
  );
  await reportLink.click();
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

  const order = await page
    .locator("[data-report-section]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-report-section")));
  expect(order).toEqual([
    "title",
    "summary",
    "position",
    "composition",
    "teams",
    "attention",
    "annex",
  ]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.emulateMedia({ media: "print" });
  const printStyles = await page.evaluate(() => ({
    sidebar: getComputedStyle(
      document.querySelector('[data-slot="sidebar-container"]')!,
    ).display,
    appHeader: getComputedStyle(document.querySelector("[data-app-header]")!).display,
    runningHeader: getComputedStyle(
      document.querySelector(".report-running-header")!,
    ).display,
    background: getComputedStyle(document.documentElement).backgroundColor,
    cardBreak: getComputedStyle(
      document.querySelector('[data-report-sheet] [data-slot="card"]')!,
    ).breakInside,
  }));

  expect(printStyles.sidebar).toBe("none");
  expect(printStyles.appHeader).toBe("none");
  expect(printStyles.runningHeader).toBe("block");
  expect(printStyles.background).toBe("rgb(255, 255, 255)");
  expect(printStyles.cardBreak).toBe("avoid");
});
