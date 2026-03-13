import { PrepBook } from "@/components/prep-book";
import {
  getPrepCategoriesForApp,
  getPrepRecipesForApp,
  getPrepStorageOptionsForApp,
  getPrepUnitOptionsForApp,
} from "@/server/prep-store";

export default async function PrepPage() {
  const [recipes, categories, unitOptions, storageOptions] = await Promise.all([
    getPrepRecipesForApp(),
    getPrepCategoriesForApp(),
    getPrepUnitOptionsForApp(),
    getPrepStorageOptionsForApp(),
  ]);

  return (
    <PrepBook
      recipes={recipes}
      categories={categories}
      unitOptions={unitOptions}
      storageOptions={storageOptions}
    />
  );
}
