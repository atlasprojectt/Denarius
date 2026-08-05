import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildCsp,
  createNonce,
  isIndexable,
  originOf,
  STATIC_SECURITY_HEADERS,
} from "@/lib/security/headers";

/** Routes reachable without a session. Everything else redirects to /login.
 *  /convite carries its own credential — the invite token in the path — and an
 *  invitee has no session yet by definition. */
const PUBLIC_PREFIXES = ["/login", "/auth", "/convite"];

/**
 * Routes with their own non-session authorization (e.g. CRON_SECRET) — bypass
 * the session redirect entirely so the caller's Authorization header can reach
 * the route handler at all. Vercel Cron never carries a Supabase session
 * cookie, so without this the session check would redirect it to /login
 * before the route's own bearer-token check ever runs (issue #17).
 */
const SESSION_BYPASS_PREFIXES = ["/api/cron"];

/**
 * Security headers on every response the proxy produces (issue #60), including
 * the redirects and the cron bypass — a header applied on the happy path only
 * is a header an attacker routes around.
 *
 * The CSP is per-request because it carries a nonce; the rest are constants
 * from lib/security/headers.ts. next.config.ts serves the same constants for
 * the asset paths this matcher deliberately skips.
 */
function secured(
  response: NextResponse,
  { csp, pathname }: { csp: string; pathname: string },
): NextResponse {
  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  response.headers.set("Content-Security-Policy", csp);
  // A budget dashboard for a named company must not be indexable. The public
  // legal pages and the login screen are the deliberate exceptions.
  if (!isIndexable(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    supabaseOrigin: originOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
    dev: process.env.NODE_ENV === "development",
  });

  // The policy travels on the REQUEST too, not only the response: Next reads
  // the incoming Content-Security-Policy and stamps its own bootstrap and
  // flight scripts with the nonce it finds there. Without this, a script-src
  // without 'unsafe-inline' would break the app rather than protect it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const forwarded = { headers: requestHeaders };

  if (SESSION_BYPASS_PREFIXES.some((p) => path.startsWith(p))) {
    return secured(NextResponse.next({ request: forwarded }), {
      csp,
      pathname: path,
    });
  }

  let response = NextResponse.next({ request: forwarded });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: forwarded });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the JWT against Supabase — never trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return secured(NextResponse.redirect(url), { csp, pathname: path });
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return secured(NextResponse.redirect(url), { csp, pathname: path });
  }

  return secured(response, { csp, pathname: path });
}

export const config = {
  // `html` joins the excluded extensions (issue #60): a static page dropped in
  // public/ was being served THROUGH the session middleware, so a file that is
  // public by placement got the app's auth redirect. Excluding it makes the
  // handling deliberate — next.config.ts still gives those paths the static
  // security headers.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)",
  ],
};
