"use client";

import {
  cloneElement,
  useState,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const copy = { cancel: "Cancelar" };

/** The shell every confirmation shares: no corner close (Cancel is the exit),
 *  scrollable on short screens, 44px touch targets on phones. */
export function ConfirmationDialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain max-sm:[&_[data-slot=button]]:min-h-11"
    >
      {children}
    </DialogContent>
  );
}

/** Medallion + title + description. Neutral for a step that only verifies
 *  (the e-mail code), destructive for one that confirms an irreversible act. */
export function ConfirmationDialogHeader({
  title,
  description,
  icon,
  tone = "destructive",
}: {
  title: string;
  description: ReactNode;
  /** Per-action icon for the medallion; defaults to a generic alert. */
  icon?: ReactNode;
  tone?: "destructive" | "neutral";
}) {
  return (
    <DialogHeader className="flex-row items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5",
          tone === "destructive"
            ? "bg-destructive/10 text-destructive"
            : "bg-foreground/[0.06] text-ink-secondary",
        )}
      >
        {icon ?? <HugeiconsIcon icon={Alert02Icon} />}
      </span>
      <div className="flex min-w-0 flex-col gap-1 pt-0.5">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </div>
    </DialogHeader>
  );
}

function ConfirmationFooter({
  confirmLabel,
  pendingLabel,
  pending,
}: {
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  // useActionState callers pass their own `pending`; a bare server action
  // (logout) has no such state and relies on the form status.
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline" disabled={busy} autoFocus>
          {copy.cancel}
        </Button>
      </DialogClose>
      <Button
        type="submit"
        variant="destructive"
        loading={busy}
        loadingText={pendingLabel ?? confirmLabel}
      >
        {confirmLabel}
      </Button>
    </DialogFooter>
  );
}

export function ConfirmationDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
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
  /** Opens the dialog on click. Omit it and control `open` when the opener
   *  unmounts before the dialog shows (e.g. a dropdown item). */
  trigger?: ReactElement<{ onClick?: MouseEventHandler }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  action: (payload: FormData) => void | Promise<void>;
  pending?: boolean;
  success?: string;
  /** Per-action icon for the destructive header medallion. */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  // Close on a landed success (React's "adjust state during render" pattern —
  // the action returns a fresh success string identity on every dispatch).
  const [prevSuccess, setPrevSuccess] = useState(success);
  if (success !== prevSuccess) {
    setPrevSuccess(success);
    if (success) setOpen(false);
  }

  const triggerWithOpen = trigger
    ? cloneElement(trigger, {
        onClick: (event) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
        },
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerWithOpen}
      <ConfirmationDialogContent>
        <form action={action} className="contents">
          <ConfirmationDialogHeader
            title={title}
            description={description}
            icon={icon}
          />
          {children}
          <ConfirmationFooter
            confirmLabel={confirmLabel}
            pendingLabel={pendingLabel}
            pending={pending}
          />
        </form>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
