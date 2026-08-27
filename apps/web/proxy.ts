import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";

const PUBLIC_PATHS = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  const sessionToken = request.cookies.get("session")?.value;
  const isAuthenticated = sessionToken ? await verifyIdToken(sessionToken).then(
    () => true,
    () => false,
  ) : false;

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
