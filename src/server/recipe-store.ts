import type { Recipe as DbRecipe, RecipeItem as DbRecipeItem } from "@/generated/prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { recipes as fallbackRecipes } from "@/lib/recipes";
import {
  cloneRecipe,
  normalizeItem,
  normalizeRecipe,
  recipeStatusOptions,
  recipeUnitOptions,
} from "@/lib/recipe-utils";
import type { Recipe, RecipeCategory, RecipeStatus, RecipeUnit } from "@/types/recipe";

const validCategories = new Set<RecipeCategory>([
  "Bowl",
  "Sallad",
  "Burger",
  "Taco",
  "Bao",
  "Sides",
  "Sås",
]);

const validStatuses = new Set<RecipeStatus>(recipeStatusOptions);
const validUnits = new Set<RecipeUnit>(
  recipeUnitOptions.map((option) => option.value),
);

type DatabaseRecipe = DbRecipe & {
  items: DbRecipeItem[];
};

function isValidCategory(value: string): value is RecipeCategory {
  return validCategories.has(value as RecipeCategory);
}

function isValidStatus(value: string): value is RecipeStatus {
  return validStatuses.has(value as RecipeStatus);
}

function isValidUnit(value: string): value is RecipeUnit {
  return validUnits.has(value as RecipeUnit);
}

function mapRecipe(record: DatabaseRecipe): Recipe {
  return {
    id: record.id,
    title: record.title,
    category: isValidCategory(record.category) ? record.category : "Bowl",
    status: isValidStatus(record.status) ? record.status : "Utkast",
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
          unit: isValidUnit(item.unit) ? item.unit : "g",
          isEmphasis: item.isEmphasis,
          isSpacer: item.isSpacer,
        }),
      ),
  };
}

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
}

export async function getRecipesForApp() {
  if (!hasDatabaseConfig()) {
    return fallbackRecipes;
  }

  try {
    const databaseRecipes = await getPrismaClient().recipe.findMany({
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    if (databaseRecipes.length === 0) {
      return fallbackRecipes;
    }

    return databaseRecipes.map(mapRecipe);
  } catch (error) {
    console.error("Failed to load recipes from Supabase. Falling back to local data.", error);
    return fallbackRecipes;
  }
}

export async function upsertRecipeForApp(input: Recipe) {
  const normalized = normalizeRecipe(cloneRecipe(input), input.status);

  const record = await getPrismaClient().recipe.upsert({
    where: {
      id: normalized.id,
    },
    create: {
      id: normalized.id,
      title: normalized.title,
      category: normalized.category,
      status: normalized.status,
      servings: normalized.servings,
      updatedLabel: normalized.updatedLabel,
      allergens: normalized.allergens,
      notes: normalized.notes,
      summary: normalized.summary,
      intro: normalized.intro,
      items: {
        create: normalized.items.map((item, index) => ({
          sortOrder: index,
          info: item.info,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          isEmphasis: item.isEmphasis,
          isSpacer: item.isSpacer,
        })),
      },
    },
    update: {
      title: normalized.title,
      category: normalized.category,
      status: normalized.status,
      servings: normalized.servings,
      updatedLabel: normalized.updatedLabel,
      allergens: normalized.allergens,
      notes: normalized.notes,
      summary: normalized.summary,
      intro: normalized.intro,
      items: {
        deleteMany: {},
        create: normalized.items.map((item, index) => ({
          sortOrder: index,
          info: item.info,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          isEmphasis: item.isEmphasis,
          isSpacer: item.isSpacer,
        })),
      },
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  return mapRecipe(record);
}

export async function deleteRecipeForApp(recipeId: string) {
  await getPrismaClient().recipe.delete({
    where: {
      id: recipeId,
    },
  });
}
