import { PrepBook } from "@/components/prep-book";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser, getLocalPreviewUser } from "@/server/auth-store";
import { getPrepCategoriesForApp, getPrepRecipesForApp } from "@/server/prep-store";

export default async function PrepPage() {
  const authEnabled = hasSupabaseAuthEnv();
  const canUseLocalPreview = !authEnabled && process.env.NODE_ENV !== "production";
  const appUser = authEnabled
    ? await getCurrentAppUser()
    : canUseLocalPreview
      ? getLocalPreviewUser()
      : null;

  const [recipes, categories] = await Promise.all([
    getPrepRecipesForApp(),
    getPrepCategoriesForApp(),
  ]);

  return (
    <PrepBook
      canManage={appUser?.role === "admin"}
      recipes={recipes}
      categories={categories}
    />
  );
}
