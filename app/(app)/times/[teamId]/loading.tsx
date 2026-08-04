import { PageContainer } from "@/components/domain/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// F1 streaming state for the team drill-down — the heaviest route in the app
// (cumulative Recharts line plus the mix and contributor sections). Mirrors the
// real geometry of page.tsx and DiagnosisBody: header, executive summary, the
// chart card at its own height, the two-column mix/contributors grid and the
// control plan. Nothing stretches — a skeleton with a void teaches the eye to
// expect a void.
export default function TeamDetailLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      {/* PageHeader: back link, title, description, period stamp, action slot. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-[10px]" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Executive summary. */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-4 w-64" />
            <div className="grid gap-6 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-28" />
                </div>
              ))}
            </div>
            <Skeleton className="h-2.5 w-full" />
          </CardContent>
        </Card>

        {/* Cumulative chart — same height the chart settles at. */}
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-72 max-w-[70vw]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Mix + contributors. */}
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, card) => (
            <Card key={card}>
              <CardHeader className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, row) => (
                  <div key={row} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-4 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Control plan. */}
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-3/4 max-w-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
