import { describe, expect, it } from "vitest";

import { compactMoney, signedMoney } from "@/lib/money";

describe("compactMoney", () => {
  it("supports extra precision for close chart labels", () => {
    expect(compactMoney(7160, "BRL", 2)).toBe("R$\u00a07,16\u00a0mil");
  });
});

describe("signedMoney \u2014 the sign replaces acima/abaixo", () => {
  it("prefixes a plus above the reference and a true minus below it", () => {
    expect(signedMoney(1200)).toBe("+R$\u00a01.200,00");
    expect(signedMoney(-300)).toBe("\u2212R$\u00a0300,00");
    expect(signedMoney(-12.5, "USD")).toBe("\u2212US$\u00a012,50");
  });

  it("leaves zero \u2014 and anything that rounds to it \u2014 unsigned", () => {
    expect(signedMoney(0)).toBe("R$\u00a00,00");
    expect(signedMoney(-0)).toBe("R$\u00a00,00");
    expect(signedMoney(-0.004)).toBe("R$\u00a00,00");
  });
});
