import { PageContainer } from "@/components/domain/page-container";
import { TableCardSkeleton } from "@/components/domain/table-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// F1 streaming state: mirrors page.tsx's PageHeader (back link, title,
// description, status/meta) and DiagnosisBody's real card geometry —
// executive summary, cumulative chart, mix + contributors, control plan.
export default function TeamDetailLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Skeleton className="mb-2 h-3.5 w-14" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-xl" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-w-0">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1.5 h-5 w-20" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
          <Skeleton className="h-4 w-3/4 border-t border-border pt-3" />
        </div>

        <div className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-[280px] w-full" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <TableCardSkeleton rows={3} />
          <TableCardSkeleton rows={4} />
        </div>

        <div className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="divide-y divide-border rounded-md border border-border">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
