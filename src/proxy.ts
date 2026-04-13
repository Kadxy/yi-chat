import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "index, follow",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function applyHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname === "/admin") {
    return applyHeaders(
      NextResponse.redirect(new URL("/admin/users", request.url)),
    );
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return applyHeaders(
      NextResponse.redirect(new URL("/sign-in", request.url)),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|favicon-96x96\\.png|apple-touch-icon\\.png|web-app-manifest-.*\\.png|sw\\.js|offline|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|api/auth|api/captcha|share|sign-in).*)",
  ],
};
