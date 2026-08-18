import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CurrentReportLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="h-[clamp(460px,61vh,640px)] rounded-xl border border-border bg-foreground/5 p-4 sm:p-8">
        <div className="mx-auto grid h-full w-full max-w-[680px] content-start gap-5 rounded-sm border border-stone-200 bg-white p-8 shadow-sm">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </PageContainer>
  );
}
