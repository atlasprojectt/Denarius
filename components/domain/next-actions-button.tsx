"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiLightbulbLine,
} from "@remixicon/react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNextActions } from "@/lib/home/actions";
import type { Observation } from "@/lib/home/queries";

// Global header control (2026-07-12): "Próximas ações" moved off Home into a
// button in the app header, on every screen. This is where the product saves
// the CEO's time, so the trigger is tonal brand accent with a count badge
// (2026-07-14) instead of a ghost button. The badge is fed by one prefetch on
// mount — the header's client island persists across client-side navigations,
// so that's one query per full page load, not per navigation — and the items
// are refetched on open so the list reflects the latest sync/budget state.
// Empty → a calm "tudo em dia" state (no "0" badge — that would nag).

const copy = {
  title: "Próximas ações",
  subtitle: "Caminhos claros para manter o orçamento no controle.",
  defaultAction: "Investigar",
  loading: "Carregando…",
  allClearTitle: "Tudo em dia",
  allClearBody: "Nenhuma ação recomendada agora. O Denarius avisa quando surgir.",
  error: "Não foi possível carregar agora. Tente reabrir.",
  badgeAria: (n: number) =>
    n === 1 ? "Próximas ações: 1 ação recomendada" : `Próximas ações: ${n} ações recomendadas`,
};

export function NextActionsButton() {
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

  // Badge prefetch — silent on failure (no badge is fine; the on-open fetch
  // has its own error state).
  useEffect(() => {
    fetchNextActions().then(setItems, () => {});
  }, []);

  const count = items?.length ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Refetch each open so the actions reflect the latest sync/budget state.
        if (next) void load();
      }}
    >
      <PopoverTrigger
        aria-label={count > 0 ? copy.badgeAria(count) : copy.title}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-primary/15 dark:text-primary-hover dark:hover:bg-primary/20"
      >
        <RiLightbulbLine className="size-4" aria-hidden />
        <span className="hidden sm:inline">{copy.title}</span>
        {count > 0 && (
          <span
            aria-hidden
            className="min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums"
          >
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        <div className="p-1.5">
          {loading ? (
            <div className="flex flex-col gap-1.5 p-1.5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : failed ? (
            <p className="p-3 text-sm text-muted-foreground">{copy.error}</p>
          ) : items && items.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href ?? "/explorar"}
                    onClick={() => setOpen(false)}
                    className="group flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="text-sm/relaxed">{item.text}</span>
                    <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                      {item.actionLabel ?? copy.defaultAction}
                      <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-2.5 p-3">
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
      </PopoverContent>
    </Popover>
  );
}
