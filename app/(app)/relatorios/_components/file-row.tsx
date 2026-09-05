import { RiArrowRightSLine, RiFileTextLine, RiLockLine } from "@remixicon/react";

import { cn } from "@/lib/utils";

// One file row: quiet by design — icon, title, meta, chevron. Print and
// download live in the preview header, never here. The locked variant is not
// a button at all: no preview exists yet.
export function FileRow({
  title,
  meta,
  badge,
  labels,
  onOpen,
  locked,
  kind,
}: {
  title: string;
  meta: string;
  badge?: React.ReactNode;
  labels: { open: string };
  onOpen?: () => void;
  locked?: boolean;
  kind: "agora" | "closing" | "history";
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg border border-border",
          locked ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {locked ? (
          <RiLockLine className="size-5" />
        ) : (
          <RiFileTextLine className="size-5" />
        )}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      {!locked && (
        <RiArrowRightSLine
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      )}
    </>
  );

  if (locked || !onOpen) {
    return (
      <div
        aria-disabled={locked || undefined}
        data-file-row={kind}
        className={cn(
          "group flex min-h-16 items-center gap-3 px-4 py-3",
          locked && "bg-muted",
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={labels.open}
      data-file-row={kind}
      onClick={onOpen}
      className="group flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
    >
      {inner}
    </button>
  );
}
