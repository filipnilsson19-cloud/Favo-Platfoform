import { unstable_cache } from "next/cache";

import { getPrismaClient } from "@/lib/prisma";
import { prepStatusOptions } from "@/lib/prep-utils";
import type { AppPrepCategory, PrepBatch, PrepRecipe, PrepStatus } from "@/types/prep";

type DbPrepRecipe = {
  id: string;
  title: string;
  category: string;
  status: string;
  shelfLifeDays: number;
  defaultYield: string;
  yieldUnit: string;
  allergens: string;
  notes: string;
  ingredients: { info: string; name: string; amount: string; unit: string; sortOrder: number }[];
  steps: { description: string; sortOrder: number }[];
};

type DbPrepBatch = {
  id: string;
  prepRecipeId: string;
  madeAt: Date;
  bestBefore: Date;
  batchYield: string;
  notes: string;
  madeBy: { displayName: string; email: string };
};

const validStatuses = new Set<PrepStatus>(prepStatusOptions);

function isValidStatus(value: string): value is PrepStatus {
  return validStatuses.has(value as PrepStatus);
}

function mapPrepRecipe(record: DbPrepRecipe): PrepRecipe {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    status: isValidStatus(record.status) ? record.status : "Utkast",
    shelfLifeDays: record.shelfLifeDays,
    defaultYield: record.defaultYield,
    yieldUnit: record.yieldUnit,
    allergens: record.allergens,
    notes: record.notes,
    ingredients: record.ingredients
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ info, name, amount, unit }) => ({ info, name, amount, unit })),
    steps: record.steps
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ description }) => ({ description })),
  };
}

function mapPrepBatch(record: DbPrepBatch): PrepBatch {
  return {
    id: record.id,
    prepRecipeId: record.prepRecipeId,
    madeAt: record.madeAt.toISOString(),
    bestBefore: record.bestBefore.toISOString(),
    batchYield: record.batchYield,
    notes: record.notes,
    madeByName: record.madeBy.displayName || record.madeBy.email,
  };
}

const fetchPrepRecipesFromDb = unstable_cache(
  async () => {
    return getPrismaClient().prepRecipe.findMany({
      include: { ingredients: true, steps: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
  },
  ["prep-recipes"],
  { revalidate: 30, tags: ["prep-recipes"] },
);

export async function getPrepRecipesForApp(): Promise<PrepRecipe[]> {
  const records = await fetchPrepRecipesFromDb();
  return records.map(mapPrepRecipe);
}

const fetchPrepCategoriesFromDb = unstable_cache(
  async () => {
    const prisma = getPrismaClient();
    const [categories, recipeCategories] = await Promise.all([
      prisma.prepCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.prepRecipe.findMany({
        select: { category: true },
        distinct: ["category"],
      }),
    ]);
    return { categories, recipeCategories };
  },
  ["prep-categories"],
  { revalidate: 30, tags: ["prep-recipes"] },
);

export async function getPrepCategoriesForApp(): Promise<string[]> {
  const { categories, recipeCategories } = await fetchPrepCategoriesFromDb();
  const names = new Set([
    ...categories.map((c) => c.name),
    ...recipeCategories.map((r) => r.category),
  ]);
  return [...names].sort();
}

export async function getPrepCategoryEntriesForApp(): Promise<AppPrepCategory[]> {
  const prisma = getPrismaClient();
  const [records, usage] = await Promise.all([
    prisma.prepCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.prepRecipe.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
  ]);

  const usageMap = new Map(usage.map((e) => [e.category, e._count._all]));
  const knownNames = new Set(records.map((r) => r.name));

  // Include recipe categories that have no PrepCategory entry (e.g. created via seed scripts)
  const orphaned: AppPrepCategory[] = [];
  for (const [name, count] of usageMap) {
    if (!knownNames.has(name)) {
      orphaned.push({ id: `orphan:${name}`, name, isActive: true, recipeCount: count });
    }
  }

  return [
    ...records.map((record) => ({
      id: record.id,
      name: record.name,
      isActive: record.isActive,
      recipeCount: usageMap.get(record.name) ?? 0,
    })),
    ...orphaned,
  ].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export async function createPrepCategoryForApp(name: string): Promise<string> {
  const normalized = name.trim();
  if (!normalized) throw new Error("Category name is required.");

  const existing = await getPrismaClient().prepCategory.findUnique({ where: { name: normalized } });
  if (existing) {
    if (!existing.isActive) {
      await getPrismaClient().prepCategory.update({ where: { id: existing.id }, data: { isActive: true } });
    }
    return existing.name;
  }

  const count = await getPrismaClient().prepCategory.count();
  const created = await getPrismaClient().prepCategory.create({
    data: { name: normalized, sortOrder: count },
  });
  return created.name;
}

export async function renamePrepCategoryForApp(name: string, nextName: string): Promise<string> {
  const current = name.trim();
  const next = nextName.trim();
  if (!current || !next) throw new Error("Both names are required.");
  if (current === next) return next;

  const conflicting = await getPrismaClient().prepCategory.findUnique({ where: { name: next } });
  if (conflicting) throw new Error("A category with that name already exists.");

  await getPrismaClient().$transaction(async (tx) => {
    const currentEntry = await tx.prepCategory.findUnique({ where: { name: current } });
    if (currentEntry) {
      await tx.prepCategory.update({ where: { name: current }, data: { name: next } });
    } else {
      // Orphaned category — create a proper entry with the new name
      const count = await tx.prepCategory.count();
      await tx.prepCategory.create({ data: { name: next, sortOrder: count } });
    }
    await tx.prepRecipe.updateMany({ where: { category: current }, data: { category: next } });
  });

  return next;
}

export async function setPrepCategoryActiveForApp(name: string, isActive: boolean): Promise<string> {
  const normalized = name.trim();
  if (!normalized) throw new Error("Category name is required.");
  const count = await getPrismaClient().prepCategory.count();
  await getPrismaClient().prepCategory.upsert({
    where: { name: normalized },
    update: { isActive },
    create: { name: normalized, isActive, sortOrder: count },
  });
  return normalized;
}

export async function upsertPrepRecipeForApp(input: PrepRecipe): Promise<PrepRecipe> {
  await createPrepCategoryForApp(input.category);

  const prisma = getPrismaClient();
  const data = {
    title: input.title.trim(),
    category: input.category,
    status: isValidStatus(input.status) ? input.status : "Utkast",
    shelfLifeDays: Math.max(1, input.shelfLifeDays),
    defaultYield: input.defaultYield,
    yieldUnit: input.yieldUnit,
    allergens: input.allergens,
    notes: input.notes,
  };

  const ingredientsCreate = input.ingredients
    .filter((i) => i.name.trim())
    .map((i, idx) => ({
      sortOrder: idx,
      info: i.info,
      name: i.name,
      amount: i.amount,
      unit: i.unit,
    }));

  const stepsCreate = input.steps
    .filter((s) => s.description.trim())
    .map((s, idx) => ({ sortOrder: idx, description: s.description }));

  let record;

  if (input.id) {
    record = await prisma.prepRecipe.update({
      where: { id: input.id },
      data: {
        ...data,
        ingredients: { deleteMany: {}, create: ingredientsCreate },
        steps: { deleteMany: {}, create: stepsCreate },
      },
      include: { ingredients: true, steps: true },
    });
  } else {
    record = await prisma.prepRecipe.create({
      data: {
        ...data,
        ingredients: { create: ingredientsCreate },
        steps: { create: stepsCreate },
      },
      include: { ingredients: true, steps: true },
    });
  }

  return mapPrepRecipe(record);
}

export async function deletePrepRecipeForApp(id: string): Promise<void> {
  await getPrismaClient().prepRecipe.delete({ where: { id } });
}

export async function getRecentBatchesForApp(prepRecipeId: string, limit = 5): Promise<PrepBatch[]> {
  const records = await getPrismaClient().prepBatch.findMany({
    where: { prepRecipeId },
    include: { madeBy: { select: { displayName: true, email: true } } },
    orderBy: { madeAt: "desc" },
    take: limit,
  });

  return records.map(mapPrepBatch);
}

export async function logPrepBatchForApp(input: {
  prepRecipeId: string;
  madeById: string;
  batchYield: string;
  bestBefore: Date;
  notes: string;
}): Promise<PrepBatch> {
  const record = await getPrismaClient().prepBatch.create({
    data: {
      prepRecipeId: input.prepRecipeId,
      madeById: input.madeById,
      batchYield: input.batchYield,
      bestBefore: input.bestBefore,
      notes: input.notes,
    },
    include: { madeBy: { select: { displayName: true, email: true } } },
  });

  return mapPrepBatch(record);
}
