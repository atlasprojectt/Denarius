import { notFound } from "next/navigation";

import { monthlyReport } from "@/lib/reports/queries";
import { ReportSheet } from "../_components/report-sheet";

export default async function MonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ period: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const { period } = await params;
  const { pdf } = await searchParams;
  const report = await monthlyReport(period);
  if (!report) notFound();

  return <ReportSheet report={report} variant="closed" printOnly={pdf === "1"} />;
}
