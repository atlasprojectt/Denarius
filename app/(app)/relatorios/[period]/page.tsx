import { notFound } from "next/navigation";

import { monthlyReport } from "@/lib/reports/queries";
import { reportRenderMode } from "@/lib/reports/mode";
import { ReportSheet } from "../_components/report-sheet";

export default async function MonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ period: string }>;
  searchParams: Promise<{ mode?: string; pdf?: string }>;
}) {
  const { period } = await params;
  const mode = reportRenderMode(await searchParams);
  const report = await monthlyReport(period);
  if (!report) notFound();

  return <ReportSheet report={report} variant="closed" mode={mode} />;
}
