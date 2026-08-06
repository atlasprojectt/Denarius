import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes reachable without a session. Everything else redirects to /login.
 *  /convite carries its own credential — the invite token in the path — and an
 *  invitee has no session yet by definition. /privacidade and /termos are
 *  public by purpose (issue #57): a policy behind a login is not a policy, and
 *  Google's consent screen has to reach both URLs unauthenticated (#65).
 *  Exported so a test can assert the legal pages never fall back behind auth. */
export const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/convite",
  "/privacidade",
  "/termos",
];

/**
 * Routes with their own non-session authorization (e.g. CRON_SECRET) — bypass
 * the session redirect entirely so the caller's Authorization header can reach
 * the route handler at all. Vercel Cron never carries a Supabase session
 * cookie, so without this the session check would redirect it to /login
 * before the route's own bearer-token check ever runs (issue #17).
 */
const SESSION_BYPASS_PREFIXES = ["/api/cron"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (SESSION_BYPASS_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
