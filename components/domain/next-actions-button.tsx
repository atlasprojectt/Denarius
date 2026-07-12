"use client";

import Link from "next/link";
import { useState } from "react";
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
// button in the app header, on every screen. The action items are fetched
// on-open via a server action (fetchNextActions) so the always-present header
// costs nothing per navigation. Empty → a calm "tudo em dia" state.

const copy = {
  title: "Próximas ações",
  subtitle: "Caminhos claros para manter o orçamento no controle.",
  defaultAction: "Investigar",
  loading: "Carregando…",
  allClearTitle: "Tudo em dia",
  allClearBody: "Nenhuma ação recomendada agora. O Denarius avisa quando surgir.",
  error: "Não foi possível carregar agora. Tente reabrir.",
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

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Refetch each open so the actions reflect the latest sync/budget state.
        if (next) void load();
      }}
    >
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40">
        <RiLightbulbLine className="size-4 text-chart-2" aria-hidden />
        <span className="hidden sm:inline">{copy.title}</span>
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
