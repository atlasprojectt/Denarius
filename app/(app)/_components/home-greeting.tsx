"use client";

import { useEffect, useState } from "react";

import type { VerdictStatus } from "@/lib/engine/verdict";
import { homeCopy } from "./copy";

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return homeCopy.greeting.morning;
  if (hour >= 12 && hour < 18) return homeCopy.greeting.afternoon;
  return homeCopy.greeting.evening;
}

/** Read the browser's local timezone instead of the server's UTC clock. */
export function localHour(now = new Date()): number {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart);
  return Number.isFinite(hour) ? hour % 24 : now.getHours();
}

const statusCopy: Record<VerdictStatus, string> = homeCopy.greeting.status;

const dot: Record<VerdictStatus, string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  collecting: "bg-muted-foreground",
};

const halo: Record<VerdictStatus, string> = {
  green: "bg-status-green/20",
  amber: "bg-status-amber/20",
  red: "bg-status-red/20",
  collecting: "bg-muted-foreground/15",
};

export function statusIndicatorClasses(status: VerdictStatus) {
  return {
    halo: halo[status],
    ping: status === "collecting" ? "" : "denarius-ping",
    dot: `${dot[status]}${status === "collecting" ? "" : " denarius-breathe"}`,
  };
}

export function HomeGreeting({
  name,
  status,
}: {
  name: string;
  status: VerdictStatus | null;
}) {
  const [greeting, setGreeting] = useState<string>(homeCopy.greeting.fallback);
  const indicator = status === null ? null : statusIndicatorClasses(status);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGreeting(greetingForHour(localHour()));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="text-xl font-semibold leading-7 tracking-[-0.02em]">{greeting}, {name}</h1>
      {status !== null && (
        <span className="inline-flex items-center gap-3 text-sm font-medium">
          <span aria-hidden className="h-5 w-px bg-border" />
          <span
            role="status"
            className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface-control px-2.5 py-1 text-foreground"
            aria-label={`Situação: ${statusCopy[status]}`}
          >
            <span aria-hidden className={`relative flex size-4 items-center justify-center rounded-full ${indicator?.halo}`}>
              {indicator?.ping && (
                <span aria-hidden className={`absolute inset-0 rounded-full opacity-0 ${indicator.ping} ${dot[status]}`} />
              )}
              <span aria-hidden className={`size-2 rounded-full ${indicator?.dot}`} />
            </span>
            {statusCopy[status]}
          </span>
        </span>
      )}
    </div>
  );
}
