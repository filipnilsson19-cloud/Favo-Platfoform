import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export function getPrismaClient() {
  const existingClient = globalForPrisma.prisma as
    | (PrismaClient & {
        category?: unknown;
        stationView?: unknown;
      userProfile?: unknown;
      recipe?: unknown;
      prepCategory?: unknown;
      prepUnitOption?: unknown;
      prepStorageOption?: unknown;
      rawIngredient?: unknown;
      recipeCostProfile?: unknown;
      recipeItemCostLink?: unknown;
      prepIngredientCostLink?: unknown;
    })
    | undefined;

  if (
    existingClient?.category &&
    existingClient?.stationView &&
    existingClient?.userProfile &&
    existingClient?.recipe &&
    existingClient?.prepCategory &&
    existingClient?.prepUnitOption &&
    existingClient?.prepStorageOption &&
    existingClient?.rawIngredient &&
    existingClient?.recipeCostProfile &&
    existingClient?.recipeItemCostLink &&
    existingClient?.prepIngredientCostLink
  ) {
    return existingClient;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
