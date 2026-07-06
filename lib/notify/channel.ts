// Denarius — the notification channel seam (PRD P4: pluggable interface,
// Slack later). A channel only knows how to deliver an already-rendered
// message; what to send and to whom is decided upstream (alerts/digest).
// The Resend implementation follows the connectors' injectable-fetchFn
// pattern — no SDK dependency, deterministic tests.

export type RenderedNotification = {
  to: string[];
  subject: string;
  /** Plain-text body — the source of truth for the content. */
  text: string;
  /** Simple single-column HTML, mobile-legible (email click-through target). */
  html: string;
};

export type SendResult = { ok: true } | { ok: false; error: string };

export interface NotificationChannel {
  send(msg: RenderedNotification): Promise<SendResult>;
}

type FetchFn = typeof fetch;

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class ResendChannel implements NotificationChannel {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async send(msg: RenderedNotification): Promise<SendResult> {
    try {
      const response = await this.fetchFn(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      });
      if (!response.ok) {
        // Never include the payload or key in the error — status only.
        return { ok: false, error: `resend responded ${response.status}` };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "resend request failed" };
    }
  }
}

/**
 * The configured email channel, or null when RESEND_API_KEY is unset — the
 * caller skips delivery (and does NOT record the dedup log, so the alert
 * fires on the first run after the key is configured).
 */
export function emailChannel(fetchFn: FetchFn = fetch): NotificationChannel | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  // Resend's shared onboarding sender works out of the box (delivers only to
  // the account owner) — set NOTIFY_FROM_EMAIL once a domain is verified.
  const from = process.env.NOTIFY_FROM_EMAIL ?? "Denarius <onboarding@resend.dev>";
  return new ResendChannel(apiKey, from, fetchFn);
}
