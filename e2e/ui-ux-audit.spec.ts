import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const sidebarMotionDurationMs = 520;

type MotionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SidebarMotionFrame = {
  elapsed: number;
  railCenterX: number;
  icons: Record<string, MotionBox>;
};

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email ?? "");
  await page.getByLabel("Senha").fill(password ?? "");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function captureSidebarCollapse(page: Page): Promise<SidebarMotionFrame[]> {
  const framesPromise = page.evaluate(
    (duration) =>
      new Promise<SidebarMotionFrame[]>((resolve) => {
        const startedAt = performance.now();
        const frames: SidebarMotionFrame[] = [];

        function sample(now: number) {
          const rail = document.querySelector<HTMLElement>(
            '[data-slot="sidebar-inner"]',
          );
          const icons: Record<string, MotionBox> = {};

          document
            .querySelectorAll<HTMLElement>("[data-sidebar-nav-icon]")
            .forEach((slot) => {
              const icon = slot.querySelector<SVGElement>("svg");
              const key = slot.dataset.sidebarNavIcon;
              if (!icon || !key) return;
              const rect = icon.getBoundingClientRect();
              icons[`nav:${key}`] = {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
              };
            });

          const profile = document.querySelector<HTMLElement>(
            "[data-sidebar-profile-slot]",
          );
          if (profile) {
            const rect = profile.getBoundingClientRect();
            icons.profile = {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height,
            };
          }

          const stale = document.querySelector<HTMLElement>(
            '[data-sidebar-notice-icon="stale"] svg',
          );
          if (stale) {
            const rect = stale.getBoundingClientRect();
            icons.stale = {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height,
            };
          }

          const railRect = rail?.getBoundingClientRect();
          frames.push({
            elapsed: now - startedAt,
            railCenterX: railRect
              ? railRect.x + railRect.width / 2
              : Number.NaN,
            icons,
          });

          if (now - startedAt < duration) {
            requestAnimationFrame(sample);
          } else {
            resolve(frames);
          }
        }

        requestAnimationFrame(sample);
      }),
    sidebarMotionDurationMs,
  );

  await page.locator('[data-slot="sidebar-trigger"]').click();
  return framesPromise;
}

function expectStableCollapse(frames: SidebarMotionFrame[]) {
  expect(frames.length).toBeGreaterThan(10);
  const finalFrame = frames.at(-1);
  expect(finalFrame).toBeDefined();
  if (!finalFrame) return;

  expect(Object.keys(finalFrame.icons)).toEqual(
    expect.arrayContaining([
      "nav:/",
      "nav:/times",
      "nav:/explorar",
      "nav:/ajustes",
      "profile",
    ]),
  );

  for (const key of Object.keys(finalFrame.icons)) {
    const boxes = frames.map((frame) => frame.icons[key]).filter(Boolean);
    const xPositions = boxes.map((box) => box.x);
    const widths = boxes.map((box) => box.width);
    const heights = boxes.map((box) => box.height);
    const reverseSteps = xPositions
      .slice(1)
      .map((position, index) => position - xPositions[index]);
    const settledPositions = frames
      .filter((frame) => finalFrame.elapsed - frame.elapsed <= 80)
      .map((frame) => frame.icons[key]?.x)
      .filter((position): position is number => position !== undefined);

    expect(Math.max(...widths) - Math.min(...widths), key).toBeLessThanOrEqual(
      0.1,
    );
    expect(
      Math.max(...heights) - Math.min(...heights),
      key,
    ).toBeLessThanOrEqual(0.1);
    expect(Math.max(0, ...reverseSteps), key).toBeLessThanOrEqual(0.5);
    expect(
      Math.max(...settledPositions) - Math.min(...settledPositions),
      key,
    ).toBeLessThanOrEqual(0.2);
    expect(
      Math.abs(xPositions.at(-1)! - finalFrame.railCenterX),
      key,
    ).toBeLessThanOrEqual(0.5);
  }
}

test.beforeEach(async ({ page }) => {
  test.skip(!email || !password, "Configure E2E_EMAIL e E2E_PASSWORD para o tenant seed.");
  await signIn(page);
});

test("Home keeps the verdict visible and team rows predictable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Você está no controle do gasto com IA?")).toBeAttached();
  const firstTeam = page.getByRole("link", { name: /Ver detalhe de/ }).first();
  if (await firstTeam.count()) await expect(firstTeam).toBeVisible();
  await expect(page.locator("main")).toHaveJSProperty("scrollWidth", await page.locator("main").evaluate((node) => node.clientWidth));
});

test("Explore exposes anchored sections and no horizontal page overflow", async ({ page }) => {
  await page.goto("/explorar");
  await expect(page.getByRole("navigation", { name: "Seções de exploração" })).toBeVisible();
  await expect(page.locator("#por-modelo")).toBeVisible();
  await expect(page.locator("#assentos")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
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
  await revoke.click();
  await expect(page.getByRole("dialog")).toContainText("Revogar conexão?");
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
});

test("Subscription validation stays inside the product UI", async ({ page }) => {
  await page.goto("/ajustes/assinaturas");
  const add = page.getByRole("button", { name: "Adicionar", exact: true });
  await add.click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("Collapsed sidebar icons stay stable and destinations remain labelled", async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(test.info().project.name === "mobile", "Mobile uses the drawer sidebar.");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expectStableCollapse(await captureSidebarCollapse(page));
  await page.locator('[data-slot="sidebar-trigger"]').click();
  await page.waitForTimeout(350);
  expectStableCollapse(await captureSidebarCollapse(page));

  await page.getByRole("link", { name: "Explorar" }).hover();
  await expect(page.getByRole("tooltip")).toContainText("Explorar");
});
