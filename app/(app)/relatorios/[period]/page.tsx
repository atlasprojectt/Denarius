import { notFound } from "next/navigation";

import { monthlyReport } from "@/lib/reports/queries";
import { ReportSheet } from "../_components/report-sheet";

export default async function MonthlyReportPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  const report = await monthlyReport(period);
  if (!report) notFound();

  return <ReportSheet report={report} variant="closed" />;
}
