import Link from "next/link";

import { Button } from "@/components/ui/button";
import { hasRecoveryGrant } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

import { RecoveryShell } from "../_components/recovery-shell";
import { NewPasswordForm } from "./_components/new-password-form";

// Reachable only through a recovery link: the callback exchanges the code AND
// stamps the grant, and both are required here. A live session on its own is
// not enough — that would be a password change with no current password.

const copy = {
  deadTitle: "Link de redefinição inválido",
  deadBody:
    "Este link expirou, já foi usado ou foi aberto em outro navegador. Peça um novo para continuar.",
  request: "Pedir um novo link",
};

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const granted = await hasRecoveryGrant();

  if (!user || !granted) {
    return (
      <RecoveryShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold text-balance">{copy.deadTitle}</h1>
          <p className="text-sm/relaxed text-muted-foreground">{copy.deadBody}</p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/auth/recuperar">{copy.request}</Link>
          </Button>
        </div>
      </RecoveryShell>
    );
  }

  return (
    <RecoveryShell>
      <NewPasswordForm email={user.email ?? ""} />
    </RecoveryShell>
  );
}
