import { readFileSync } from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

// Load DATABASE_URL from .env.local
const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (!key || !rest.length) continue;
  const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
  process.env[key.trim()] = val;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const recipe = await prisma.prepRecipe.create({
    data: {
      title: "Ananassalsa",
      category: "Sälj",
      status: "Publicerad",
      shelfLifeDays: 4,
      defaultYield: "1",
      yieldUnit: "sats",
      allergens: "",
      notes: "Håll upp på furikakelåda (160 gram per låda).",
      ingredients: {
        create: [
          { sortOrder: 1, amount: "10", unit: "st", name: "Ananas",                    info: "" },
          { sortOrder: 2, amount: "5",  unit: "st", name: "Rödlök, finhackad",       info: "" },
          { sortOrder: 3, amount: "10", unit: "st", name: "Färsk jalapeño, finhackad", info: "" },
          { sortOrder: 4, amount: "5",  unit: "st", name: "Lime, zest",              info: "" },
          { sortOrder: 5, amount: "5",  unit: "st", name: "Lime, färskpressad juice", info: "" },
          { sortOrder: 6, amount: "50", unit: "g",  name: "Färsk koriander, hackad", info: "" },
          { sortOrder: 7, amount: "10", unit: "st", name: "Vitlök, finhackad",       info: "" },
          { sortOrder: 8, amount: "17", unit: "g",  name: "Havssalt",               info: "Smaka av!" },
        ],
      },
      steps: {
        create: [
          { sortOrder: 1, description: "Skär färsk ananas i cm stora kuber." },
          { sortOrder: 2, description: "Blanda ananas, rödlök, jalapeño, limejuice, limezest, koriander & vitlök i en stor bunke." },
          { sortOrder: 3, description: "Tillsätt salt och rör om." },
          { sortOrder: 4, description: "Låt gärna salsan vila 30–60 minuter i kyl för bästa smak." },
          { sortOrder: 5, description: "Håll upp på furikakelåda (160 gram per låda)." },
        ],
      },
    },
  });

  console.log("✅ Recept skapat:", recipe.title, "(id:", recipe.id + ")");
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
