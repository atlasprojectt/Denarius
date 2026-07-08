"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { removeUser, type SettingsFormState } from "@/lib/settings/actions";

const copy = {
  you: "você",
  roleLabel: { admin: "Administrador", viewer: "Visualizador" } as Record<
    string,
    string
  >,
  remove: "Remover",
  removing: "Removendo…",
  selfNote: "Não é possível remover a si mesmo.",
  adminOnly: "Somente administradores podem remover usuários.",
};

export type TenantUser = {
  id: string;
  email: string;
  role: string;
};

const initialState: SettingsFormState = {};

function initialsOf(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function RemoveButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(removeUser, initialState);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <ActionStatus error={state.error} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? copy.removing : copy.remove}
      </Button>
    </form>
  );
}

export function UsersTable({
  users,
  currentUserId,
  isAdmin,
}: {
  users: TenantUser[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ItemGroup className="gap-2">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <Item key={u.id} variant="outline">
              <ItemMedia>
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px] font-semibold">
                    {initialsOf(u.email)}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {u.email}
                  {isSelf && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({copy.you})
                    </span>
                  )}
                </ItemTitle>
                <ItemDescription>
                  {copy.roleLabel[u.role] ?? u.role}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {isAdmin && !isSelf && <RemoveButton userId={u.id} />}
                {isSelf && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {copy.selfNote}
                  </Badge>
                )}
              </ItemActions>
            </Item>
          );
        })}
      </ItemGroup>
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">{copy.adminOnly}</p>
      )}
    </div>
  );
}
