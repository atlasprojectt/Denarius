export const SUPPORT_EMAIL = "joocrepaldi.pro@gmail.com";

const copy = {
  subject: "Denarius: ajuda e suporte",
  body: [
    "O que aconteceu?",
    "",
    "",
    "O que você esperava que acontecesse?",
    "",
    "",
    "Em qual tela isso aconteceu?",
    "",
  ].join("\n"),
};

/** Gmail's web compose window, prefilled with the support address and a short
 *  bug-report template. Nothing from the session or the tenant goes into the
 *  URL — the user decides what to share. */
export function supportComposeUrl(): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: SUPPORT_EMAIL,
    su: copy.subject,
    body: copy.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
