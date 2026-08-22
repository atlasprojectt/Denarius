import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const reportPdf = vi.fn();
const logOk = vi.fn();
const logThrown = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/logging/server-log", () => ({ logOk, logThrown }));
vi.mock("@/lib/reports/pdf", () => ({ reportPdf }));

async function liveRoute() {
  vi.resetModules();
  return import("@/app/api/relatorios/agora/pdf/route");
}

describe("live report PDF route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an incomplete session before launching Chromium", async () => {
    requireSession.mockResolvedValue({ error: "Sessão expirada." });
    const route = await liveRoute();

    const response = await route.GET();

    expect(response.status).toBe(401);
    expect(reportPdf).not.toHaveBeenCalled();
  });

  it("returns a private PDF with an attachment filename", async () => {
    requireSession.mockResolvedValue({
      session: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "viewer",
        email: "viewer@example.com",
      },
    });
    reportPdf.mockResolvedValue({
      pdf: Buffer.from("%PDF-test"),
      filename: "denarius-relatorio-atual.pdf",
    });
    const route = await liveRoute();

    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain(
      "denarius-relatorio-atual.pdf",
    );
    expect(logOk).toHaveBeenCalledWith(
      "report.pdf.generate",
      "tenant-1",
      { variant: "live" },
    );
  });

  it("logs generation failures and returns a retryable status", async () => {
    requireSession.mockResolvedValue({
      session: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "admin",
        email: "admin@example.com",
      },
    });
    const error = new Error("browser unavailable");
    reportPdf.mockRejectedValue(error);
    const route = await liveRoute();

    const response = await route.GET();

    expect(response.status).toBe(503);
    expect(logThrown).toHaveBeenCalledWith(
      "report.pdf.generate",
      "tenant-1",
      error,
    );
  });
});
