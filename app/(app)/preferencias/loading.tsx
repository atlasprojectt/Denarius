import { PageContainer } from "@/components/domain/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PreferenceCardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-0">
        <section className="px-5 py-6 sm:px-6">{children}</section>
      </CardContent>
    </Card>
  );
}

export default function PersonalPreferencesLoading() {
  return (
    <PageContainer variant="form" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <PreferenceCardSkeleton>
        <Skeleton className="h-4 w-14" />
        <Skeleton className="mt-2 h-3 w-96 max-w-full" />
        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(180px,0.78fr)_minmax(0,1.22fr)] md:gap-8">
          <div className="rounded-lg border bg-muted/30 p-4 sm:p-5">
            <Skeleton className="h-3 w-28" />
            <div className="mt-4 flex items-center gap-3">
              <Skeleton className="size-14 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t pt-4">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
              <Skeleton className="h-8 w-full sm:w-24" />
            </div>
            <div className="border-t pt-5">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
          </div>
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="mt-5 h-3 w-96 max-w-full" />
        <div className="mt-5 flex justify-end">
          <Skeleton className="h-8 w-full md:w-32" />
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-2 h-3 w-96 max-w-full" />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-80 max-w-full" />
        <div className="mt-5 flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-56 max-w-full" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </div>
          <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
        </div>
        <div className="mt-5 flex justify-end">
          <Skeleton className="h-8 w-full md:w-36" />
        </div>
      </PreferenceCardSkeleton>
    </PageContainer>
  );
}
