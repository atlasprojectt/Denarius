import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("interactive geometry contract", () => {
  it("keeps tabs on the pill radius", () => {
    expect(source("components/ui/tabs.tsx")).toContain("rounded-full");
  });

  it.each([
    "components/ui/dropdown-menu.tsx",
    "components/ui/select.tsx",
  ])("uses the medium radius for %s popovers", (path) => {
    expect(source(path)).toContain("rounded-md");
  });

  it("uses the standard radius for structural navigation", () => {
    expect(source("components/ui/sidebar.tsx")).toContain("rounded-lg");
    expect(source("components/domain/app-sidebar.tsx")).toContain("rounded-md");
  });

  it("exposes only standard and full button shapes", () => {
    const button = source("components/ui/button.tsx");

    expect(button).toContain('standard: "rounded-sm"');
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
    // The rail has its own interaction step because its light-mode base is
    // darker than the shell. Reusing the shell's selected surface would make
    // the sidebar jump to the wrong contrast ladder.
    expect(globals).toContain("--sidebar-accent:");
    expect(globals).toContain("--sidebar-accent-foreground:");
  });
});

describe("sheet geometry contract", () => {
  it("floats side sheets on desktop and dims the page behind them", () => {
    const sheet = source("components/ui/sheet.tsx");

    expect(sheet).toContain('bg-black/20 backdrop-blur-[6px]');
    expect(sheet).toContain("data-[side=right]:sm:inset-y-4");
    expect(sheet).toContain("data-[side=right]:sm:right-4");
    expect(sheet).toContain("data-[side=right]:sm:h-[calc(100dvh-2rem)]");
    expect(sheet).toContain("data-[side=right]:sm:rounded-lg");
    expect(sheet).toContain("data-[side=right]:sm:shadow-2xl");
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
    // New font-light call sites must be deliberate tier decisions, not drive-by
    // additions. Extend this list in the same PR.
    const allowed = new Set(
      [
        "app/(auth)/_components/auth-form.tsx",
        "app/auth/nova-senha/_components/new-password-form.tsx",
        "app/auth/nova-senha/page.tsx",
        "app/auth/recuperar/_components/recover-form.tsx",
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
