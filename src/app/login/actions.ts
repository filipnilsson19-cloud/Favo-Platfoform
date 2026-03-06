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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(buildLoginUrl("Fel e-post eller lösenord.", nextPath));
  }

  await ensureUserProfileForUser(data.user);
  redirect(nextPath);
}

export async function logoutAction() {
  if (hasSupabaseAuthEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
