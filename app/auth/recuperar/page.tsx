import { RecoveryShell } from "../_components/recovery-shell";
import { RecoverForm } from "./_components/recover-form";

// Public route — the whole point is that the person cannot sign in. It lives
// under /auth, which `proxy.ts` already lets through without a session.

// Rendered per request so Next can stamp the CSP nonce on its inline flight
// scripts (issue #60). Prerendered, they ship without one and the strict
// `script-src` blocks them — which here costs more than a console error: the
// form drives its pending, error and success states through `useActionState`,
// and none of that survives a page that never hydrates.
export const dynamic = "force-dynamic";

export default function RecoverPage() {
  return (
    <RecoveryShell>
      <RecoverForm />
    </RecoveryShell>
  );
}
