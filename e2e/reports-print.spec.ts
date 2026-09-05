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

test("the preview dialog exposes close, print, and download over the list", async ({
  page,
}) => {
  await page.goto("/relatorios");
  await page.getByRole("button", { name: "Gerar agora", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Fechar", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Imprimir", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Baixar PDF", exact: true }),
  ).toBeVisible();
  // The list stays the page: opening a file never navigates away.
  expect(page.url()).toContain("/relatorios");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(page.url()).toContain("/relatorios");
});

test("the print action closes the preview and invokes print", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printInvoked = "true";
    };
  });
  await page.goto("/relatorios");
  const indexUrl = page.url();
  await page.getByRole("button", { name: "Gerar agora", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Imprimir" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-invoked", "true");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(page.url()).toBe(indexUrl);
});

test("the on-demand preview shows the shared executive document", async ({
  page,
}) => {
  await page.goto("/relatorios");
  await page.getByRole("button", { name: "Gerar agora", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-report-sheet]")).toBeVisible();

  // One editorial structure serves both the live and frozen reports.
  const order = await dialog
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
});

test("the render endpoint prints as the shared executive document", async ({
  page,
}) => {
  await page.goto("/relatorios/agora?mode=pdf");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-report-sheet]")).toBeVisible();

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

test("a history file opens the same preview without navigating", async ({ page }) => {
  await page.goto("/relatorios");
  const historyRow = page.locator('[data-file-row="history"]').first();
  test.skip(
    (await historyRow.count()) === 0,
    "A migration de period_snapshot ainda nÃ£o tem um mÃªs fechado para visualizar.",
  );
  const indexUrl = page.url();
  await historyRow.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-report-sheet]")).toBeVisible();
  expect(page.url()).toBe(indexUrl);

  const order = await dialog
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
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Chromium produces a real A4 PDF from the shared report", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "page.pdf is a Chromium capability.");
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
