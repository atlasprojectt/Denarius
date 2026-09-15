import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Route-group loading state (F1: RSC streaming + skeletons, no client
// spinners). Mirrors the cockpit rhythm — greeting/status over a three-card
// top row, then the unchanged pace chart + teams table row — so the screen
// settles without a layout jump.

export default function AppLoading() {
  return (
    <PageContainer variant="full" className="gap-3" aria-busy>
      <div className="flex flex-wrap items-baseline gap-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)_minmax(0,1.45fr)]">
        <div className="flex flex-col gap-5 rounded-xl border p-6 lg:col-span-2 xl:col-span-1">
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
        <div className="flex flex-col gap-4 rounded-xl border p-6 lg:self-stretch xl:aspect-[1.16/1] xl:max-w-[24rem] xl:self-start">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex min-h-full flex-col gap-4 rounded-xl border p-6">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>

      <div className="grid flex-1 items-stretch gap-3 lg:grid-cols-2">
        <div className="flex min-h-[220px] flex-col gap-4 rounded-xl border p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-6">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </PageContainer>
  );
}
