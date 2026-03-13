import type { PrepRecipe } from "@/types/prep";
import type { Recipe } from "@/types/recipe";

export type CostUnit = string;
export type CostDimension = "weight" | "volume" | "count" | "unknown";
export type CostSourceKind = "raw" | "prep";
export type CostSection = "raw" | "prep" | "menu";

export type RawIngredient = {
  id: string;
  name: string;
  supplier: string;
  purchasePrice: number;
  packageType: string;
  packageCount: number;
  purchaseAmount: number;
  purchaseUnit: CostUnit;
  yieldPercent: number;
  notes: string;
  isActive: boolean;
};

export type PrepIngredientCostLink = {
  ingredientIndex: number;
  rawIngredientId: string | null;
};

export type RecipeItemCostLink = {
  itemIndex: number;
  sourceKind: CostSourceKind;
  rawIngredientId: string | null;
  prepRecipeId: string | null;
};

export type RecipeCostProfile = {
  recipeId: string;
  sellingPriceInclVat: number;
  vatRate: number;
};

export type CostPrepRecipe = PrepRecipe & {
  ingredientLinks: PrepIngredientCostLink[];
};

export type CostMenuRecipe = Recipe & {
  itemLinks: RecipeItemCostLink[];
  costProfile: RecipeCostProfile;
};

export type PrepIngredientCostRow = {
  index: number;
  name: string;
  info: string;
  amount: string;
  unit: CostUnit;
  linkedRawIngredientId: string | null;
  guessedRawIngredientId: string | null;
  resolvedRawIngredientId: string | null;
  resolvedRawIngredientName: string | null;
  lineCost: number | null;
  isResolved: boolean;
};

export type RecipeItemCostRow = {
  index: number;
  name: string;
  info: string;
  amount: string;
  unit: CostUnit;
  sourceKind: CostSourceKind;
  rawIngredientId: string | null;
  prepRecipeId: string | null;
  guessedSourceKind: CostSourceKind | null;
  guessedRawIngredientId: string | null;
  guessedPrepRecipeId: string | null;
  resolvedLabel: string | null;
  lineCost: number | null;
  isResolved: boolean;
};

export type PrepCostSummary = {
  id: string;
  title: string;
  category: string;
  outputLabel: string;
  totalCost: number | null;
  unitCostLabel: string;
  resolvedCount: number;
  ingredientCount: number;
};

export type MenuCostSummary = {
  id: string;
  title: string;
  category: string;
  totalCost: number | null;
  sellingPriceInclVat: number;
  sellingPriceExVat: number | null;
  vatRate: number;
  grossMarginSek: number | null;
  grossMarginPercent: number | null;
  foodCostPercent: number | null;
  resolvedCount: number;
  itemCount: number;
};

export type PrepCostDetail = {
  recipe: CostPrepRecipe;
  rows: PrepIngredientCostRow[];
  totalCost: number | null;
  outputLabel: string;
  unitCostLabel: string;
};

export type MenuCostDetail = {
  recipe: CostMenuRecipe;
  rows: RecipeItemCostRow[];
  totalCost: number | null;
  sellingPriceInclVat: number;
  sellingPriceExVat: number | null;
  grossMarginSek: number | null;
  grossMarginPercent: number | null;
  foodCostPercent: number | null;
};

export type CostingPayload = {
  rawIngredients: RawIngredient[];
  prepRecipes: CostPrepRecipe[];
  menuRecipes: CostMenuRecipe[];
};
