import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";

// Shared page header (frontend F5: cross-screen domain component). Keeps every
// screen's opening consistent: optional back link, title, one-line description,
// an optional right-aligned action slot and an optional honesty stamp
// ("as of <date>" — product principle #3) under the actions.

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  meta?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconChevronLeft className="size-3.5" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm/relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(actions || meta) && (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          {meta && (
            <p className="text-xs text-muted-foreground tabular-nums">{meta}</p>
          )}
        </div>
      )}
    </header>
  );
}
