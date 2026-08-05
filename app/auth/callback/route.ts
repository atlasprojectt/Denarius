import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/origin";
import {
  RECOVERY_COOKIE,
  RECOVERY_PATH,
  recoveryCookieOptions,
} from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth/PKCE callback (Google, and Supabase email links). Exchanges the code
 * for a session, then hands off to `next` (default "/") — the app layout routes
 * users without a tenant to /onboarding.
 *
 * Behind Vercel's proxy `request.url`'s host is the internal one, so the redirect
 * base is rebuilt from the forwarded host in production; failures (provider error
 * or a failed exchange) bounce back to /login with a flag the form surfaces.
 *
 * Password recovery (#68) comes through here too, with `next` pointing at the
 * reset page: on success the response also stamps the short-lived recovery
 * grant that page requires.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  // `next` is attacker-supplied — keep it a path on this site (open redirect).
  const next = safeNextPath(searchParams.get("next"));

  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development"
      ? origin
      : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

  if (providerError || !code) {
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }

  const response = NextResponse.redirect(`${base}${next}`);
  if (next === RECOVERY_PATH) {
    response.cookies.set(RECOVERY_COOKIE, "1", recoveryCookieOptions);
  }
  return response;
}
