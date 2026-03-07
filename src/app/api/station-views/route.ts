import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import {
  deleteStationViewForApp,
  getStationViewEntriesForApp,
  getStationViewsForScopeForApp,
  renameStationViewForApp,
  saveStationViewForApp,
  setStationViewActiveStateForApp,
} from "@/server/recipe-store";
import type { StationEditableLayout, StationPrintPayload } from "@/types/station";

async function requireAuthenticatedUser() {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return appUser;
}

async function requireAdminUser() {
  const appUser = await requireAuthenticatedUser();

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  if (appUser && appUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return appUser;
}

export async function GET(request: Request) {
  const appUser = await requireAuthenticatedUser();

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  const { searchParams } = new URL(request.url);
  const manage = searchParams.get("manage") === "1";
  const scopeKey = searchParams.get("scopeKey");
  const payloadRaw = searchParams.get("payload");

  if (manage) {
    const views = await getStationViewEntriesForApp();
    return NextResponse.json({ views });
  }

  if (!scopeKey || !payloadRaw) {
    return NextResponse.json({ views: [] });
  }

  try {
    const payload = JSON.parse(payloadRaw) as StationPrintPayload;
    const views = await getStationViewsForScopeForApp(scopeKey, payload);
    return NextResponse.json({ views });
  } catch {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const appUser = await requireAdminUser();

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      scopeKey?: string;
      scopeLabel?: string;
      recipeCount?: number;
      payload?: StationPrintPayload;
      layout?: StationEditableLayout;
    };

    if (
      !body.name?.trim() ||
      !body.scopeKey?.trim() ||
      !body.scopeLabel?.trim() ||
      !body.payload ||
      !body.layout
    ) {
      return NextResponse.json(
        { error: "Missing station view payload." },
        { status: 400 },
      );
    }

    const view = await saveStationViewForApp({
      id: body.id,
      name: body.name,
      scopeKey: body.scopeKey,
      scopeLabel: body.scopeLabel,
      recipeCount: body.recipeCount ?? body.payload.recipeCount,
      payload: body.payload,
      layout: body.layout,
    });

    revalidatePath("/");
    return NextResponse.json({ view });
  } catch (error) {
    console.error("Failed to save station view", error);

    return NextResponse.json(
      { error: "Failed to save station view." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const appUser = await requireAdminUser();

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  try {
    const body = (await request.json()) as
      | { action?: "rename"; id?: string; nextName?: string }
      | { action?: "set-active"; id?: string; isActive?: boolean };

    if (body.action === "rename") {
      if (!body.id || !body.nextName?.trim()) {
        return NextResponse.json(
          { error: "id and nextName are required." },
          { status: 400 },
        );
      }

      const view = await renameStationViewForApp(body.id, body.nextName);
      const views = await getStationViewEntriesForApp();
      revalidatePath("/");

      return NextResponse.json({ view, views });
    }

    if (body.action === "set-active") {
      if (!body.id || typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "id and isActive are required." },
          { status: 400 },
        );
      }

      const view = await setStationViewActiveStateForApp(body.id, body.isActive);
      const views = await getStationViewEntriesForApp();
      revalidatePath("/");

      return NextResponse.json({ view, views });
    }

    return NextResponse.json(
      { error: "Unsupported action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to update station view", error);

    return NextResponse.json(
      { error: "Failed to update station view." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const appUser = await requireAdminUser();

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  try {
    const body = (await request.json()) as { viewId?: string };

    if (!body.viewId) {
      return NextResponse.json(
        { error: "viewId is required." },
        { status: 400 },
      );
    }

    await deleteStationViewForApp(body.viewId);
    const views = await getStationViewEntriesForApp();
    revalidatePath("/");

    return NextResponse.json({ ok: true, views });
  } catch (error) {
    console.error("Failed to delete station view", error);

    return NextResponse.json(
      { error: "Failed to delete station view." },
      { status: 500 },
    );
  }
}
