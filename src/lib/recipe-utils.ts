import type {
  Recipe,
  RecipeCategory,
  RecipeItem,
  RecipeStatus,
} from "@/types/recipe";

type RecipeSeed = {
  title: string;
  category: RecipeCategory;
  items: Array<Partial<RecipeItem>>;
  notes?: string;
  allergens?: string;
  servings?: number;
  status?: Recipe["status"];
  updatedLabel?: string;
};

export const categoryToneMap: Record<RecipeCategory | "Alla", string> = {
  Alla: "all",
  Bowl: "bowl",
  Sallad: "salad",
  Burger: "burger",
  Taco: "taco",
  Bao: "bao",
  Sides: "sides",
  Sås: "sauce",
};

export const recipeCategories: RecipeCategory[] = [
  "Bowl",
  "Sallad",
  "Burger",
  "Taco",
  "Bao",
  "Sides",
  "Sås",
];

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `recipe-${Date.now()}`
  );
}

export function normalizeItem(item: Partial<RecipeItem> = {}): RecipeItem {
  return {
    info: String(item.info ?? "").trim(),
    name: String(item.name ?? "").trim(),
    amount: String(item.amount ?? "").trim(),
    isEmphasis: Boolean(item.isEmphasis),
    isSpacer: Boolean(item.isSpacer),
  };
}

export function filledItems(items: Array<Partial<RecipeItem>>) {
  return items
    .map(normalizeItem)
    .filter((item) => item.isSpacer || item.info || item.name || item.amount);
}

export function contentItems(items: Array<Partial<RecipeItem>>) {
  return filledItems(items).filter((item) => !item.isSpacer);
}

function parseGramAmount(amount: string) {
  const value = amount.trim().replace(",", ".");
  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (/^\d+(\.\d+)?\s*g$/i.test(value)) {
    return Number.parseFloat(value);
  }

  return null;
}

export function computeAmountSummary(items: Array<Partial<RecipeItem>>) {
  const cleaned = contentItems(items);
  if (cleaned.length === 0) {
    return "0 g";
  }

  const gramValues = cleaned.map((item) => parseGramAmount(item.amount));
  if (gramValues.every((value) => value !== null)) {
    const total = gramValues.reduce((sum, value) => sum + Number(value), 0);
    return `${total} g`;
  }

  return "Blandade mått";
}

export function buildRecipeSummary(items: Array<Partial<RecipeItem>>) {
  const names = contentItems(items)
    .map((item) => item.name)
    .filter(Boolean)
    .slice(0, 6);

  if (names.length === 0) {
    return "Inga komponenter ännu.";
  }

  return `${names.join(", ")}.`;
}

export function buildRecipeIntro(recipe: Pick<Recipe, "category" | "items">) {
  const count = contentItems(recipe.items).length;
  return `Snabb receptvy för ${recipe.category.toLowerCase()} med ${count} komponenter.`;
}

export function createRecipe(seed: RecipeSeed): Recipe {
  const items = filledItems(seed.items);

  return {
    id: slugify(seed.title),
    title: seed.title,
    category: seed.category,
    status: seed.status ?? "Publicerad",
    servings: seed.servings ?? 1,
    updatedLabel: seed.updatedLabel ?? "Importerad",
    allergens: seed.allergens ?? "",
    notes: seed.notes ?? "",
    summary: buildRecipeSummary(items),
    intro: buildRecipeIntro({
      category: seed.category,
      items,
    }),
    items,
  };
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    items: recipe.items.map((item) => ({ ...item })),
  };
}

export function blankRecipe(): Recipe {
  return {
    id: "",
    title: "",
    category: "Bowl",
    status: "Utkast",
    servings: 1,
    updatedLabel: "Inte sparad ännu",
    allergens: "",
    notes: "",
    summary: "",
    intro: "",
    items: [
      {
        info: "",
        name: "",
        amount: "",
        isEmphasis: false,
        isSpacer: false,
      },
    ],
  };
}

export function normalizeRecipe(recipe: Recipe, statusOverride?: RecipeStatus): Recipe {
  const items = filledItems(recipe.items);
  const title = recipe.title.trim() || "Nytt recept";
  const status = statusOverride ?? recipe.status ?? "Utkast";
  const servings = Math.max(1, Number(recipe.servings) || 1);

  return {
    ...recipe,
    id: recipe.id || slugify(title),
    title,
    status,
    servings,
    updatedLabel: status === "Publicerad" ? "Nu" : "Utkast sparat",
    summary: buildRecipeSummary(items),
    intro: buildRecipeIntro({
      category: recipe.category,
      items,
    }),
    items,
  };
}
