import type { Recipe, RecipeCategory } from "@/types/recipe";
import type { AppCategory } from "@/types/category";
import type { AppStationView } from "@/types/station-view";

async function readJson<T>(response: Response, errorMessage: string) {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || errorMessage);
  }

  return (await response.json()) as T;
}

export async function saveRecipeRequest(recipe: Recipe) {
  const response = await fetch("/api/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipe }),
  });

  return readJson<{ recipe: Recipe }>(response, "Failed to save recipe");
}

export async function deleteRecipeRequest(recipeId: string) {
  const response = await fetch("/api/recipes", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipeId }),
  });

  return readJson<{ success: true }>(response, "Failed to delete recipe");
}

export async function createCategoryRequest(name: string) {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return readJson<{ category: RecipeCategory }>(
    response,
    "Failed to create category",
  );
}

export async function loadManagedCategoriesRequest() {
  const response = await fetch("/api/categories?manage=1");
  return readJson<{ categories: AppCategory[] }>(
    response,
    "Failed to load categories",
  );
}

export async function renameManagedCategoryRequest(
  name: string,
  nextName: string,
) {
  const response = await fetch("/api/categories", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "rename",
      name,
      nextName,
    }),
  });

  return readJson<{
    categories: AppCategory[];
    category: RecipeCategory;
    previousName: RecipeCategory;
  }>(response, "Failed to rename category");
}

export async function setManagedCategoryActiveRequest(
  name: string,
  isActive: boolean,
) {
  const response = await fetch("/api/categories", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "set-active",
      name,
      isActive,
    }),
  });

  return readJson<{ categories: AppCategory[] }>(
    response,
    "Failed to update category state",
  );
}

export async function loadManagedStationViewsRequest() {
  const response = await fetch("/api/station-views?manage=1");
  return readJson<{ views: AppStationView[] }>(
    response,
    "Failed to load station views",
  );
}

export async function renameManagedStationViewRequest(
  viewId: string,
  nextName: string,
) {
  const response = await fetch("/api/station-views", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "rename",
      id: viewId,
      nextName,
    }),
  });

  return readJson<{ views: AppStationView[] }>(
    response,
    "Failed to rename station view",
  );
}

export async function setManagedStationViewActiveRequest(
  viewId: string,
  isActive: boolean,
) {
  const response = await fetch("/api/station-views", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "set-active",
      id: viewId,
      isActive,
    }),
  });

  return readJson<{ views: AppStationView[] }>(
    response,
    "Failed to update station view state",
  );
}

export async function deleteManagedStationViewRequest(viewId: string) {
  const response = await fetch("/api/station-views", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ viewId }),
  });

  return readJson<{ views: AppStationView[] }>(
    response,
    "Failed to delete station view",
  );
}
