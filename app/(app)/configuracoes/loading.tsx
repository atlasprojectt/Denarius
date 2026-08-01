import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function PersonalSettingsLoading() {
  return (
    <PageContainer variant="form" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="overflow-hidden rounded-md ring-1 ring-foreground/10">
        <section className="px-5 py-6 sm:px-6">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          <div className="mt-5 flex items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-full md:w-24" />
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="px-5 py-6 sm:px-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-3 w-96 max-w-full" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="px-5 py-6 sm:px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          <div className="mt-5 flex items-start justify-between gap-5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-56 max-w-full" />
              <Skeleton className="h-3 w-96 max-w-full" />
              <Skeleton className="h-3 w-60 max-w-full" />
            </div>
            <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
          </div>
          <div className="mt-5 flex justify-end">
            <Skeleton className="h-8 w-full md:w-36" />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
