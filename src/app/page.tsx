import { redirect } from "next/navigation";

import { FavoShell } from "@/components/favo-shell";
import { RecipeBook } from "@/components/recipe-book";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser, getLocalPreviewUser } from "@/server/auth-store";
import { getCategoriesForApp, getRecipesForApp } from "@/server/recipe-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authEnabled = hasSupabaseAuthEnv();
  const canUseLocalPreview = !authEnabled && process.env.NODE_ENV !== "production";
  const appUser = authEnabled
    ? await getCurrentAppUser()
    : canUseLocalPreview
      ? getLocalPreviewUser()
      : null;

  if (!appUser) {
    redirect("/login");
  }

  const [recipes, categories] = await Promise.all([
    getRecipesForApp(),
    getCategoriesForApp(),
  ]);
  const resolvedUser = appUser;

  return (
    <FavoShell authEnabled={authEnabled} user={resolvedUser}>
      <RecipeBook
        categories={categories}
        recipes={recipes}
        canManage={resolvedUser.role === "admin"}
      />
    </FavoShell>
  );
}
