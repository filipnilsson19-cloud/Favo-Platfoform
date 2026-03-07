import type { Recipe as DbRecipe, RecipeItem as DbRecipeItem } from "@/generated/prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { recipes as fallbackRecipes } from "@/lib/recipes";
import {
  cloneRecipe,
  normalizeItem,
  normalizeRecipe,
  recipeCategories,
  recipeStatusOptions,
  recipeUnitOptions,
  sortRecipeCategories,
} from "@/lib/recipe-utils";
import type { Recipe, RecipeStatus, RecipeUnit } from "@/types/recipe";
import type { AppCategory } from "@/types/category";

const validStatuses = new Set<RecipeStatus>(recipeStatusOptions);
const validUnits = new Set<RecipeUnit>(
  recipeUnitOptions.map((option) => option.value),
);

type DatabaseRecipe = DbRecipe & {
  items: DbRecipeItem[];
};

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
    category: record.category || recipeCategories[0],
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

async function getStoredCategories() {
  const records = await getPrismaClient().category.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return records.map((record) => record.name);
}

export async function getCategoryEntriesForApp(): Promise<AppCategory[]> {
  if (!hasDatabaseConfig()) {
    return recipeCategories.map((name, index) => ({
      id: `local-${index}`,
      name,
      isActive: true,
      recipeCount: fallbackRecipes.filter((recipe) => recipe.category === name).length,
    }));
  }

  const prisma = getPrismaClient();
  const [records, usage] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.recipe.groupBy({
      by: ["category"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const usageMap = new Map(
    usage.map((entry) => [entry.category, entry._count._all]),
  );

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    isActive: record.isActive,
    recipeCount: usageMap.get(record.name) ?? 0,
  }));
}

async function syncCategoriesFromRecipes() {
  const prisma = getPrismaClient();
  const recipeCategoriesInDb = await prisma.recipe.findMany({
    select: {
      category: true,
    },
    distinct: ["category"],
    orderBy: {
      category: "asc",
    },
  });

  const categoryNames = sortRecipeCategories(
    recipeCategoriesInDb.map((record) => record.category),
  );

  if (categoryNames.length === 0) {
    return recipeCategories;
  }

  await prisma.category.createMany({
    data: categoryNames.map((name, index) => ({
      name,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });

  return categoryNames;
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

export async function getCategoriesForApp() {
  if (!hasDatabaseConfig()) {
    return recipeCategories;
  }

  try {
    const storedCategories = await getStoredCategories();

    if (storedCategories.length > 0) {
      return storedCategories;
    }

    return await syncCategoriesFromRecipes();
  } catch (error) {
    console.error(
      "Failed to load categories from Supabase. Falling back to defaults.",
      error,
    );
    return recipeCategories;
  }
}

export async function createCategoryForApp(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const prisma = getPrismaClient();
  const existing = await prisma.category.findUnique({
    where: {
      name: normalizedName,
    },
  });

  if (existing) {
    if (!existing.isActive) {
      await prisma.category.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: true,
        },
      });
    }

    return existing.name;
  }

  const count = await prisma.category.count();

  const created = await prisma.category.create({
    data: {
      name: normalizedName,
      sortOrder: count,
    },
  });

  return created.name;
}

export async function renameCategoryForApp(name: string, nextName: string) {
  const currentName = name.trim();
  const normalizedNextName = nextName.trim();

  if (!currentName || !normalizedNextName) {
    throw new Error("Both current and next category names are required.");
  }

  if (currentName === normalizedNextName) {
    return normalizedNextName;
  }

  const prisma = getPrismaClient();
  const existingTarget = await prisma.category.findUnique({
    where: {
      name: normalizedNextName,
    },
  });

  if (existingTarget) {
    throw new Error("A category with that name already exists.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.category.update({
      where: {
        name: currentName,
      },
      data: {
        name: normalizedNextName,
      },
    });

    await tx.recipe.updateMany({
      where: {
        category: currentName,
      },
      data: {
        category: normalizedNextName,
      },
    });
  });

  return normalizedNextName;
}

export async function setCategoryActiveStateForApp(
  name: string,
  isActive: boolean,
) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  await getPrismaClient().category.update({
    where: {
      name: normalizedName,
    },
    data: {
      isActive,
    },
  });

  return normalizedName;
}

export async function upsertRecipeForApp(input: Recipe) {
  const normalized = normalizeRecipe(cloneRecipe(input), input.status);
  await createCategoryForApp(normalized.category);

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
