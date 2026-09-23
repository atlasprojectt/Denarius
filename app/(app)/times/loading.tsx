import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

// F1 streaming state: the grouped comparison index keeps its geometry while
// the server assembles budget, usage and attribution data.
export default function TimesLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <div className="flex flex-col gap-5">
        {[3, 4].map((rows) => (
          <section key={rows} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <div className="team-index-card overflow-hidden rounded-xl border border-border">
              {Array.from({ length: rows }, (_, index) => (
                <div
                  key={index}
                  className="team-index-loading-row border-b border-border px-4 py-4 last:border-b-0"
                >
                  <div className="team-index-loading-header flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-24 rounded-pill" />
                  </div>
                  <div className="team-index-metrics team-index-loading-metrics mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {[0, 1, 2, 3].map((metric) => (
                      <div key={metric} className="space-y-1.5">
                        <Skeleton className="team-index-loading-label h-3 w-16" />
                        <Skeleton className="h-4 w-24 max-w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="team-index-loading-progress mt-3 flex items-center gap-3">
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="team-index-loading-action hidden h-4 w-4" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
