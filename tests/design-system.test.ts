import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

/** Every .tsx under app/ and components/ whose source matches, as absolute paths. */
const tsxFilesMatching = (pattern: RegExp) => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (full.endsWith(".tsx") && pattern.test(readFileSync(full, "utf8"))) {
        found.push(full);
      }
    }
  };
  walk(join(process.cwd(), "app"));
  walk(join(process.cwd(), "components"));
  return found.sort();
};

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
    const allowed = [
      "app/(auth)/_components/auth-form.tsx",
      "app/auth/nova-senha/_components/new-password-form.tsx",
      "app/auth/nova-senha/page.tsx",
      "app/auth/recuperar/_components/recover-form.tsx",
    ].map((path) => join(process.cwd(), path));

    expect(tsxFilesMatching(/font-light/)).toEqual(allowed.sort());
  });
});

describe("semaphore contract", () => {
  it("keeps the semaphore tokens on budget-status surfaces", () => {
    // Principle #5: green, amber and red mean budget status. Every other state
    // (connection, sync, invite, data quality, a failed save) wears the state
    // tones (badge-*). A new call site must be a budget-status surface; extend
    // this list in the same PR.
    const allowed = [
      "app/(app)/_components/hero.tsx",
      "app/(app)/_components/home-greeting.tsx",
      "app/(app)/times/_components/team-progress.tsx",
      "components/domain/budget-bar.tsx",
      "components/domain/sidebar-notice.tsx",
      "components/domain/verdict-line.tsx",
    ].map((path) => join(process.cwd(), path));

    expect(tsxFilesMatching(/status-(green|amber|red)/)).toEqual(allowed.sort());
  });
});

describe("state tone contrast", () => {
  // A state tone (badges, notices, inline results, toasts) is its ink on a 12%
  // wash of its hue. At 11–12px that text needs WCAG AA (4.5:1) on every surface
  // a badge sits on. Computed from the tokens, so an edit that breaks the floor
  // fails here instead of in a screenshot.
  const css = source("app/globals.css");

  const declarations = (selector: string) => {
    const tokens: Record<string, string> = {};
    const blocks = new RegExp(`^${selector} \\{([\\s\\S]*?)^\\}`, "gm");
    for (const [, body] of css.matchAll(blocks)) {
      for (const [, name, value] of body.matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)) {
        tokens[name] = value.trim();
      }
    }
    return tokens;
  };
  const light = declarations(":root");
  const themes = { light, dark: { ...light, ...declarations("\\.dark") } };

  // A token value as gamma-encoded sRGB channels, following var() aliases and
  // the palette mixes (`color-mix(in srgb, <color>, white|black N%)`), which
  // interpolate the gamma-encoded channels.
  const colorOf = (tokens: Record<string, string>, value: string): number[] => {
    const alias = /^var\(--([\w-]+)\)$/.exec(value);
    if (alias) {
      const next = tokens[alias[1]];
      if (next === undefined) throw new Error(`--${alias[1]} is not defined`);
      return colorOf(tokens, next);
    }
    const mix = /^color-mix\(in srgb, (.+), (white|black) ([\d.]+)%\)$/.exec(value);
    if (mix) {
      const toward = mix[2] === "white" ? 1 : 0;
      const share = Number(mix[3]) / 100;
      return colorOf(tokens, mix[1]).map((c) => c * (1 - share) + toward * share);
    }
    return srgb(value);
  };

  // Gamma-encoded sRGB channels in 0–1, from a 6-digit hex or an oklch().
  const srgb = (color: string): number[] => {
    const hex = /^#([\da-f]{6})$/i.exec(color);
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255);

    const oklch = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(color);
    if (!oklch) throw new Error(`unsupported color: ${color}`);
    const [lightness, chroma, hue] = oklch.slice(1).map(Number);
    const a = chroma * Math.cos((hue * Math.PI) / 180);
    const b = chroma * Math.sin((hue * Math.PI) / 180);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((channel) => {
      const c = Math.min(1, Math.max(0, channel));
      return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    });
  };

  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contrast = (a: number[], b: number[]) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };

  // Each colored wash is a tint of the hue's strong semaphore value; neutral has
  // no strong value, so it tints with its own ink.
  const washPercent = 12;
  const washHue = {
    neutral: "badge-neutral",
    amber: "status-amber",
    positive: "status-green",
    destructive: "status-red",
  } as const;
  const tones = Object.keys(washHue) as (keyof typeof washHue)[];
  // Page, card, popover (the notifications panel) and a hovered table row.
  const surfaces = ["background", "card", "popover", "accent"] as const;

  // Palette scale (2026-10-07): each semaphore hue is one vivid base; the dark
  // lift and the text ink are that base mixed toward white or black, never a
  // hand-picked tone.
  it.each(["green", "amber", "red"])("derives every %s semaphore value from its base", (hue) => {
    expect(light[`status-${hue}`]).toBe(`var(--${hue}-base)`);
    expect(light[`status-${hue}-fg`]).toMatch(
      new RegExp(`^color-mix\\(in srgb, var\\(--${hue}-base\\), black \\d+%\\)$`),
    );
    expect(themes.dark[`status-${hue}`]).toBe(
      `color-mix(in srgb, var(--${hue}-base), white 10%)`,
    );
  });

  it.each(Object.keys(themes))("builds every %s wash as a tint of its hue", (theme) => {
    const tokens = themes[theme as keyof typeof themes];
    for (const tone of tones) {
      expect(tokens[`badge-${tone}-soft`]).toBe(
        `color-mix(in oklab, var(--${washHue[tone]}) ${washPercent}%, transparent)`,
      );
    }
  });

  it.each(
    Object.keys(themes).flatMap((theme) =>
      tones.flatMap((tone) => surfaces.map((surface) => [theme, tone, surface])),
    ),
  )("%s %s ink holds 4.5:1 on its wash over --%s", (theme, tone, surface) => {
    const tokens = themes[theme as keyof typeof themes];
    const ink = colorOf(tokens, `var(--badge-${tone})`);
    const hue = colorOf(tokens, `var(--${washHue[tone as keyof typeof washHue]})`);
    const ground = colorOf(tokens, `var(--${surface})`);
    // A color-mix with transparent composites over the surface in sRGB.
    const alpha = washPercent / 100;
    const wash = hue.map((c, i) => alpha * c + (1 - alpha) * ground[i]);

    expect(contrast(ink, wash)).toBeGreaterThanOrEqual(4.5);
  });
});
