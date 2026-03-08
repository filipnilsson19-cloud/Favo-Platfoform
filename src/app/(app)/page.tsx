import { RecipeBook } from "@/components/recipe-book";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser, getLocalPreviewUser } from "@/server/auth-store";
import { getCategoriesForApp, getRecipesForApp } from "@/server/recipe-store";

export default async function HomePage() {
  const authEnabled = hasSupabaseAuthEnv();
  const canUseLocalPreview = !authEnabled && process.env.NODE_ENV !== "production";
  const appUser = authEnabled
    ? await getCurrentAppUser()
    : canUseLocalPreview
      ? getLocalPreviewUser()
      : null;

  const [recipes, categories] = await Promise.all([
    getRecipesForApp(),
    getCategoriesForApp(),
  ]);

  return (
    <RecipeBook
      categories={categories}
      recipes={recipes}
      canManage={appUser?.role === "admin"}
    />
  );
}
