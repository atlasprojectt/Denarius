import { notFound } from "next/navigation";

import { monthlyReport } from "@/lib/reports/queries";
import { ReportDocument } from "../_components/report-document";

// Headless render endpoint for the PDF generator (`app/api/relatorios/[period]`
// prints this URL with `?mode=pdf`). Deliberately unlinked: frozen months open
// in the preview dialog on /relatorios, never by navigating here.
export default async function MonthlyRenderEndpoint({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  const report = await monthlyReport(period);
  if (!report) notFound();

  return (
    <>
      <div className="report-preview-paper">
        <ReportDocument report={report} variant="closed" />
      </div>
      <div className="report-print-source" aria-hidden>
        <ReportDocument report={report} variant="closed" />
      </div>
    </>
  );
}
