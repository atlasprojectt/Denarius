import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";
import { TableCardSkeleton } from "@/components/domain/table-card-skeleton";

// Times skeleton (F1: RSC streaming). Mirrors the real shape — PageHeader then
// the budgeted teams table — at the same content column, so the screen settles
// without a layout jump from the route-group fallback.

export default function TimesLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <TableCardSkeleton rows={5} />
    </PageContainer>
  );
}
