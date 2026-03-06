import { FavoShell } from "@/components/favo-shell";
import { RecipeBook } from "@/components/recipe-book";
import { recipes } from "@/lib/recipes";

export default function Home() {
  return (
    <FavoShell>
      <RecipeBook recipes={recipes} />
    </FavoShell>
  );
}
