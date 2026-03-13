import type {
  CostDimension,
  CostMenuRecipe,
  CostPrepRecipe,
  CostSourceKind,
  MenuCostDetail,
  MenuCostSummary,
  PrepCostDetail,
  PrepCostSummary,
  RawIngredient,
} from "@/types/costing";

const weightFactors: Record<string, number> = {
  g: 1,
  kg: 1000,
};

const volumeFactors: Record<string, number> = {
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  liter: 1000,
  tsk: 5,
  msk: 15,
};

const countFactors: Record<string, number> = {
  st: 1,
  port: 1,
  sats: 1,
  bricka: 1,
  förpackning: 1,
};

export function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getUnitDimension(unit: string): CostDimension {
  const candidate = unit.trim().toLowerCase();
  if (candidate in weightFactors) return "weight";
  if (candidate in volumeFactors) return "volume";
  if (candidate in countFactors) return "count";
  return "unknown";
}

export function convertToBaseUnit(amount: number, unit: string) {
  const candidate = unit.trim().toLowerCase();
  if (candidate in weightFactors) return amount * (weightFactors[candidate] ?? 1);
  if (candidate in volumeFactors) return amount * (volumeFactors[candidate] ?? 1);
  if (candidate in countFactors) return amount * (countFactors[candidate] ?? 1);
  return null;
}

export function parseNumeric(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = value.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatSek(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Ej beräknad";
  return `${roundMoney(value).toFixed(2)} kr`;
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 10) / 10}%`;
}

export function formatComparePrice(rawIngredient: RawIngredient) {
  const unitCost = getRawIngredientBaseCost(rawIngredient);
  const dimension = getUnitDimension(rawIngredient.purchaseUnit);

  if (unitCost === null) return "Ej beräknad";
  if (dimension === "weight") return `${roundMoney(unitCost * 1000).toFixed(2)} kr/kg`;
  if (dimension === "volume") return `${roundMoney(unitCost * 1000).toFixed(2)} kr/l`;
  if (dimension === "count") return `${roundMoney(unitCost).toFixed(2)} kr/st`;
  return "Ej beräknad";
}

export function getRawIngredientTotalAmount(rawIngredient: RawIngredient) {
  return roundMoney(rawIngredient.packageCount * rawIngredient.purchaseAmount);
}

export function formatQuantity(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function formatRawIngredientPackage(rawIngredient: RawIngredient) {
  const countLabel = `${formatQuantity(rawIngredient.packageCount)} x ${formatQuantity(rawIngredient.purchaseAmount)} ${rawIngredient.purchaseUnit}`;
  return `1 ${rawIngredient.packageType} · ${countLabel}`;
}

export function formatRawIngredientTotalQuantity(rawIngredient: RawIngredient) {
  return `${formatQuantity(getRawIngredientTotalAmount(rawIngredient))} ${rawIngredient.purchaseUnit}`;
}

export function getRawIngredientBaseCost(rawIngredient: RawIngredient) {
  const amount = getRawIngredientTotalAmount(rawIngredient);
  if (!amount || amount <= 0) return null;

  const baseAmount = convertToBaseUnit(amount, rawIngredient.purchaseUnit);
  if (!baseAmount || baseAmount <= 0) return null;

  const usableFactor = Math.max(0.01, rawIngredient.yieldPercent / 100);
  return rawIngredient.purchasePrice / (baseAmount * usableFactor);
}

function guessRawIngredientId(name: string, rawIngredients: RawIngredient[]) {
  const normalized = normalizeName(name);
  const exact = rawIngredients.find((raw) => normalizeName(raw.name) === normalized);
  return exact?.id ?? null;
}

function guessPrepRecipeId(name: string, prepRecipes: CostPrepRecipe[]) {
  const normalized = normalizeName(name);
  const exact = prepRecipes.find((prep) => normalizeName(prep.title) === normalized);
  return exact?.id ?? null;
}

function getReadableOutputUnit(dimension: CostDimension, baseAmount: number) {
  if (dimension === "weight") {
    if (baseAmount >= 1000) {
      return {
        amount: roundMoney(baseAmount / 1000),
        unit: "kg",
      };
    }

    return {
      amount: roundMoney(baseAmount),
      unit: "g",
    };
  }

  if (dimension === "volume") {
    if (baseAmount >= 1000) {
      return {
        amount: roundMoney(baseAmount / 1000),
        unit: "l",
      };
    }

    return {
      amount: roundMoney(baseAmount),
      unit: "ml",
    };
  }

  if (dimension === "count") {
    return {
      amount: roundMoney(baseAmount),
      unit: "st",
    };
  }

  return null;
}

function getCompareFactorForDimension(dimension: CostDimension) {
  if (dimension === "weight" || dimension === "volume") return 1000;
  if (dimension === "count") return 1;
  return null;
}

function getCompareUnitForDimension(dimension: CostDimension) {
  if (dimension === "weight") return "kg";
  if (dimension === "volume") return "l";
  if (dimension === "count") return "st";
  return null;
}

function getCalculatedPrepOutput(recipe: CostPrepRecipe) {
  const totals = recipe.ingredients.reduce(
    (accumulator, ingredient) => {
      if (!ingredient.name.trim()) return accumulator;

      const amount = parseNumeric(ingredient.amount);
      const dimension = getUnitDimension(ingredient.unit);
      const baseAmount = amount !== null ? convertToBaseUnit(amount, ingredient.unit) : null;

      if (amount === null || baseAmount === null || dimension === "unknown") {
        accumulator.unknown = true;
        return accumulator;
      }

      accumulator.dimensions.add(dimension);
      accumulator.totals[dimension] += baseAmount;
      return accumulator;
    },
    {
      totals: {
        weight: 0,
        volume: 0,
        count: 0,
      } as Record<Exclude<CostDimension, "unknown">, number>,
      dimensions: new Set<Exclude<CostDimension, "unknown">>(),
      unknown: false,
    },
  );

  if (totals.dimensions.size !== 1 || totals.unknown) {
    return null;
  }

  const [dimension] = Array.from(totals.dimensions);
  const baseAmount = totals.totals[dimension];
  if (!baseAmount || baseAmount <= 0) {
    return null;
  }

  const readable = getReadableOutputUnit(dimension, baseAmount);
  if (!readable) {
    return null;
  }

  return {
    dimension,
    baseAmount,
    displayAmount: readable.amount,
    displayUnit: readable.unit,
    label: `${formatQuantity(readable.amount)} ${readable.unit}`,
    source: "calculated" as const,
  };
}

function getManualPrepOutput(recipe: CostPrepRecipe) {
  const outputAmount = parseNumeric(recipe.defaultYield);
  if (outputAmount === null) {
    return null;
  }

  const unit = recipe.yieldUnit?.trim() || "";
  const dimension = getUnitDimension(unit);
  const baseAmount = convertToBaseUnit(outputAmount, unit);

  if (!unit || dimension === "unknown" || baseAmount === null || baseAmount <= 0) {
    return null;
  }

  return {
    dimension,
    baseAmount,
    displayAmount: roundMoney(outputAmount),
    displayUnit: unit,
    label: `${formatQuantity(outputAmount)} ${unit}`,
    source: "manual" as const,
  };
}

function getPrepRecipeOutput(recipe: CostPrepRecipe) {
  return getCalculatedPrepOutput(recipe) ?? getManualPrepOutput(recipe);
}

function getPrepRecipeUnitCost(prepRecipe: CostPrepRecipe, rawIngredients: RawIngredient[]) {
  const detail = buildPrepCostDetail(prepRecipe, rawIngredients);
  const output = getPrepRecipeOutput(prepRecipe);
  if (detail.totalCost === null || !output || output.baseAmount <= 0) return null;

  return detail.totalCost / output.baseAmount;
}

export function buildPrepCostDetail(recipe: CostPrepRecipe, rawIngredients: RawIngredient[]): PrepCostDetail {
  const rows = recipe.ingredients.map((ingredient, index) => {
    const savedLink = recipe.ingredientLinks.find((link) => link.ingredientIndex === index);
    const guessedRawIngredientId = guessRawIngredientId(ingredient.name, rawIngredients);
    const resolvedRawIngredientId = savedLink?.rawIngredientId ?? guessedRawIngredientId;
    const rawIngredient = rawIngredients.find((item) => item.id === resolvedRawIngredientId) ?? null;
    const amount = parseNumeric(ingredient.amount);
    const ingredientBase = amount !== null ? convertToBaseUnit(amount, ingredient.unit) : null;
    const rawCost = rawIngredient ? getRawIngredientBaseCost(rawIngredient) : null;
    const unitDimension = getUnitDimension(ingredient.unit);
    const sourceDimension = rawIngredient ? getUnitDimension(rawIngredient.purchaseUnit) : "unknown";
    const lineCost =
      rawIngredient &&
      rawCost !== null &&
      ingredientBase !== null &&
      unitDimension !== "unknown" &&
      unitDimension === sourceDimension
        ? roundMoney(rawCost * ingredientBase)
        : null;

    return {
      index,
      name: ingredient.name,
      info: ingredient.info,
      amount: ingredient.amount,
      unit: ingredient.unit,
      linkedRawIngredientId: savedLink?.rawIngredientId ?? null,
      guessedRawIngredientId,
      resolvedRawIngredientId,
      resolvedRawIngredientName: rawIngredient?.name ?? null,
      lineCost,
      isResolved: lineCost !== null,
    };
  });

  const resolvedRows = rows.filter((row) => row.lineCost !== null);
  const totalCost = resolvedRows.length === rows.filter((row) => row.name.trim()).length
    ? roundMoney(resolvedRows.reduce((sum, row) => sum + Number(row.lineCost ?? 0), 0))
    : resolvedRows.length > 0
      ? roundMoney(resolvedRows.reduce((sum, row) => sum + Number(row.lineCost ?? 0), 0))
      : null;

  const output = getPrepRecipeOutput(recipe);
  const compareFactor = output ? getCompareFactorForDimension(output.dimension) : null;
  const compareUnit = output ? getCompareUnitForDimension(output.dimension) : null;
  const unitCostLabel =
    totalCost !== null && output && output.baseAmount > 0 && compareFactor && compareUnit
      ? `${roundMoney((totalCost / output.baseAmount) * compareFactor).toFixed(2)} kr/${compareUnit}`
      : "Ej beräknad";

  return {
    recipe,
    rows,
    totalCost,
    outputLabel: output?.label ?? "Blandade mått",
    unitCostLabel,
  };
}

export function buildPrepCostSummary(recipe: CostPrepRecipe, rawIngredients: RawIngredient[]): PrepCostSummary {
  const detail = buildPrepCostDetail(recipe, rawIngredients);
  const ingredientCount = recipe.ingredients.filter((ingredient) => ingredient.name.trim()).length;
  const resolvedCount = detail.rows.filter((row) => row.isResolved).length;

  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    outputLabel: detail.outputLabel,
    totalCost: detail.totalCost,
    unitCostLabel: detail.unitCostLabel,
    resolvedCount,
    ingredientCount,
  };
}

export function buildMenuCostDetail(
  recipe: CostMenuRecipe,
  rawIngredients: RawIngredient[],
  prepRecipes: CostPrepRecipe[],
): MenuCostDetail {
  const rows = recipe.items.map((item, index) => {
    const savedLink = recipe.itemLinks.find((link) => link.itemIndex === index);
    const guessedPrepRecipeId = guessPrepRecipeId(item.name, prepRecipes);
    const guessedRawIngredientId = guessRawIngredientId(item.name, rawIngredients);
    const sourceKind: CostSourceKind =
      savedLink?.sourceKind ??
      (guessedPrepRecipeId ? "prep" : "raw");
    const resolvedPrepRecipeId =
      sourceKind === "prep" ? savedLink?.prepRecipeId ?? guessedPrepRecipeId : null;
    const resolvedRawIngredientId =
      sourceKind === "raw" ? savedLink?.rawIngredientId ?? guessedRawIngredientId : null;

    const amount = parseNumeric(item.amount);
    const itemBase = amount !== null ? convertToBaseUnit(amount, item.unit) : null;

    let lineCost: number | null = null;
    let resolvedLabel: string | null = null;

    if (sourceKind === "raw" && resolvedRawIngredientId) {
      const rawIngredient = rawIngredients.find((candidate) => candidate.id === resolvedRawIngredientId) ?? null;
      const rawCost = rawIngredient ? getRawIngredientBaseCost(rawIngredient) : null;
      const unitDimension = getUnitDimension(item.unit);
      const sourceDimension = rawIngredient ? getUnitDimension(rawIngredient.purchaseUnit) : "unknown";

      if (rawIngredient && rawCost !== null && itemBase !== null && unitDimension === sourceDimension) {
        lineCost = roundMoney(rawCost * itemBase);
        resolvedLabel = rawIngredient.name;
      }
    }

    if (sourceKind === "prep" && resolvedPrepRecipeId) {
      const prepRecipe = prepRecipes.find((candidate) => candidate.id === resolvedPrepRecipeId) ?? null;
      const prepUnitCost = prepRecipe ? getPrepRecipeUnitCost(prepRecipe, rawIngredients) : null;
      const itemDimension = getUnitDimension(item.unit);
      const prepDimension = prepRecipe ? (getPrepRecipeOutput(prepRecipe)?.dimension ?? "unknown") : "unknown";

      if (prepRecipe && prepUnitCost !== null && itemBase !== null && itemDimension === prepDimension) {
        lineCost = roundMoney(prepUnitCost * itemBase);
        resolvedLabel = prepRecipe.title;
      }
    }

    return {
      index,
      name: item.name,
      info: item.info,
      amount: item.amount,
      unit: item.unit,
      sourceKind,
      rawIngredientId: sourceKind === "raw" ? resolvedRawIngredientId : null,
      prepRecipeId: sourceKind === "prep" ? resolvedPrepRecipeId : null,
      guessedSourceKind: guessedPrepRecipeId
        ? ("prep" as CostSourceKind)
        : guessedRawIngredientId
          ? ("raw" as CostSourceKind)
          : null,
      guessedRawIngredientId,
      guessedPrepRecipeId,
      resolvedLabel,
      lineCost,
      isResolved: lineCost !== null,
    };
  });

  const costableRows = rows.filter((row) => row.name.trim());
  const resolvedRows = costableRows.filter((row) => row.lineCost !== null);
  const totalCost = resolvedRows.length > 0
    ? roundMoney(resolvedRows.reduce((sum, row) => sum + Number(row.lineCost ?? 0), 0))
    : null;

  const sellingPriceInclVat = recipe.costProfile.sellingPriceInclVat;
  const vatRate = recipe.costProfile.vatRate;
  const sellingPriceExVat =
    sellingPriceInclVat > 0 ? roundMoney(sellingPriceInclVat / (1 + vatRate / 100)) : null;
  const grossMarginSek =
    sellingPriceExVat !== null && totalCost !== null ? roundMoney(sellingPriceExVat - totalCost) : null;
  const grossMarginPercent =
    sellingPriceExVat && grossMarginSek !== null ? roundMoney((grossMarginSek / sellingPriceExVat) * 100) : null;
  const foodCostPercent =
    sellingPriceExVat && totalCost !== null ? roundMoney((totalCost / sellingPriceExVat) * 100) : null;

  return {
    recipe,
    rows,
    totalCost,
    sellingPriceInclVat,
    sellingPriceExVat,
    grossMarginSek,
    grossMarginPercent,
    foodCostPercent,
  };
}

export function buildMenuCostSummary(
  recipe: CostMenuRecipe,
  rawIngredients: RawIngredient[],
  prepRecipes: CostPrepRecipe[],
): MenuCostSummary {
  const detail = buildMenuCostDetail(recipe, rawIngredients, prepRecipes);
  const itemCount = recipe.items.filter((item) => item.name.trim()).length;
  const resolvedCount = detail.rows.filter((row) => row.isResolved).length;

  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    totalCost: detail.totalCost,
    sellingPriceInclVat: detail.sellingPriceInclVat,
    sellingPriceExVat: detail.sellingPriceExVat,
    vatRate: recipe.costProfile.vatRate,
    grossMarginSek: detail.grossMarginSek,
    grossMarginPercent: detail.grossMarginPercent,
    foodCostPercent: detail.foodCostPercent,
    resolvedCount,
    itemCount,
  };
}
