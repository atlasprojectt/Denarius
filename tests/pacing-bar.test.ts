import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createElement } from "react";

import { PacingBar } from "@/components/domain/pacing-bar";

const render = (pctSpent: number, pctProjected: number | null, dayOfPeriod: number) =>
  renderToStaticMarkup(
    createElement(PacingBar, { pctSpent, pctProjected, dayOfPeriod, daysInPeriod: 30 }),
  );

describe("PacingBar", () => {
  it("does not announce or list a projection before the guard day", () => {
    const html = render(0.08, null, 3);
    expect(html).toContain("O ritmo de fechamento ainda está sendo coletado");
    expect(html).not.toContain(">Projeção<");
    expect(html).not.toContain("a projeção até o fechamento");
  });

  it("reads the projection before the budget when the close fits", () => {
    const html = render(0.2, 0.6, 6);
    expect(html).toContain(
      "o gasto, a projeção até o fechamento e o orçamento que deve sobrar.",
    );
    expect(html.indexOf(">Projeção<")).toBeLessThan(html.indexOf(">Orçamento<"));
  });

  it("brings the budget forward when the close passes it", () => {
    const html = render(0.4, 1.5, 12);
    expect(html).toContain(
      "o gasto, o restante do orçamento e a projeção até o fechamento, em vermelho, passando do orçamento.",
    );
    expect(html.indexOf(">Orçamento<")).toBeLessThan(html.indexOf(">Projeção<"));
  });

  it("names a realized overrun", () => {
    const html = render(1.2, 1.6, 20);
    expect(html).toContain(">Gasto acima do orçamento<");
    expect(html).not.toContain(">Orçamento<");
  });
});
