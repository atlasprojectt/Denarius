import { currentReport } from "@/lib/reports/current";
import { ReportSheet } from "../_components/report-sheet";

// The on-demand report (#96). A static segment, so it wins over `[period]` —
// "agora" is a moment, not a month key.
//
// Never cached: the whole promise of this screen is that it describes the
// company as it stands the second the CEO asks.
export const dynamic = "force-dynamic";

export default async function CurrentReportPage() {
  const report = await currentReport();

  return <ReportSheet report={report} variant="live" />;
}
