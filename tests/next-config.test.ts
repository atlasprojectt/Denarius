import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("Next production tracing", () => {
  it("includes Chromium Brotli assets in the PDF route functions", () => {
    const includes = nextConfig.outputFileTracingIncludes?.["/api/relatorios/*/pdf"];

    expect(includes).toContain("./node_modules/@sparticuz/chromium/bin/**/*");
  });
});
