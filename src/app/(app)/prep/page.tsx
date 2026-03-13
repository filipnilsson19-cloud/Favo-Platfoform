import { PrepBook } from "@/components/prep-book";
import { getPrepCategoriesForApp, getPrepRecipesForApp } from "@/server/prep-store";

export default async function PrepPage() {
  const [recipes, categories] = await Promise.all([
    getPrepRecipesForApp(),
    getPrepCategoriesForApp(),
  ]);

  return <PrepBook recipes={recipes} categories={categories} />;
}
