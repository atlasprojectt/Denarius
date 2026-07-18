import { describe, expect, it } from "vitest";

import { compactMoney } from "@/lib/money";

describe("compactMoney", () => {
  it("supports extra precision for close chart labels", () => {
    expect(compactMoney(7160, "BRL", 2)).toBe("R$\u00a07,16\u00a0mil");
  });
});
