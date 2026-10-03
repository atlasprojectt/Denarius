import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  cookies: vi.fn(),
  executablePath: vi.fn(),
  launch: vi.fn(),
  goto: vi.fn(),
  evaluate: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: mocks.cookies,
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: [],
    executablePath: mocks.executablePath,
  },
}));

vi.mock("puppeteer-core", () => ({
  default: {
    launch: mocks.launch,
  },
}));

import { reportPdf } from "@/lib/reports/pdf";

describe("report PDF generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.evaluate.mockReset();
    vi.stubEnv("REPORT_PDF_ORIGIN", undefined);
    vi.stubEnv("APP_BASE_URL", undefined);

    const page = {
      setExtraHTTPHeaders: vi.fn(),
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      goto: mocks.goto.mockResolvedValue({
        ok: () => true,
        status: () => 200,
      }),
      url: vi.fn().mockReturnValue("https://app.usedenarius.pro/relatorios/agora?mode=pdf"),
      emulateMediaType: vi.fn(),
      waitForSelector: vi.fn(),
      evaluate: mocks.evaluate,
      pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-test")),
    };
    const browser = {
      newPage: vi.fn().mockResolvedValue(page),
      close: vi.fn(),
    };

    mocks.headers.mockResolvedValue(
      new Headers({
        "x-forwarded-host": "app.usedenarius.pro",
        "x-forwarded-proto": "https",
      }),
    );
    mocks.cookies.mockResolvedValue({ toString: () => "sb-session=valid" });
    mocks.executablePath.mockResolvedValue("/tmp/chromium");
    mocks.launch.mockResolvedValue(browser);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the canonical production origin when the request has no origin env var", async () => {
    const result = await reportPdf("/relatorios/agora", "atual");

    expect(result.filename).toBe("denarius-relatorio-atual.pdf");
    expect(mocks.goto).toHaveBeenCalledWith(
      "https://app.usedenarius.pro/relatorios/agora?mode=pdf",
      { waitUntil: "networkidle0" },
    );
    expect(mocks.launch).toHaveBeenCalledOnce();
  });

  it("does not use the email deep-link base as the PDF origin", async () => {
    vi.stubEnv("APP_BASE_URL", "https://app.usedenarius.prohttps");

    await reportPdf("/relatorios/agora", "atual");

    expect(mocks.goto).toHaveBeenCalledWith(
      "https://app.usedenarius.pro/relatorios/agora?mode=pdf",
      { waitUntil: "networkidle0" },
    );
  });

  it("rejects an untrusted host when no explicit origin is configured", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      }),
    );

    await expect(reportPdf("/relatorios/agora", "atual")).rejects.toThrow(
      "report pdf trusted origin missing",
    );
    expect(mocks.launch).not.toHaveBeenCalled();
  });

  it("hides the preview copy before rendering the print copy", async () => {
    const preview = { style: { display: "block" } };
    const source = { style: { display: "none" } };
    const sheet = {
      textContent: "AI spend governance report",
      getBoundingClientRect: () => ({ height: 500 }),
    };
    vi.stubGlobal("document", {
      fonts: { ready: Promise.resolve() },
      images: [],
      querySelector: (selector: string) => {
        switch (selector) {
          case ".report-preview-paper": return preview;
          case ".report-print-source": return source;
          case "[data-report-sheet]": return sheet;
          default: return null;
        }
      },
    });
    mocks.evaluate.mockImplementation(async (callback: () => Promise<void>) => callback());

    await reportPdf("/relatorios/agora", "atual");

    expect(preview.style.display).toBe("none");
    expect(source.style.display).toBe("block");
  });
});
