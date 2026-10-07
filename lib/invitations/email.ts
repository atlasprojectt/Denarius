// Denarius — the invitation email (pure render, no I/O). The message keeps the
// link prominent in both clients that render HTML and clients that show plain
// text. The only secret it carries is the invite URL itself, so nothing here
// is logged by the caller.

import {
  EMAIL_LINK_HINT,
  emailButton,
  emailFinePrint,
  emailPanel,
  emailPanelLead,
  emailPanelNote,
  emailParagraph,
  renderEmailLayout,
} from "@/lib/email/layout";
import type { RenderedNotification } from "@/lib/notify/channel";

import { INVITE_TTL_DAYS } from "./policy";

const copy = {
  subject: (company: string) => `Convite para entrar no Denarius — ${company}`,
  preheader: (company: string) =>
    `Você recebeu acesso ao espaço ${company} no Denarius.`,
  eyebrow: "Convite para o Denarius",
  title: "Você recebeu um convite",
  intro: (company: string) =>
    `Um administrador convidou você para entrar no espaço ${company}.`,
  roleLabel: { admin: "Administrador", viewer: "Visualizador" } as Record<
    string,
    string
  >,
  roleTitle: "Seu acesso",
  body: (role: string) => `Seu papel será ${role}.`,
  viewerNote:
    "Você verá os números agregados da empresa. Nomes de pessoas ficam restritos a administradores.",
  adminNote:
    "Você poderá conectar provedores, definir orçamentos e convidar outras pessoas.",
  cta: "Criar meu acesso",
  expiry: `Este link vale por ${INVITE_TTL_DAYS} dias e só pode ser usado uma vez.`,
  security:
    "O convite é pessoal. Se você não esperava este e-mail, pode ignorá-lo.",
};

export type InviteRenderInput = {
  to: string;
  companyName: string;
  role: "admin" | "viewer";
  inviteUrl: string;
};

export function renderInvite({
  to,
  companyName,
  role,
  inviteUrl,
}: InviteRenderInput): RenderedNotification {
  const roleLabel = copy.roleLabel[role] ?? role;
  const roleNote = role === "admin" ? copy.adminNote : copy.viewerNote;

  const text = [
    copy.eyebrow,
    copy.title,
    "",
    copy.intro(companyName),
    "",
    `${copy.roleTitle}: ${copy.body(roleLabel)}`,
    roleNote,
    "",
    `${copy.cta}: ${inviteUrl}`,
    "",
    EMAIL_LINK_HINT,
    inviteUrl,
    "",
    copy.expiry,
    copy.security,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: copy.preheader(companyName),
    eyebrow: copy.eyebrow,
    title: copy.title,
    body: [
      emailParagraph(copy.intro(companyName)),
      emailPanel(
        copy.roleTitle,
        emailPanelLead(copy.body(roleLabel)) + emailPanelNote(roleNote),
      ),
      emailButton(inviteUrl, copy.cta),
      emailFinePrint([copy.expiry, copy.security]),
    ].join(""),
  });

  return { to: [to], subject: copy.subject(companyName), text, html };
}
