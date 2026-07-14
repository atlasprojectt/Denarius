import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Route-group loading state (F1: RSC streaming + skeletons, no client
// spinners). Mirrors the cockpit rhythm — verdict line over the 2x2 card grid
// (hero + composition bars, pace chart + teams table) — so every screen in the
// group settles without layout jumps.

export default function AppLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-6 w-2/3 max-w-md" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-xs">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </PageContainer>
  );
}
