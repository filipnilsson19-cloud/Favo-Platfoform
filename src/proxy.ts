import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseAuthEnv()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    const { response, user } = await updateSession(request);

    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
