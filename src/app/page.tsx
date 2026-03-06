import { FavoShell } from "@/components/favo-shell";
import { RecipeBook } from "@/components/recipe-book";
import { getRecipesForApp } from "@/server/recipe-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recipes = await getRecipesForApp();

  return (
    <FavoShell>
      <RecipeBook recipes={recipes} />
    </FavoShell>
  );
}
