import { PageContainer } from "@/components/domain/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <Card>
        <CardHeader className="border-b border-border/60">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-9 w-40 max-sm:h-11" />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="gap-0 py-0">
        <div className="hidden gap-4 border-b border-border/60 px-4 py-2 lg:grid lg:grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr_20px]">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-16 gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr_0.8fr_20px] lg:items-center lg:gap-4"
          >
            {Array.from({ length: 5 }, (_, cell) => (
              <Skeleton key={cell} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </Card>
    </PageContainer>
  );
}
