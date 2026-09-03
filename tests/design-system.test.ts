import { readFileSync } from "node:fs";
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
