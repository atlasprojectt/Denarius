import Link from "next/link";

import type { Verdict } from "@/lib/engine/verdict";

// The verdict line (frontend §3.3): always present, a status dot + the one
// deterministic sentence the engine produced. Verdict-first — this is the
// 10-second answer; everything below justifies it. The dot carries the semaphore
// color; "collecting" stays neutral (no judgement before day 5). An optional
// action ("Ver time" on a red verdict) renders as a brand-accent link — orange
// is action, never status (§4 contrast rule for resting brand text).

const dot: Record<Verdict["status"], string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  collecting: "bg-muted-foreground",
};

const halo: Record<Verdict["status"], string> = {
  green: "bg-status-green/20",
  amber: "bg-status-amber/20",
  red: "bg-status-red/20",
  collecting: "bg-muted-foreground/15",
};

export function VerdictLine({
  verdict,
  action = null,
}: {
  verdict: Verdict;
  action?: { label: string; href: string } | null;
}) {
  // The dot pulses (an expanding ring + a subtle breathe) in every semaphore
  // state, in its own color — it never blinks. At 2.2s it reads as "this
  // reading is live", not as an alarm, so green stays calm (principle #6).
  // "collecting" is still: no judgement, no motion, before day 5.
  const live = verdict.status !== "collecting";

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`relative mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ${halo[verdict.status]}`}
      >
        {live && (
          <span
            className={`denarius-ping absolute inset-0 rounded-full opacity-0 ${dot[verdict.status]}`}
          />
        )}
        <span
          className={`size-2 rounded-full ${dot[verdict.status]} ${live ? "denarius-breathe" : ""}`}
        />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p className="text-xl/snug font-semibold tracking-tight text-balance">
          {verdict.sentence}
        </p>
        {action !== null && (
          <Link
            href={action.href}
            className="text-sm font-medium whitespace-nowrap text-primary hover:underline dark:text-primary-hover"
          >
            {action.label}
            {" →"}
          </Link>
        )}
      </div>
    </div>
  );
}
