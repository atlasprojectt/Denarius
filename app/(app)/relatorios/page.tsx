import { RiErrorWarningLine } from "@remixicon/react";

import { EmptyState } from "@/components/domain/empty-state";
import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { currentPeriod } from "@/lib/engine/period";
import { closingCardState } from "@/lib/reports/closing";
import { reportMonth } from "@/lib/reports/format";
import { listMonthlyReports } from "@/lib/reports/queries";
import { copy } from "./copy";
import { ReportsHost } from "./_components/reports-host";

// The report centre is a file list: the on-demand file, the official closing
// (locked or featured) and the frozen history. Document data is fetched on
// open into the single preview dialog — the index only reads summaries.
export default async function ReportsPage() {
  const read = await listMonthlyReports();

  if (!read.ok) {
    return (
      <PageContainer variant="wide" className="gap-6">
        <PageHeader title={copy.indexTitle} description={copy.indexDescription} />
        <EmptyState
          icon={<RiErrorWarningLine />}
          title={copy.unavailableTitle}
          description={copy.unavailableDescription}
        />
      </PageContainer>
    );
  }

  const closing = closingCardState(
    new Date(),
    read.reports.map((report) => report.periodMonth),
  );

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader title={copy.indexTitle} description={copy.indexDescription} />
      <ReportsHost
        closing={closing}
        history={read.reports}
        agoraMonth={reportMonth(currentPeriod().monthStart)}
      />
    </PageContainer>
  );
}
