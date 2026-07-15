// Denarius — the invitation email (pure render, no I/O). Same shape as the
// alert/digest mails: pt-BR copy, one single-column HTML shell, one link. The
// only secret it carries is the invite URL itself, so nothing here is logged
// by the caller.

import type { RenderedNotification } from "@/lib/notify/channel";

import { INVITE_TTL_DAYS } from "./policy";

const copy = {
  subject: (company: string) => `Convite para o Denarius — ${company}`,
  title: (company: string) => `Você foi convidado para o Denarius de ${company}`,
  roleLabel: { admin: "Administrador", viewer: "Visualizador" } as Record<
    string,
    string
  >,
  body: (role: string) =>
    `Seu papel será ${role}. O Denarius acompanha o gasto com IA da empresa e responde se ele está sob controle.`,
  viewerNote:
    "Como Visualizador, você vê os números agregados da empresa — nomes de pessoas ficam restritos a administradores.",
  adminNote:
    "Como Administrador, você pode conectar provedores, definir orçamentos e convidar outras pessoas.",
  cta: "Aceitar convite",
  expiry: `O link expira em ${INVITE_TTL_DAYS} dias e só pode ser usado uma vez.`,
  ignore: "Se você não esperava este convite, ignore este e-mail.",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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
  const company = escapeHtml(companyName);

  const text = [
    copy.title(companyName),
    "",
    copy.body(roleLabel),
    roleNote,
    "",
    `${copy.cta}: ${inviteUrl}`,
    "",
    copy.expiry,
    copy.ignore,
  ].join("\n");

  const html = `<div style="max-width:480px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
<p style="font-weight:700;font-size:14px;letter-spacing:0.02em">Denarius</p>
<h1 style="font-size:18px;line-height:1.4;margin:16px 0">${copy.title(company)}</h1>
<p style="font-size:14px;line-height:1.6">${escapeHtml(copy.body(roleLabel))}</p>
<p style="font-size:14px;line-height:1.6;color:#6b7280">${escapeHtml(roleNote)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px">${copy.cta}</a></p>
<p style="font-size:12px;color:#6b7280">${copy.expiry}</p>
<p style="font-size:12px;color:#6b7280">${copy.ignore}</p>
</div>`;

  return { to: [to], subject: copy.subject(companyName), text, html };
}
