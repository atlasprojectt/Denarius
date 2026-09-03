import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const authenticatedRoutes = [
  "/",
  "/times",
  "/explorar",
  "/relatorios",
  "/relatorios/agora",
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

test("Home cards use divided headers and cards remain darker than the shell", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator('.home-cockpit [data-slot="card"]');
  await expect(cards).toHaveCount(4);
  await expect(cards.locator('[data-slot="card-header"]')).toHaveCount(4);

  for (const header of await cards.locator('[data-slot="card-header"]').all()) {
    expect(await header.evaluate((node) => getComputedStyle(node).borderBottomWidth)).toBe("1px");
  }

  for (const dark of [false, true]) {
    const colors = await page.evaluate((useDark) => {
      document.documentElement.classList.toggle("dark", useDark);
      const shell = document.querySelector("[data-app-content]");
      const card = document.querySelector('.home-cockpit [data-slot="card"]');
      if (!shell || !card) return null;
      return {
        shell: getComputedStyle(shell).backgroundColor || getComputedStyle(document.body).backgroundColor,
        card: getComputedStyle(card).backgroundColor,
      };
    }, dark);
    expect(colors).not.toBeNull();
    const shellColor = colors?.shell === "rgba(0, 0, 0, 0)"
      ? await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      : colors?.shell ?? "";
    expect(luminance(colors?.card ?? "")).toBeLessThan(luminance(shellColor));
  }
});

test("button geometry follows autonomous and structural intent", async ({ page }) => {
  await page.goto("/configuracoes");

  const structural = page.getByRole("link", { name: "Início", exact: true });
  const search = page.getByRole("button", { name: "Pesquisa (Ctrl P)" });
  const action = page.locator('main form button[type="submit"]').first();

  for (const target of [structural, search]) {
    const geometry = await target.evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      radius: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
    }));
    expect(geometry.radius).toBeLessThan(geometry.height / 2);
  }

  const actionGeometry = await action.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    radius: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
  }));
  expect(actionGeometry.radius).toBeGreaterThanOrEqual(actionGeometry.height / 2);
});

test("dark mode exposes seven distinct neutral surface roles", async ({ page }) => {
  await page.goto("/");
  const surfaces = await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    const styles = getComputedStyle(document.documentElement);
    return [
      "--surface-deep",
      "--surface-card",
      "--surface-canvas",
      "--surface-control",
      "--surface-elevated",
      "--surface-hover",
      "--surface-selected",
    ].map((token) => styles.getPropertyValue(token).trim());
  });

  expect(new Set(surfaces).size).toBe(7);
});

test("authenticated product surfaces stay inside the viewport", async ({ page }) => {
  for (const route of authenticatedRoutes) {
    await page.goto(route);
    await waitForRouteReady(page);
    await expectNoPageOverflow(page, route);
  }
});

test("Global search finds and opens a team with keyboard navigation", async ({ page }) => {
  await page.goto("/times");
  await page.keyboard.press("Control+p");
  const input = page.getByRole("combobox", { name: "Buscar no Denarius" });
  await input.fill("eng");
  await expect(page.getByRole("option", { name: /Engineering/i })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/times\/[0-9a-f-]+$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("Ctrl+P toggles Global search without changing routes and resets on close", async ({ page }) => {
  await page.goto("/times");
  await page.keyboard.press("Control+p");
  await expect(page).toHaveURL(/\/times$/);
  const dialog = page.getByRole("dialog");
  const input = page.getByRole("combobox", { name: "Buscar no Denarius" });
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();
  await expect(dialog.locator("[data-search-results-panel]")).toHaveCount(0);
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0) / 2 - (viewport?.height ?? 0) / 2)).toBeLessThanOrEqual(2);
  await input.fill("eng");
  await expect(page.getByRole("option", { name: /Engineering/i })).toBeVisible();
  await expect(dialog.locator("[data-search-results-panel]")).toBeVisible();
  await page.keyboard.press("Control+p");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("Control+p");
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Pesquisa (Ctrl P)" }).click();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(dialog.locator("[data-search-results-panel]")).toHaveCount(0);
});

test("Global search shows an empty result inside the dialog", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+p");
  const input = page.getByRole("combobox", { name: "Buscar no Denarius" });
  await input.fill("xyzabc-search-audit");
  await expect(page.getByText(/Nenhum resultado para/)).toBeVisible();
  await expect(page.getByText("Tente outro termo.")).toBeVisible();
  await expect(input).toHaveValue("xyzabc-search-audit");
  await expectNoPageOverflow(page);
});

test("Removed Global search route returns not found", async ({ page }) => {
  const response = await page.goto("/search");
  expect(response?.status()).toBe(404);
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
  await expect(page.locator('[data-slot="tabs-list"]')).toHaveCSS("border-top-width", "1px");
  await expect(page.locator('[data-slot="tabs-indicator"]')).toHaveCSS("border-top-width", "0px");
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
  await expect(page.getByRole("link", { name: "Início", exact: true })).toHaveCSS(
    "border-top-width",
    "1px",
  );
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
