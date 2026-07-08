"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { removeUser, type SettingsFormState } from "@/lib/settings/actions";

const copy = {
  you: "você",
  roleLabel: { admin: "Administrador", viewer: "Visualizador" } as Record<
    string,
    string
  >,
  remove: "Remover",
  removing: "Removendo...",
  selfNote: "Não é possível remover a si mesmo.",
  adminOnly: "Somente administradores podem remover usuários.",
};

export type TenantUser = {
  id: string;
  email: string;
  role: string;
};

const initialState: SettingsFormState = {};

function RemoveButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(removeUser, initialState);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? copy.removing : copy.remove}
      </Button>
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
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
    <ul className="flex flex-col gap-3">
      {users.map((u) => {
        const isSelf = u.id === currentUserId;
        return (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {u.email}
                {isSelf && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({copy.you})
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {copy.roleLabel[u.role] ?? u.role}
              </span>
            </div>
            {isAdmin && !isSelf && <RemoveButton userId={u.id} />}
            {isSelf && (
              <span className="text-xs text-muted-foreground">
                {copy.selfNote}
              </span>
            )}
          </li>
        );
      })}
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">{copy.adminOnly}</p>
      )}
    </ul>
  );
}
