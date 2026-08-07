"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { RiErrorWarningLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const copy = { cancel: "Cancelar" };

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  action,
  pending,
  success,
  icon,
  children,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  action: (payload: FormData) => void;
  pending: boolean;
  success?: string;
  /** Per-action icon for the destructive header medallion. */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Close on a landed success (React's "adjust state during render" pattern —
  // the action returns a fresh success string identity on every dispatch).
  const [prevSuccess, setPrevSuccess] = useState(success);
  if (success !== prevSuccess) {
    setPrevSuccess(success);
    if (success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain max-sm:[&_[data-slot=button]]:min-h-11"
      >
        <form action={action} className="contents">
          <DialogHeader className="flex-row items-start gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive [&>svg]:size-5"
            >
              {icon ?? <RiErrorWarningLine />}
            </span>
            <div className="flex min-w-0 flex-col gap-1 pt-0.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </DialogHeader>
          {children}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending} autoFocus>
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              loading={pending}
              loadingText={pendingLabel ?? confirmLabel}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
