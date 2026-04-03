"use server";

import { redirect } from "next/navigation";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginWithPassword, sanitizeNextPath } from "@/server/login-store";

export async function loginAction(formData: FormData) {
  const result = await loginWithPassword({
    nextPath: sanitizeNextPath(formData.get("next")?.toString() ?? "/"),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  redirect(result.redirectTo);
}

export async function logoutAction() {
  if (hasSupabaseAuthEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
