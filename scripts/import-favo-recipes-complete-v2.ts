import { config as loadEnv } from "dotenv";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildRecipeIntro,
  buildRecipeSummary,
  normalizeItem,
  recipeCategories,
} from "../src/lib/recipe-utils";
import type { Recipe, RecipeUnit, RecipeStatus } from "../src/types/recipe";

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
  grams?: number | null;
  amount?: string;
  note?: string;
};

type DatasetRecipe = {
  table_id: string;
  source_file: string;
  kind: "dish" | "sub_recipe";
  dish: string;
  items: DatasetItem[];
  notes?: string[];
};

const dataset: DatasetRecipe[] = [
  {
    table_id: "img4637_moa_manu",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "MOA MANU",
    items: [
      { section: "base", component: "Ris", grams: 215 },
      { section: "base", component: "Teriyaki", grams: 15 },
      { section: "base", component: "Mango", grams: 50 },
      { section: "base", component: "Sojabönor (Edamame)", grams: 20 },
      { section: "base", component: "Gurka", grams: 35 },
      { section: "base", component: "Picklad rödkål", grams: 25 },
      { section: "base", component: "Rödbets gari", grams: 20 },
      { section: "topping", component: "Sojamajonnäs", grams: 10 },
      { section: "topping", component: "Solrostopping", grams: 15 },
      {
        section: "topping",
        component: "Cashewnötter",
        grams: 10,
        note: "tryckt rad säger 4-5 st",
      },
      { section: "topping", component: "Koriander", grams: 5 },
      { section: "topping", component: "Furikado kvart", grams: 40 },
    ],
    notes: ["handskrivna siffror verkar vara overrides av tryckta gram"],
  },
  {
    table_id: "img4637_hey_bay",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "HEY BAY",
    items: [
      { section: "base", component: "Ris", grams: 215 },
      { section: "base", component: "Teriyaki", grams: 15 },
      { section: "base", component: "Mango", grams: 50 },
      { section: "base", component: "Sojabönor (Edamame)", grams: 20 },
      { section: "base", component: "Morot kimchimarinerad", grams: 60 },
      { section: "base", component: "Rödbets gari", grams: 20 },
      { section: "topping", component: "Chilimajonnäs", grams: 10 },
      { section: "topping", component: "Kokostopping", grams: 15 },
      { section: "topping", component: "Cashewnötter", grams: 10 },
      { section: "topping", component: "Koriander", grams: 5 },
      { section: "topping", component: "Furikado kvart", grams: 50 },
    ],
  },
  {
    table_id: "img4637_sassy_caesar",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "SASSY CAESAR",
    items: [
      { section: "slungas", component: "Romansallad", grams: 100 },
      { section: "slungas", component: "Vitkål", grams: 50 },
      { section: "slungas", component: "Grönkål", grams: 20 },
      { section: "slungas", component: "Quinoa", grams: 90 },
      {
        section: "slungas",
        component: "Dressing Caesar",
        grams: 20,
        note: "svårläst handskriven override; tryckt värde ser ut som 75",
      },
      {
        section: "topping",
        component: "PROTEIN",
        grams: null,
        note: "rubrikrad i tabellen",
      },
      { section: "topping", component: "Picklad rödkål", grams: 40 },
      { section: "topping", component: "Frötopping", grams: 5 },
      {
        section: "topping",
        component: "Grana Pedano",
        grams: 10,
        note: "stavat så i tabellen; kan avse Grana Padano",
      },
    ],
  },
  {
    table_id: "img4637_the_og",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "THE OG",
    items: [
      { section: "slungas", component: "Vitkål", grams: 70 },
      { section: "slungas", component: "Grönkål", grams: 40 },
      { section: "slungas", component: "Picklad rödkål", grams: 30 },
      { section: "slungas", component: "Gomadressing", grams: 50 },
      {
        section: "topping",
        component: "PROTEIN",
        grams: null,
        note: "rubrikrad i tabellen",
      },
      { section: "topping", component: "Sojabönor", grams: 20 },
      { section: "topping", component: "Kokostopping", grams: 10 },
      { section: "topping", component: "Schalottenlök rostad", grams: 10 },
      { section: "topping", component: "Furikado kvart", grams: 50 },
      { section: "topping", component: "Salladslök", grams: 5 },
    ],
  },
  {
    table_id: "img4637_bimbimbap",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "BIMBIMBAP",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "base", component: "Spetskål", grams: 50 },
      { section: "protein", component: "Entrecôte", grams: 100 },
      { section: "sauce", component: "Niku-Glaze", grams: 7 },
      { section: "sauce", component: "Chilimayo", grams: 35 },
      { section: "sauce", component: "Gochujang-dressing", grams: 7 },
      { section: "topping", component: "Picklad rödlök", grams: 25 },
      { section: "topping", component: "Picklad sesamgurka", grams: 20 },
      { section: "topping", component: "Picklad Gari", grams: 20 },
      { section: "topping", component: "Rostad schalottenlök", grams: 15 },
    ],
  },
  {
    table_id: "img4637_mini_kale_caesar",
    source_file: "IMG_4637",
    kind: "dish",
    dish: "MINI KALE CAESAR",
    items: [
      { section: "slungas", component: "Romansallad", grams: 35 },
      { section: "slungas", component: "Vitkål", grams: 10 },
      { section: "slungas", component: "Grönkål", grams: 15 },
      { section: "slungas", component: "Quinoa", grams: 30 },
      { section: "slungas", component: "Dressing Caesar", grams: 25 },
      { section: "topping", component: "Frötopping", grams: 10 },
      { section: "protein_option", component: "Kyckling", grams: 90 },
      { section: "protein_option", component: "Marinerad Lax", grams: 80 },
      { section: "protein_option", component: "Portabello", grams: 90 },
      { section: "protein_option", component: "Extra protein", grams: 40 },
    ],
  },
  {
    table_id: "img4638_quack_attack",
    source_file: "IMG_4638",
    kind: "dish",
    dish: "QUACK ATTACK",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "base", component: "Gurksalsa", grams: 35 },
      { section: "protein", component: "Friterad Anka", grams: 120 },
      { section: "sauce", component: "Jordnötsmayo", grams: 35 },
      { section: "sauce", component: "Hoisin", grams: 10 },
      { section: "topping", component: "Salladslök", grams: 10 },
      { section: "topping", component: "Koriander", grams: 3 },
      { section: "topping", component: "Sesamfrön", grams: 3 },
    ],
  },
  {
    table_id: "img4638_gurksalsa",
    source_file: "IMG_4638",
    kind: "sub_recipe",
    dish: "GURKSALSA",
    items: [
      { section: "recipe", component: "Honung", amount: "4 dl" },
      { section: "recipe", component: "Sesamolja", amount: "3 dl" },
      { section: "recipe", component: "Soja", amount: "3 liter" },
      {
        section: "recipe",
        component: "Sueiro vinäger MIZKAN",
        amount: "6 dl",
        note: "best guess på stavning från bilden",
      },
      { section: "recipe", component: "Rapsolja", amount: "2 liter" },
      {
        section: "recipe",
        component: "Gochugaru (chiliflakes)",
        amount: "3 dl",
      },
      {
        section: "recipe",
        component: "Riven vitlök",
        amount: "125 gram",
        note: "står under OBS! GRAM",
      },
    ],
    notes: [
      "metod 1: Blanda ihop alla ingredienser.",
      "metod 2: Häll på marinaden på gurkan (samma som bowls station).",
    ],
  },
  {
    table_id: "img4638_jordnotsmayo",
    source_file: "IMG_4638",
    kind: "sub_recipe",
    dish: "JORDNÖTSMAYO",
    items: [
      {
        section: "recipe",
        component: "Jordnötssmör",
        amount: "1050 gram",
        note: "rad anger 3 st burkar",
      },
      { section: "recipe", component: "Riven vitlök", amount: "70 gram" },
      { section: "recipe", component: "Socker", amount: "7,5 dl" },
      { section: "recipe", component: "Majonnäs", amount: "5 liter" },
      { section: "recipe", component: "Soja", amount: "5 dl" },
      { section: "recipe", component: "Pressad lime", amount: "4 st" },
      { section: "recipe", component: "Salt", amount: "5-10 gram" },
    ],
    notes: [
      "metod 1: Blanda samtliga ingredienser och smaka in med salt.",
      "metod 2: Märka och spritsa.",
    ],
  },
  {
    table_id: "img4639_triple_cheese",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "TRIPLE CHEESE",
    items: [
      { section: "bottom", component: "Bröd", grams: 70 },
      { section: "bottom", component: "Mayo", grams: 15 },
      { section: "bottom", component: "Senap", grams: 8 },
      { section: "bottom", component: "Pickles", grams: 15 },
      {
        section: "protein",
        component: "Protein",
        grams: 133,
        note: "best guess från handskrift i proteinraden",
      },
      {
        section: "topping",
        component: "Cheddar",
        grams: 36,
        note: "tryckt värde; handskrift antyder 3x12",
      },
      { section: "topping", component: "Mayo", grams: 15 },
      { section: "topping", component: "Ketchup", grams: 15 },
      { section: "topping", component: "Silverlök", grams: 25 },
    ],
  },
  {
    table_id: "img4639_tryffel",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "TRYFFEL",
    items: [
      { section: "bottom", component: "Bröd", grams: 50 },
      {
        section: "bottom",
        component: "Tryffelmayo",
        grams: 15,
        note: "handskrift ser ut som 15; marginalnotering kan ev. indikera 20",
      },
      { section: "bottom", component: "Rostad Schalottenlök", grams: 12 },
      { section: "bottom", component: "Pickles", grams: 15 },
      {
        section: "protein",
        component: "Protein",
        grams: null,
        note: "proteinraden svårläst",
      },
      {
        section: "topping",
        component: "Cheddar",
        grams: 24,
        note: "tryckt värde, handskrift svårläst",
      },
      {
        section: "topping",
        component: "Tryffelmayo",
        grams: 15,
        note: "handskrift svårläst, kan ev. vara 20",
      },
      { section: "topping", component: "Silverlök", grams: 25 },
    ],
  },
  {
    table_id: "img4639_originalen",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "ORIGINALEN",
    items: [
      { section: "bottom", component: "Bröd", grams: 50 },
      { section: "bottom", component: "Vitlöksmayo", grams: 15 },
      { section: "bottom", component: "Tomat", grams: 30 },
      { section: "bottom", component: "Rostad Schalottenlök", grams: 12 },
      {
        section: "protein",
        component: "Protein",
        grams: null,
        note: "proteinraden ej tydlig",
      },
      {
        section: "topping",
        component: "Cheddar",
        grams: 24,
        note: "tryckt värde, handskrift svårläst",
      },
      { section: "topping", component: "Vitlöksmayo", grams: 15 },
      { section: "topping", component: "Krisp sallad", grams: 15 },
    ],
  },
  {
    table_id: "img4639_smokey_chili",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "SMOKEY CHILI",
    items: [
      { section: "bottom", component: "Bröd", grams: 50 },
      { section: "bottom", component: "Chipotlemayo", grams: 15 },
      { section: "bottom", component: "Rostad Schalottenlök", grams: 12 },
      { section: "bottom", component: "Krispsallad", grams: 15 },
      {
        section: "protein",
        component: "Protein",
        grams: null,
        note: "proteinraden ej tydlig",
      },
      { section: "topping", component: "Cheddar", grams: 24 },
      { section: "topping", component: "Bacon", grams: 20 },
      { section: "topping", component: "BBQ", grams: 6 },
      {
        section: "topping",
        component: "Chipotlemayo",
        grams: null,
        note: "markerad med X i tabellen",
      },
    ],
  },
  {
    table_id: "img4639_kiillin_kentucky",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "KIILL'IN KENTUCKY",
    items: [
      { section: "bottom", component: "Bröd", grams: 70 },
      { section: "bottom", component: "Chilimayo", grams: 15 },
      { section: "protein", component: "Protein", grams: 100 },
      { section: "protein", component: "Silverlök", grams: 35 },
      { section: "topping", component: "Sweetchili", grams: 30 },
      { section: "topping", component: "Rostad Schalottenlök", grams: 12 },
      { section: "topping", component: "Koriander", grams: 5 },
    ],
  },
  {
    table_id: "img4639_chili_zephyr",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "CHILI ZEPHYR",
    items: [
      { section: "bottom", component: "Bröd", grams: 50 },
      {
        section: "bottom",
        component: "Chili-bearnaise",
        grams: 15,
        note: "marginalnotering ser ev. ut som 20",
      },
      { section: "stekbord", component: "Kött", amount: "2 x 100" },
      {
        section: "stekbord",
        component: "Cheddar",
        amount: "2 st",
        note: "handskrift antyder ev. 3 skivor per burgare, men osäkert",
      },
      {
        section: "topping",
        component: "Chili-bearnaise",
        grams: 15,
        note: "marginalnotering ser ev. ut som 20",
      },
      { section: "topping", component: "Silverlök", grams: 25 },
    ],
  },
  {
    table_id: "img4639_cheese_meal",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "CHEESE MEAL",
    items: [
      { section: "bottom", component: "Bröd", grams: 50 },
      { section: "protein", component: "Protein", grams: 100 },
      { section: "topping", component: "Cheddar", grams: 15 },
      { section: "topping", component: "Ketchup", grams: 5 },
    ],
  },
  {
    table_id: "img4639_garlic_fries",
    source_file: "IMG_4639",
    kind: "dish",
    dish: "GARLIC FRIES",
    items: [
      { section: "slungas", component: "The Fries", grams: 160 },
      { section: "slungas", component: "Vitlöksolja", grams: 10 },
      { section: "slungas", component: "Parmesanmix", grams: 10 },
    ],
  },
  {
    table_id: "img4640_tacos_de_pollo_frito",
    source_file: "IMG_4640",
    kind: "dish",
    dish: "TACOS DE POLLO FRITO",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Chilimayo", grams: 10 },
      {
        section: "topping",
        component: "Ananas salsa",
        grams: 20,
        note: "övre tabellen har handskriven override från 17 till 20",
      },
      {
        section: "protein",
        component: "Panerad kyckling",
        grams: 52,
        note: "övre tabellen har handskriven override från 50 till 52",
      },
      {
        section: "topping",
        component: "Koriander",
        grams: 5,
        note: "övre tabellen har handskriven override från 3 till 5",
      },
      { section: "side", component: "Lime klyfta", grams: 15 },
    ],
    notes: [
      "två nästan identiska tabeller finns på sidan; här används den handskrivna/uppdaterade versionen",
    ],
  },
  {
    table_id: "img4641_chicken_katsu",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "CHICKEN KATSU",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      {
        section: "protein",
        component: "KFC Kyckling",
        grams: 120,
        note: "best guess från handskrift; tryckt värde 100",
      },
      {
        section: "base",
        component: "Kålsallad",
        grams: 70,
        note: "tryckt värde 80",
      },
      {
        section: "sauce",
        component: "Soyamayo",
        grams: 20,
        note: "tryckt värde 17",
      },
      {
        section: "topping",
        component: "Sesampicklad gurka",
        grams: 20,
        note: "tryckt värde 30",
      },
      { section: "sauce", component: "Tonkatsu", grams: 15 },
      { section: "topping", component: "Friterad schalottenlök", grams: 5 },
      { section: "topping", component: "Sesamfrön", grams: 2 },
    ],
  },
  {
    table_id: "img4641_the_kfc",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "THE KFC",
    items: [
      { section: "slungas", component: "Tteokbokki", grams: 100 },
      { section: "slungas", component: "KFC kyckling", grams: 150 },
      {
        section: "slungas",
        component: "Gochujang Glaze",
        grams: 80,
        note: "tryckt värde 120, handskriven override ser ut som 80",
      },
      {
        section: "slungas",
        component: "Kålsallad",
        grams: 60,
        note: "best guess från handskrift; tryckt värde 100",
      },
      { section: "slungas", component: "Salladslök", grams: 10 },
      { section: "slungas", component: "Sesamfrön", grams: 2 },
    ],
  },
  {
    table_id: "img4641_baoulloumi",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "BAOULLOUMI",
    items: [
      { section: "base", component: "Bao bröd", grams: 45 },
      {
        section: "protein",
        component: "Panko pannoumi",
        grams: 60,
        note: "tryckt värde 50",
      },
      { section: "sauce", component: "Chilimayo", grams: 5 },
      { section: "topping", component: "Picklad rödkål", grams: 20 },
      { section: "topping", component: "Feta ost", grams: 5 },
      {
        section: "topping",
        component: "Koriander",
        grams: 5,
        note: "tryckt värde 3",
      },
    ],
    notes: ["tabellen anger recept per bao"],
  },
  {
    table_id: "img4641_korean_fried_chicken_bao",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "KOREAN FRIED CHICKEN",
    items: [
      { section: "base", component: "Bao bröd", grams: 45 },
      {
        section: "sauce",
        component: "Chilimayo",
        grams: 10,
        note: "svårläst handskrift, best guess",
      },
      { section: "protein", component: "KFC chicken", grams: 50 },
      {
        section: "sauce",
        component: "Korean glaze",
        grams: 10,
        note: "best guess från handskrift; tryckt värde ser ut som 5",
      },
      {
        section: "topping",
        component: "Picklad rödlök",
        grams: 10,
        note: "best guess från handskrift; tryckt värde 20",
      },
      {
        section: "topping",
        component: "Sesampicklad Gurka",
        grams: 15,
        note: "best guess från handskrift; tryckt värde 30",
      },
      {
        section: "topping",
        component: "Koriander",
        grams: 5,
        note: "tryckt värde 3",
      },
    ],
    notes: [
      "tabellen anger recept per bao",
      "detta är en av de mest svårlästa tabellerna i materialet",
    ],
  },
  {
    table_id: "img4641_talloumi",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "TALLOUMI",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Chilimayo", grams: 15 },
      { section: "topping", component: "Mango", grams: 25 },
      { section: "protein", component: "Panoumi", grams: 45 },
      { section: "topping", component: "Picklad rödlök", grams: 10 },
      { section: "topping", component: "Picklad jalapeño", grams: 5 },
      { section: "topping", component: "Smulad fetaost", grams: 5 },
      { section: "topping", component: "Hackad koriander", grams: 3 },
      { section: "side", component: "Lime", grams: 15 },
    ],
    notes: ["tabellen anger recept per taco"],
  },
  {
    table_id: "img4641_baja_fish",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "BAJA FISH",
    items: [
      { section: "base", component: "Tortillabröd", grams: 27 },
      { section: "sauce", component: "Smetana", grams: 10 },
      {
        section: "topping",
        component: "Picklad rödkål",
        grams: 20,
        note: "tryckt värde 15",
      },
      {
        section: "topping",
        component: "Picklad avokado (4 bitar)",
        grams: 15,
        note: "best guess från handskrift; tryckt värde 20",
      },
      {
        section: "protein",
        component: "Panerad Koj",
        grams: 60,
        note: "står så i tabellen; sannolikt fisk/kolja",
      },
      { section: "sauce", component: "Chilimayo", grams: 5 },
      { section: "topping", component: "Rostad lök", grams: 5 },
      { section: "topping", component: "Hackad koriander", grams: 3 },
      { section: "side", component: "Lime", grams: 15 },
    ],
    notes: ["tabellen anger recept per taco"],
  },
  {
    table_id: "img4641_carnitas",
    source_file: "IMG_4641",
    kind: "dish",
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
    table_id: "img4641_bimbimbap_duplicate",
    source_file: "IMG_4641",
    kind: "dish",
    dish: "BIMBIMBAP",
    items: [
      { section: "base", component: "Osötat ris", grams: 200 },
      { section: "base", component: "Spetskål", grams: 50 },
      { section: "protein", component: "Entrecote", grams: 100 },
      { section: "sauce", component: "Niku - Glaze", grams: 7 },
      { section: "sauce", component: "Chilimayo", grams: 35 },
      { section: "sauce", component: "Gochujang - dressing", grams: 7 },
      { section: "topping", component: "Picklad rödlök", grams: 25 },
      {
        section: "topping",
        component: "Picklad sesamgurka",
        grams: 25,
        note: "tryckt värde 20",
      },
      { section: "topping", component: "Picklad Gari", grams: 20 },
      {
        section: "topping",
        component: "Rostad schalottenlök",
        grams: 15,
        note: "raden verkar överstruken",
      },
      {
        section: "note_item",
        component: "Isberg mix",
        grams: null,
        note: "handskriven notering under tabellen",
      },
      {
        section: "note_item",
        component: "Sesam strö",
        grams: 3,
        note: "handskriven notering under tabellen",
      },
    ],
    notes: ["separat tabell i materialet; behålls därför som egen post"],
  },
  {
    table_id: "img4642_fish_sticks",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "FISH STICKS",
    items: [
      {
        section: "protein",
        component: "Panerad Koj (x2)",
        grams: 120,
        note: "står så i tabellen; sannolikt fisk/kolja",
      },
      { section: "side", component: "Lime", grams: 15 },
      { section: "sauce", component: "Chilimayo", grams: 50 },
    ],
  },
  {
    table_id: "img4642_fried_umami_broccoli",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "FRIED UMAMI BROCCOLI",
    items: [
      { section: "slungas", component: "Broccoli", grams: 150 },
      {
        section: "slungas",
        component: "Umami BBQ",
        grams: 50,
        note: "tryckt värde 40",
      },
      { section: "topping", component: "Salladslök", grams: 10 },
      {
        section: "topping",
        component: "Rostad lök",
        grams: 7,
        note: "tryckt värde 10",
      },
    ],
  },
  {
    table_id: "img4642_crispy_dumplings",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "CRISPY DUMPLINGS",
    items: [
      { section: "base", component: "Dumplings", grams: 132 },
      { section: "topping", component: "Hackad koriander", grams: 3 },
      { section: "dip", component: "Soja", grams: 30 },
    ],
  },
  {
    table_id: "img4642_chicken_sticks",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "CHICKEN STICKS",
    items: [
      { section: "protein", component: "KFC Sticks (1st)", grams: 45 },
      { section: "topping", component: "Parmesan med persilja", grams: 7 },
      { section: "dip", component: "Korean BBQ", grams: 30 },
    ],
    notes: ["tabellrubriken anger (1st/5st)"],
  },
  {
    table_id: "img4642_fish_n_fries",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "FISH 'N' FRIES",
    items: [
      {
        section: "protein",
        component: "Pannerad Koj",
        grams: 100,
        note: "står så i tabellen; sannolikt fisk/kolja",
      },
      { section: "base", component: "Fries", grams: 150 },
      { section: "topping", component: "Picklad rödkål", grams: 40 },
      { section: "dip", component: "Ketchup dipp", grams: 30 },
    ],
  },
  {
    table_id: "img4642_7st_pannoumi_sticks",
    source_file: "IMG_4642",
    kind: "dish",
    dish: "7st PANNOUMI STICKS",
    items: [
      { section: "count", component: "Pannoumi sticks", amount: "7 st" },
    ],
  },
];

function resolveCategory(entry: DatasetRecipe) {
  if (entry.kind === "sub_recipe") {
    return "Sås";
  }

  switch (entry.dish) {
    case "MOA MANU":
    case "HEY BAY":
    case "BIMBIMBAP":
    case "QUACK ATTACK":
    case "CHICKEN KATSU":
    case "THE KFC":
      return "Bowl";
    case "SASSY CAESAR":
    case "THE OG":
    case "MINI KALE CAESAR":
      return "Sallad";
    case "TRIPLE CHEESE":
    case "TRYFFEL":
    case "ORIGINALEN":
    case "SMOKEY CHILI":
    case "KIILL'IN KENTUCKY":
    case "CHILI ZEPHYR":
    case "CHEESE MEAL":
      return "Burger";
    case "BAOULLOUMI":
    case "KOREAN FRIED CHICKEN":
      return "Bao";
    case "TACOS DE POLLO FRITO":
    case "TALLOUMI":
    case "BAJA FISH":
    case "CARNITAS":
      return "Taco";
    case "GARLIC FRIES":
    case "FISH STICKS":
    case "FRIED UMAMI BROCCOLI":
    case "CRISPY DUMPLINGS":
    case "CHICKEN STICKS":
    case "FISH 'N' FRIES":
    case "7st PANNOUMI STICKS":
      return "Sides";
    default:
      throw new Error(`Missing category mapping for ${entry.table_id}`);
  }
}

function normalizeUnit(rawUnit?: string): RecipeUnit {
  const unit = String(rawUnit ?? "").trim().toLowerCase();

  switch (unit) {
    case "g":
    case "gram":
    case "grams":
      return "g";
    case "kg":
    case "kilogram":
      return "kg";
    case "ml":
      return "ml";
    case "cl":
      return "cl";
    case "dl":
      return "dl";
    case "l":
    case "liter":
      return "l";
    case "st":
      return "st";
    case "tsk":
      return "tsk";
    case "msk":
      return "msk";
    default:
      return "g";
  }
}

function parseAmountText(rawAmount: string) {
  const normalized = rawAmount.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(.*?)(?:\s+)(gram|grams|g|kg|kilogram|ml|cl|dl|l|liter|st|tsk|msk)$/i);

  if (!match) {
    return {
      amount: normalized,
      unit: "g" as RecipeUnit,
    };
  }

  return {
    amount: match[1].trim(),
    unit: normalizeUnit(match[2]),
  };
}

function buildInfo(item: DatasetItem) {
  const parts = [item.section.trim(), item.note?.trim()].filter(Boolean);
  return parts.join(" - ");
}

function isHeaderRow(item: DatasetItem) {
  return item.grams == null && !item.amount && /rubrikrad/i.test(item.note ?? "");
}

function toRecipeItem(item: DatasetItem) {
  if (isHeaderRow(item)) {
    return normalizeItem({
      info: item.component,
      isSpacer: true,
    });
  }

  if (typeof item.grams === "number") {
    return normalizeItem({
      info: buildInfo(item),
      name: item.component,
      amount: String(item.grams),
      unit: "g",
      isEmphasis: item.section === "protein" || item.section === "stekbord",
      isSpacer: false,
    });
  }

  if (item.amount) {
    const parsed = parseAmountText(item.amount);
    return normalizeItem({
      info: buildInfo(item),
      name: item.component,
      amount: parsed.amount,
      unit: parsed.unit,
      isEmphasis: item.section === "protein" || item.section === "stekbord",
      isSpacer: false,
    });
  }

  return normalizeItem({
    info: buildInfo(item),
    name: item.component,
    amount: "",
    unit: "g",
    isEmphasis: item.section === "protein" || item.section === "stekbord",
    isSpacer: false,
  });
}

function toRecipe(entry: DatasetRecipe): Recipe {
  const category = resolveCategory(entry);
  const items = entry.items.map(toRecipeItem);
  const status: RecipeStatus = "Publicerad";

  return {
    id: entry.table_id,
    title: entry.dish,
    category,
    status,
    servings: 1,
    updatedLabel: "Nu",
    allergens: "",
    notes: (entry.notes ?? []).join("\n"),
    summary: buildRecipeSummary(items),
    intro: buildRecipeIntro({
      category,
      items,
    }),
    items,
  };
}

async function ensureCategories(recipes: Recipe[]) {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))];

  await Promise.all(
    categories.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {
          isActive: true,
          sortOrder: Math.max(recipeCategories.indexOf(name), 0),
        },
        create: {
          name,
          isActive: true,
          sortOrder: Math.max(recipeCategories.indexOf(name), 0),
        },
      }),
    ),
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

  await ensureCategories(recipes);

  for (const recipe of recipes) {
    await upsertRecipe(recipe);
  }

  const stored = await prisma.recipe.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }, { id: "asc" }],
    select: {
      title: true,
      category: true,
      status: true,
      id: true,
    },
  });

  console.log(`Imported ${recipes.length} recipes.`);
  for (const recipe of stored) {
    console.log(`${recipe.category} | ${recipe.status} | ${recipe.title} | ${recipe.id}`);
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
