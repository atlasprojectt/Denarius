"use server";

import { logThrown } from "@/lib/logging/server-log";

import { currentReport, type CurrentReport } from "./current";
import { monthlyReport, type MonthlyReport } from "./queries";

// Data source of the preview dialog (no dedicated preview routes): the modal
// fetches the document data on open and renders the shared ReportDocument.
// Reads run under RLS like the pages did; nothing is ever written here.

/** The running month as it stands right now. */
export async function getLivePreview(): Promise<CurrentReport> {
  try {
    return await currentReport();
  } catch (error) {
    logThrown("report.preview.live", null, error);
    throw new Error("preview-unavailable");
  }
}

/** One frozen month. The period regex is validated before any DB read. */
export async function getClosedPreview(period: string): Promise<MonthlyReport> {
  try {
    const report = await monthlyReport(period);
    if (!report) throw new Error("preview-unavailable");
    return report;
  } catch (error) {
    if (error instanceof Error && error.message === "preview-unavailable") {
      throw error;
    }
    logThrown("report.preview.closed", null, error);
    throw new Error("preview-unavailable");
  }
}
