"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiErrorWarningFill,
  RiNotification3Line,
  RiRefreshLine,
  RiTimeFill,
  type RemixiconComponentType,
} from "@remixicon/react";

import { StateBadge, type StateBadgeTone } from "@/components/domain/state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { fetchBudgetNotifications } from "@/lib/home/actions";
import {
  compactNotificationCount,
  filterUnseen,
  notificationTriggerTone,
  parseSeenIds,
  seenStorageKeyForDate,
  serializeSeenIds,
  type BudgetNotification,
} from "@/lib/home/notifications";

const copy = {
  title: "Notificações",
  subtitle: "Alertas ativos do período atual",
  loading: "Carregando notificações",
  allClearBadge: "No controle",
  allClearTitle: "Sem alertas ativos",
  allClearBody: "Nenhum limite de orçamento precisa da sua atenção agora.",
  errorTitle: "Não foi possível atualizar",
  errorBody: "Verifique sua conexão e tente novamente.",
  retry: "Tentar novamente",
  active: (n: number) => (n === 1 ? "1 alerta ativo" : `${n} alertas ativos`),
  badgeAria: (n: number) =>
    n === 1
      ? "Notificações: 1 alerta de orçamento ativo"
      : `Notificações: ${n} alertas de orçamento ativos`,
};

const levelMeta: Record<
  BudgetNotification["level"],
  { label: string; tone: StateBadgeTone; icon: RemixiconComponentType }
> = {
  warning: {
    label: "Limite atingido",
    tone: "amber",
    icon: RiErrorWarningFill,
  },
  projected_breach: {
    label: "Risco projetado",
    tone: "amber",
    icon: RiTimeFill,
  },
  breach: {
    label: "Estourado",
    tone: "destructive",
    icon: RiCloseCircleFill,
  },
};

function PanelHeader({
  mobile,
  titleId,
  descriptionId,
  count,
}: {
  mobile: boolean;
  titleId: string;
  descriptionId: string;
  count: number;
}) {
  const title = mobile ? (
    <SheetTitle id={titleId} className="text-sm font-semibold">
      {copy.title}
    </SheetTitle>
  ) : (
    <p id={titleId} className="text-sm font-semibold">
      {copy.title}
    </p>
  );
  const description = mobile ? (
    <SheetDescription id={descriptionId}>{copy.subtitle}</SheetDescription>
  ) : (
    <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
      {copy.subtitle}
    </p>
  );
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        {title}
        {count > 0 && (
          <StateBadge icon={RiNotification3Line} tone="neutral">
            {copy.active(count)}
          </StateBadge>
        )}
      </div>
      {description}
    </>
  );

  return mobile ? (
    <SheetHeader className="gap-0 border-b px-5 py-4 pr-12 text-left">
      {content}
    </SheetHeader>
  ) : (
    <div className="border-b px-4 py-3.5">{content}</div>
  );
}

function NotificationsPanel({
  panelId,
  mobile,
  items,
  loading,
  failed,
  onNavigate,
  onRetry,
}: {
  panelId: string;
  mobile: boolean;
  items: BudgetNotification[] | null;
  loading: boolean;
  failed: boolean;
  onNavigate: () => void;
  onRetry: () => void;
}) {
  const count = items?.length ?? 0;
  const titleId = `${panelId}-title`;
  const descriptionId = `${panelId}-description`;

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy={loading}>
      <PanelHeader
        mobile={mobile}
        titleId={titleId}
        descriptionId={descriptionId}
        count={count}
      />

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        {loading && items === null ? (
          <div aria-label={copy.loading} className="divide-y px-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="space-y-2.5 py-3.5">
                <Skeleton className="h-5 w-24 rounded-pill" />
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
            ))}
          </div>
        ) : failed && items === null ? (
          <div role="status" className="px-5 py-5">
            <p className="text-sm font-medium">{copy.errorTitle}</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              {copy.errorBody}
            </p>
            <Button
              variant="tertiary"
              size="sm"
              className="mt-3"
              loading={loading}
              loadingText={copy.retry}
              onClick={onRetry}
            >
              <RiRefreshLine data-icon="inline-start" aria-hidden />
              {copy.retry}
            </Button>
          </div>
        ) : items && items.length > 0 ? (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const meta = levelMeta[item.level];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3.5 outline-none transition-colors duration-(--motion-duration-standard) ease-(--motion-ease-standard) hover:bg-surface-hover focus-visible:bg-surface-hover"
                  >
                    <span className="min-w-0">
                      <StateBadge icon={meta.icon} tone={meta.tone}>
                        {meta.label}
                      </StateBadge>
                      <span className="mt-2 block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs/relaxed text-muted-foreground tabular-nums">
                        {item.detail}
                      </span>
                    </span>
                    <RiArrowRightSLine
                      className="mt-1 size-4 shrink-0 self-center text-muted-foreground transition-transform duration-(--motion-duration-fast) group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-5">
            <StateBadge icon={RiCheckboxCircleFill} tone="positive">
              {copy.allClearBadge}
            </StateBadge>
            <p className="mt-2.5 text-sm font-medium">{copy.allClearTitle}</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              {copy.allClearBody}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsButton() {
  const isMobile = useIsMobile();
  const panelId = useId();
  const requestRef = useRef<Promise<BudgetNotification[]> | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BudgetNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Local-only "seen" hint for the count badge. Findings stay stateless on
  // the server; this never leaves the browser and never marks alerts read.
  const storageKey = seenStorageKeyForDate(new Date());
  const [seenIds, setSeenIds] = useState<ReadonlySet<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      return new Set(parseSeenIds(window.localStorage.getItem(storageKey)));
    } catch {
      return new Set<string>();
    }
  });

  function markSeen(nextItems: BudgetNotification[]) {
    if (nextItems.length === 0 || typeof window === "undefined") return;
    let stored: Set<string>;
    try {
      stored = new Set(parseSeenIds(window.localStorage.getItem(storageKey)));
    } catch {
      stored = new Set(seenIds);
    }
    let changed = false;
    for (const item of nextItems) {
      if (!stored.has(item.id)) {
        stored.add(item.id);
        changed = true;
      }
    }
    if (!changed) return;
    try {
      window.localStorage.setItem(storageKey, serializeSeenIds(stored));
    } catch {
      // Storage blocked or full: the badge just won't persist as seen.
    }
    setSeenIds(stored);
  }

  const openRef = useRef(false);

  async function load() {
    const pendingRequest = requestRef.current;
    if (pendingRequest) {
      setLoading(true);
      setFailed(false);
      try {
        const fetched = await pendingRequest;
        setItems(fetched);
        if (openRef.current) markSeen(fetched);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setFailed(false);
    const request = fetchBudgetNotifications();
    requestRef.current = request;
    try {
      const fetched = await request;
      setItems(fetched);
      if (openRef.current) markSeen(fetched);
    } catch {
      setFailed(true);
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const request = fetchBudgetNotifications();
    requestRef.current = request;
    request.then(
      (nextItems) => {
        if (active) {
          setItems(nextItems);
          setFailed(false);
        }
      },
      () => {
        if (active) setFailed(true);
      },
    ).finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });

    return () => {
      active = false;
    };
  }, []);

  const unseen = items ? filterUnseen(items, seenIds) : [];
  const unseenCount = unseen.length;
  const triggerTone = notificationTriggerTone(unseen);
  const countTone =
    triggerTone === "destructive"
      ? "bg-badge-destructive text-background"
      : "bg-badge-amber text-background";
  const handleOpenChange = (next: boolean) => {
    openRef.current = next;
    setOpen(next);
    if (next) {
      // Items already on screen are seen immediately; the refresh below
      // marks the fresh payload on arrival (only if still open).
      if (items) markSeen(items);
      void load();
    }
  };
  const trigger = (
    <Button
      variant="secondary"
      size="icon"
      aria-label={unseenCount > 0 ? copy.badgeAria(unseenCount) : copy.title}
      aria-expanded={open}
      aria-controls={panelId}
      aria-busy={loading && items === null}
      title={copy.title}
      className="size-10 overflow-visible border-border bg-card text-foreground hover:border-border hover:bg-surface-hover aria-expanded:border-border aria-expanded:bg-surface-selected sm:size-9"
    >
      <RiNotification3Line className="size-[18px]" aria-hidden />
      {unseenCount > 0 && (
        <Badge
          aria-hidden
          className={`absolute -top-1 -right-1 h-5 min-w-5 border-0 px-1 py-0 text-[10px] font-bold leading-none shadow-sm ring-2 ring-background tabular-nums ${countTone}`}
        >
          {compactNotificationCount(unseenCount)}
        </Badge>
      )}
    </Button>
  );
  const handleClose = () => {
    openRef.current = false;
    setOpen(false);
  };
  const panel = (
    <NotificationsPanel
      panelId={panelId}
      mobile={isMobile}
      items={items}
      loading={loading}
      failed={failed}
      onNavigate={handleClose}
      onRetry={() => void load()}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          id={panelId}
          side="bottom"
          className="notifications-sheet max-h-[85svh] overflow-hidden rounded-t-xl border-border bg-popover p-0"
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
        className="notifications-popover flex max-h-[min(70vh,640px)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border-border bg-popover p-0 shadow-lg"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
