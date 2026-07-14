import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Team drill-down skeleton (F1: RSC streaming). Mirrors the real shape —
// breadcrumb, header with the [Simular] slot, budget-context card, control
// plan, contributors table — at the same max-w-4xl column.

export default function TeamDetailLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <Skeleton className="h-4 w-40" />

      <div className="flex items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0" />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="hidden h-10 sm:block" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </PageContainer>
  );
}
