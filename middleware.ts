import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Set pathname header so the server layout can detect admin routes
  // without depending on `headers()`.nextUrl.pathname (unstable in RSC).
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
  response.headers.set("x-pathname", pathname);

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== LOGIN_PATH) {
    // getToken is Edge-compatible and reads + verifies the NextAuth session JWT
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });

    if (!token?.uid) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
