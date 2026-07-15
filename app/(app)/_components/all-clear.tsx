"use client";

import { useEffect, useState } from "react";
import { RiCheckboxCircleLine, RiCloseLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";

import { homeCopy } from "./copy";

// The all-clear state (frontend §3): affirmative, not a blank screen. Shown when
// nothing needs attention and the verdict is green — the calm, in-control answer.

const c = homeCopy.allClear;

export function AllClear() {
  const [state, setState] = useState<"open" | "closing" | "closed">("open");

  useEffect(() => {
    if (state !== "closing") return;
    const timeout = window.setTimeout(() => setState("closed"), 180);
    return () => window.clearTimeout(timeout);
  }, [state]);

  if (state === "closed") return null;

  return (
    <div
      role="status"
      className={`relative flex items-start gap-3 rounded-xl border bg-status-green-soft p-4 pr-12 ${
        state === "closing"
          ? "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 motion-safe:duration-150"
          : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      }`}
    >
      <RiCheckboxCircleLine
        className="mt-0.5 size-5 shrink-0 text-status-green"
      />
      <div>
        <p className="text-sm font-semibold text-status-green-fg">{c.title}</p>
        <p className="mt-0.5 text-sm/relaxed text-status-green-fg/80">
          {c.body}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={c.dismiss}
        className="absolute top-2.5 right-2.5 text-status-green-fg/65 hover:bg-status-green/10 hover:text-status-green-fg"
        onClick={() => setState("closing")}
      >
        <RiCloseLine aria-hidden />
      </Button>
    </div>
  );
}
