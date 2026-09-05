import { describe, expect, it } from "vitest";

import { reportFileDateTime } from "@/lib/reports/format";

describe("reportFileDateTime", () => {
  it("stamps the file row as DD/MM/AAAA · HH:mm in São Paulo time", () => {
    // 19:28 UTC = 16:28 in America/Sao_Paulo (no DST since 2019).
    expect(reportFileDateTime("2026-09-05T19:28:00.000Z")).toBe(
      "05/09/2026 · 16:28",
    );
  });
});
