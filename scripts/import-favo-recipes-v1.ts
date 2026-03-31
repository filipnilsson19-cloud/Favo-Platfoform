import { config as loadEnv } from "dotenv";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildRecipeIntro,
  buildRecipeSummary,
  normalizeItem,
  recipeCategories,
  slugify,
} from "../src/lib/recipe-utils";
import type { Recipe, RecipeStatus, RecipeUnit } from "../src/types/recipe";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

type DatasetItem = {
  section: string;
  component: string;
  grams: number;
  note?: string;
};

type DatasetRecipe = {
  dish: string;
  items: DatasetItem[];
};

const categoryByDish: Record<string, string> = {
  "MOA MANU": "Bowl",
  "HEY BAY": "Bowl",
  "SASSY CAESAR": "Sallad",
  "THE OG": "Sallad",
  BIMBIMBAP: "Bowl",
  "MINI KALE CAESAR": "Sallad",
  "QUACK ATTACK": "Bowl",
  "TRIPLE CHEESE": "Burger",
  "SMOKEY CHILI": "Burger",
  "TACOS DE POLLO FRITO": "Taco",
  "CHICKEN KATSU": "Bowl",
  "KOREAN FRIED CHICKEN (BAO)": "Bao",
  TALLOUMI: "Taco",
  "BAJA FISH": "Taco",
  CARNITAS: "Taco",
  "GARLIC FRIES": "Sides",
  "FISH STICKS": "Sides",
  "CRISPY DUMPLINGS": "Sides",
};

const dataset: DatasetRecipe[] = [
  {
    dish: "MOA MANU",
    items: [
      { section: "base", component: "Ris", grams: 215 },
      { section: "base", component: "Teriyaki", grams: 15 },
      { section: "base", component: "Mango", grams: 50 },
      { section: "base", component: "Sojabönor (edamame)", grams: 20 },
      { section: "base", component: "Gurka", grams: 35 },
      { section: "base", component: "Picklad rödkål", grams: 25 },
      { section: "base", component: "Rödbets gari", grams: 20 },
      { section: "topping", component: "Sojamajonnäs", grams: 10 },
      { section: "topping", component: "Solrostopping", grams: 15 },
      { section: "topping", component: "Cashewnötter", grams: 10 },
      { section: "topping", component: "Koriander", grams: 5 },
      { section: "topping", component: "Furikado kvart", grams: 40 },
    ],
  },
  {
    dish: "HEY BAY",
    items: [
      { section: "base", component: "Ris", grams: 215 },
      { section: "base", component: "Teriyaki", grams: 15 },
      { section: "base", component: "Mango", grams: 50 },
      { section: "base", component: "Sojabönor (edamame)", grams: 20 },
      { section: "base", component: "Morot kimchi-marinerad", grams: 60 },
      { section: "base", component: "Rödbets gari", grams: 20 },
      { section: "topping", component: "Chilimajonnäs", grams: 10 },
      { section: "topping", component: "Kokostopping", grams: 15 },
      { section: "topping", component: "Cashewnötter", grams: 10 },
      { section: "topping", component: "Koriander", grams: 5 },
      { section: "topping", component: "Furikado kvart", grams: 50 },
    ],
  },
  {
    dish: "SASSY CAESAR",
    items: [
      { section: "slungas", component: "Romansallad", grams: 100 },
      { section: "slungas", component: "Vitkål", grams: 50 },
      { section: "slungas", component: "Grönkål", grams: 20 },
      { section: "slungas", component: "Quinoa", grams: 90 },
      { section: "slungas", component: "Dressing Caesar", grams: 20, note: "override från ~75" },
      { section: "topping", component: "Picklad rödkål", grams: 40 },
      { section: "topping", component: "Frötopping", grams: 5 },
      { section: "topping", component: "Grana Padano", grams: 10 },
    ],
  },
  {
    dish: "THE OG",
    items: [
      { section: "slungas", component: "Vitkål", grams: 70 },
      { section: "slungas", component: "Grönkål", grams: 40 },
      { section: "slungas", component: "Picklad rödkål", grams: 30 },
      { section: "slungas", component: "Goma dressing", grams: 50 },
      { section: "topping", component: "Sojabönor", grams: 20 },
      { section: "topping", component: "Kokostopping", grams: 10 },
      { section: "topping", component: "Schalottenlök rostad", grams: 10 },
      { section: "topping", component: "Furikado kvart", grams: 50 },
      { section: "topping", component: "Salladslök", grams: 5 },
    ],
  },
  {
    dish: "BIMBIMBAP",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "base", component: "Spetskål", grams: 50 },
      { section: "protein", component: "Entrecote", grams: 100 },
      { section: "sauce", component: "Niku glaze", grams: 7 },
      { section: "sauce", component: "Chilimayo", grams: 35 },
      { section: "sauce", component: "Gochujang dressing", grams: 7 },
      { section: "topping", component: "Picklad rödlök", grams: 25 },
      { section: "topping", component: "Picklad sesamgurka", grams: 25 },
      { section: "topping", component: "Picklad gari", grams: 20 },
      { section: "topping", component: "Rostad schalottenlök", grams: 15 },
    ],
  },
  {
    dish: "MINI KALE CAESAR",
    items: [
      { section: "base", component: "Romansallad", grams: 35 },
      { section: "base", component: "Vitkål", grams: 10 },
      { section: "base", component: "Grönkål", grams: 15 },
      { section: "base", component: "Quinoa", grams: 30 },
      { section: "sauce", component: "Caesar dressing", grams: 25 },
      { section: "topping", component: "Frötopping", grams: 10 },
    ],
  },
  {
    dish: "QUACK ATTACK",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "base", component: "Gurksalsa", grams: 35 },
      { section: "protein", component: "Friterad anka", grams: 120 },
      { section: "sauce", component: "Jordnötsmayo", grams: 35 },
      { section: "sauce", component: "Hoisin", grams: 10 },
      { section: "topping", component: "Salladslök", grams: 10 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "topping", component: "Sesamfrön", grams: 3 },
    ],
  },
  {
    dish: "TRIPLE CHEESE",
    items: [
      { section: "base", component: "Bröd", grams: 70 },
      { section: "base", component: "Mayo", grams: 15 },
      { section: "base", component: "Senap", grams: 8 },
      { section: "base", component: "Pickles", grams: 15 },
      { section: "protein", component: "Burgare", grams: 130, note: "approx" },
      { section: "topping", component: "Cheddar", grams: 36 },
      { section: "topping", component: "Mayo", grams: 15 },
      { section: "topping", component: "Ketchup", grams: 15 },
      { section: "topping", component: "Silverlök", grams: 25 },
    ],
  },
  {
    dish: "SMOKEY CHILI",
    items: [
      { section: "base", component: "Bröd", grams: 50 },
      { section: "base", component: "Chipotlemayo", grams: 15 },
      { section: "base", component: "Rostad schalottenlök", grams: 12 },
      { section: "base", component: "Krispsallad", grams: 15 },
      { section: "protein", component: "Burgare", grams: 130 },
      { section: "topping", component: "Cheddar", grams: 24 },
      { section: "topping", component: "Bacon", grams: 20 },
      { section: "topping", component: "BBQ", grams: 6 },
    ],
  },
  {
    dish: "TACOS DE POLLO FRITO",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Chilimayo", grams: 10 },
      { section: "topping", component: "Ananas salsa", grams: 20 },
      { section: "protein", component: "Panerad kyckling", grams: 52 },
      { section: "topping", component: "Koriander", grams: 5 },
      { section: "side", component: "Lime klyfta", grams: 15 },
    ],
  },
  {
    dish: "CHICKEN KATSU",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "protein", component: "KFC kyckling", grams: 120 },
      { section: "base", component: "Kålsallad", grams: 70 },
      { section: "sauce", component: "Soyamayo", grams: 20 },
      { section: "topping", component: "Sesampicklad gurka", grams: 20 },
      { section: "sauce", component: "Tonkatsu", grams: 15 },
      { section: "topping", component: "Friterad schalottenlök", grams: 5 },
      { section: "topping", component: "Sesamfrön", grams: 2 },
    ],
  },
  {
    dish: "KOREAN FRIED CHICKEN (BAO)",
    items: [
      { section: "base", component: "Bao bröd", grams: 45 },
      { section: "sauce", component: "Chilimayo", grams: 10 },
      { section: "protein", component: "KFC chicken", grams: 50 },
      { section: "sauce", component: "Korean glaze", grams: 10 },
      { section: "topping", component: "Picklad rödlök", grams: 10 },
      { section: "topping", component: "Sesampicklad gurka", grams: 15 },
      { section: "topping", component: "Koriander", grams: 5 },
    ],
  },
  {
    dish: "TALLOUMI",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Chilimayo", grams: 15 },
      { section: "topping", component: "Mango", grams: 25 },
      { section: "protein", component: "Panoumi", grams: 45 },
      { section: "topping", component: "Picklad rödlök", grams: 10 },
      { section: "topping", component: "Picklad jalapeño", grams: 5 },
      { section: "topping", component: "Fetaost", grams: 5 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "side", component: "Lime", grams: 15 },
    ],
  },
  {
    dish: "BAJA FISH",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Smetana", grams: 10 },
      { section: "topping", component: "Picklad rödkål", grams: 20 },
      { section: "topping", component: "Picklad avocado", grams: 15 },
      { section: "protein", component: "Panerad fisk", grams: 60 },
      { section: "sauce", component: "Chilimayo", grams: 5 },
      { section: "topping", component: "Rostad lök", grams: 5 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "side", component: "Lime", grams: 15 },
    ],
  },
  {
    dish: "CARNITAS",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "topping", component: "Guacamole", grams: 7 },
      { section: "topping", component: "Ananassalsa", grams: 17 },
      { section: "protein", component: "Fläsk", grams: 45 },
      { section: "sauce", component: "Chipotle mayo", grams: 5 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "side", component: "Lime", grams: 15 },
    ],
  },
  {
    dish: "GARLIC FRIES",
    items: [
      { section: "base", component: "Fries", grams: 160 },
      { section: "topping", component: "Vitlöksolja", grams: 10 },
      { section: "topping", component: "Parmesanmix", grams: 10 },
    ],
  },
  {
    dish: "FISH STICKS",
    items: [
      { section: "protein", component: "Panerad fisk", grams: 120 },
      { section: "side", component: "Lime", grams: 15 },
      { section: "sauce", component: "Chilimayo", grams: 50 },
    ],
  },
  {
    dish: "CRISPY DUMPLINGS",
    items: [
      { section: "base", component: "Dumplings", grams: 132 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "sauce", component: "Soja", grams: 30 },
    ],
  },
];

function toRecipeUnit(): RecipeUnit {
  return "g";
}

function buildInfo(item: DatasetItem) {
  const section = item.section.trim();
  const note = item.note?.trim();

  if (section && note) {
    return `${section} - ${note}`;
  }

  return section || note || "";
}

function toRecipe(entry: DatasetRecipe): Recipe {
  const category = categoryByDish[entry.dish];

  if (!category) {
    throw new Error(`Missing category mapping for ${entry.dish}`);
  }

  const items = entry.items.map((item) =>
    normalizeItem({
      info: buildInfo(item),
      name: item.component,
      amount: String(item.grams),
      unit: toRecipeUnit(),
      isEmphasis: item.section === "protein",
      isSpacer: false,
    }),
  );

  const status: RecipeStatus = "Publicerad";

  return {
    id: slugify(entry.dish),
    title: entry.dish,
    category,
    status,
    servings: 1,
    updatedLabel: "Nu",
    allergens: "",
    notes: "",
    summary: buildRecipeSummary(items),
    intro: buildRecipeIntro({
      category,
      items,
    }),
    items,
  };
}

async function ensureCategories() {
  const neededCategories = [...new Set(dataset.map((entry) => categoryByDish[entry.dish]))];

  await Promise.all(
    neededCategories.map(async (name) => {
      const sortOrder = Math.max(recipeCategories.indexOf(name), 0);

      await prisma.category.upsert({
        where: { name },
        update: {
          isActive: true,
          sortOrder,
        },
        create: {
          name,
          sortOrder,
          isActive: true,
        },
      });
    }),
  );
}

async function upsertRecipe(recipe: Recipe) {
  await prisma.recipe.upsert({
    where: {
      id: recipe.id,
    },
    create: {
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
    update: {
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
        deleteMany: {},
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

async function main() {
  const recipes = dataset.map(toRecipe);

  await ensureCategories();

  for (const recipe of recipes) {
    await upsertRecipe(recipe);
  }

  const stored = await prisma.recipe.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      title: true,
      category: true,
      status: true,
    },
  });

  console.log(`Imported ${recipes.length} recipes.`);
  for (const recipe of stored) {
    console.log(`${recipe.category} | ${recipe.status} | ${recipe.title}`);
  }
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
