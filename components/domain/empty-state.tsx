import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// Shared empty state (frontend F5). Every area that can have no data renders
// this instead of a blank space: icon, clear title, one useful sentence, and a
// CTA when there's an obvious next action. Composes the shadcn Empty primitives
// so all empty states in the product read the same.

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  /** Rendered as the main CTA — pass a <Link> (wrapped in Button asChild). */
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {(primaryAction || secondaryAction) && (
        <EmptyContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {primaryAction && <Button asChild>{primaryAction}</Button>}
            {secondaryAction && (
              <Button variant="outline" asChild>
                {secondaryAction}
              </Button>
            )}
          </div>
        </EmptyContent>
      )}
    </Empty>
  );
}
