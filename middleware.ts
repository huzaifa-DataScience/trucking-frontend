import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = ["/login", "/register"];
const SESSION_COOKIE_NAME = "construction-logistics-session";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on these paths. /login and /register are never matched.
  // Admin routes are protected by RequireAdmin component (client-side check).
  // Matcher uses Next.js path matching - paths starting with these will be matched
  matcher: [
    "/",
    "/job/:path*",
    "/material/:path*",
    "/hauler/:path*",
    "/forensic/:path*",
    "/admin/:path*",
    "/pending",
  ],
};
