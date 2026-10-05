import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createElement } from "react";

import { PacingBar } from "@/app/(app)/_components/pacing-bar";

describe("PacingBar collecting state", () => {
  it("does not announce or list a projection before the guard day", () => {
    const html = renderToStaticMarkup(
      createElement(PacingBar, {
        pctSpent: 0.08,
        pctProjected: null,
        dayOfPeriod: 3,
        daysInPeriod: 30,
      }),
    );

    expect(html).toContain("O ritmo de fechamento ainda está sendo coletado.");
    expect(html).not.toContain(">Projeção<");
    expect(html).not.toContain("a projeção do que ainda será gasto");
  });

  it("lists the projection once the guard has passed", () => {
    const html = renderToStaticMarkup(
      createElement(PacingBar, {
        pctSpent: 0.2,
        pctProjected: 0.6,
        dayOfPeriod: 6,
        daysInPeriod: 30,
      }),
    );

    expect(html).toContain("Projeção");
    expect(html).toContain("a projeção do que ainda será gasto");
  });
});
