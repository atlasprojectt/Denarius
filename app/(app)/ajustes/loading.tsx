import { Skeleton } from "@/components/ui/skeleton";

// Settings skeleton (F1: RSC streaming). Mirrors the hub rhythm — PageHeader,
// group label, cards of icon+text item rows — at the same max-w-4xl column.
// Also covers the /ajustes/* subpages (header + form cards share the shape).

function ItemRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton className="size-5 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <Skeleton className="size-4 shrink-0" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-col rounded-xl border bg-card py-2 shadow-xs">
          <ItemRowSkeleton />
          <ItemRowSkeleton />
          <ItemRowSkeleton />
          <ItemRowSkeleton />
        </div>
      </div>
    </div>
  );
}
