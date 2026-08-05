import "server-only";

import { headers } from "next/headers";

/** The public origin of this deployment, from the request itself — no env var
 *  to drift between preview and prod. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Narrows a `?next=` parameter to a path on THIS site. Auth callbacks take the
 * destination from the query string, and a value that starts a new authority
 * ("//evil.com", "https://evil.com", or a backslash, which some browsers
 * normalize to "/") would turn the callback into an open redirect — a phishing
 * hop that borrows the product's domain. Anything that is not a plain absolute
 * path falls back to "/".
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
