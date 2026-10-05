import { HugeiconsIcon } from "@hugeicons/react";
import { MailXIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { LogoWordmark } from "@/components/domain/logo";
import { Button } from "@/components/ui/button";
import { invitationState } from "@/lib/invitations/policy";
import { findInvitationByTokenHash } from "@/lib/invitations/queries";
import { hashToken } from "@/lib/invitations/token";

import { AcceptForm } from "./_components/accept-form";

// Public route: the invitee has no session yet, so the token is the only
// credential. Read on the service role — RLS has no policy that could serve a
// stranger, deliberately (the invitation migration says why).

const copy = {
  deadKicker: "Link indisponível",
  deadTitle: "Convite não está disponível",
  deadBody:
    "Este link pode ter expirado, já ter sido usado ou ter sido cancelado.",
  helpTitle: "Peça um novo convite",
  helpBody:
    "Fale com o administrador da sua empresa. Ele pode enviar um novo link para o seu e-mail.",
  login: "Ir para o login",
};

// The invite screen is deliberately a single centered column: accepting is
// one password choice, so there is no narrative panel — only the form card.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex items-center gap-2">
        <LogoWordmark className="h-6 w-auto" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Invitation creation and acceptance still use the Supabase Admin client.
  // Read from that same store here: querying the separate Neon privileged
  // connection made every valid link look expired after the DB migration.
  const invitation = await findInvitationByTokenHash(hashToken(token));

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
        <div className="flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <div
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <HugeiconsIcon icon={MailXIcon} className="size-5" />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            {copy.deadKicker}
          </p>
          <h1 className="mt-2 text-2xl text-balance">
            {copy.deadTitle}
          </h1>
          <p className="mt-3 max-w-sm text-sm/relaxed text-ink-secondary">
            {copy.deadBody}
          </p>
          <div className="mt-6 w-full rounded-md bg-muted/60 p-4 text-left">
            <p className="text-sm font-medium">{copy.helpTitle}</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              {copy.helpBody}
            </p>
          </div>
          <Button asChild variant="outline" className="mt-6 h-11 w-full sm:w-auto">
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
        companyName={invitation.tenant?.name ?? "sua empresa"}
      />
    </Shell>
  );
}
