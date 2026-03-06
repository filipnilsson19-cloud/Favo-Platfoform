import { redirect } from "next/navigation";

import { FavoShell } from "@/components/favo-shell";
import { RecipeBook } from "@/components/recipe-book";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser, getLocalPreviewUser } from "@/server/auth-store";
import { getRecipesForApp } from "@/server/recipe-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authEnabled = hasSupabaseAuthEnv();
  const appUser = authEnabled ? await getCurrentAppUser() : getLocalPreviewUser();

  if (authEnabled && !appUser) {
    redirect("/login");
  }

  const recipes = await getRecipesForApp();
  const resolvedUser = appUser ?? getLocalPreviewUser();

  return (
    <FavoShell authEnabled={authEnabled} user={resolvedUser}>
      <RecipeBook recipes={recipes} canManage={resolvedUser.role === "admin"} />
    </FavoShell>
  );
}
