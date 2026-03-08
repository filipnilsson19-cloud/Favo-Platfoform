export type PrepStatus = "Publicerad" | "Utkast" | "Inaktiv";

export type PrepIngredient = {
  info: string;
  name: string;
  amount: string;
  unit: string;
};

export type PrepStep = {
  description: string;
};

export type PrepRecipe = {
  id: string;
  title: string;
  category: string;
  status: PrepStatus;
  shelfLifeDays: number;
  defaultYield: string;
  yieldUnit: string;
  allergens: string;
  notes: string;
  ingredients: PrepIngredient[];
  steps: PrepStep[];
};

export type PrepBatch = {
  id: string;
  prepRecipeId: string;
  madeAt: string;
  bestBefore: string;
  batchYield: string;
  notes: string;
  madeByName: string;
};

export type AppPrepCategory = {
  id: string;
  name: string;
  isActive: boolean;
  recipeCount: number;
};

export type PrepEditorMode = "new" | "edit";
