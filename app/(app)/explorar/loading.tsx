import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Explore skeleton (F1: RSC streaming). Mirrors the compact tabs, the separate
// financial summary cards and the ranked list card so the screen settles
// without a jump.

export default function ExploreLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="hidden h-3 w-32 sm:block" />
      </div>
      <Skeleton className="h-9 w-44 rounded-full" />
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg p-4 ring-1 ring-foreground/6"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg ring-1 ring-foreground/6">
          <div className="flex flex-col gap-2 border-b border-border p-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid gap-1 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid h-12 grid-cols-[1fr_7rem] items-center gap-6 border-b border-border last:border-0">
                <div className="grid gap-2">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-1 w-full" />
                </div>
                <Skeleton className="h-4 w-24 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
