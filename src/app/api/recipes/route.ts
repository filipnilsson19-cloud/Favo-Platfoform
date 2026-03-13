import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import {
  deleteRecipeForApp,
  getRecipesForApp,
  upsertRecipeForApp,
} from "@/server/recipe-store";
import type { Recipe } from "@/types/recipe";

export async function GET() {
  if (hasSupabaseAuthEnv()) {
    const appUser = await getCurrentAppUser();

    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const recipes = await getRecipesForApp();
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  try {
    if (hasSupabaseAuthEnv()) {
      const appUser = await getCurrentAppUser();

      if (!appUser) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      if (appUser.role !== "admin") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const body = (await request.json()) as { recipe?: Recipe };

    if (!body.recipe) {
      return NextResponse.json(
        { error: "Recipe payload is required." },
        { status: 400 },
      );
    }

    const recipe = await upsertRecipeForApp(body.recipe);

    revalidateTag("recipes", "max");

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Failed to save recipe", error);

    return NextResponse.json(
      { error: "Failed to save recipe." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (hasSupabaseAuthEnv()) {
      const appUser = await getCurrentAppUser();

      if (!appUser) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      if (appUser.role !== "admin") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const body = (await request.json()) as { recipeId?: string };

    if (!body.recipeId) {
      return NextResponse.json(
        { error: "recipeId is required." },
        { status: 400 },
      );
    }

    await deleteRecipeForApp(body.recipeId);

    revalidateTag("recipes", "max");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete recipe", error);

    return NextResponse.json(
      { error: "Failed to delete recipe." },
      { status: 500 },
    );
  }
}
