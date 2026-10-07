"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  MailSend01Icon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import { useActionState, useMemo, useState } from "react";

import { ActionStatus } from "@/components/domain/action-status";
import {
  ConfirmationDialogContent,
  ConfirmationDialogHeader,
} from "@/components/domain/confirmation-dialog";
import {
  EmailCodeField,
  EmailCodeInstructions,
  useResendCooldown,
} from "@/components/domain/email-code-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMAIL_CODE_TTL_MINUTES } from "@/lib/auth/email-code-policy";
import {
  confirmAccountDeletion,
  requestAccountDeletionCode,
  verifyAccountDeletionCode,
  type AccountDeletionState,
} from "@/lib/privacy/actions";

const copy = {
  cardTitle: "Zona de risco",
  cardDescription:
    "Estas ações são permanentes. Confirme sua identidade antes de continuar.",
  viewerAction: "Sair desta empresa",
  adminAction: "Excluir empresa e conta",
  viewerDescription:
    "Seu acesso será removido desta empresa. Os dados e o histórico da empresa permanecem intactos.",
  adminDescription:
    "A empresa, os dados de uso, orçamentos e acessos de todas as pessoas serão apagados permanentemente.",
  dialogViewerTitle: "Sair desta empresa?",
  dialogAdminTitle: "Excluir empresa e conta?",
  codeDescription: (email: string) =>
    `Enviaremos um código de 6 dígitos para ${email}. Ele expira em ${EMAIL_CODE_TTL_MINUTES} minutos.`,
  requestCode: "Enviar código por e-mail",
  requestingCode: "Enviando…",
  codeTitle: "Confirme seu e-mail",
  codeLifetime: `${EMAIL_CODE_TTL_MINUTES} minutos`,
  verifyCode: "Confirmar código",
  verifyingCode: "Confirmando…",
  phraseTitle: "Confirmação final",
  phraseDescription:
    "Para concluir, digite exatamente a frase abaixo. Não há como desfazer esta ação.",
  phraseLabel: "Digite a frase de confirmação",
  phrasePlaceholder: "Digite a frase exatamente como aparece",
  confirmViewer: "Sair da empresa",
  confirmAdmin: "Excluir empresa e conta",
  confirmingViewer: "Removendo acesso…",
  confirmingAdmin: "Excluindo tudo…",
  cancel: "Cancelar",
  dangerNotice:
    "O Denarius é somente leitura: excluir esta conta não cancela nem altera nada na OpenAI ou na Anthropic.",
  verified: "E-mail confirmado. Falta apenas a confirmação final.",
};

type AccountRole = "admin" | "viewer";
type DeletionStep = "request" | "code" | "phrase";

type AccountDeletionCardProps = {
  role: AccountRole;
  email: string;
  displayName: string;
  /** Used only as a local fallback while the server action returns its phrase. */
  companyName?: string;
};

const initialState: AccountDeletionState = {};

function expectedPhrase({
  role,
  displayName,
  companyName,
}: Pick<AccountDeletionCardProps, "role" | "displayName" | "companyName">) {
  if (role === "admin") {
    return companyName
      ? `Eu confirmo a exclusão da empresa ${companyName}.`
      : `Eu confirmo a exclusão da empresa.`;
  }
  return `Eu excluo a minha conta, ${displayName}.`;
}

/**
 * Destructive account actions deliberately live at the bottom of settings.
 * The component owns only the step UI; all authorization and side effects are
 * performed by the server actions imported above.
 */
export function AccountDeletionCard({
  role,
  email,
  displayName,
  companyName,
}: AccountDeletionCardProps) {
  const [open, setOpen] = useState(false);

  const isAdmin = role === "admin";
  const actionLabel = isAdmin ? copy.adminAction : copy.viewerAction;
  const description = isAdmin ? copy.adminDescription : copy.viewerDescription;

  return (
    <Card id="account-deletion" className="border-destructive/30 bg-destructive/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <HugeiconsIcon icon={Delete02Icon} className="size-4" aria-hidden />
          {copy.cardTitle}
        </CardTitle>
        <CardDescription>{copy.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-md border border-destructive/20 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs/relaxed text-muted-foreground">
            {description}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="shrink-0">
                <HugeiconsIcon icon={Delete02Icon} aria-hidden />
                {actionLabel}
              </Button>
            </DialogTrigger>
            {open ? (
              <AccountDeletionFlow
                role={role}
                email={email}
                displayName={displayName}
                companyName={companyName}
              />
            ) : null}
          </Dialog>
        </div>
        <p className="flex items-start gap-2 text-xs/relaxed text-muted-foreground">
          <HugeiconsIcon icon={ShieldKeyIcon} className="mt-0.5 size-4 shrink-0" aria-hidden />
          {copy.dangerNotice}
        </p>
      </CardContent>
    </Card>
  );
}

function AccountDeletionFlow({
  role,
  email,
  displayName,
  companyName,
}: AccountDeletionCardProps) {
  const [step, setStep] = useState<DeletionStep>("request");
  const [typedCode, setTypedCode] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");
  const [codesSent, setCodesSent] = useState(0);
  const [cooldown, restartCooldown] = useResendCooldown();

  const [requestState, requestAction, requestPending] = useActionState(
    async (previous: AccountDeletionState, formData: FormData) => {
      const next = await requestAccountDeletionCode(previous, formData);
      if (next.step === "sent") {
        setStep("code");
        setTypedCode("");
        setCodesSent((sent) => sent + 1);
        restartCooldown();
      }
      return next;
    },
    initialState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    async (previous: AccountDeletionState, formData: FormData) => {
      const next = await verifyAccountDeletionCode(previous, formData);
      if (next.step === "verified") setStep("phrase");
      return next;
    },
    initialState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmAccountDeletion,
    initialState,
  );

  const fallbackPhrase = useMemo(
    () => expectedPhrase({ role, displayName, companyName }),
    [companyName, displayName, role],
  );
  const phrase = verifyState.phrase ?? fallbackPhrase;
  const isAdmin = role === "admin";

  const title = isAdmin ? copy.dialogAdminTitle : copy.dialogViewerTitle;
  const confirmLabel = isAdmin ? copy.confirmAdmin : copy.confirmViewer;
  const confirmingLabel = isAdmin
    ? copy.confirmingAdmin
    : copy.confirmingViewer;

  return (
    <ConfirmationDialogContent>
      {step === "request" && (
        <form action={requestAction} className="contents">
          <ConfirmationDialogHeader
            title={title}
            description={copy.codeDescription(email)}
            icon={<HugeiconsIcon icon={Delete02Icon} />}
          />

          <div className="flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs/relaxed text-destructive">
            <HugeiconsIcon icon={MailSend01Icon} className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{copy.dangerNotice}</p>
          </div>

          <ActionStatus
            error={requestState.error}
            success={requestState.success}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={requestPending}
                autoFocus
              >
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              loading={requestPending}
              loadingText={copy.requestingCode}
            >
              {copy.requestCode}
            </Button>
          </DialogFooter>
        </form>
      )}

      {step === "code" && (
        <form action={verifyAction} className="contents">
          <ConfirmationDialogHeader
            tone="neutral"
            title={copy.codeTitle}
            description={<EmailCodeInstructions email={email} />}
            icon={<HugeiconsIcon icon={MailSend01Icon} />}
          />

          <EmailCodeField
            id="account-deletion-code"
            name="code"
            value={typedCode}
            onValueChange={setTypedCode}
            lifetime={copy.codeLifetime}
            error={verifyState.error ?? requestState.error}
            resent={codesSent > 1}
            resendAction={requestAction}
            resending={requestPending}
            cooldown={cooldown}
            disabled={verifyPending}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={verifyPending}>
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={typedCode.length !== 6}
              loading={verifyPending}
              loadingText={copy.verifyingCode}
            >
              {copy.verifyCode}
            </Button>
          </DialogFooter>
        </form>
      )}

      {step === "phrase" && (
        <form action={confirmAction} className="contents">
          <ConfirmationDialogHeader
            title={copy.phraseTitle}
            description={copy.phraseDescription}
            icon={<HugeiconsIcon icon={Delete02Icon} />}
          />

          <p className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm/relaxed font-medium text-destructive">
            “{phrase}”
          </p>

          <div className="flex flex-col gap-1.5">
            <ActionStatus success={copy.verified} />
            <Label htmlFor="account-deletion-phrase">{copy.phraseLabel}</Label>
            <Input
              id="account-deletion-phrase"
              name="phrase"
              value={typedPhrase}
              onChange={(event) => setTypedPhrase(event.target.value)}
              placeholder={copy.phrasePlaceholder}
              autoComplete="off"
              required
              aria-invalid={confirmState.error !== undefined}
              className="h-10"
            />
          </div>

          <ActionStatus
            error={confirmState.error}
            success={confirmState.success}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={confirmPending}>
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={typedPhrase !== phrase}
              loading={confirmPending}
              loadingText={confirmingLabel}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      )}
    </ConfirmationDialogContent>
  );
}
