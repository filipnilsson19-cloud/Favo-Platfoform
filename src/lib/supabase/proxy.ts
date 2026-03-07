import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAuthEnv } from "@/lib/supabase/config";

function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? error.code : undefined;
  return (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    code === "refresh_token_already_used"
  );
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
) {
  const authCookieNames = request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) => name.startsWith("sb-"));

  if (!authCookieNames.length) {
    return response;
  }

  const clearedResponse = NextResponse.next({
    request,
  });

  authCookieNames.forEach((name) => {
    clearedResponse.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
    });
  });

  return clearedResponse;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { url, publishableKey } = getSupabaseAuthEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, user };
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return {
        response: clearSupabaseAuthCookies(request, response),
        user: null,
      };
    }

    throw error;
  }
}
