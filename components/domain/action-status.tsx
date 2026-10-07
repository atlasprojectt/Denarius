import { HugeiconsIcon } from "@hugeicons/react";

import { stateIcons } from "@/components/domain/state-icons";

// Inline result line for useActionState forms (F4). One consistent look for
// every mutation across the app. Success stays neutral — green is reserved for
// budget status (product principle #5), not for "saved". The error reads in the
// destructive state tone, which holds AA on every surface.

export function ActionStatus({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-sm text-badge-destructive">
        <HugeiconsIcon icon={stateIcons.failure} className="size-4 shrink-0" />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm text-ink-secondary">
        <HugeiconsIcon icon={stateIcons.done} className="size-4 shrink-0" />
        {success}
      </p>
    );
  }
  return null;
}
