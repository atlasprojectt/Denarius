import { describe, expect, it } from "vitest";

import { formatPtBrMoneyInput, normalizePtBrMoney } from "@/lib/locale-money";

describe("pt-BR money input", () => {
  it("normalizes decimal comma for server validation", () => {
    expect(normalizePtBrMoney("1.234,56")).toBe("1234.56");
  });

  it("preserves a dot decimal sent by autofill", () => {
    expect(normalizePtBrMoney("1234.56")).toBe("1234.56");
  });

  it("formats numbers with two decimal places", () => {
    expect(formatPtBrMoneyInput(1234.5)).toBe("1.234,50");
  });
});
