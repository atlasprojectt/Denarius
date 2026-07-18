import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("buttonVariants", () => {
  it.each([
    "primary",
    "secondary",
    "tertiary",
    "ghost",
    "destructive",
    "outline",
  ] as const)("provides the %s semantic variant", (variant) => {
    expect(buttonVariants({ variant })).toContain("rounded-[8px]");
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
});
