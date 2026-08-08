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

test("the print action explains how to remove browser chrome", async ({ page }) => {
  await page.goto("/relatorios/agora");
  await page.getByRole("button", { name: "Imprimir ou salvar em PDF" }).click();

  const dialog = page.getByRole("dialog", { name: "Antes de salvar o PDF" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Papel A4 e escala de 100%.");
  await expect(dialog).toContainText(
    "Cabeçalhos e rodapés do navegador desativados.",
  );
  await expect(dialog).toContainText("Fundos gráficos ativados");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
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
    "header",
    "partial",
    "verdict",
    "spend",
    "providers",
    "teams",
    "seats-unattributed",
    "caveats",
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
    headerGroup: getComputedStyle(
      document.querySelector(".report-print-header")!,
    ).display,
    runningPosition: getComputedStyle(
      document.querySelector(".report-running-header")!,
    ).position,
    bodyRowBreak: getComputedStyle(
      document.querySelector(".report-print-frame > tbody > tr")!,
    ).breakInside,
    sectionBreak: getComputedStyle(
      document.querySelector(".report-section:not([data-print-keep])")!,
    ).breakInside,
    keepBreak: getComputedStyle(
      document.querySelector("[data-print-keep]")!,
    ).breakInside,
    background: getComputedStyle(document.documentElement).backgroundColor,
  }));

  expect(printStyles.sidebar).toBe("none");
  expect(printStyles.printControl).toBe("none");
  expect(printStyles.runningHeader).toBe("block");
  expect(printStyles.headerGroup).toBe("table-header-group");
  expect(printStyles.runningPosition).toBe("static");
  expect(printStyles.bodyRowBreak).toBe("auto");
  expect(printStyles.sectionBreak).toBe("auto");
  expect(printStyles.keepBreak).toBe("avoid");
  expect(printStyles.background).toBe("rgb(255, 255, 255)");
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
    "header",
    "verdict",
    "spend",
    "providers",
    "teams",
    "seats-unattributed",
    "caveats",
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

test("Chromium produces a real A4 PDF from the shared report", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "page.pdf is a Chromium capability.");
  await page.goto("/relatorios/agora");
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

  const pdf = await page.pdf({
    displayHeaderFooter: false,
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });

  expect(pdf.byteLength).toBeGreaterThan(20_000);
  await testInfo.attach("report.pdf", {
    body: pdf,
    contentType: "application/pdf",
  });
});
