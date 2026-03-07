import { computeAmountSummary } from "@/lib/recipe-utils";
import type { Recipe } from "@/types/recipe";
import type {
  StationPackPreset,
  StationPackedColumn,
  StationPagePack,
  StationPrintBundle,
  StationPrintPayload,
  StationPrintableRecipe,
  StationSource,
} from "@/types/station";

export const STATION_PRINT_STORAGE_KEY = "favo.station-print-payload";

const STATION_LAYOUT_PRESETS: Record<
  StationPackPreset["key"],
  StationPackPreset
> = {
  single: {
    key: "single",
    columns: 1,
    maxCards: 1,
    columnCapacity: 34,
    baseLoad: 6.2,
    rowLoad: 1.58,
    wrapChars: 34,
    titleChars: 24,
    titleLineLoad: 0.84,
    categoryLoad: 0.55,
    infoLoad: 0.14,
  },
  duo: {
    key: "duo",
    columns: 2,
    maxCards: 2,
    columnCapacity: 28.5,
    baseLoad: 4.5,
    rowLoad: 1.08,
    wrapChars: 27,
    titleChars: 18,
    titleLineLoad: 0.7,
    categoryLoad: 0.48,
    infoLoad: 0.1,
  },
  spread: {
    key: "spread",
    columns: 2,
    maxCards: 4,
    columnCapacity: 27,
    baseLoad: 3.05,
    rowLoad: 0.84,
    wrapChars: 22,
    titleChars: 15,
    titleLineLoad: 0.54,
    categoryLoad: 0.34,
    infoLoad: 0.08,
  },
  dense: {
    key: "dense",
    columns: 3,
    maxCards: 6,
    columnCapacity: 24.1,
    baseLoad: 2.28,
    rowLoad: 0.67,
    wrapChars: 18,
    titleChars: 13,
    titleLineLoad: 0.38,
    categoryLoad: 0.26,
    infoLoad: 0.06,
  },
  compact: {
    key: "compact",
    columns: 4,
    maxCards: 8,
    columnCapacity: 21.7,
    baseLoad: 1.62,
    rowLoad: 0.54,
    wrapChars: 15,
    titleChars: 11,
    titleLineLoad: 0.28,
    categoryLoad: 0.22,
    infoLoad: 0.04,
  },
};

function getStationPackCandidates(count: number) {
  if (count <= 1) {
    return [STATION_LAYOUT_PRESETS.single];
  }

  if (count === 2) {
    return [STATION_LAYOUT_PRESETS.duo, STATION_LAYOUT_PRESETS.spread];
  }

  if (count <= 4) {
    return [STATION_LAYOUT_PRESETS.spread, STATION_LAYOUT_PRESETS.dense];
  }

  if (count <= 6) {
    return [
      STATION_LAYOUT_PRESETS.dense,
      STATION_LAYOUT_PRESETS.compact,
      STATION_LAYOUT_PRESETS.spread,
    ];
  }

  return [STATION_LAYOUT_PRESETS.compact, STATION_LAYOUT_PRESETS.dense];
}

function estimateWrappedLines(value: string, maxChars: number) {
  const cleaned = value.trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / maxChars));
}

function estimateStationRecipeLoad(
  recipe: StationPrintableRecipe,
  layout: StationPackPreset,
  showCategoryLabel: boolean,
) {
  const titleLines = estimateWrappedLines(recipe.title, layout.titleChars);
  const itemLoad = recipe.items.reduce((sum, item) => {
    if (item.isSpacer) {
      return sum + layout.rowLoad * 0.38;
    }

    const nameLines = estimateWrappedLines(item.name, layout.wrapChars);
    const infoLoad = item.info ? layout.infoLoad : 0;
    return sum + nameLines * layout.rowLoad + infoLoad;
  }, 0);

  return (
    layout.baseLoad +
    itemLoad +
    Math.max(0, titleLines - 1) * layout.titleLineLoad +
    (showCategoryLabel ? layout.categoryLoad : 0)
  );
}

function packStationPage(
  recipes: StationPrintableRecipe[],
  layout: StationPackPreset,
  showCategoryLabel: boolean,
): StationPagePack {
  const columns: StationPackedColumn[] = Array.from(
    { length: layout.columns },
    () => ({
    recipes: [],
    load: 0,
  }),
  );

  let usedCount = 0;
  const maxCards = Math.min(layout.maxCards, recipes.length);

  for (let index = 0; index < maxCards; index += 1) {
    const recipe = recipes[index];
    const recipeLoad = estimateStationRecipeLoad(
      recipe,
      layout,
      showCategoryLabel,
    );

    const placeableColumns = columns
      .map((column, columnIndex) => ({ column, columnIndex }))
      .filter(
        ({ column }) =>
          column.load + recipeLoad <= layout.columnCapacity ||
          column.recipes.length === 0,
      )
      .sort(
        (left, right) =>
          left.column.load - right.column.load ||
          left.columnIndex - right.columnIndex,
      );

    if (placeableColumns.length === 0) {
      break;
    }

    const targetColumn = placeableColumns[0].column;
    targetColumn.recipes.push(recipe);
    targetColumn.load += recipeLoad;
    usedCount += 1;
  }

  if (usedCount === 0 && recipes.length > 0) {
    columns[0].recipes.push(recipes[0]);
    columns[0].load = estimateStationRecipeLoad(
      recipes[0],
      layout,
      showCategoryLabel,
    );
    usedCount = 1;
  }

  const usedLoads = columns
    .filter((column) => column.recipes.length > 0)
    .map((column) => column.load);
  const balanceGap =
    usedLoads.length > 1 ? Math.max(...usedLoads) - Math.min(...usedLoads) : 0;

  return {
    layout,
    columns,
    usedCount,
    balanceGap,
  };
}

function chooseStationPagePack(
  recipes: StationPrintableRecipe[],
  showCategoryLabel: boolean,
) {
  const candidates = getStationPackCandidates(recipes.length);

  return candidates.reduce<StationPagePack | null>((bestPack, layout) => {
    const candidatePack = packStationPage(recipes, layout, showCategoryLabel);

    if (!bestPack) {
      return candidatePack;
    }

    if (candidatePack.usedCount !== bestPack.usedCount) {
      return candidatePack.usedCount > bestPack.usedCount
        ? candidatePack
        : bestPack;
    }

    if (candidatePack.layout.columns !== bestPack.layout.columns) {
      return candidatePack.layout.columns < bestPack.layout.columns
        ? candidatePack
        : bestPack;
    }

    return candidatePack.balanceGap < bestPack.balanceGap
      ? candidatePack
      : bestPack;
  }, null);
}

export function paginateStationRecipes(
  recipes: StationPrintableRecipe[],
  showCategoryLabel: boolean,
) {
  const pages: StationPagePack[] = [];
  let cursor = 0;

  while (cursor < recipes.length) {
    const remainingRecipes = recipes.slice(cursor);
    const pagePack = chooseStationPagePack(remainingRecipes, showCategoryLabel);

    if (!pagePack) break;

    pages.push(pagePack);
    cursor += pagePack.usedCount;
  }

  return pages;
}

export function serializeStationPrintBundle(bundle: StationPrintBundle) {
  return JSON.stringify(bundle);
}

export function buildStationViewScope(params: {
  source: StationSource;
  activeCategory: string;
  selectedRecipeIds: string[];
}) {
  if (params.source === "selected") {
    const sortedIds = [...params.selectedRecipeIds].sort();

    return {
      key: `selected:${sortedIds.join(",")}`,
      label:
        sortedIds.length === 1
          ? "Valt recept"
          : `${sortedIds.length} valda recept`,
    };
  }

  const categoryLabel = params.activeCategory || "Alla";

  return {
    key: `category:${categoryLabel}`,
    label: `Kategori: ${categoryLabel}`,
  };
}

export function buildStationMeta(recipeCount: number) {
  return `${recipeCount} recept`;
}

function describeStationSource(
  source: StationSource,
  recipes: Recipe[],
  activeCategory: string,
) {
  if (source === "selected") {
    return recipes.length === 1
      ? "1 markerat recept"
      : `${recipes.length} markerade recept`;
  }

  if (activeCategory === "Flera kategorier") {
    return "Synliga recept i flera kategorier";
  }

  if (activeCategory !== "Alla") {
    return `Synliga recept i ${activeCategory}`;
  }

  return "Alla synliga recept";
}

function buildStationHeading(
  source: StationSource,
  recipes: Recipe[],
  activeCategory: string,
) {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))];

  if (source === "selected") {
    if (categories.length === 1) {
      return `${categories[0]} - valda recept`;
    }

    return "Valda recept";
  }

  if (activeCategory === "Flera kategorier") {
    return "Stationsblad";
  }

  if (activeCategory !== "Alla") {
    return `${activeCategory} station`;
  }

  if (categories.length === 1) {
    return `${categories[0]} station`;
  }

  return "Stationsblad";
}

export function buildStationPayload(params: {
  source: StationSource;
  visibleRecipes: Recipe[];
  selectedRecipes: Recipe[];
  activeCategory: string;
}): StationPrintPayload {
  const sourceRecipes =
    params.source === "selected" && params.selectedRecipes.length > 0
      ? params.selectedRecipes
      : params.visibleRecipes;

  const showCategoryLabel =
    new Set(sourceRecipes.map((recipe) => recipe.category)).size > 1;

  return {
    title: buildStationHeading(
      params.source,
      sourceRecipes,
      params.activeCategory,
    ),
    source: params.source,
    sourceLabel: describeStationSource(
      params.source,
      sourceRecipes,
      params.activeCategory,
    ),
    showCategoryLabel,
    recipeCount: sourceRecipes.length,
    recipes: sourceRecipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      totalAmount: computeAmountSummary(recipe.items),
      items: recipe.items.map((item) => ({ ...item })),
    })),
  };
}
