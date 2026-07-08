import type { Verdict } from "@/lib/engine/verdict";

// The verdict line (frontend §3.3): always present, a status dot + the one
// deterministic sentence the engine produced. Verdict-first — this is the
// 10-second answer; everything below justifies it. The dot carries the semaphore
// color; "collecting" stays neutral (no judgement before day 5).

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

export function VerdictLine({ verdict }: { verdict: Verdict }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ${halo[verdict.status]}`}
      >
        <span className={`size-2 rounded-full ${dot[verdict.status]}`} />
      </span>
      <p className="text-xl/snug font-semibold tracking-tight text-balance">
        {verdict.sentence}
      </p>
    </div>
  );
}
