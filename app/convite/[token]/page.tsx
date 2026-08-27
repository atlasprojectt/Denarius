import Link from "next/link";

import { LogoWordmark } from "@/components/domain/logo";
import { Button } from "@/components/ui/button";
import { invitationState } from "@/lib/invitations/policy";
import { hashToken } from "@/lib/invitations/token";
import { findInvitationByTokenHash } from "@/lib/db/admin";

import { BrandPanel } from "../../(auth)/_components/brand-panel";
import { AcceptForm } from "./_components/accept-form";

// Public route: the invitee has no session yet, so the token is the only
// credential. Read on the service role — RLS has no policy that could serve a
// stranger, deliberately (the invitation migration says why).

const copy = {
  deadTitle: "Convite não é mais válido",
  deadBody:
    "Este link expirou, já foi usado ou foi revogado. Peça um novo convite ao administrador da empresa.",
  login: "Ir para o login",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <BrandPanel />
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Only the HASH of the token reaches the database — the plaintext token is
  // never stored, logged or bound into a query. A read failure renders the
  // same "dead link" page the old unchecked-error path produced.
  const invitation = await findInvitationByTokenHash(hashToken(token)).catch(
    () => null,
  );

  const usable =
    invitation !== null &&
    invitationState(
      {
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at,
        revokedAt: invitation.revoked_at,
      },
      new Date(),
    ) === "pending";

  if (!usable) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold text-balance">{copy.deadTitle}</h1>
          <p className="text-sm/relaxed text-muted-foreground">{copy.deadBody}</p>
          <Button asChild variant="outline" className="mt-2 h-11">
            <Link href="/login">{copy.login}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <AcceptForm
        token={token}
        email={invitation.email}
        companyName={invitation.tenant_name ?? "sua empresa"}
      />
    </Shell>
  );
}
