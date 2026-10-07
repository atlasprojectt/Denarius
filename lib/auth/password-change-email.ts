import { EMAIL_CODE_TTL_MINUTES } from "@/lib/auth/email-code-policy";
import {
  emailCode,
  emailFinePrint,
  emailParagraph,
  renderEmailLayout,
} from "@/lib/email/layout";
import type { RenderedNotification } from "@/lib/notify/channel";

const copy = {
  subject: "Seu código para alterar a senha — Denarius",
  preheader: (code: string) =>
    `Seu código para alterar a senha do Denarius é ${code}.`,
  eyebrow: "Alteração de senha",
  title: "Confirme a alteração de senha",
  intro: "Você pediu para alterar a senha da sua conta no Denarius. Digite este código para continuar:",
  codeLabel: "Código de verificação",
  expiry: `Este código expira em ${EMAIL_CODE_TTL_MINUTES} minutos e só pode ser usado uma vez.`,
  security:
    "Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.",
};

/** Renders the one-time password-change code. The code never reaches a log. */
export function renderPasswordChangeCode(input: {
  to: string;
  code: string;
}): RenderedNotification {
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
