import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { Button, buttonShapeFor, buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it.each([
    "primary",
    "secondary",
    "tertiary",
    "ghost",
    "destructive",
    "outline",
  ] as const)("provides the %s semantic variant", (variant) => {
    expect(buttonVariants({ variant })).toContain("rounded-full");
    expect(buttonVariants({ variant }).length).toBeGreaterThan(100);
  });

  it.each([
    ["sm", "h-7"],
    ["default", "h-9"],
    ["lg", "h-10"],
    ["icon", "size-9"],
    ["icon-sm", "size-7"],
  ] as const)("keeps %s on the documented height", (size, expectedClass) => {
    expect(buttonVariants({ size })).toContain(expectedClass);
  });

  it("keeps primary and destructive treatments distinct", () => {
    expect(buttonVariants({ variant: "primary" })).toContain("bg-primary");
    expect(buttonVariants({ variant: "destructive" })).toContain("bg-destructive/10");
  });

  it("uses the full radius for autonomous textual actions", () => {
    expect(buttonShapeFor("tertiary", "sm")).toBe("full");
    expect(buttonShapeFor("secondary", "sm")).toBe("full");
    expect(
      buttonVariants({ variant: "tertiary", size: "sm", shape: "full" }),
    ).toContain("rounded-full");
    expect(buttonVariants({ variant: "secondary", shape: "standard" })).toContain(
      "rounded-standard",
    );
    expect(buttonVariants({ variant: "primary" })).not.toContain("rounded-standard");
  });

  it.each(["icon", "icon-sm", "icon-xs", "icon-lg"] as const)(
    "keeps %s circular",
    (size) => {
      expect(buttonShapeFor("ghost", size)).toBe("full");
      expect(buttonVariants({ size, shape: "full" })).toContain("rounded-full");
    },
  );

  it("uses the centralized motion timing tokens", () => {
    expect(buttonVariants({ variant: "primary" })).toContain(
      "[transition-duration:var(--motion-duration-standard)]",
    );
    expect(buttonVariants({ variant: "tertiary" })).toContain(
      "[transition-duration:var(--motion-duration-fast)]",
    );
  });
});

describe("Button interaction state", () => {
  it("exposes directional intent without moving the label", () => {
    const button = Button({
      children: "Ver time",
      motion: "forward",
      variant: "tertiary",
    });

    expect(button.props["data-motion"]).toBe("forward");
  });

  it("exposes disclosure intent for expanded-state chevrons", () => {
    const button = Button({
      "aria-expanded": true,
      children: "Notificações",
      motion: "disclosure",
      variant: "secondary",
    });

    expect(button.props["data-motion"]).toBe("disclosure");
    expect(button.props["aria-expanded"]).toBe(true);
  });

  it("keeps loading dimensions while disabling repeated interaction", () => {
    const button = Button({
      children: "Salvar",
      loading: true,
      loadingText: "Salvando...",
    });
    const layers = button.props.children.props.children;

    expect(button.props.disabled).toBe(true);
    expect(button.props["aria-busy"]).toBe(true);
    expect(button.props["data-loading"]).toBe("true");
    expect(layers[0].props.className).toContain("opacity-0");
    expect(layers[1].props.className).toContain("opacity-100");
  });

  it("preserves asChild links while composing the motion layers", () => {
    const button = Button({
      asChild: true,
      children: createElement("a", { href: "/times" }, "Ver time"),
      motion: "forward",
      variant: "tertiary",
    });
    const contentLayer = button.props.render.props.children.props.children[0];

    expect(button.props.render.type).toBe("a");
    expect(button.props.render.props.href).toBe("/times");
    expect(contentLayer.props.children).toBe("Ver time");
  });
});
