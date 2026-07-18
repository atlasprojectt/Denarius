"use client";

import { useEffect, useRef } from "react";
import { Toast } from "@base-ui/react/toast";
import { RiErrorWarningLine, RiCheckLine, RiCloseLine } from "@remixicon/react";

import { cn } from "@/lib/utils";

type ToastData = { tone?: "neutral" | "destructive" };

// ONE global manager (Base UI's documented pattern for imperative toasts):
// module-scoped, handed to the Provider below. Unlike the context hook, it
// cannot resolve to a different provider instance across bundle boundaries —
// the context-hook variant silently dropped every add — and its identity is
// stable, so effects that fire toasts never loop on a changing manager.
const toastManager = Toast.createToastManager();

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>();

  return toasts.map((toast) => {
    const destructive = toast.data?.tone === "destructive";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] rounded-xl border bg-popover text-popover-foreground shadow-lg select-none after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:transform-[translateY(150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)] data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] h-(--height) [transition:transform_0.35s_var(--motion-ease-standard),opacity_0.25s,height_0.15s] motion-reduce:transition-none",
          destructive && "border-destructive/30",
        )}
      >
        <Toast.Content className="flex min-h-16 items-start gap-3 overflow-hidden p-4 pr-11">
          {destructive ? (
            <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <RiCheckLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <Toast.Title className="text-sm font-semibold" />
            <Toast.Description className="mt-0.5 text-xs/relaxed text-muted-foreground" />
          </div>
          <Toast.Close
            className="absolute top-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-pill text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Fechar notificação"
          >
            <RiCloseLine className="size-4" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3} timeout={5000}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-[100] w-[calc(100%-2rem)] max-w-sm sm:right-8 sm:bottom-8">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export const useToastManager = Toast.useToastManager<ToastData>;

export function ActionToast({
  id,
  success,
  error,
  state,
}: {
  id: string;
  /** Message to toast on success — callers pick what surfaces here vs inline. */
  success?: string;
  /** Message to toast on error — omit when the error renders inline instead. */
  error?: string;
  /** The useActionState state object. Each dispatch returns a FRESH object, so
   *  its identity marks "one action completed" — one toast per completion,
   *  even when the message text repeats across saves. */
  state: object;
}) {
  // One toast per action completion: each useActionState dispatch returns a
  // FRESH state object, so its identity marks "the action finished" — even
  // when the message text repeats across saves.
  const lastState = useRef<object | null>(null);

  useEffect(() => {
    if (lastState.current === state) return;
    lastState.current = state;
    if (error) {
      toastManager.add({
        title: "Não foi possível concluir",
        description: error,
        priority: "high",
        data: { tone: "destructive" },
      });
      return;
    }
    if (success) {
      toastManager.add({
        title: "Alteração concluída",
        description: success,
        priority: "low",
        data: { tone: "neutral" },
      });
    }
  }, [error, id, success, state]);

  return null;
}
