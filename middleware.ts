import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = ["/login", "/register"];
const SESSION_COOKIE_NAME = "construction-logistics-session";

// Sign-in disabled: set NEXT_PUBLIC_AUTH_ENABLED=true and restart to re-enable. See ENABLE_SIGNIN.md.
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  if (AUTH_DISABLED) return NextResponse.next();

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
  matcher: [
    "/",
    "/job/:path*",
    "/material/:path*",
    "/hauler/:path*",
    "/forensic/:path*",
    "/billings/:path*",
    "/admin/:path*",
    "/pending",
  ],
};
