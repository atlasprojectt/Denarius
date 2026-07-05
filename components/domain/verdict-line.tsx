import type { Verdict } from "@/lib/engine/verdict";

// The verdict line (frontend §3.3): always present, a status dot + the one
// deterministic sentence the engine produced. Verdict-first — this is the
// 10-second answer; everything below justifies it. The dot carries the semaphore
// color; "collecting" stays neutral (no judgement before day 5).

const dot: Record<Verdict["status"], string> = {
  green: "bg-green-600",
  amber: "bg-amber-500",
  red: "bg-red-600",
  collecting: "bg-muted-foreground",
};

export function VerdictLine({ verdict }: { verdict: Verdict }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[verdict.status]}`}
      />
      <p className="text-lg font-semibold leading-snug tracking-tight">
        {verdict.sentence}
      </p>
    </div>
  );
}
