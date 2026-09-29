import type { RenderedNotification } from "@/lib/notify/channel";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export type AccountDeletionCodeEmail = {
  to: string;
  code: string;
};

/** Renders the one-time deletion code. The code is deliberately absent from
 * logs and audit context; this value only crosses the configured mail channel. */
export function renderAccountDeletionCode(
  input: AccountDeletionCodeEmail,
): RenderedNotification {
  const code = escapeHtml(input.code);
  return {
    to: [input.to],
    subject: "Seu código para excluir a conta — Denarius",
    text: [
      "Você solicitou a exclusão da sua conta no Denarius.",
      "",
      `Código de confirmação: ${input.code}`,
      "",
      "Esse código expira em 10 minutos. Se você não fez essa solicitação, ignore este e-mail.",
    ].join("\n"),
    html: [
      '<div style="font-family:Arial,sans-serif;max-width:560px;color:#292524;line-height:1.55">',
      "<p>Você solicitou a exclusão da sua conta no Denarius.</p>",
      `<p style="font-size:30px;letter-spacing:8px;font-weight:700">${code}</p>`,
      "<p>Esse código expira em 10 minutos. Se você não fez essa solicitação, ignore este e-mail.</p>",
      "</div>",
    ].join(""),
  };
}

