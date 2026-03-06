import type {
  Recipe,
  RecipeCategory,
  RecipeItem,
  RecipeUnit,
  RecipeStatus,
} from "../types/recipe";

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

export const recipeStatusOptions: RecipeStatus[] = [
  "Publicerad",
  "Utkast",
  "Inaktiv",
];

export const recipeUnitOptions: Array<{ value: RecipeUnit; label: string }> = [
  { value: "g", label: "Gram" },
  { value: "kg", label: "Kilogram" },
  { value: "ml", label: "Milliliter" },
  { value: "cl", label: "Centiliter" },
  { value: "dl", label: "Deciliter" },
  { value: "l", label: "Liter" },
  { value: "st", label: "Styck" },
  { value: "tsk", label: "Tesked" },
  { value: "msk", label: "Matsked" },
];

const recipeUnitValues = recipeUnitOptions.map((option) => option.value);
const recipeUnitPattern = new RegExp(
  `^(.+?)\\s*(${recipeUnitValues.join("|")})$`,
  "i",
);

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

function normalizeUnit(value: string | undefined | null): RecipeUnit {
  const candidate = String(value ?? "").trim().toLowerCase() as RecipeUnit;
  return recipeUnitValues.includes(candidate) ? candidate : "g";
}

function splitAmountAndUnit(
  amount: string | undefined,
  unit: RecipeUnit | undefined,
): Pick<RecipeItem, "amount" | "unit"> {
  const rawAmount = String(amount ?? "").trim();
  if (unit) {
    return {
      amount: rawAmount.replace(recipeUnitPattern, "$1").trim(),
      unit: normalizeUnit(unit),
    };
  }

  const match = rawAmount.match(recipeUnitPattern);
  if (match) {
    return {
      amount: match[1].trim(),
      unit: normalizeUnit(match[2]),
    };
  }

  return {
    amount: rawAmount,
    unit: "g",
  };
}

export function normalizeItem(item: Partial<RecipeItem> = {}): RecipeItem {
  const amountWithUnit = splitAmountAndUnit(item.amount, item.unit);

  return {
    info: String(item.info ?? "").trim(),
    name: String(item.name ?? "").trim(),
    amount: amountWithUnit.amount,
    unit: amountWithUnit.unit,
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

function parseNumericAmount(amount: string) {
  const value = amount.trim().replace(",", ".");
  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return null;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatRecipeItemAmount(item: Pick<RecipeItem, "amount" | "unit">) {
  return item.amount ? `${item.amount} ${item.unit}` : "";
}

export function computeAmountSummary(items: Array<Partial<RecipeItem>>) {
  const cleaned = contentItems(items);
  if (cleaned.length === 0) {
    return "0 g";
  }

  const parsedValues = cleaned.map((item) => ({
    value: parseNumericAmount(item.amount),
    unit: normalizeUnit(item.unit),
  }));

  if (parsedValues.some((entry) => entry.value === null)) {
    return "Blandade mått";
  }

  const units = new Set(parsedValues.map((entry) => entry.unit));

  if ([...units].every((unit) => unit === "g" || unit === "kg")) {
    const totalGrams = parsedValues.reduce((sum, entry) => {
      const value = Number(entry.value);
      return sum + value * (entry.unit === "kg" ? 1000 : 1);
    }, 0);

    return totalGrams >= 1000
      ? `${formatNumber(totalGrams / 1000)} kg`
      : `${formatNumber(totalGrams)} g`;
  }

  if ([...units].every((unit) => unit === "ml" || unit === "cl" || unit === "dl" || unit === "l")) {
    const factorMap: Record<RecipeUnit, number> = {
      ml: 1,
      cl: 10,
      dl: 100,
      l: 1000,
      g: 0,
      kg: 0,
      st: 0,
      tsk: 0,
      msk: 0,
    };

    const totalMl = parsedValues.reduce((sum, entry) => {
      return sum + Number(entry.value) * factorMap[entry.unit];
    }, 0);

    if (totalMl >= 1000) {
      return `${formatNumber(totalMl / 1000)} l`;
    }

    if (totalMl >= 100) {
      return `${formatNumber(totalMl / 100)} dl`;
    }

    return `${formatNumber(totalMl)} ml`;
  }

  if ([...units].every((unit) => unit === "st")) {
    const totalCount = parsedValues.reduce((sum, entry) => sum + Number(entry.value), 0);
    return `${formatNumber(totalCount)} st`;
  }

  if ([...units].every((unit) => unit === "tsk" || unit === "msk")) {
    const totalTsp = parsedValues.reduce((sum, entry) => {
      return sum + Number(entry.value) * (entry.unit === "msk" ? 3 : 1);
    }, 0);

    return totalTsp >= 3 && totalTsp % 3 === 0
      ? `${formatNumber(totalTsp / 3)} msk`
      : `${formatNumber(totalTsp)} tsk`;
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
        unit: "g",
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
    updatedLabel:
      status === "Publicerad"
        ? "Nu"
        : status === "Inaktiv"
          ? "Inaktivt utkast"
          : "Utkast sparat",
    summary: buildRecipeSummary(items),
    intro: buildRecipeIntro({
      category: recipe.category,
      items,
    }),
    items,
  };
}
