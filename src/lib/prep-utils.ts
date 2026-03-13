import type { PrepRecipe, PrepStatus } from "@/types/prep";

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
