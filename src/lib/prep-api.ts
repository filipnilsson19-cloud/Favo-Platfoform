import type { AppPrepCategory, PrepBatch, PrepRecipe } from "@/types/prep";

async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) throw new Error(errorMessage);
  return (await response.json()) as T;
}

export async function savePrepRecipeRequest(recipe: PrepRecipe) {
  const response = await fetch("/api/prep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipe }),
  });
  return readJson<{ recipe: PrepRecipe }>(response, "Failed to save prep recipe");
}

export async function deletePrepRecipeRequest(recipeId: string) {
  const response = await fetch("/api/prep", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId }),
  });
  return readJson<{ ok: true }>(response, "Failed to delete prep recipe");
}

export async function createPrepCategoryRequest(name: string) {
  const response = await fetch("/api/prep/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return readJson<{ category: string }>(response, "Failed to create prep category");
}

export async function loadManagedPrepCategoriesRequest() {
  const response = await fetch("/api/prep/categories?manage=1");
  return readJson<{ categories: AppPrepCategory[] }>(response, "Failed to load prep categories");
}

export async function renameManagedPrepCategoryRequest(name: string, nextName: string) {
  const response = await fetch("/api/prep/categories", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rename", name, nextName }),
  });
  return readJson<{ categories: AppPrepCategory[]; category: string; previousName: string }>(
    response,
    "Failed to rename prep category",
  );
}

export async function setManagedPrepCategoryActiveRequest(name: string, isActive: boolean) {
  const response = await fetch("/api/prep/categories", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set-active", name, isActive }),
  });
  return readJson<{ categories: AppPrepCategory[] }>(response, "Failed to update prep category");
}

export async function loadPrepBatchesRequest(prepRecipeId: string) {
  const response = await fetch(`/api/prep/${prepRecipeId}/batches`);
  return readJson<{ batches: PrepBatch[] }>(response, "Failed to load batches");
}

export async function logPrepBatchRequest(
  prepRecipeId: string,
  payload: { batchYield: string; shelfLifeDays: number; notes: string },
) {
  const response = await fetch(`/api/prep/${prepRecipeId}/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<{ batch: PrepBatch }>(response, "Failed to log batch");
}
