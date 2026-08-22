import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CurrentReportLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      {/* Header — mirrors `report-viewer-toolbar`: breadcrumb + title block on
          the left, the Imprimir/Baixar PDF actions on the right. */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-7 rounded-md" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
      </div>

      {/* Preview — same clamp height, app-canvas surface and centered white
          sheet as the live preview, so the swap is imperceptible. A single
          subtle border on the surface (no inner card) keeps it from reading as
          a generic card. */}
      <div className="h-[clamp(460px,61vh,640px)] rounded-xl border border-border bg-background p-4 sm:p-8">
        <div className="mx-auto grid h-full w-full max-w-[680px] content-start gap-6 rounded-[2px] bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-7 w-56" />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-24 w-2/3" />
        </div>
      </div>
    </PageContainer>
  );
}
