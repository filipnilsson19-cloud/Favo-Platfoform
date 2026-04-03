import "server-only";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileForUser } from "@/server/auth-store";

export function sanitizeNextPath(value: string | null | undefined) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export function buildLoginUrl(message: string, nextPath: string) {
  const params = new URLSearchParams();
  params.set("error", message);

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

type LoginAttemptInput = {
  email: string;
  password: string;
  nextPath: string;
};

type LoginAttemptResult = {
  redirectTo: string;
  success: boolean;
};

export async function loginWithPassword({
  email,
  password,
  nextPath,
}: LoginAttemptInput): Promise<LoginAttemptResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNextPath = sanitizeNextPath(nextPath);

  if (!hasSupabaseAuthEnv()) {
    return {
      redirectTo: buildLoginUrl(
        "Supabase Auth är inte konfigurerad ännu.",
        normalizedNextPath,
      ),
      success: false,
    };
  }

  if (!normalizedEmail || !password) {
    return {
      redirectTo: buildLoginUrl(
        "Fyll i både e-post och lösenord.",
        normalizedNextPath,
      ),
      success: false,
    };
  }

  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Failed to create Supabase client during login.", error);

    return {
      redirectTo: buildLoginUrl(
        "Inloggning är inte korrekt konfigurerad ännu.",
        normalizedNextPath,
      ),
      success: false,
    };
  }

  let data;
  let error;

  try {
    const result = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    data = result.data;
    error = result.error;
  } catch (loginError) {
    console.error("Supabase login request failed.", loginError);

    return {
      redirectTo: buildLoginUrl(
        "Inloggningen kunde inte genomföras just nu.",
        normalizedNextPath,
      ),
      success: false,
    };
  }

  if (error || !data.user) {
    return {
      redirectTo: buildLoginUrl("Fel e-post eller lösenord.", normalizedNextPath),
      success: false,
    };
  }

  try {
    await ensureUserProfileForUser(data.user);
  } catch (profileError) {
    console.error(
      "Failed to ensure user profile after login. Continuing with authenticated fallback access.",
      profileError,
    );
  }

  return {
    redirectTo: normalizedNextPath,
    success: true,
  };
}
