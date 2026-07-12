import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Explore skeleton (F1: RSC streaming). Mirrors the real shape — PageHeader,
// then the by-team and by-model table cards at the same max-w-4xl column — so
// the screen settles without a layout jump from the route-group fallback.

function TableCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ExploreLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <TableCardSkeleton rows={4} />
      <TableCardSkeleton rows={5} />
    </PageContainer>
  );
}
