import { unstable_cache } from "next/cache";

import { getPrismaClient } from "@/lib/prisma";
import { prepManagedUnitDefaults, prepStatusOptions, prepStorageOptions } from "@/lib/prep-utils";
import type { AppPrepCategory, AppPrepOption, PrepBatch, PrepRecipe, PrepStatus } from "@/types/prep";

type DbPrepRecipe = {
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
    storage: record.storage || "Kyl",
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

async function ensurePrepUnitOptionsSeeded() {
  const prisma = getPrismaClient();
  await Promise.all(
    prepManagedUnitDefaults.map((option, index) =>
      prisma.prepUnitOption.upsert({
        where: { name: option.value },
        update: {},
        create: {
          name: option.value,
          sortOrder: index,
        },
      }),
    ),
  );
}

async function ensurePrepStorageOptionsSeeded() {
  const prisma = getPrismaClient();
  await Promise.all(
    prepStorageOptions.map((option, index) =>
      prisma.prepStorageOption.upsert({
        where: { name: option.value },
        update: {},
        create: {
          name: option.value,
          sortOrder: index,
        },
      }),
    ),
  );
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

const fetchPrepUnitOptionsFromDb = unstable_cache(
  async () => {
    await ensurePrepUnitOptionsSeeded();
    const prisma = getPrismaClient();
    const [units, ingredientUnits, yieldUnits] = await Promise.all([
      prisma.prepUnitOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.prepIngredient.findMany({
        select: { unit: true },
        distinct: ["unit"],
      }),
      prisma.prepRecipe.findMany({
        select: { yieldUnit: true },
        distinct: ["yieldUnit"],
      }),
    ]);
    return { units, ingredientUnits, yieldUnits };
  },
  ["prep-unit-options"],
  { revalidate: 30, tags: ["prep-recipes"] },
);

export async function getPrepUnitOptionsForApp(): Promise<string[]> {
  const { units, ingredientUnits, yieldUnits } = await fetchPrepUnitOptionsFromDb();
  const names = new Set([
    ...units.map((unit) => unit.name),
    ...ingredientUnits.map((unit) => unit.unit).filter(Boolean),
    ...yieldUnits.map((unit) => unit.yieldUnit).filter(Boolean),
  ]);
  return [...names].sort((a, b) => a.localeCompare(b, "sv"));
}

export async function getPrepUnitEntriesForApp(): Promise<AppPrepOption[]> {
  await ensurePrepUnitOptionsSeeded();
  const prisma = getPrismaClient();
  const [records, ingredientUsage, yieldUsage] = await Promise.all([
    prisma.prepUnitOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.prepIngredient.groupBy({
      by: ["unit"],
      _count: { _all: true },
    }),
    prisma.prepRecipe.groupBy({
      by: ["yieldUnit"],
      _count: { _all: true },
    }),
  ]);

  const usageMap = new Map<string, number>();
  for (const entry of ingredientUsage) {
    if (!entry.unit) continue;
    usageMap.set(entry.unit, (usageMap.get(entry.unit) ?? 0) + entry._count._all);
  }
  for (const entry of yieldUsage) {
    if (!entry.yieldUnit) continue;
    usageMap.set(entry.yieldUnit, (usageMap.get(entry.yieldUnit) ?? 0) + entry._count._all);
  }

  const knownNames = new Set(records.map((record) => record.name));
  const orphaned: AppPrepOption[] = [];
  for (const [name, count] of usageMap) {
    if (!knownNames.has(name)) {
      orphaned.push({ id: `orphan:${name}`, name, isActive: true, usageCount: count });
    }
  }

  return [
    ...records.map((record) => ({
      id: record.id,
      name: record.name,
      isActive: record.isActive,
      usageCount: usageMap.get(record.name) ?? 0,
    })),
    ...orphaned,
  ].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export async function createPrepUnitOptionForApp(name: string): Promise<string> {
  await ensurePrepUnitOptionsSeeded();
  const normalized = name.trim();
  if (!normalized) throw new Error("Unit name is required.");

  const prisma = getPrismaClient();
  const existing = await prisma.prepUnitOption.findUnique({ where: { name: normalized } });
  if (existing) {
    if (!existing.isActive) {
      await prisma.prepUnitOption.update({ where: { id: existing.id }, data: { isActive: true } });
    }
    return existing.name;
  }

  const count = await prisma.prepUnitOption.count();
  const created = await prisma.prepUnitOption.create({
    data: { name: normalized, sortOrder: count },
  });
  return created.name;
}

export async function renamePrepUnitOptionForApp(name: string, nextName: string): Promise<string> {
  await ensurePrepUnitOptionsSeeded();
  const current = name.trim();
  const next = nextName.trim();
  if (!current || !next) throw new Error("Both names are required.");
  if (current === next) return next;

  const prisma = getPrismaClient();
  const conflicting = await prisma.prepUnitOption.findUnique({ where: { name: next } });
  if (conflicting) throw new Error("An option with that name already exists.");

  await prisma.$transaction(async (tx) => {
    const currentEntry = await tx.prepUnitOption.findUnique({ where: { name: current } });
    if (currentEntry) {
      await tx.prepUnitOption.update({ where: { name: current }, data: { name: next } });
    } else {
      const count = await tx.prepUnitOption.count();
      await tx.prepUnitOption.create({ data: { name: next, sortOrder: count } });
    }
    await tx.prepIngredient.updateMany({ where: { unit: current }, data: { unit: next } });
    await tx.prepRecipe.updateMany({ where: { yieldUnit: current }, data: { yieldUnit: next } });
  });

  return next;
}

export async function setPrepUnitOptionActiveForApp(name: string, isActive: boolean): Promise<string> {
  await ensurePrepUnitOptionsSeeded();
  const normalized = name.trim();
  if (!normalized) throw new Error("Unit name is required.");
  const prisma = getPrismaClient();
  const count = await prisma.prepUnitOption.count();
  await prisma.prepUnitOption.upsert({
    where: { name: normalized },
    update: { isActive },
    create: { name: normalized, isActive, sortOrder: count },
  });
  return normalized;
}

const fetchPrepStorageOptionsFromDb = unstable_cache(
  async () => {
    await ensurePrepStorageOptionsSeeded();
    const prisma = getPrismaClient();
    const [options, storageValues] = await Promise.all([
      prisma.prepStorageOption.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.prepRecipe.findMany({
        select: { storage: true },
        distinct: ["storage"],
      }),
    ]);
    return { options, storageValues };
  },
  ["prep-storage-options"],
  { revalidate: 30, tags: ["prep-recipes"] },
);

export async function getPrepStorageOptionsForApp(): Promise<string[]> {
  const { options, storageValues } = await fetchPrepStorageOptionsFromDb();
  const names = new Set([
    ...options.map((option) => option.name),
    ...storageValues.map((value) => value.storage).filter(Boolean),
  ]);
  return [...names].sort((a, b) => a.localeCompare(b, "sv"));
}

export async function getPrepStorageEntriesForApp(): Promise<AppPrepOption[]> {
  await ensurePrepStorageOptionsSeeded();
  const prisma = getPrismaClient();
  const [records, usage] = await Promise.all([
    prisma.prepStorageOption.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.prepRecipe.groupBy({
      by: ["storage"],
      _count: { _all: true },
    }),
  ]);

  const usageMap = new Map(
    usage.filter((entry) => Boolean(entry.storage)).map((entry) => [entry.storage, entry._count._all]),
  );
  const knownNames = new Set(records.map((record) => record.name));
  const orphaned: AppPrepOption[] = [];
  for (const [name, count] of usageMap) {
    if (!knownNames.has(name)) {
      orphaned.push({ id: `orphan:${name}`, name, isActive: true, usageCount: count });
    }
  }

  return [
    ...records.map((record) => ({
      id: record.id,
      name: record.name,
      isActive: record.isActive,
      usageCount: usageMap.get(record.name) ?? 0,
    })),
    ...orphaned,
  ].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export async function createPrepStorageOptionForApp(name: string): Promise<string> {
  await ensurePrepStorageOptionsSeeded();
  const normalized = name.trim();
  if (!normalized) throw new Error("Storage name is required.");

  const prisma = getPrismaClient();
  const existing = await prisma.prepStorageOption.findUnique({ where: { name: normalized } });
  if (existing) {
    if (!existing.isActive) {
      await prisma.prepStorageOption.update({ where: { id: existing.id }, data: { isActive: true } });
    }
    return existing.name;
  }

  const count = await prisma.prepStorageOption.count();
  const created = await prisma.prepStorageOption.create({
    data: { name: normalized, sortOrder: count },
  });
  return created.name;
}

export async function renamePrepStorageOptionForApp(name: string, nextName: string): Promise<string> {
  await ensurePrepStorageOptionsSeeded();
  const current = name.trim();
  const next = nextName.trim();
  if (!current || !next) throw new Error("Both names are required.");
  if (current === next) return next;

  const prisma = getPrismaClient();
  const conflicting = await prisma.prepStorageOption.findUnique({ where: { name: next } });
  if (conflicting) throw new Error("An option with that name already exists.");

  await prisma.$transaction(async (tx) => {
    const currentEntry = await tx.prepStorageOption.findUnique({ where: { name: current } });
    if (currentEntry) {
      await tx.prepStorageOption.update({ where: { name: current }, data: { name: next } });
    } else {
      const count = await tx.prepStorageOption.count();
      await tx.prepStorageOption.create({ data: { name: next, sortOrder: count } });
    }
    await tx.prepRecipe.updateMany({ where: { storage: current }, data: { storage: next } });
  });

  return next;
}

export async function setPrepStorageOptionActiveForApp(name: string, isActive: boolean): Promise<string> {
  await ensurePrepStorageOptionsSeeded();
  const normalized = name.trim();
  if (!normalized) throw new Error("Storage name is required.");
  const prisma = getPrismaClient();
  const count = await prisma.prepStorageOption.count();
  await prisma.prepStorageOption.upsert({
    where: { name: normalized },
    update: { isActive },
    create: { name: normalized, isActive, sortOrder: count },
  });
  return normalized;
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
    storage: input.storage || "Kyl",
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
