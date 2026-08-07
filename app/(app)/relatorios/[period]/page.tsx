import { notFound } from "next/navigation";

import { monthlyReport } from "@/lib/reports/queries";
import { MonthlyReport } from "../_components/monthly-report";

export default async function MonthlyReportPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  const report = await monthlyReport(period);
  if (!report) notFound();

  return <MonthlyReport report={report} />;
}
