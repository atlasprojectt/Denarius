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

test("Home keeps the verdict visible and team rows predictable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Você está no controle do gasto com IA?")).toBeAttached();
  const firstTeam = page.getByRole("link", { name: /Ver detalhe de/ }).first();
  if (await firstTeam.count()) await expect(firstTeam).toBeVisible();
  await expect(page.locator("main")).toHaveJSProperty("scrollWidth", await page.locator("main").evaluate((node) => node.clientWidth));
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
