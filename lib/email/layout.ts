// Denarius — the one transactional e-mail layout (pure, no I/O). Every message
// the app sends renders through it, and the Supabase auth templates in
// `supabase/templates/` are hand-copies of its output (they cannot import it),
// so a change here must be mirrored there; tests/email-layout.test.ts guards
// the shared shell. Inline styles only: mail clients strip <style> blocks.

const palette = {
  canvas: "#f5f4f1",
  card: "#ffffff",
  panel: "#fafaf9",
  border: "#e7e5e4",
  divider: "#f0efed",
  ink: "#1c1917",
  body: "#44403c",
  secondary: "#57534e",
  muted: "#78716c",
  faint: "#a8a29e",
  brand: "#ff5100",
};

const brandFooter = "Denarius · Governança de gasto com IA";

/** Shown under every button, and in plain-text bodies beside the bare URL. */
export const EMAIL_LINK_HINT =
  "Se o botão não funcionar, copie e cole este endereço no navegador:";

/** The card markup every Denarius e-mail opens with, Supabase templates included. */
export const EMAIL_CARD_STYLE = `width:100%;max-width:560px;background:${palette.card};border:1px solid ${palette.border};border-radius:16px;overflow:hidden`;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** The live app, the one host every mail client can reach. */
const CANONICAL_ORIGIN = "https://app.usedenarius.pro";

/** Deep-link base, disclosed nowhere client-side; prod default is the live app. */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? CANONICAL_ORIGIN;
}

/** Brand images always come from the canonical host, never from
 *  APP_BASE_URL: links may point at a local or preview deployment, but Gmail
 *  cannot fetch those hosts, so a logo derived from them arrives broken. */
function logoUrl(): string {
  return new URL("/brand/denarius-avatar.png", CANONICAL_ORIGIN).toString();
}

export type EmailLayoutInput = {
  /** Inbox preview line; hidden in the body. */
  preheader: string;
  /** Small uppercase label above the title, naming the kind of message. */
  eyebrow: string;
  title: string;
  /** Pre-rendered blocks from the helpers below. */
  body: string;
  /** Why this person receives the message, shown above the brand line. */
  footerNote?: string;
};

/** Plain strings in, escaped here; `body` is trusted markup built by the helpers. */
export function renderEmailLayout({
  preheader,
  eyebrow,
  title,
  body,
  footerNote,
}: EmailLayoutInput): string {
  const footer = footerNote
    ? `${escapeHtml(footerNote)}<br>${brandFooter}`
    : brandFooter;
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:${palette.canvas};color:${palette.ink};font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${palette.canvas}">
      <tr>
        <td align="center" style="padding:32px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${EMAIL_CARD_STYLE}">
            <tr>
              <td style="padding:28px 32px 22px;border-bottom:1px solid ${palette.divider}">
                <img src="${escapeHtml(logoUrl())}" width="44" height="44" alt="Denarius" style="display:block;width:44px;height:44px;border:0;border-radius:12px">
                <p style="margin:16px 0 0;color:${palette.muted};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px">
                <h1 style="margin:0;color:${palette.ink};font-size:28px;line-height:1.15;letter-spacing:-.02em">${escapeHtml(title)}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid ${palette.divider};color:${palette.faint};font-size:11px;line-height:1.5">${footer}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Body copy. Blank lines inside `text` are kept as line breaks. */
export function emailParagraph(text: string): string {
  return `<p style="margin:16px 0 0;color:${palette.body};font-size:16px;line-height:1.6;white-space:pre-line">${escapeHtml(text)}</p>`;
}

/** The single call to action: brand pill plus the plain address for clients
 *  that drop the button. */
export function emailButton(href: string, label: string): string {
  return [
    `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:${palette.brand};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:700">${escapeHtml(label)}</a></p>`,
    `<p style="margin:0;color:${palette.muted};font-size:12px;line-height:1.55">${EMAIL_LINK_HINT}</p>`,
    `<p style="margin:8px 0 0;word-break:break-all;color:${palette.secondary};font-size:12px;line-height:1.55">${escapeHtml(href)}</p>`,
  ].join("");
}

/** Shaded block with a small uppercase label; `content` is trusted markup. */
export function emailPanel(label: string, content: string): string {
  return `<div style="margin:24px 0;padding:16px;border-radius:12px;background:${palette.panel}"><p style="margin:0;color:${palette.muted};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(label)}</p>${content}</div>`;
}

/** Emphasised line inside a panel. */
export function emailPanelLead(text: string): string {
  return `<p style="margin:8px 0 0;color:${palette.ink};font-size:15px;font-weight:700">${escapeHtml(text)}</p>`;
}

/** Supporting line inside a panel. */
export function emailPanelNote(text: string): string {
  return `<p style="margin:8px 0 0;color:${palette.secondary};font-size:13px;line-height:1.55">${escapeHtml(text)}</p>`;
}

/** Label/value rows inside a panel; values are figures, so tabular. */
export function emailFacts(rows: [label: string, value: string][]): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:${palette.secondary};font-size:14px">${escapeHtml(label)}</td><td style="padding:4px 0;color:${palette.ink};font-size:14px;font-weight:700;font-variant-numeric:tabular-nums">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;border-collapse:collapse">${cells}</table>`;
}

/** Bulleted lines inside a panel. */
export function emailList(items: string[]): string {
  const lines = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<ul style="margin:8px 0 0;padding-left:20px;color:${palette.ink};font-size:14px;line-height:1.6">${lines}</ul>`;
}

/** A one-time code, centred in a panel — the same block as the signup template. */
export function emailCode(label: string, code: string): string {
  return `<div style="margin:24px 0;padding:20px 16px;border-radius:12px;background:${palette.panel};text-align:center"><p style="margin:0;color:${palette.muted};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(label)}</p><p style="margin:10px 0 0;color:${palette.ink};font-size:34px;font-weight:700;letter-spacing:10px;font-variant-numeric:tabular-nums">${escapeHtml(code)}</p></div>`;
}

/** Expiry and security notes closing the body. */
export function emailFinePrint(lines: string[]): string {
  return lines
    .map(
      (line, index) =>
        `<p style="margin:${index === 0 ? "24px" : "8px"} 0 0;color:${palette.muted};font-size:12px;line-height:1.55">${escapeHtml(line)}</p>`,
    )
    .join("");
}
