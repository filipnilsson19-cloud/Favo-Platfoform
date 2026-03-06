import type { RecipeCategory, RecipeItem } from "@/types/recipe";

export type StationSource = "visible" | "selected";

export type StationPrintableRecipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  totalAmount: string;
  items: RecipeItem[];
};

export type StationPrintPayload = {
  title: string;
  source: StationSource;
  sourceLabel: string;
  showCategoryLabel: boolean;
  recipeCount: number;
  recipes: StationPrintableRecipe[];
};

export type StationLayoutPreset = {
  key: "single" | "duo" | "spread" | "dense" | "compact";
  columns: number;
  maxCards: number;
  columnCapacity: number;
  baseLoad: number;
  rowLoad: number;
  wrapChars: number;
  titleChars: number;
  titleLineLoad: number;
  categoryLoad: number;
  infoLoad: number;
};

export type StationPackedColumn = {
  recipes: StationPrintableRecipe[];
  load: number;
};

export type StationPagePack = {
  layout: StationLayoutPreset;
  columns: StationPackedColumn[];
  usedCount: number;
  balanceGap: number;
};
