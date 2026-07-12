import { RiCheckboxCircleLine, RiErrorWarningLine } from "@remixicon/react";

// Inline result line for useActionState forms (F4). One consistent look for
// every mutation across the app. Success stays neutral — green is reserved for
// budget status (product principle #5), not for "saved".

export function ActionStatus({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
        <RiErrorWarningLine className="size-4 shrink-0" />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <RiCheckboxCircleLine className="size-4 shrink-0" />
        {success}
      </p>
    );
  }
  return null;
}
