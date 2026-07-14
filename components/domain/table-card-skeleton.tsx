import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for a table Card (title + description + N rows) —
 *  shared by the Explorar and Times route skeletons (F1: RSC streaming). */
export function TableCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
