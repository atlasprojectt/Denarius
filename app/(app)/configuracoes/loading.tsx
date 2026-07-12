import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Personal-settings skeleton (F1: RSC streaming). Mirrors the real shape —
// PageHeader, one card with the profile row (large avatar + form) and the
// icon rows below — at the same max-w-3xl column.

export default function PersonalSettingsLoading() {
  return (
    <PageContainer className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-col rounded-xl border bg-card shadow-xs">
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        <div className="border-t" />

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>

        <div className="border-t" />

        <div className="flex items-center gap-3 px-5 py-5">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
