import type { RecipeCategory, RecipeStatus } from "@/types/recipe";

export type ViewMode = "card" | "table";
export type CategoryOption = RecipeCategory | "Alla";
export type ActiveStatus = RecipeStatus | "Alla";
