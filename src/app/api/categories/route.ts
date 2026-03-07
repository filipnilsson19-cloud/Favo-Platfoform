import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import {
  createCategoryForApp,
  getCategoryEntriesForApp,
  getCategoriesForApp,
  renameCategoryForApp,
  setCategoryActiveStateForApp,
} from "@/server/recipe-store";

export async function GET(request: Request) {
  if (hasSupabaseAuthEnv()) {
    const appUser = await getCurrentAppUser();

    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const manage = searchParams.get("manage") === "1";

  if (manage) {
    const categories = await getCategoryEntriesForApp();
    return NextResponse.json({ categories });
  }

  const categories = await getCategoriesForApp();
  return NextResponse.json({ categories });
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

    const body = (await request.json()) as { name?: string };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 },
      );
    }

    const category = await createCategoryForApp(body.name);

    revalidatePath("/");

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Failed to create category", error);

    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = (await request.json()) as
      | { action?: "rename"; name?: string; nextName?: string }
      | { action?: "set-active"; name?: string; isActive?: boolean };

    if (body.action === "rename") {
      if (!body.name?.trim() || !body.nextName?.trim()) {
        return NextResponse.json(
          { error: "name and nextName are required." },
          { status: 400 },
        );
      }

      const category = await renameCategoryForApp(body.name, body.nextName);
      const categories = await getCategoryEntriesForApp();
      revalidatePath("/");

      return NextResponse.json({
        category,
        previousName: body.name,
        categories,
      });
    }

    if (body.action === "set-active") {
      if (!body.name?.trim() || typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "name and isActive are required." },
          { status: 400 },
        );
      }

      const category = await setCategoryActiveStateForApp(body.name, body.isActive);
      const categories = await getCategoryEntriesForApp();
      revalidatePath("/");

      return NextResponse.json({
        category,
        isActive: body.isActive,
        categories,
      });
    }

    return NextResponse.json(
      { error: "Unsupported action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to update category", error);

    return NextResponse.json(
      { error: "Failed to update category." },
      { status: 500 },
    );
  }
}
