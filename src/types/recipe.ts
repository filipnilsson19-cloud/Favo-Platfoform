export type RecipeCategory = string;

export type RecipeStatus = "Publicerad" | "Utkast" | "Inaktiv";

export type RecipeUnit =
  | "g"
  | "kg"
  | "ml"
  | "cl"
  | "dl"
  | "l"
  | "st"
  | "tsk"
  | "msk";

export type RecipeItem = {
  info: string;
  name: string;
  amount: string;
  unit: RecipeUnit;
  isEmphasis: boolean;
  isSpacer: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  status: RecipeStatus;
  servings: number;
  updatedLabel: string;
  allergens: string;
  notes: string;
  summary: string;
  intro: string;
  items: RecipeItem[];
};

export type EditorMode = "new" | "edit" | "duplicate";
