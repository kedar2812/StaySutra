import { NextResponse, type NextRequest } from "next/server";

/**
 * The dashboard's first gate.
 *
 * Off unless the deployment says otherwise (DASHBOARD_ENABLED=true, set on
 * the VPS): anywhere else — the Vercel demo — /dashboard and /login answer
 * 404, as if they did not exist. Where it is on, no session cookie means the
 * sign-in page. The real check (live session, active user, permission) runs on
 * the server in every dashboard layout and action — lib/server/auth.ts.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const enabled = process.env.DASHBOARD_ENABLED === "true" && Boolean(process.env.DATABASE_URL?.trim());

  if (!enabled) {
    return new NextResponse("Not found", { status: 404, headers: { "x-robots-tag": "noindex" } });
  }

  if (pathname.startsWith("/dashboard") && !request.cookies.get("ss_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/login/:path*", "/login", "/api/admin/:path*", "/api/auth/:path*"] };
