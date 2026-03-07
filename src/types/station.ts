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

export type StationPrintBundle = {
  payload: StationPrintPayload;
  editableLayout?: StationEditableLayout | null;
};

export type StationViewMode = "static" | "editable";

export type StationEditableLayoutItem = {
  recipeId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type StationEditableLayout = {
  version: 1;
  pageCount: number;
  pagePresets: Array<{
    page: number;
    packKey: StationPackPreset["key"];
  }>;
  items: StationEditableLayoutItem[];
};

export type StationPackPreset = {
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
  layout: StationPackPreset;
  columns: StationPackedColumn[];
  usedCount: number;
  balanceGap: number;
};
