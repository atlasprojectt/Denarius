"use client";

import { useActionState } from "react";
import { RiMailLine } from "@remixicon/react";

import { ConfirmationDialog } from "@/components/domain/confirmation-dialog";
import { ActionToast } from "@/components/domain/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { revokeInvitation, type InviteFormState } from "@/lib/invitations/actions";
import type { PendingInvitation } from "@/lib/invitations/queries";

const copy = {
  pending: "Convite pendente",
  roleLabel: { admin: "Administrador", viewer: "Visualizador" } as Record<
    string,
    string
  >,
  expires: (date: string) => `Expira em ${date}`,
  revoke: "Revogar",
  revoking: "Revogando…",
  revokeTitle: "Revogar convite?",
  revokeDescription:
    "O link para de funcionar imediatamente. Você pode convidar a mesma pessoa de novo depois.",
};

const initialState: InviteFormState = {};

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [state, formAction, pending] = useActionState(
    revokeInvitation,
    initialState,
  );
  return (
    <>
      <ActionToast
        id={`invitation:${invitationId}:revoke`}
        state={state}
        error={state.error}
        success={state.success}
      />
      <ConfirmationDialog
        trigger={
          <Button type="button" variant="destructive" size="sm">
            {copy.revoke}
          </Button>
        }
        title={copy.revokeTitle}
        description={copy.revokeDescription}
        confirmLabel={copy.revoke}
        pendingLabel={copy.revoking}
        action={formAction}
        pending={pending}
        success={state.success}
      >
        <input type="hidden" name="invitationId" value={invitationId} />
      </ConfirmationDialog>
    </>
  );
}

export function PendingInvitations({
  invitations,
  isAdmin,
}: {
  invitations: PendingInvitation[];
  isAdmin: boolean;
}) {
  if (invitations.length === 0) return null;

  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <ItemGroup className="gap-2">
      {invitations.map((invitation) => (
        <Item key={invitation.id} variant="outline">
          <ItemMedia>
            <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
              <RiMailLine className="size-4" aria-hidden />
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              {invitation.email}
              <Badge variant="outline" className="text-muted-foreground">
                {copy.pending}
              </Badge>
            </ItemTitle>
            <ItemDescription>
              {copy.roleLabel[invitation.role] ?? invitation.role} ·{" "}
              {copy.expires(dateFormat.format(new Date(invitation.expiresAt)))}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            {isAdmin && <RevokeButton invitationId={invitation.id} />}
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
