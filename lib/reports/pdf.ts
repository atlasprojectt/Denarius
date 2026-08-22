import "server-only";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";
import { cookies, headers } from "next/headers";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import { execFileSync } from "node:child_process";

export class ReportPdfError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 503,
  ) {
    super(message);
    this.name = "ReportPdfError";
  }
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "empresa";
}

function trustedOrigin(requestHeaders: Headers): string {
  const configured = process.env.REPORT_PDF_ORIGIN ?? process.env.APP_BASE_URL;
  if (configured) {
    const origin = new URL(configured);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") {
      throw new Error("report pdf origin must use http or https");
    }
    return origin.origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    throw new Error("report pdf trusted origin missing");
  }
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  return `${protocol}://${host}`;
}

function findSystemChrome(): string[] {
  const isWin = platform() === "win32";
  const isMac = platform() === "darwin";
  if (isWin) {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ].filter(existsSync);
  }
  if (isMac) {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ].filter(existsSync);
  }
  const out: string[] = [];
  for (const bin of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const path = execFileSync("which", [bin]).toString().trim();
      if (path) out.push(path);
    } catch {}
  }
  return out;
}

/** `puppeteer.launch` honours an explicit override, then tries the bundled
 *  @sparticuz Chromium, then falls back to a system Chrome/Edge. The bundled
 *  archive is occasionally the wrong host build (e.g. a Linux ELF on Windows),
 *  which `spawn` then rejects as ENOENT — falling back keeps the report
 *  preview and download working instead of failing the whole request. */
async function launchBrowser(): Promise<Browser> {
  const args: string[] = chromium.args;
  const configured = process.env.CHROME_EXECUTABLE_PATH;
  if (configured) {
    return puppeteer.launch({ args, executablePath: configured, headless: true });
  }

  const candidates = [await chromium.executablePath(), ...findSystemChrome()];
  let lastErr: unknown;
  for (const executablePath of candidates) {
    try {
      return await puppeteer.launch({
        args,
        executablePath,
        headless: true,
      });
    } catch (error: unknown) {
      lastErr = error;
    }
  }
  throw lastErr ?? new Error("no Chrome/Chromium executable available");
}

export async function reportPdf(path: string, filename: string) {
  const requestHeaders = await headers();
  const origin = trustedOrigin(requestHeaders);
  const cookie = (await cookies()).toString();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(30_000);
    const response = await page.goto(`${origin}${path}?mode=pdf`, {
      waitUntil: "domcontentloaded",
    });
    if (!response || !response.ok() || page.url().includes("/login")) {
      throw new ReportPdfError(
        "report pdf document unavailable",
        response?.status() === 404 ? 404 : 503,
      );
    }
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    return { pdf, filename: `denarius-relatorio-${safeFilename(filename)}.pdf` };
  } finally {
    await browser.close();
  }
}
