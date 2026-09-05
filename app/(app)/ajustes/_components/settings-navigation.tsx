import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SettingsItemStatus({
  children,
  indicator = false,
}: {
  children: ReactNode;
  indicator?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
      {indicator && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
        />
      )}
      {children}
    </span>
  );
}

export function SettingsNavigationItem({
  href,
  icon,
  title,
  description,
  meta,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/item relative grid min-h-[66px] grid-cols-[20px_minmax(0,1fr)_36px] items-center gap-x-3 px-4 py-3.5 outline-none",
        "after:absolute after:right-4 after:bottom-0 after:left-12 after:h-px after:bg-border last:after:hidden",
        "transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover active:bg-surface-selected",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
        "motion-reduce:transition-none sm:grid-cols-[20px_minmax(0,1fr)_minmax(140px,auto)_36px] sm:px-5 sm:after:right-5 sm:after:left-13",
      )}
    >
      <span className="col-start-1 row-start-1 mt-0.5 flex size-5 shrink-0 items-center justify-center self-start text-muted-foreground transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) group-hover/item:text-muted-foreground motion-reduce:transition-none sm:mt-0 sm:self-center [&>svg]:size-4">
        {icon}
      </span>

      <span className="col-start-2 row-start-1 min-w-0">
        <span className="block text-[13px] font-medium text-foreground transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) group-hover/item:text-foreground motion-reduce:transition-none">
          {title}
        </span>
        <span className="mt-0.5 block text-xs/relaxed text-muted-foreground">
          {description}
        </span>
      </span>

      {meta && (
        <span className="col-start-2 row-start-2 mt-1.5 min-w-0 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:text-right">
          {meta}
        </span>
      )}

      <span className="col-start-3 row-span-2 row-start-1 flex size-9 shrink-0 items-center justify-end text-muted-foreground sm:col-start-4">
        <RiArrowRightSLine
          aria-hidden
          className="size-4 transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) group-hover/item:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}

export function SettingsNavigationGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <nav aria-label={label}>{children}</nav>
    </Card>
  );
}

export function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2
        id={id}
        className="text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        {title}
      </h2>
      <SettingsNavigationGroup label={title}>
        {children}
      </SettingsNavigationGroup>
    </section>
  );
}
