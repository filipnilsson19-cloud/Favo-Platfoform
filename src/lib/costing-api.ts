import type { CostSourceKind, RawIngredient } from "@/types/costing";

async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || errorMessage);
  }
  return (await response.json()) as T;
}

export async function saveRawIngredientRequest(ingredient: RawIngredient) {
  const response = await fetch("/api/costing/raw-ingredients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredient }),
  });
  return readJson<{ rawIngredient: RawIngredient }>(response, "Failed to save raw ingredient");
}

export async function deleteRawIngredientRequest(id: string) {
  const response = await fetch("/api/costing/raw-ingredients", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return readJson<{ ok: true }>(response, "Failed to delete raw ingredient");
}

export async function savePrepCostLinkRequest(input: {
  prepRecipeId: string;
  ingredientIndex: number;
  rawIngredientId: string | null;
}) {
  const response = await fetch("/api/costing/prep-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ link: { ingredientIndex: number; rawIngredientId: string | null } }>(
    response,
    "Failed to save prep cost link",
  );
}

export async function saveRecipeCostLinkRequest(input: {
  recipeId: string;
  itemIndex: number;
  sourceKind: CostSourceKind;
  rawIngredientId: string | null;
  prepRecipeId: string | null;
}) {
  const response = await fetch("/api/costing/recipe-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{
    link: {
      itemIndex: number;
      sourceKind: CostSourceKind;
      rawIngredientId: string | null;
      prepRecipeId: string | null;
    };
  }>(response, "Failed to save recipe cost link");
}

export async function saveRecipePricingRequest(input: {
  recipeId: string;
  sellingPriceInclVat: number;
  vatRate: number;
}) {
  const response = await fetch("/api/costing/recipe-pricing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{
    costProfile: {
      recipeId: string;
      sellingPriceInclVat: number;
      vatRate: number;
    };
  }>(response, "Failed to save recipe pricing");
}
