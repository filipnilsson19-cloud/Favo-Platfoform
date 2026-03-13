import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import { upsertRecipeItemCostLinkForApp } from "@/server/costing-store";
import type { CostSourceKind } from "@/types/costing";

async function guardAdmin() {
  if (!hasSupabaseAuthEnv()) return null;
  const appUser = await getCurrentAppUser();
  if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (appUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;
    const body = (await request.json()) as {
      recipeId?: string;
      itemIndex?: number;
      sourceKind?: CostSourceKind;
      rawIngredientId?: string | null;
      prepRecipeId?: string | null;
    };

    if (!body.recipeId || typeof body.itemIndex !== "number" || !body.sourceKind) {
      return NextResponse.json({ error: "recipeId, itemIndex and sourceKind are required." }, { status: 400 });
    }

    const link = await upsertRecipeItemCostLinkForApp({
      recipeId: body.recipeId,
      itemIndex: body.itemIndex,
      sourceKind: body.sourceKind,
      rawIngredientId: body.rawIngredientId ?? null,
      prepRecipeId: body.prepRecipeId ?? null,
    });
    revalidateTag("costing", "max");
    return NextResponse.json({
      link: {
        itemIndex: link.itemIndex,
        sourceKind: link.sourceKind,
        rawIngredientId: link.rawIngredientId,
        prepRecipeId: link.prepRecipeId,
      },
    });
  } catch (error) {
    console.error("Failed to update recipe cost link", error);
    return NextResponse.json({ error: "Failed to update recipe cost link." }, { status: 500 });
  }
}
