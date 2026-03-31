import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (!hasSupabaseAuthEnv()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  try {
    const { response, user } = await updateSession(request);

    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch (error) {
    console.error("Failed to refresh Supabase session in proxy.", error);
    return NextResponse.next({
      request,
    });
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
