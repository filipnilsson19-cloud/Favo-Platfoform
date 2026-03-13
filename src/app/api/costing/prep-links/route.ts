import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import { upsertPrepIngredientCostLinkForApp } from "@/server/costing-store";

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
      prepRecipeId?: string;
      ingredientIndex?: number;
      rawIngredientId?: string | null;
    };

    if (!body.prepRecipeId || typeof body.ingredientIndex !== "number") {
      return NextResponse.json({ error: "prepRecipeId and ingredientIndex are required." }, { status: 400 });
    }

    const link = await upsertPrepIngredientCostLinkForApp({
      prepRecipeId: body.prepRecipeId,
      ingredientIndex: body.ingredientIndex,
      rawIngredientId: body.rawIngredientId ?? null,
    });
    revalidateTag("costing", "max");
    return NextResponse.json({
      link: {
        ingredientIndex: link.ingredientIndex,
        rawIngredientId: link.rawIngredientId,
      },
    });
  } catch (error) {
    console.error("Failed to update prep cost link", error);
    return NextResponse.json({ error: "Failed to update prep cost link." }, { status: 500 });
  }
}
