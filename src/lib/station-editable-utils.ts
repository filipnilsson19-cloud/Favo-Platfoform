import type {
  StationEditableLayout,
  StationEditableLayoutItem,
  StationPackPreset,
  StationPrintPayload,
  StationPrintableRecipe,
} from "@/types/station";

type MeasuredStationCard = {
  recipeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type MeasuredStationPage = {
  pageIndex: number;
  packKey: StationPackPreset["key"];
  cards: MeasuredStationCard[];
};

type StationEditablePage = {
  pageIndex: number;
  packKey: StationPackPreset["key"];
  items: Array<StationEditableLayoutItem & { recipe: StationPrintableRecipe }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createEditableLayoutFromMeasuredPages(params: {
  payload: StationPrintPayload;
  pages: MeasuredStationPage[];
}): StationEditableLayout {
  const items = params.pages.flatMap((page) =>
    page.cards.map((card, index) => ({
      recipeId: card.recipeId,
      page: page.pageIndex,
      x: clamp(card.x, 0, 100),
      y: clamp(card.y, 0, 100),
      width: clamp(card.width, 8, 100),
      height: clamp(card.height, 8, 100),
      zIndex: index + 1,
    })),
  );

  return normalizeEditableLayout(params.payload, {
    version: 1,
    pageCount: Math.max(1, params.pages.length),
    pagePresets: params.pages.map((page) => ({
      page: page.pageIndex,
      packKey: page.packKey,
    })),
    items,
  });
}

export function normalizeEditableLayout(
  payload: StationPrintPayload,
  layout: StationEditableLayout | null | undefined,
): StationEditableLayout {
  const validRecipeIds = new Set(payload.recipes.map((recipe) => recipe.id));

  if (!layout || layout.version !== 1 || !Array.isArray(layout.items)) {
    return {
      version: 1,
      pageCount: 1,
      pagePresets: [],
      items: [],
    };
  }

  const seenRecipeIds = new Set<string>();
  const pagePresets = Array.from({ length: Math.max(1, layout.pageCount) }, (_, page) => {
    const match = layout.pagePresets?.find((entry) => entry.page === page);
    return {
      page,
      packKey: match?.packKey ?? "dense",
    };
  });
  const normalizedItems = layout.items
    .filter((item) => {
      if (!item || typeof item.recipeId !== "string") return false;
      if (!validRecipeIds.has(item.recipeId) || seenRecipeIds.has(item.recipeId)) {
        return false;
      }

      seenRecipeIds.add(item.recipeId);
      return true;
    })
    .map((item, index) => {
      const width = clamp(item.width, 8, 96);
      const height = clamp(item.height, 8, 96);

      return {
        recipeId: item.recipeId,
        page: clamp(
          Number.isFinite(item.page) ? item.page : 0,
          0,
          Math.max(0, layout.pageCount - 1),
        ),
        x: clamp(item.x, 0, Math.max(0, 100 - width)),
        y: clamp(item.y, 0, Math.max(0, 100 - height)),
        width,
        height,
        zIndex:
          Number.isFinite(item.zIndex) && item.zIndex > 0 ? item.zIndex : index + 1,
      } satisfies StationEditableLayoutItem;
    });

  return {
    version: 1,
    pageCount: Math.max(1, layout.pageCount),
    pagePresets,
    items: normalizedItems,
  };
}

export function bringEditableItemToFront(
  layout: StationEditableLayout,
  recipeId: string,
): StationEditableLayout {
  const highestZIndex = layout.items.reduce(
    (highest, item) => Math.max(highest, item.zIndex),
    0,
  );

  return {
    ...layout,
    items: layout.items.map((item) =>
      item.recipeId === recipeId ? { ...item, zIndex: highestZIndex + 1 } : item,
    ),
  };
}

export function updateEditableItem(
  layout: StationEditableLayout,
  recipeId: string,
  updater:
    | Partial<StationEditableLayoutItem>
    | ((item: StationEditableLayoutItem) => Partial<StationEditableLayoutItem>),
): StationEditableLayout {
  const nextLayout = {
    ...layout,
    items: layout.items.map((item) => {
      if (item.recipeId !== recipeId) return item;

      const patch = typeof updater === "function" ? updater(item) : updater;
      const nextItem = { ...item, ...patch };
      const width = clamp(nextItem.width, 8, 96);
      const height = clamp(nextItem.height, 8, 96);

      return {
        ...nextItem,
        width,
        height,
        x: clamp(nextItem.x, 0, Math.max(0, 100 - width)),
        y: clamp(nextItem.y, 0, Math.max(0, 100 - height)),
      };
    }),
  };

  return nextLayout;
}

export function groupEditableLayoutPages(
  payload: StationPrintPayload,
  layout: StationEditableLayout,
): StationEditablePage[] {
  const recipeMap = new Map(
    payload.recipes.map((recipe) => [recipe.id, recipe] as const),
  );

  return Array.from({ length: Math.max(1, layout.pageCount) }, (_, pageIndex) => {
    const pagePreset = layout.pagePresets.find((entry) => entry.page === pageIndex);

    return {
      pageIndex,
      packKey: pagePreset?.packKey ?? "dense",
      items: layout.items
        .filter((item) => item.page === pageIndex)
        .map((item) => {
          const recipe = recipeMap.get(item.recipeId);
          if (!recipe) return null;

          return {
            ...item,
            recipe,
          };
        })
        .filter(
          (
            item,
          ): item is StationEditableLayoutItem & { recipe: StationPrintableRecipe } =>
            item !== null,
        )
        .sort((left, right) => left.zIndex - right.zIndex),
    };
  });
}

export function mergeEditableLayouts(
  base: StationEditableLayout,
  saved: StationEditableLayout,
): StationEditableLayout {
  const savedMap = new Map(saved.items.map((item) => [item.recipeId, item] as const));
  const highestSavedZIndex = saved.items.reduce(
    (highest, item) => Math.max(highest, item.zIndex),
    0,
  );

  return {
    version: 1,
    pageCount: Math.max(base.pageCount, saved.pageCount),
    pagePresets:
      saved.pagePresets.length > 0
        ? saved.pagePresets
        : base.pagePresets,
    items: base.items.map((item, index) => {
      const savedItem = savedMap.get(item.recipeId);

      if (!savedItem) {
        return {
          ...item,
          zIndex: highestSavedZIndex + index + 1,
        };
      }

      return {
        ...item,
        page: savedItem.page,
        x: savedItem.x,
        y: savedItem.y,
        width: savedItem.width,
        height: savedItem.height,
        zIndex: savedItem.zIndex,
      };
    }),
  };
}
