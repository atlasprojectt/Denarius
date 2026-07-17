import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth/PKCE callback (Google, and Supabase email links). Exchanges the code
 * for a session, then hands off to `next` (default "/") — the app layout routes
 * users without a tenant to /onboarding.
 *
 * Behind Vercel's proxy `request.url`'s host is the internal one, so the redirect
 * base is rebuilt from the forwarded host in production; failures (provider error
 * or a failed exchange) bounce back to /login with a flag the form surfaces.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

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

  return NextResponse.redirect(`${base}${next}`);
}
