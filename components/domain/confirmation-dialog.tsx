"use client";

import { useState, type ReactElement, type ReactNode } from "react";

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
      <DialogContent showCloseButton={false}>
        <form action={action} className="contents">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending} autoFocus>
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
