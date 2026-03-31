import type { PrepIngredient, PrepRecipe, PrepStatus } from "@/types/prep";

export const prepStatusOptions: PrepStatus[] = ["Publicerad", "Utkast", "Inaktiv"];

export const yieldUnitOptions = [
  { label: "liter", value: "liter" },
  { label: "dl", value: "dl" },
  { label: "ml", value: "ml" },
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "port", value: "port" },
  { label: "sats", value: "sats" },
  { label: "st", value: "st" },
  { label: "bricka", value: "bricka" },
  { label: "förpackning", value: "förpackning" },
];

export const prepUnitOptions = [
  { label: "g", value: "g" },
  { label: "kg", value: "kg" },
  { label: "ml", value: "ml" },
  { label: "cl", value: "cl" },
  { label: "dl", value: "dl" },
  { label: "liter", value: "liter" },
  { label: "st", value: "st" },
  { label: "tsk", value: "tsk" },
  { label: "msk", value: "msk" },
];

export const prepManagedUnitDefaults = [
  ...new Map(
    [...prepUnitOptions, ...yieldUnitOptions].map((option) => [option.value, option]),
  ).values(),
].map((option) => ({
  label: option.label,
  value: option.value,
}));

export const prepStorageOptions = [
  { label: "Kyl", value: "Kyl" },
  { label: "Frys", value: "Frys" },
  { label: "Torr", value: "Torr" },
  { label: "Rumstemperatur", value: "Rumstemperatur" },
];

export function blankPrepRecipe(): PrepRecipe {
  return {
    id: "",
    title: "",
    category: "",
    status: "Utkast",
    storage: "Kyl",
    shelfLifeDays: 3,
    defaultYield: "",
    yieldUnit: "liter",
    allergens: "",
    notes: "",
    ingredients: [{ info: "", name: "", amount: "", unit: "g" }],
    steps: [{ description: "" }],
  };
}

export function clonePrepRecipe(recipe: PrepRecipe): PrepRecipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((i) => ({ ...i })),
    steps: recipe.steps.map((s) => ({ ...s })),
  };
}

type PrepSummaryUnit = "g" | "kg" | "ml" | "cl" | "dl" | "l" | "st" | "tsk" | "msk";

const prepSummaryUnitAliases: Record<string, PrepSummaryUnit> = {
  g: "g",
  gram: "g",
  gramm: "g",
  kg: "kg",
  ml: "ml",
  cl: "cl",
  dl: "dl",
  l: "l",
  liter: "l",
  literer: "l",
  st: "st",
  styck: "st",
  tsk: "tsk",
  msk: "msk",
};

function normalizePrepSummaryUnit(value: string): PrepSummaryUnit | null {
  const normalized = value.trim().toLowerCase();
  return prepSummaryUnitAliases[normalized] ?? null;
}

function parsePrepSummaryAmount(amount: string) {
  const normalized = amount.trim().replace(",", ".");
  if (!normalized) return null;

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
}

function formatPrepSummaryNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function computePrepAmountSummary(ingredients: PrepIngredient[]) {
  const contentIngredients = ingredients.filter(
    (ingredient) =>
      ingredient.name.trim().length > 0 || ingredient.amount.trim().length > 0,
  );

  if (contentIngredients.length === 0) {
    return "0 g";
  }

  const parsedValues = contentIngredients.map((ingredient) => ({
    value: parsePrepSummaryAmount(ingredient.amount),
    unit: normalizePrepSummaryUnit(ingredient.unit),
  }));

  if (parsedValues.some((entry) => entry.value === null || entry.unit === null)) {
    return "Blandade mått";
  }

  const resolvedValues = parsedValues as Array<{ value: number; unit: PrepSummaryUnit }>;

  const units = new Set(resolvedValues.map((entry) => entry.unit));

  if ([...units].every((unit) => unit === "g" || unit === "kg")) {
    const totalGrams = resolvedValues.reduce((sum, entry) => {
      const value = Number(entry.value);
      return sum + value * (entry.unit === "kg" ? 1000 : 1);
    }, 0);

    return totalGrams >= 1000
      ? `${formatPrepSummaryNumber(totalGrams / 1000)} kg`
      : `${formatPrepSummaryNumber(totalGrams)} g`;
  }

  if ([...units].every((unit) => unit === "ml" || unit === "cl" || unit === "dl" || unit === "l")) {
    const factorMap: Record<PrepSummaryUnit, number> = {
      ml: 1,
      cl: 10,
      dl: 100,
      l: 1000,
      g: 0,
      kg: 0,
      st: 0,
      tsk: 0,
      msk: 0,
    };

    const totalMl = resolvedValues.reduce((sum, entry) => {
      return sum + Number(entry.value) * factorMap[entry.unit];
    }, 0);

    if (totalMl >= 1000) {
      return `${formatPrepSummaryNumber(totalMl / 1000)} l`;
    }

    if (totalMl >= 100) {
      return `${formatPrepSummaryNumber(totalMl / 100)} dl`;
    }

    return `${formatPrepSummaryNumber(totalMl)} ml`;
  }

  if ([...units].every((unit) => unit === "st")) {
    const totalCount = resolvedValues.reduce((sum, entry) => sum + Number(entry.value), 0);
    return `${formatPrepSummaryNumber(totalCount)} st`;
  }

  if ([...units].every((unit) => unit === "tsk" || unit === "msk")) {
    const totalTsp = resolvedValues.reduce((sum, entry) => {
      return sum + Number(entry.value) * (entry.unit === "msk" ? 3 : 1);
    }, 0);

    return totalTsp >= 3 && totalTsp % 3 === 0
      ? `${formatPrepSummaryNumber(totalTsp / 3)} msk`
      : `${formatPrepSummaryNumber(totalTsp)} tsk`;
  }

  return "Blandade mått";
}

export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

export function formatSwedishDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isBatchExpired(bestBefore: string): boolean {
  return new Date(bestBefore) < new Date();
}

export function isBatchExpiringSoon(bestBefore: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bb = new Date(bestBefore);
  return bb <= tomorrow && bb >= new Date();
}

export function batchYieldLabel(multiplier: number, defaultYield: string, yieldUnit: string): string {
  if (!defaultYield) return multiplier === 1 ? "1 sats" : `${multiplier} satser`;
  const amount = parseFloat(defaultYield);
  if (isNaN(amount)) return `${multiplier}x ${defaultYield} ${yieldUnit}`.trim();
  const result = Math.round(amount * multiplier * 10) / 10;
  return `${result} ${yieldUnit}`.trim();
}

export function scalePrepAmount(amount: string, multiplier: number): string {
  const normalized = amount.trim().replace(",", ".");
  const value = Number.parseFloat(normalized);

  if (Number.isNaN(value)) return amount;

  const scaled = value * multiplier;
  if (Number.isInteger(scaled)) return String(scaled);
  if (Number.isInteger(scaled * 10)) return scaled.toFixed(1);
  return scaled.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export const batchMultipliers = [
  { label: "1/2 batch", value: 0.5 },
  { label: "1 batch", value: 1 },
  { label: "2 batcher", value: 2 },
  { label: "5 batcher", value: 5 },
  { label: "10 batcher", value: 10 },
];
