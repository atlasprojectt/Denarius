import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { homeCopy } from "./copy";

// The all-clear state (frontend §3): affirmative, not a blank screen. Shown when
// nothing needs attention and the verdict is green — the calm, in-control answer.

const c = homeCopy.allClear;

export function AllClear() {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-status-green-soft p-5">
      <CheckCircleIcon
        className="mt-0.5 size-5 shrink-0 text-status-green"
        weight="fill"
      />
      <div>
        <p className="text-sm font-semibold text-status-green-fg">{c.title}</p>
        <p className="mt-0.5 text-sm/relaxed text-status-green-fg/80">
          {c.body}
        </p>
      </div>
    </div>
  );
}
