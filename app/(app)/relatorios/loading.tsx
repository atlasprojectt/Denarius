import { PageContainer } from "@/components/domain/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <PageContainer variant="wide" className="gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      {["verdict", "spend", "providers", "teams"].map((section, index) => (
        <div
          key={section}
          className="rounded-xl p-4 ring-1 ring-foreground/10"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton
            className={index === 1 ? "mt-4 h-12 w-56" : "mt-4 h-16 w-full"}
          />
        </div>
      ))}
    </PageContainer>
  );
}

