"use server";

import { redirect } from "next/navigation";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileForUser } from "@/server/auth-store";

function sanitizeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function buildLoginUrl(message: string, nextPath: string) {
  const params = new URLSearchParams();
  params.set("error", message);

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

export async function loginAction(formData: FormData) {
  const nextPath = sanitizeNextPath(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!hasSupabaseAuthEnv()) {
    redirect(buildLoginUrl("Supabase Auth är inte konfigurerad ännu.", nextPath));
  }

  if (!email || !password) {
    redirect(buildLoginUrl("Fyll i både e-post och lösenord.", nextPath));
  }

  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Failed to create Supabase client during login.", error);
    redirect(buildLoginUrl("Inloggning är inte korrekt konfigurerad ännu.", nextPath));
  }

  let data;
  let error;

  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    data = result.data;
    error = result.error;
  } catch (loginError) {
    console.error("Supabase login request failed.", loginError);
    redirect(buildLoginUrl("Inloggningen kunde inte genomföras just nu.", nextPath));
  }

  if (error || !data.user) {
    redirect(buildLoginUrl("Fel e-post eller lösenord.", nextPath));
  }

  try {
    await ensureUserProfileForUser(data.user);
  } catch (profileError) {
    console.error(
      "Failed to ensure user profile after login. Continuing with authenticated fallback access.",
      profileError,
    );
  }

  redirect(nextPath);
}

export async function logoutAction() {
  if (hasSupabaseAuthEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
