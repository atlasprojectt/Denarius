import { describe, expect, it } from "vitest";

import { counted } from "@/lib/plural";

describe("counted", () => {
  it("uses the singular only for one", () => {
    expect(counted(1, "pessoa", "pessoas")).toBe("1 pessoa");
  });

  it("uses the plural for zero and values above one", () => {
    expect(counted(0, "time", "times")).toBe("0 times");
    expect(counted(3, "time", "times")).toBe("3 times");
  });
});
