import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("interactive geometry contract", () => {
  it.each([
    "components/ui/tabs.tsx",
    "components/ui/dropdown-menu.tsx",
    "components/ui/select.tsx",
  ])("uses the full radius for autonomous selectors in %s", (path) => {
    expect(source(path)).toContain("rounded-full");
  });

  it("uses the standard radius for structural navigation", () => {
    expect(source("components/ui/sidebar.tsx")).toContain("rounded-standard");
    expect(source("components/domain/app-sidebar.tsx")).toContain("rounded-standard");
  });

  it("exposes only standard and full button shapes", () => {
    const button = source("components/ui/button.tsx");

    expect(button).toContain('standard: "rounded-standard"');
    expect(button).toContain('full: "rounded-full"');
    expect(button).not.toContain('control: "');
    expect(button).not.toContain('compact: "');
    expect(button).not.toContain('pill: "');
  });
});

describe("neutral surface contract", () => {
  it("defines seven planes and maps the shared aliases to them", () => {
    const globals = source("app/globals.css");

    for (const surface of [
      "surface-deep",
      "surface-card",
      "surface-canvas",
      "surface-control",
      "surface-elevated",
      "surface-hover",
      "surface-selected",
    ]) {
      expect(globals).toContain(`--${surface}:`);
    }

    expect(globals).toContain("--background: var(--surface-canvas)");
    expect(globals).toContain("--card: var(--surface-card)");
    expect(globals).toContain("--popover: var(--surface-elevated)");
    expect(globals).toContain("--sidebar: var(--surface-deep)");
    expect(globals).toContain("--secondary: var(--surface-control)");
    expect(globals).toContain("--accent: var(--surface-hover)");
    expect(globals).toContain("--sidebar-accent: var(--surface-selected)");
  });
});

describe("helper/footer weight contract", () => {
  it("keeps DM Sans variable so font-light (300) is real, not synthesized", () => {
    for (const path of ["app/layout.tsx", "app/global-error.tsx"]) {
      const layout = source(path);

      expect(layout).toContain("DM_Sans({");
      // A pinned static weight list would drop the 300 the footer tier needs.
      expect(layout).not.toMatch(/weight:\s*\[/);
    }
  });

  it("uses font-light only in the helper/footer tier", () => {
    // New font-light call sites must be a deliberate tier decision (docs §4
    // Type row), not a drive-by — extend this list in the same PR.
    const allowed = new Set(
      [
        "app/(app)/_components/hero.tsx",
        "app/(app)/_components/monthly-pace-chart.tsx",
        "app/(app)/_components/pacing-bar.tsx",
        "app/(app)/_components/provider-composition.tsx",
        "app/(app)/_components/setup-checklist.tsx",
        "app/(app)/ajustes/_components/settings-navigation.tsx",
        "app/(app)/ajustes/_components/users-table.tsx",
        "app/(app)/ajustes/assinaturas/_components/subscription-table.tsx",
        "app/(app)/ajustes/atribuicao/_components/project-map-form.tsx",
        "app/(app)/ajustes/atribuicao/page.tsx",
        "app/(app)/ajustes/auditoria/page.tsx",
        "app/(app)/ajustes/conexoes/_components/provider-connection-card.tsx",
        "app/(app)/ajustes/orcamentos/page.tsx",
        "app/(app)/ajustes/roster/_components/employee-table.tsx",
        "app/(app)/explorar/_components/explore-table.tsx",
        "app/(app)/explorar/_components/model-comparison-drawer.tsx",
        "app/(app)/explorar/page.tsx",
        "app/(app)/page.tsx",
        "app/(app)/times/_components/diagnosis-sections.tsx",
        "app/(app)/times/_components/team-index.tsx",
        "app/(app)/times/page.tsx",
        "app/(auth)/_components/otp-dialog.tsx",
        "app/(auth)/login/page.tsx",
        "app/(legal)/_components/legal-document.tsx",
        "app/(legal)/layout.tsx",
        "components/domain/app-sidebar.tsx",
        "components/domain/calculation-disclosure.tsx",
        "components/domain/page-header.tsx",
        "components/domain/search-dialog.tsx",
        "components/domain/simulate-drawer.tsx",
        "components/domain/team-budget-table.tsx",
        "components/domain/theme-toggle.tsx",
        "components/domain/usd-value.tsx",
      ].map((path) => join(process.cwd(), path)),
    );

    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (full.endsWith(".tsx") && readFileSync(full, "utf8").includes("font-light")) {
          found.push(full);
        }
      }
    };
    walk(join(process.cwd(), "app"));
    walk(join(process.cwd(), "components"));

    expect(found.sort()).toEqual([...allowed].sort());
  });
});
