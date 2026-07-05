import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { homeCopy } from "./copy";

// The all-clear state (frontend §3): affirmative, not a blank screen. Shown when
// nothing needs attention and the verdict is green — the calm, in-control answer.

const c = homeCopy.allClear;

export function AllClear() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/40">
      <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-600" weight="fill" />
      <div>
        <p className="font-medium text-green-900 dark:text-green-200">{c.title}</p>
        <p className="mt-0.5 text-sm text-green-800/80 dark:text-green-300/80">{c.body}</p>
      </div>
    </div>
  );
}
