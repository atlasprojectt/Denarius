import { Skeleton } from "@/components/ui/skeleton";

// Route-group loading state (F1: RSC streaming + skeletons, no client
// spinners). Mirrors the cockpit rhythm — verdict line, hero card, two list
// cards — so every screen in the group settles without layout jumps.

export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-6 w-2/3 max-w-md" />
      </div>

      <div className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="hidden h-10 sm:block" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-xs">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
