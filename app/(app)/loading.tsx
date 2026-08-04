import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/domain/page-container";

// Route-group loading state (F1: RSC streaming + skeletons, no client spinners).
// Mirrors the cockpit: verdict line → the answer row (hero 7 | insights +
// composition stacked 5) → the two full-width evidence blocks. The container
// variant, gap and column spans must track app/(app)/page.tsx — changing that
// layout without changing this file reintroduces the jump the skeleton exists to
// prevent. Nothing here stretches to the viewport, for the same reason the page
// stopped doing it: a skeleton with a void teaches the eye to expect a void.

export default function AppLoading() {
  return (
    <PageContainer variant="full" className="gap-4" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-6 w-2/3 max-w-md" />
      </div>

      <section className="grid items-stretch gap-4 xl:grid-cols-12">
        {/* Hero: label, the big number, the pacing bar, projection footer. */}
        <div className="flex min-w-0 flex-col gap-5 rounded-xl border p-6 xl:col-span-7">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <div className="border-t pt-4">
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
          {/* Análise da IA: title + a couple of short observation lines. */}
          <div className="flex flex-col gap-3 rounded-xl border p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          {/* Gasto por fonte: title + three ranked tick bars. */}
          <div className="flex flex-1 flex-col gap-4 rounded-xl border p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      </section>

      {/* Evolução do mês: title, metrics row, plot at its definite height. */}
      <div className="flex flex-col gap-4 rounded-xl border p-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-6">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Orçamento dos times: title + rows. */}
      <div className="flex flex-col gap-3 rounded-xl border p-6">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </PageContainer>
  );
}
