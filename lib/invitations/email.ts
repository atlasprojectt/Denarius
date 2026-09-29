// Denarius — the invitation email (pure render, no I/O). The message keeps the
// link prominent in both clients that render HTML and clients that show plain
// text. The only secret it carries is the invite URL itself, so nothing here
// is logged by the caller.

import type { RenderedNotification } from "@/lib/notify/channel";

import { INVITE_TTL_DAYS } from "./policy";

const copy = {
  subject: (company: string) => `Convite para entrar no Denarius | ${company}`,
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
  linkHint: "Se o botão não funcionar, copie e cole este endereço no navegador:",
  expiry: `Este link vale por ${INVITE_TTL_DAYS} dias e só pode ser usado uma vez.`,
  security:
    "O convite é pessoal. Se você não esperava este e-mail, pode ignorá-lo.",
  footer: "Denarius · Governança de gasto com IA",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  // Brand images always come from the canonical host: the invite link follows
  // the request origin, but Gmail cannot fetch a localhost (or preview) host,
  // so a logo derived from it arrives broken.
  const logoUrl = new URL(
    "/brand/denarius-avatar.png",
    process.env.APP_BASE_URL ?? "https://app.usedenarius.pro",
  ).toString();

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
    copy.linkHint,
    inviteUrl,
    "",
    copy.expiry,
    copy.security,
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f5f4f1;color:#1c1917;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.preheader(companyName))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f5f4f1">
      <tr>
        <td align="center" style="padding:32px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:28px 32px 22px;border-bottom:1px solid #f0efed">
                <img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="Denarius" style="display:block;width:44px;height:44px;border:0;border-radius:12px">
                <p style="margin:16px 0 0;color:#78716c;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${copy.eyebrow}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px">
                <h1 style="margin:0;color:#1c1917;font-size:28px;line-height:1.15;letter-spacing:-.02em">${copy.title}</h1>
                <p style="margin:16px 0 0;color:#44403c;font-size:16px;line-height:1.6">${escapeHtml(copy.intro(companyName))}</p>
                <div style="margin:24px 0;padding:16px;border-radius:12px;background:#fafaf9">
                  <p style="margin:0;color:#78716c;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${copy.roleTitle}</p>
                  <p style="margin:8px 0 0;color:#1c1917;font-size:15px;font-weight:700">${escapeHtml(copy.body(roleLabel))}</p>
                  <p style="margin:8px 0 0;color:#57534e;font-size:13px;line-height:1.55">${escapeHtml(roleNote)}</p>
                </div>
                <p style="margin:0 0 24px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#ff5100;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:700">${copy.cta}</a></p>
                <p style="margin:0;color:#78716c;font-size:12px;line-height:1.55">${copy.linkHint}</p>
                <p style="margin:8px 0 0;word-break:break-all;color:#57534e;font-size:12px;line-height:1.55">${escapeHtml(inviteUrl)}</p>
                <p style="margin:24px 0 0;color:#78716c;font-size:12px;line-height:1.55">${copy.expiry}</p>
                <p style="margin:8px 0 0;color:#78716c;font-size:12px;line-height:1.55">${copy.security}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #f0efed;color:#a8a29e;font-size:11px;line-height:1.5">${copy.footer}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: [to], subject: copy.subject(companyName), text, html };
}
