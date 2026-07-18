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
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Skeleton className="h-8 w-full rounded-none" />
              {Array.from({ length: rows }, (_, index) => (
                <div
                  key={index}
                  className="flex h-[74px] items-center gap-4 border-t border-border/60 px-4"
                >
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="ml-auto h-4 w-20" />
                  <Skeleton className="h-2 w-28" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
