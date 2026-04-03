import {
  groupEditableLayoutPages,
  normalizeEditableLayout,
} from "@/lib/station-editable-utils";
import type { StationPrintBundle, StationPrintableRecipe } from "@/types/station";

const CATEGORY_FILL_MAP: Record<string, string> = {
  Bowl: "#D8E8FA",
  Sallad: "#E3F0D4",
  Burger: "#F6DDC9",
  Taco: "#FBE7A8",
  Bao: "#E3E3E3",
  Sides: "#DCEAF8",
  "S\u00e5s": "#F1E2C7",
};

const DEFAULT_FILL = "#E9EEF6";

export const STATION_SHEET_PAGE_MAX_ROWS = 66;

type StationPlacedRecipe = {
  recipe: StationPrintableRecipe;
  startColumn: number;
  startRow: number;
  rowSpan: number;
};

export type StationKitchenPage = {
  recipes: StationPlacedRecipe[];
  maxRow: number;
};

function getRecipeBlockHeight(recipe: StationPrintableRecipe) {
  return recipe.items.length + 2;
}

function getRecipeGroups(bundle: StationPrintBundle) {
  const payload = bundle.payload;

  if (!bundle.editableLayout) {
    return [payload.recipes];
  }

  const normalizedLayout = normalizeEditableLayout(payload, bundle.editableLayout);
  const editablePages = groupEditableLayoutPages(payload, normalizedLayout)
    .map((page) =>
      [...page.items]
        .sort(
          (left, right) => left.y - right.y || left.x - right.x || left.zIndex - right.zIndex,
        )
        .map((item) => item.recipe),
    )
    .filter((recipes) => recipes.length > 0);

  return editablePages.length > 0 ? editablePages : [payload.recipes];
}

function layoutRecipesIntoPages(recipes: StationPrintableRecipe[]) {
  const pages: StationKitchenPage[] = [];
  let currentPage: StationKitchenPage = { recipes: [], maxRow: 1 };
  let leftCursor = 1;
  let rightCursor = 1;

  recipes.forEach((recipe, recipeIndex) => {
    const placeOnLeft = recipeIndex % 2 === 0;
    const startColumn = placeOnLeft ? 1 : 5;
    const rowSpan = getRecipeBlockHeight(recipe);
    let startRow = placeOnLeft ? leftCursor : rightCursor;

    if (
      currentPage.recipes.length > 0 &&
      startRow + rowSpan - 1 > STATION_SHEET_PAGE_MAX_ROWS
    ) {
      pages.push(currentPage);
      currentPage = { recipes: [], maxRow: 1 };
      leftCursor = 1;
      rightCursor = 1;
      startRow = placeOnLeft ? leftCursor : rightCursor;
    }

    currentPage.recipes.push({
      recipe,
      startColumn,
      startRow,
      rowSpan,
    });
    currentPage.maxRow = Math.max(currentPage.maxRow, startRow + rowSpan - 1);

    if (placeOnLeft) {
      leftCursor = startRow + rowSpan + 1;
    } else {
      rightCursor = startRow + rowSpan + 1;
    }
  });

  if (currentPage.recipes.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

export function buildStationKitchenPages(bundle: StationPrintBundle | null) {
  if (!bundle?.payload || bundle.payload.recipes.length === 0) {
    return [];
  }

  return getRecipeGroups(bundle).flatMap((recipes) => layoutRecipesIntoPages(recipes));
}

export function getStationKitchenCategoryFill(category: string) {
  return CATEGORY_FILL_MAP[category] ?? DEFAULT_FILL;
}
