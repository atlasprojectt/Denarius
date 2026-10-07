import {
  emailCode,
  emailFinePrint,
  emailParagraph,
  renderEmailLayout,
} from "@/lib/email/layout";
import type { RenderedNotification } from "@/lib/notify/channel";

const copy = {
  subject: "Seu código para excluir a conta — Denarius",
  preheader: (code: string) =>
    `Seu código para excluir a conta do Denarius é ${code}.`,
  eyebrow: "Exclusão de conta",
  title: "Confirme a exclusão da conta",
  intro: "Você solicitou a exclusão da sua conta no Denarius. Digite este código para continuar:",
  codeLabel: "Código de confirmação",
  expiry: "Este código expira em 10 minutos e só pode ser usado uma vez.",
  security:
    "Se você não fez essa solicitação, ignore este e-mail. Nada é excluído sem o código.",
};

export type AccountDeletionCodeEmail = {
  to: string;
  code: string;
};

/** Renders the one-time deletion code. The code is deliberately absent from
 * logs and audit context; this value only crosses the configured mail channel. */
export function renderAccountDeletionCode(
  input: AccountDeletionCodeEmail,
): RenderedNotification {
  return {
    to: [input.to],
    subject: copy.subject,
    text: [
      copy.intro,
      "",
      `${copy.codeLabel}: ${input.code}`,
      "",
      copy.expiry,
      copy.security,
    ].join("\n"),
    html: renderEmailLayout({
      preheader: copy.preheader(input.code),
      eyebrow: copy.eyebrow,
      title: copy.title,
      body: [
        emailParagraph(copy.intro),
        emailCode(copy.codeLabel, input.code),
        emailFinePrint([copy.expiry, copy.security]),
      ].join(""),
    }),
  };
}
