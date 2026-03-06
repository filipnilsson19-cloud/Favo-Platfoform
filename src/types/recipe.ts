export type RecipeCategory =
  | "Bowl"
  | "Sallad"
  | "Burger"
  | "Taco"
  | "Bao"
  | "Sides"
  | "Sås";

export type RecipeStatus = "Publicerad" | "Utkast";

export type RecipeItem = {
  info: string;
  name: string;
  amount: string;
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
