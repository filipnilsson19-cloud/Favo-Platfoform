import { unstable_cache } from "next/cache";

import type {
  CostMenuRecipe,
  CostingPayload,
  CostPrepRecipe,
  RawIngredient,
} from "@/types/costing";
import type { PrepRecipe } from "@/types/prep";
import type { Recipe, RecipeUnit } from "@/types/recipe";
import { getPrismaClient } from "@/lib/prisma";
import { normalizeItem, normalizeRecipe } from "@/lib/recipe-utils";
import { blankPrepRecipe } from "@/lib/prep-utils";
import { getPrepRecipesForApp } from "./prep-store";
import { getRecipesForApp } from "./recipe-store";

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRawIngredient(record: {
  id: string;
  name: string;
  supplier: string;
  purchasePrice: unknown;
  packageType: string;
  packageCount: unknown;
  purchaseAmount: unknown;
  purchaseUnit: string;
  yieldPercent: unknown;
  notes: string;
  isActive: boolean;
}): RawIngredient {
  return {
    id: record.id,
    name: record.name,
    supplier: record.supplier,
    purchasePrice: toNumber(record.purchasePrice),
    packageType: record.packageType,
    packageCount: toNumber(record.packageCount, 1),
    purchaseAmount: toNumber(record.purchaseAmount, 1),
    purchaseUnit: record.purchaseUnit as RawIngredient["purchaseUnit"],
    yieldPercent: toNumber(record.yieldPercent, 100),
    notes: record.notes,
    isActive: record.isActive,
  };
}

function mapPrepRecipe(record: {
  id: string;
  title: string;
  category: string;
  status: string;
  storage: string;
  shelfLifeDays: number;
  defaultYield: string;
  yieldUnit: string;
  allergens: string;
  notes: string;
  ingredients: { info: string; name: string; amount: string; unit: string; sortOrder: number }[];
  steps: { description: string; sortOrder: number }[];
  ingredientLinks: { ingredientIndex: number; rawIngredientId: string | null }[];
}): CostPrepRecipe {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    status: (record.status as PrepRecipe["status"]) || "Utkast",
    storage: record.storage || blankPrepRecipe().storage,
    shelfLifeDays: record.shelfLifeDays,
    defaultYield: record.defaultYield,
    yieldUnit: record.yieldUnit,
    allergens: record.allergens,
    notes: record.notes,
    ingredients: record.ingredients
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((ingredient) => ({
        info: ingredient.info,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
      })),
    steps: record.steps
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((step) => ({ description: step.description })),
    ingredientLinks: record.ingredientLinks.map((link) => ({
      ingredientIndex: link.ingredientIndex,
      rawIngredientId: link.rawIngredientId,
    })),
  };
}

function mapMenuRecipe(record: {
  id: string;
  title: string;
  category: string;
  status: string;
  servings: number;
  updatedLabel: string;
  allergens: string;
  notes: string;
  summary: string;
  intro: string;
  items: {
    info: string;
    name: string;
    amount: string;
    unit: string;
    isEmphasis: boolean;
    isSpacer: boolean;
    sortOrder: number;
  }[];
  costProfile: { sellingPriceInclVat: unknown; vatRate: unknown } | null;
  costLinks: {
    itemIndex: number;
    sourceKind: "raw" | "prep";
    rawIngredientId: string | null;
    prepRecipeId: string | null;
  }[];
}): CostMenuRecipe {
  const recipe: Recipe = normalizeRecipe(
    {
      id: record.id,
      title: record.title,
      category: record.category,
      status: record.status as Recipe["status"],
      servings: record.servings,
      updatedLabel: record.updatedLabel,
      allergens: record.allergens,
      notes: record.notes,
      summary: record.summary,
      intro: record.intro,
      items: record.items
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) =>
          normalizeItem({
            info: item.info,
            name: item.name,
            amount: item.amount,
            unit: item.unit as RecipeUnit,
            isEmphasis: item.isEmphasis,
            isSpacer: item.isSpacer,
          }),
        ),
    },
    record.status as Recipe["status"],
  );

  return {
    ...recipe,
    itemLinks: record.costLinks.map((link) => ({
      itemIndex: link.itemIndex,
      sourceKind: link.sourceKind,
      rawIngredientId: link.rawIngredientId,
      prepRecipeId: link.prepRecipeId,
    })),
    costProfile: {
      recipeId: record.id,
      sellingPriceInclVat: toNumber(record.costProfile?.sellingPriceInclVat),
      vatRate: toNumber(record.costProfile?.vatRate, 12),
    },
  };
}

const fetchCostingPayloadFromDb = unstable_cache(
  async (): Promise<CostingPayload> => {
    const prisma = getPrismaClient();
    const [rawIngredients, prepRecipes, menuRecipes] = await Promise.all([
      prisma.rawIngredient.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.prepRecipe.findMany({
        include: {
          ingredients: true,
          steps: true,
          ingredientLinks: true,
        },
        orderBy: [{ category: "asc" }, { title: "asc" }],
      }),
      prisma.recipe.findMany({
        include: {
          items: true,
          costProfile: true,
          costLinks: true,
        },
        orderBy: [{ category: "asc" }, { title: "asc" }],
      }),
    ]);

    return {
      rawIngredients: rawIngredients.map(mapRawIngredient),
      prepRecipes: prepRecipes.map(mapPrepRecipe),
      menuRecipes: menuRecipes.map(mapMenuRecipe),
    };
  },
  ["costing-payload"],
  { revalidate: 30, tags: ["costing", "recipes", "prep-recipes"] },
);

export async function getCostingPayloadForApp(): Promise<CostingPayload> {
  if (!hasDatabaseConfig()) {
    return {
      rawIngredients: [],
      prepRecipes: (await getPrepRecipesForApp()).map((recipe) => ({ ...recipe, ingredientLinks: [] })),
      menuRecipes: (await getRecipesForApp()).map((recipe) => ({
        ...recipe,
        itemLinks: [],
        costProfile: { recipeId: recipe.id, sellingPriceInclVat: 0, vatRate: 12 },
      })),
    };
  }

  return fetchCostingPayloadFromDb();
}

export async function upsertRawIngredientForApp(input: RawIngredient): Promise<RawIngredient> {
  const prisma = getPrismaClient();
  const data = {
    name: input.name.trim(),
    supplier: input.supplier.trim(),
    purchasePrice: input.purchasePrice,
    packageType: input.packageType.trim(),
    packageCount: input.packageCount,
    purchaseAmount: input.purchaseAmount,
    purchaseUnit: input.purchaseUnit,
    yieldPercent: input.yieldPercent,
    notes: input.notes.trim(),
    isActive: input.isActive,
  };

  const record = input.id
    ? await prisma.rawIngredient.update({
        where: { id: input.id },
        data,
      })
    : await prisma.rawIngredient.create({
        data,
      });

  return mapRawIngredient(record);
}

export async function deleteRawIngredientForApp(id: string) {
  await getPrismaClient().rawIngredient.delete({ where: { id } });
}

export async function upsertPrepIngredientCostLinkForApp(input: {
  prepRecipeId: string;
  ingredientIndex: number;
  rawIngredientId: string | null;
}) {
  const prisma = getPrismaClient();
  return prisma.prepIngredientCostLink.upsert({
    where: {
      prepRecipeId_ingredientIndex: {
        prepRecipeId: input.prepRecipeId,
        ingredientIndex: input.ingredientIndex,
      },
    },
    create: input,
    update: {
      rawIngredientId: input.rawIngredientId,
    },
  });
}

export async function upsertRecipeItemCostLinkForApp(input: {
  recipeId: string;
  itemIndex: number;
  sourceKind: "raw" | "prep";
  rawIngredientId: string | null;
  prepRecipeId: string | null;
}) {
  const prisma = getPrismaClient();
  return prisma.recipeItemCostLink.upsert({
    where: {
      recipeId_itemIndex: {
        recipeId: input.recipeId,
        itemIndex: input.itemIndex,
      },
    },
    create: input,
    update: {
      sourceKind: input.sourceKind,
      rawIngredientId: input.rawIngredientId,
      prepRecipeId: input.prepRecipeId,
    },
  });
}

export async function upsertRecipeCostProfileForApp(input: {
  recipeId: string;
  sellingPriceInclVat: number;
  vatRate: number;
}) {
  const prisma = getPrismaClient();
  return prisma.recipeCostProfile.upsert({
    where: { recipeId: input.recipeId },
    create: input,
    update: {
      sellingPriceInclVat: input.sellingPriceInclVat,
      vatRate: input.vatRate,
    },
  });
}
