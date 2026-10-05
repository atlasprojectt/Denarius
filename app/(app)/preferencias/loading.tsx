import { PageContainer } from "@/components/domain/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PreferenceCardSkeleton({
  titleWidth,
  children,
}: {
  titleWidth: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-5 py-5 [--card-spacing:--spacing(5)] sm:gap-6 sm:py-6 sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <Skeleton className={`h-4 ${titleWidth}`} />
        </div>
        <Skeleton className="h-3 w-80 max-w-full" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function PersonalPreferencesLoading() {
  return (
    <PageContainer variant="form" className="gap-5" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <PreferenceCardSkeleton titleWidth="w-14">
        <div className="flex items-center gap-4 sm:gap-5">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-2 border-t pt-5">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-9 w-full sm:max-w-sm" />
            <Skeleton className="h-9 w-full sm:w-28" />
          </div>
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton titleWidth="w-36">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-full sm:w-32" />
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton titleWidth="w-20">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      </PreferenceCardSkeleton>

      <PreferenceCardSkeleton titleWidth="w-24">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-56 max-w-full" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </div>
          <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
        </div>
      </PreferenceCardSkeleton>
    </PageContainer>
  );
}
