"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiListCheck2,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchNextActions } from "@/lib/home/actions";
import type { Observation } from "@/lib/home/queries";

const copy = {
  title: "Próximas ações",
  subtitle: "Ajustes recomendados para manter os gastos sob controle",
  defaultAction: "Investigar",
  loading: "Carregando ações",
  allClearTitle: "Tudo em dia",
  allClearBody: "Nenhuma ação recomendada agora. O Denarius avisa quando surgir.",
  error: "Não foi possível carregar agora. Tente reabrir.",
  pending: (n: number) => (n === 1 ? "1 pendência" : `${n} pendências`),
  badgeAria: (n: number) =>
    n === 1
      ? "Próximas ações: 1 ação recomendada"
      : `Próximas ações: ${n} ações recomendadas`,
};

function ActionsPanel({
  panelId,
  mobile,
  items,
  loading,
  failed,
  onNavigate,
}: {
  panelId: string;
  mobile: boolean;
  items: Observation[] | null;
  loading: boolean;
  failed: boolean;
  onNavigate: () => void;
}) {
  const count = items?.length ?? 0;
  const titleId = `${panelId}-title`;
  const descriptionId = `${panelId}-description`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {mobile ? (
        <SheetHeader className="gap-1 border-b px-5 py-4 pr-12 text-left">
          <div className="flex items-baseline gap-2.5">
            <SheetTitle id={titleId} className="text-sm font-semibold">
              {copy.title}
            </SheetTitle>
            {count > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {copy.pending(count)}
              </span>
            )}
          </div>
          <SheetDescription id={descriptionId}>{copy.subtitle}</SheetDescription>
        </SheetHeader>
      ) : (
        <div className="border-b px-4 py-3.5">
          <div className="flex items-baseline gap-2.5">
            <p id={titleId} className="text-sm font-semibold">
              {copy.title}
            </p>
            {count > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {copy.pending(count)}
              </span>
            )}
          </div>
          <p id={descriptionId} className="mt-0.5 text-xs/relaxed text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
      )}

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        {loading ? (
          <div aria-label={copy.loading} className="space-y-0 px-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="space-y-2 border-b py-4 last:border-b-0">
                <Skeleton className="h-4 w-2/3 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
                <Skeleton className="h-7 w-32 rounded-pill" />
              </div>
            ))}
          </div>
        ) : failed ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">{copy.error}</p>
        ) : items && items.length > 0 ? (
          <ul className="divide-y divide-border/70">
            {items.map((item) => (
              <li
                key={item.id}
                className="px-4 py-4 transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-muted/30 focus-within:bg-muted/20"
              >
                <p className="text-sm font-semibold text-foreground">
                  {item.title ?? item.text}
                </p>
                {item.context && (
                  <p className="mt-1 text-xs/relaxed text-muted-foreground">
                    {item.context}
                  </p>
                )}
                {item.impact && (
                  <p className="mt-1 text-xs text-foreground/80 tabular-nums">
                    {item.impact}
                  </p>
                )}
                <Button
                  asChild
                  variant="tertiary"
                  size="sm"
                  motion="forward"
                  className="mt-3"
                >
                  <Link href={item.href ?? "/explorar"} onClick={onNavigate}>
                    {item.actionLabel ?? copy.defaultAction}
                    <RiArrowRightSLine
                      className="size-3.5"
                      data-icon="inline-end"
                      aria-hidden
                    />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-2.5 px-4 py-5">
            <RiCheckboxCircleLine
              className="mt-0.5 size-4 shrink-0 text-status-green"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">{copy.allClearTitle}</p>
              <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
                {copy.allClearBody}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NextActionsButton() {
  const isMobile = useIsMobile();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Observation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await fetchNextActions());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNextActions().then(setItems, () => {});
  }, []);

  const count = items?.length ?? 0;
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // The mount effect already prefetched once per page load; refetch on open
    // only when that prefetch hasn't landed (or failed), never in duplicate.
    if (next && items === null && !loading) void load();
  };
  const trigger = (
    <Button
      variant="secondary"
      size="default"
      shape="compact"
      motion="disclosure"
      aria-label={count > 0 ? copy.badgeAria(count) : copy.title}
      aria-expanded={open}
      aria-controls={panelId}
      className="gap-1.5 border-border/80 bg-muted/35 px-2 shadow-xs hover:bg-muted/55 aria-expanded:border-border aria-expanded:bg-muted/65"
    >
      <span
        aria-hidden
        className="flex size-6 items-center justify-center rounded-md bg-brand-accent-muted text-brand-accent-light"
      >
        <RiListCheck2 />
      </span>
      <span className="hidden px-0.5 font-semibold sm:inline">{copy.title}</span>
      {count > 0 && (
        <span
          aria-hidden
          className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-accent-muted px-1.5 text-[11px] font-semibold leading-none text-brand-accent-light tabular-nums"
        >
          {count}
        </span>
      )}
      <Separator
        aria-hidden
        orientation="vertical"
        className="mx-0.5 h-4! bg-border/70"
      />
      <RiArrowDownSLine
        className={`text-muted-foreground/65 transition-transform duration-(--motion-duration-fast) ease-(--motion-ease-standard) ${open ? "rotate-180" : ""}`}
        data-icon="disclosure"
        aria-hidden
      />
    </Button>
  );
  const panel = (
    <ActionsPanel
      panelId={panelId}
      mobile={isMobile}
      items={items}
      loading={loading}
      failed={failed}
      onNavigate={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          id={panelId}
          side="bottom"
          className="next-actions-sheet max-h-[85svh] overflow-hidden rounded-t-lg border-border bg-popover p-0"
        >
          {panel}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        id={panelId}
        side="bottom"
        sideOffset={10}
        align="end"
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-description`}
        className="next-actions-popover flex max-h-[min(70vh,640px)] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border-border bg-popover p-0 shadow-lg"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
