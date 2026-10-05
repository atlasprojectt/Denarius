import { supportComposeUrl } from "@/lib/support/contact";

export function GET(): Response {
  return Response.redirect(supportComposeUrl(), 307);
}
