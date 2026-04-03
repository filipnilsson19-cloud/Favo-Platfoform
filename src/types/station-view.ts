import type { StationEditableLayout } from "@/types/station";

export type AppStationView = {
  id: string;
  name: string;
  scopeKey: string;
  scopeLabel: string;
  recipeCount: number;
  isActive: boolean;
  recipeIds?: string[] | null;
  layout?: StationEditableLayout | null;
};
