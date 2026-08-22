import { currentReport } from "@/lib/reports/current";
import { logThrown } from "@/lib/logging/server-log";
import { reportRenderMode } from "@/lib/reports/mode";
import { ReportSheet, ReportUnavailable } from "../_components/report-sheet";

// The on-demand report (#96). A static segment, so it wins over `[period]` —
// "agora" is a moment, not a month key.
//
// Never cached: the whole promise of this screen is that it describes the
// company as it stands the second the CEO asks.
export const dynamic = "force-dynamic";

export default async function CurrentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; pdf?: string }>;
}) {
  const mode = reportRenderMode(await searchParams);

  // The report is assembled live from real provider/RLS data. A failure there
  // (provider error, transient sync issue, unexpected data shape) is a runtime
  // condition — not a programming error in the document render — so it must
  // not blank the whole screen or throw through the Server Component boundary.
  // We catch, log the real error server-side (never silent), and show a
  // discreet fallback the user can retry. A genuine bug in the JSX render
  // still throws and reaches the error path unchanged.
  let report: Awaited<ReturnType<typeof currentReport>>;
  try {
    report = await currentReport();
  } catch (error) {
    logThrown("report.current.read", null, error);
    if (mode !== "screen") throw error;
    return <ReportUnavailable />;
  }

  return <ReportSheet report={report} variant="live" mode={mode} />;
}
