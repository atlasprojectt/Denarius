import { PageContainer } from "@/components/domain/page-container";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function FileRowSkeleton() {
  return (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
      <Skeleton className="size-4 shrink-0" />
    </div>
  );
}

export default function ReportsLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-44 max-sm:h-11" />
        <Card className="gap-0 py-0">
          <FileRowSkeleton />
        </Card>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-36" />
        <Card className="gap-0 py-0">
          <FileRowSkeleton />
        </Card>
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Card className="gap-0 py-0">
          <div className="divide-y divide-border">
            <FileRowSkeleton />
            <FileRowSkeleton />
            <FileRowSkeleton />
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
