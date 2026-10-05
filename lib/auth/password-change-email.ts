import type { RenderedNotification } from "@/lib/notify/channel";

/** Renders the one-time password-change code. The code is generated server-side
 *  as six digits, so it needs no HTML escaping; it never reaches a log. */
export function renderPasswordChangeCode(input: {
  to: string;
  code: string;
}): RenderedNotification {
  const intro = "Você pediu para alterar a senha da sua conta no Denarius.";
  const expiry =
    "Esse código expira em 10 minutos. Se você não fez esse pedido, ignore este e-mail — sua senha continua a mesma.";
  return {
    to: [input.to],
    subject: "Seu código para alterar a senha — Denarius",
    text: [intro, "", `Código de verificação: ${input.code}`, "", expiry].join(
      "\n",
    ),
    html: [
      '<div style="font-family:Arial,sans-serif;max-width:560px;color:#292524;line-height:1.55">',
      `<p>${intro}</p>`,
      `<p style="font-size:30px;letter-spacing:8px;font-weight:700">${input.code}</p>`,
      `<p>${expiry}</p>`,
      "</div>",
    ].join(""),
  };
}
