import { currentReport } from "@/lib/reports/current";
import { logThrown } from "@/lib/logging/server-log";
import { ReportDocument } from "../_components/report-document";

// Headless render endpoint for the PDF generator (`app/api/relatorios/agora`
// prints this URL with `?mode=pdf`). Deliberately unlinked: the product
// previews the live report in the dialog on /relatorios, never by
// navigating here.
export const dynamic = "force-dynamic";

export default async function AgoraRenderEndpoint() {
  let report: Awaited<ReturnType<typeof currentReport>>;
  try {
    report = await currentReport();
  } catch (error) {
    logThrown("report.current.read", null, error);
    throw error;
  }

  return (
    <>
      <div className="report-preview-paper">
        <ReportDocument report={report} variant="live" />
      </div>
      <div className="report-print-source" aria-hidden>
        <ReportDocument report={report} variant="live" />
      </div>
    </>
  );
}
