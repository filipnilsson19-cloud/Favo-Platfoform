import { RecipeBook } from "@/components/recipe-book";
import { getCategoriesForApp, getRecipesForApp } from "@/server/recipe-store";

export default async function HomePage() {
  const [recipes, categories] = await Promise.all([
    getRecipesForApp(),
    getCategoriesForApp(),
  ]);

  return <RecipeBook categories={categories} recipes={recipes} />;
}
