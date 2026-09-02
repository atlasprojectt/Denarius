import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const authenticatedRoutes = [
  "/",
  "/times",
  "/explorar",
  "/relatorios",
  "/relatorios/agora",
  "/search",
  "/ajustes",
  "/configuracoes",
] as const;

test.setTimeout(90_000);

async function expectNoPageOverflow(page: Page, route = page.url()) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    main: (() => {
      const main = document.querySelector("main");
      return main ? main.scrollWidth - main.clientWidth : 0;
    })(),
  }));

  expect(overflow.document, `${route} document overflow`).toBeLessThanOrEqual(1);
  expect(overflow.body, `${route} body overflow`).toBeLessThanOrEqual(1);
  expect(overflow.main, `${route} main overflow`).toBeLessThanOrEqual(1);
}

async function waitForRouteReady(page: Page) {
  await expect(page.locator("main h1").first()).toBeVisible();
}

function srgbChannel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Cor inválida: ${color}`);
  return (
    0.2126 * srgbChannel(channels[0]) +
    0.7152 * srgbChannel(channels[1]) +
    0.0722 * srgbChannel(channels[2])
  );
}

function contrastRatio(foreground: string, background: string) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email ?? "");
  await page.locator("#password").fill(password ?? "");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, "Configure E2E_EMAIL e E2E_PASSWORD para o tenant seed.");
  await signIn(page);
});

test("Home keeps the verdict visible and team rows predictable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Você está no controle do gasto com IA?")).toBeAttached();
  const monthlyPacePanel = page.locator("[data-monthly-pace]");
  const monthlyPacePlot = monthlyPacePanel.locator('[data-reveal="monthly-pace"]');
  const collectingPace = monthlyPacePanel.getByText("coletando ritmo", { exact: true });
  if ((await monthlyPacePanel.count()) && (await collectingPace.count())) {
    const box = await monthlyPacePlot.boundingBox();
    expect(box).not.toBeNull();
    const minimumHeight =
      test.info().project.name === "desktop"
        ? 360
        : test.info().project.name === "compact"
          ? 280
          : 240;
    expect(box?.height ?? 0, "Evolução do mês ocupa a altura disponível").toBeGreaterThanOrEqual(
      minimumHeight,
    );
    const now = new Date();
    const lastDayOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    ).getUTCDate();
    await expect(
      monthlyPacePlot.getByText(String(lastDayOfMonth), { exact: true }),
      "coletando ritmo mantém o mês inteiro no eixo X",
    ).toBeVisible();

    const todayLabel = monthlyPacePlot.getByText(/^Hoje ·/);
    const todayBox = await todayLabel.boundingBox();
    expect(todayBox).not.toBeNull();
    expect(
      ((todayBox?.x ?? 0) - (box?.x ?? 0)) / (box?.width ?? 1),
      "o ponto de hoje permanece próximo ao início do mês",
    ).toBeLessThan(0.2);
  }
  const firstTeam = page.getByRole("link", { name: /Ver detalhe de/ }).first();
  if (await firstTeam.count()) await expect(firstTeam).toBeVisible();
  await expectNoPageOverflow(page);
});

test("authenticated product surfaces stay inside the viewport", async ({ page }) => {
  for (const route of authenticatedRoutes) {
    await page.goto(route);
    await waitForRouteReady(page);
    await expectNoPageOverflow(page, route);
  }
});

test("Global search finds and opens a team with keyboard navigation", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Buscar no Denarius" });
  await input.fill("eng");
  await expect(page.getByRole("option", { name: /Engineering/i })).toBeVisible();
  await expect(page).toHaveURL(/\/search\?q=eng$/);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/times\/[0-9a-f-]+$/);
});

test("Ctrl+P opens Global search and focuses its field", async ({ page }) => {
  await page.goto("/times");
  await page.keyboard.press("Control+p");
  await expect(page).toHaveURL(/\/search\?focus=1$/);
  await expect(page.getByRole("combobox", { name: "Buscar no Denarius" })).toBeFocused();
});

test("Global search restores an empty result from the URL", async ({ page }) => {
  await page.goto("/search?q=xyzabc-search-audit");
  await expect(page.getByText(/Nenhum resultado para/)).toBeVisible();
  await expect(page.getByText("Tente outro termo.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Buscar no Denarius" })).toHaveValue("xyzabc-search-audit");
  await expectNoPageOverflow(page);
});

test("State badges keep the shared icon-led geometry", async ({ page }) => {
  await page.goto("/ajustes/conexoes");
  const badge = page.locator('[data-slot="state-badge"]').first();
  await expect(badge).toBeVisible();

  const metrics = await badge.evaluate((node) => {
    const style = getComputedStyle(node);
    const icon = node.querySelector("svg");
    const iconStyle = icon ? getComputedStyle(icon) : null;
    return {
      height: style.height,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      borderWidth: style.borderTopWidth,
      iconWidth: iconStyle?.width ?? null,
      iconHeight: iconStyle?.height ?? null,
    };
  });

  expect(metrics).toEqual({
    height: "20px",
    fontSize: "12px",
    fontWeight: "600",
    borderWidth: "0px",
    iconWidth: "12px",
    iconHeight: "12px",
  });

  const darkDestructive = await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--badge-destructive")
      .trim()
      .toLowerCase();
  });
  expect(darkDestructive).toBe("#fb2c36");
});

test("Explore exposes the current tab contract and semantic panel heading", async ({ page }) => {
  await page.goto("/explorar");
  await expect(page.getByRole("tablist", { name: "Visualizações de gastos" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Modelos" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.locator("#por-modelo")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("primary action text keeps AA contrast at rest and on hover", async ({ page }) => {
  await page.goto("/relatorios");
  const action = page.getByRole("link", { name: "Visualizar relatório" });
  await expect(action).toBeVisible();

  const colors = async () =>
    action.evaluate((node) => {
      const style = getComputedStyle(node);
      return { foreground: style.color, background: style.backgroundColor };
    });

  const resting = await colors();
  expect(contrastRatio(resting.foreground, resting.background)).toBeGreaterThanOrEqual(4.5);
  await action.hover();
  const hovered = await colors();
  expect(contrastRatio(hovered.foreground, hovered.background)).toBeGreaterThanOrEqual(4.5);
});

test("report keeps one main landmark, unique ids, and a fitted preview", async ({ page }) => {
  await page.goto("/relatorios/agora");
  await expect(page.locator("main")).toHaveCount(1);

  const duplicateIds = await page.evaluate(() => {
    const counts = new Map<string, number>();
    for (const node of document.querySelectorAll<HTMLElement>("[id]")) {
      counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicateIds).toEqual([]);

  const preview = page.locator(".report-viewer-preview");
  await expect(preview).toBeVisible();
  await expect
    .poll(async () => {
      const documentBox = await preview.locator(".report-preview-document").boundingBox();
      const previewBox = await preview.boundingBox();
      if (!documentBox || !previewBox) return false;
      return documentBox.x + documentBox.width <= previewBox.x + previewBox.width + 1;
    })
    .toBe(true);
});

test("mobile controls keep touch-sized targets", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile");

  for (const route of ["/", "/explorar", "/relatorios", "/ajustes", "/configuracoes"] as const) {
    await page.goto(route);
    await waitForRouteReady(page);
    const targets = page.locator(
      '[data-slot="button"]:visible, [data-slot="tabs-trigger"]:visible, [data-slot="input"]:visible, [data-slot="select-trigger"]:visible, [data-info-tip]:visible',
    );
    const count = await targets.count();

    for (let index = 0; index < count; index += 1) {
      const target = targets.nth(index);
      const box = await target.boundingBox();
      const layoutHeight = await target.evaluate((node) => (node as HTMLElement).offsetHeight);
      const label = (await target.getAttribute("aria-label")) ?? (await target.textContent());
      expect(box, `${route} target ${label ?? index} has a box`).not.toBeNull();
      expect(layoutHeight, `${route} target ${label ?? index} height`).toBeGreaterThanOrEqual(44);
    }
  }
});

test("shell and charts expose concise Portuguese accessible names", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator('[data-sidebar="trigger"][aria-label="Alternar menu lateral"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mais informações sobre evolução do mês" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Evolução do mês", exact: true }),
  ).toBeVisible();
});

test("sidebar removes layout motion when reduced motion is requested", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const durations = await page.evaluate(() => ({
    gap: getComputedStyle(document.querySelector('[data-slot="sidebar-gap"]')!).transitionDuration,
    inset: getComputedStyle(document.querySelector('[data-slot="sidebar-inset"]')!).transitionDuration,
  }));
  expect(durations).toEqual({ gap: "0s", inset: "0s" });
});

test("Settings is an index with dedicated company, privacy, and users routes", async ({ page }) => {
  await page.goto("/ajustes");
  await expect(page.getByRole("link", { name: /Empresa e moeda/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Privacidade/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Usuários/ })).toBeVisible();
  await page.getByRole("link", { name: /Empresa e moeda/ }).click();
  await expect(page).toHaveURL(/\/ajustes\/empresa$/);
});

test("Destructive controls open an explicit confirmation", async ({ page }) => {
  await page.goto("/ajustes/conexoes");
  const revoke = page.getByRole("button", { name: "Revogar" }).first();
  test.skip((await revoke.count()) === 0, "O tenant seed não tem conexão ativa.");
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    if (!(await dialog.isVisible())) await revoke.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await expect(dialog).toContainText("Revogar conexão?");
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
});

test("Subscription validation stays inside the product UI", async ({ page }) => {
  await page.goto("/ajustes/assinaturas");
  const add = page.getByRole("button", { name: "Adicionar", exact: true });
  await add.evaluate((node) => (node as HTMLButtonElement).click());
  await expect(page.getByRole("alert")).toBeVisible();
});
