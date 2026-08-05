import { RecoveryShell } from "../_components/recovery-shell";
import { RecoverForm } from "./_components/recover-form";

// Public route — the whole point is that the person cannot sign in. It lives
// under /auth, which `proxy.ts` already lets through without a session.

export default function RecoverPage() {
  return (
    <RecoveryShell>
      <RecoverForm />
    </RecoveryShell>
  );
}
