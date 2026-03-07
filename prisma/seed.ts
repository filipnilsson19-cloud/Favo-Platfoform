import { config as loadEnv } from "dotenv";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import { recipeCategories, sortRecipeCategories } from "../src/lib/recipe-utils";
import { recipes } from "../src/lib/recipes";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.recipeItem.deleteMany();
    await tx.recipe.deleteMany();
    await tx.category.deleteMany();

    const categoryNames = sortRecipeCategories([
      ...recipeCategories,
      ...recipes.map((recipe) => recipe.category),
    ]);

    await tx.category.createMany({
      data: categoryNames.map((name, index) => ({
        name,
        sortOrder: index,
      })),
    });

    for (const recipe of recipes) {
      await tx.recipe.create({
        data: {
          id: recipe.id,
          title: recipe.title,
          category: recipe.category,
          status: recipe.status,
          servings: recipe.servings,
          updatedLabel: recipe.updatedLabel,
          allergens: recipe.allergens,
          notes: recipe.notes,
          summary: recipe.summary,
          intro: recipe.intro,
          items: {
            create: recipe.items.map((item, index) => ({
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
      });
    }
  });

  console.log(`Seeded ${recipes.length} recipes into Supabase.`);
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
