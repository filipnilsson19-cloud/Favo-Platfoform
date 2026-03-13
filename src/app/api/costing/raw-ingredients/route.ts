import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import {
  deleteRawIngredientForApp,
  getCostingPayloadForApp,
  upsertRawIngredientForApp,
} from "@/server/costing-store";
import type { RawIngredient } from "@/types/costing";

async function guardAdmin() {
  if (!hasSupabaseAuthEnv()) return null;
  const appUser = await getCurrentAppUser();
  if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (appUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const guard = await guardAdmin();
  if (guard) return guard;
  const payload = await getCostingPayloadForApp();
  return NextResponse.json({ rawIngredients: payload.rawIngredients });
}

export async function POST(request: Request) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;
    const body = (await request.json()) as { ingredient?: RawIngredient };
    if (!body.ingredient) {
      return NextResponse.json({ error: "ingredient is required." }, { status: 400 });
    }
    const rawIngredient = await upsertRawIngredientForApp(body.ingredient);
    revalidateTag("costing", "max");
    return NextResponse.json({ rawIngredient });
  } catch (error) {
    console.error("Failed to save raw ingredient", error);
    return NextResponse.json({ error: "Failed to save raw ingredient." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    await deleteRawIngredientForApp(body.id);
    revalidateTag("costing", "max");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete raw ingredient", error);
    return NextResponse.json({ error: "Failed to delete raw ingredient." }, { status: 500 });
  }
}
