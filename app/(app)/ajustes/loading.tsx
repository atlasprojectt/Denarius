import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function SettingsRowSkeleton({ meta = true }: { meta?: boolean }) {
  return (
    <div className="grid min-h-[66px] grid-cols-[20px_minmax(0,1fr)_36px] items-center gap-x-3 px-4 py-3.5 sm:grid-cols-[20px_minmax(0,1fr)_minmax(140px,auto)_36px] sm:px-5">
      <Skeleton className="size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      {meta && (
        <Skeleton className="col-start-2 mt-2 h-3 w-28 sm:col-start-3 sm:mt-0 sm:justify-self-end" />
      )}
      <Skeleton className="col-start-3 row-span-2 row-start-1 size-4 justify-self-end sm:col-start-4" />
    </div>
  );
}

function SettingsGroupSkeleton({
  rows,
  withoutMeta,
}: {
  rows: number;
  withoutMeta?: number[];
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <Skeleton className="h-3 w-28" />
      <div className="divide-y divide-border/60 overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {Array.from({ length: rows }, (_, index) => (
          <SettingsRowSkeleton
            key={index}
            meta={!withoutMeta?.includes(index)}
          />
        ))}
      </div>
    </section>
  );
}

export default function SettingsLoading() {
  return (
    <PageContainer variant="settings" className="gap-8" aria-busy>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>

      <div className="flex flex-col gap-7">
        <SettingsGroupSkeleton rows={1} />
        <SettingsGroupSkeleton rows={4} withoutMeta={[1]} />
        <SettingsGroupSkeleton rows={3} withoutMeta={[1]} />
      </div>
    </PageContainer>
  );
}
