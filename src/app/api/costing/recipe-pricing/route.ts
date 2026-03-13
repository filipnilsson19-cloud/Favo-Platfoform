import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import { upsertRecipeCostProfileForApp } from "@/server/costing-store";

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
      sellingPriceInclVat?: number;
      vatRate?: number;
    };
    if (!body.recipeId) {
      return NextResponse.json({ error: "recipeId is required." }, { status: 400 });
    }
    const costProfile = await upsertRecipeCostProfileForApp({
      recipeId: body.recipeId,
      sellingPriceInclVat: Number(body.sellingPriceInclVat ?? 0),
      vatRate: Number(body.vatRate ?? 12),
    });
    revalidateTag("costing", "max");
    return NextResponse.json({
      costProfile: {
        recipeId: costProfile.recipeId,
        sellingPriceInclVat: Number(costProfile.sellingPriceInclVat),
        vatRate: Number(costProfile.vatRate),
      },
    });
  } catch (error) {
    console.error("Failed to update recipe pricing", error);
    return NextResponse.json({ error: "Failed to update recipe pricing." }, { status: 500 });
  }
}
