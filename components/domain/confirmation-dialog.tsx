"use client";

import {
  cloneElement,
  useState,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { RiErrorWarningLine } from "@/components/domain/icons";

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

const copy = { cancel: "Cancelar" };

type ConfirmationDialogControl =
  | {
      kind?: "trigger";
      trigger: ReactElement<{ onClick?: MouseEventHandler }>;
    }
  | {
      kind: "controlled";
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

type ConfirmationDialogContentProps = {
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
};

function ConfirmationActions({
  pending,
  pendingLabel,
  confirmLabel,
}: {
  pending: boolean;
  pendingLabel?: string;
  confirmLabel: string;
}) {
  const { pending: formPending } = useFormStatus();
  const submitting = pending || formPending;

  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline" disabled={submitting} autoFocus>
          {copy.cancel}
        </Button>
      </DialogClose>
      <Button
        type="submit"
        variant="destructive"
        loading={submitting}
        loadingText={pendingLabel ?? confirmLabel}
      >
        {confirmLabel}
      </Button>
    </DialogFooter>
  );
}

export function ConfirmationDialog(
  props: ConfirmationDialogContentProps & ConfirmationDialogControl,
) {
  const {
    title,
    description,
    confirmLabel,
    pendingLabel,
    action,
    pending,
    success,
    icon,
    children,
  } = props;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.kind === "controlled" ? props.open : internalOpen;
  const setOpen =
    props.kind === "controlled" ? props.onOpenChange : setInternalOpen;

  // Close on a landed success (React's "adjust state during render" pattern —
  // the action returns a fresh success string identity on every dispatch).
  const [prevSuccess, setPrevSuccess] = useState(success);
  if (success !== prevSuccess) {
    setPrevSuccess(success);
    if (success) setOpen(false);
  }

  const triggerWithOpen =
    props.kind === "controlled"
      ? null
      : cloneElement(props.trigger, {
          onClick: (event) => {
            props.trigger.props.onClick?.(event);
            if (!event.defaultPrevented) setOpen(true);
          },
        });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerWithOpen}
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
          <ConfirmationActions
            pending={pending}
            pendingLabel={pendingLabel}
            confirmLabel={confirmLabel}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
