import Link from "next/link";
import { RiArrowRightLine, RiLightbulbLine } from "@remixicon/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Observation } from "@/lib/home/queries";
import { homeCopy } from "./copy";

export function NextActions({ items }: { items: Observation[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.025]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RiLightbulbLine className="size-4 text-primary" aria-hidden />
          {homeCopy.nextActions.title}
        </CardTitle>
        <CardDescription>{homeCopy.nextActions.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href ?? "/explorar"}
            className="group flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3 text-sm outline-none transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span className="text-sm/relaxed">{item.text}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
              {item.actionLabel ?? homeCopy.nextActions.defaultAction}
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
