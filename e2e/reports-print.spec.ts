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
  await expect(page.getByRole("heading", { name: "RelatÃ³rios" })).toBeVisible();

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

test("the report viewer exposes direct print, download, and expand actions", async ({ page }) => {
  await page.goto("/relatorios/agora");
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expandir" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Expandir" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").locator(".report-viewer-dialog-header"),
  ).toBeVisible();
  const pageRatios = await page
    .getByRole("dialog")
    .locator(".report-page")
    .evaluateAll((pages) =>
      pages.map((item) => getComputedStyle(item).aspectRatio),
    );
  expect(pageRatios).toEqual(["210 / 297", "210 / 297"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("the print action stays on the report and invokes print", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printInvoked = "true";
    };
  });
  await page.goto("/relatorios/agora");
  const reportUrl = page.url();

  await page.getByRole("button", { name: "Imprimir" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-invoked", "true");
  expect(page.url()).toBe(reportUrl);
});

test("the on-demand report prints as the shared executive document", async ({
  page,
}) => {
  await page.goto("/relatorios");
  await page.getByRole("link", { name: "Visualizar relatÃ³rio" }).click();
  await page.waitForURL("**/relatorios/agora");
  await page.goto("/relatorios/agora?mode=pdf");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

  // One editorial structure serves both the live and frozen reports.
  const order = await page
    .locator("[data-report-section]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-report-section")));
  expect(order).toEqual([
    "header",
    "summary",
    "overview",
    "providers",
    "teams",
    "subscriptions",
    "unattributed",
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
    documentHeader: getComputedStyle(
      document.querySelector(".report-document-header")!,
    ).display,
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
  expect(printStyles.documentHeader).toBe("block");
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
    "A migration de period_snapshot ainda nÃ£o tem um mÃªs fechado para imprimir.",
  );
  await reportLink.click();
  await page.goto(`${page.url()}?mode=pdf`);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

  const order = await page
    .locator("[data-report-section]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-report-section")));
  expect(order).toEqual([
    "header",
    "summary",
    "overview",
    "providers",
    "teams",
    "subscriptions",
    "unattributed",
    "caveats",
  ]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.emulateMedia({ media: "print" });
  const printStyles = await page.evaluate(() => ({
    sidebar: getComputedStyle(
      document.querySelector('[data-slot="sidebar-container"]')!,
    ).display,
    appHeader: getComputedStyle(document.querySelector("[data-app-header]")!).display,
    documentHeader: getComputedStyle(
      document.querySelector(".report-document-header")!,
    ).display,
    footer: getComputedStyle(
      document.querySelector(".report-brand-footer")!,
    ).display,
    background: getComputedStyle(document.documentElement).backgroundColor,
    documentBackground: getComputedStyle(
      document.querySelector(".report-print-frame")!,
    ).backgroundColor,
    documentShadow: getComputedStyle(
      document.querySelector(".report-print-frame")!,
    ).boxShadow,
  }));

  expect(printStyles.sidebar).toBe("none");
  expect(printStyles.appHeader).toBe("none");
  expect(printStyles.documentHeader).toBe("block");
  expect(printStyles.footer).toBe("block");
  expect(printStyles.background).toBe("rgb(255, 255, 255)");
  expect(printStyles.documentBackground).toBe("rgb(255, 255, 255)");
  expect(printStyles.documentShadow).toBe("none");
});

test("Chromium produces a real A4 PDF from the shared report", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "page.pdf is a Chromium capability.");
  await page.goto("/relatorios/agora");
  await page.goto("/relatorios/agora?mode=pdf");
  await page.emulateMedia({ media: "print" });
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
