import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser } from "@/server/auth-store";
import {
  createPrepUnitOptionForApp,
  getPrepUnitEntriesForApp,
  renamePrepUnitOptionForApp,
  setPrepUnitOptionActiveForApp,
} from "@/server/prep-store";

export async function GET() {
  if (hasSupabaseAuthEnv()) {
    const appUser = await getCurrentAppUser();
    if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const options = await getPrepUnitEntriesForApp();
  return NextResponse.json({ options });
}

export async function POST(request: Request) {
  try {
    if (hasSupabaseAuthEnv()) {
      const appUser = await getCurrentAppUser();
      if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      if (appUser.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Unit name is required." }, { status: 400 });
    }

    const option = await createPrepUnitOptionForApp(body.name);
    const options = await getPrepUnitEntriesForApp();
    revalidateTag("prep-recipes", "max");
    return NextResponse.json({ option, options });
  } catch (error) {
    console.error("Failed to create prep unit", error);
    return NextResponse.json({ error: "Failed to create unit." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (hasSupabaseAuthEnv()) {
      const appUser = await getCurrentAppUser();
      if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      if (appUser.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as
      | { action?: "rename"; name?: string; nextName?: string }
      | { action?: "set-active"; name?: string; isActive?: boolean };

    if (body.action === "rename") {
      if (!body.name?.trim() || !body.nextName?.trim()) {
        return NextResponse.json({ error: "name and nextName are required." }, { status: 400 });
      }
      const option = await renamePrepUnitOptionForApp(body.name, body.nextName);
      const options = await getPrepUnitEntriesForApp();
      revalidateTag("prep-recipes", "max");
      return NextResponse.json({ option, previousName: body.name, options });
    }

    if (body.action === "set-active") {
      if (!body.name?.trim() || typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "name and isActive are required." }, { status: 400 });
      }
      await setPrepUnitOptionActiveForApp(body.name, body.isActive);
      const options = await getPrepUnitEntriesForApp();
      revalidateTag("prep-recipes", "max");
      return NextResponse.json({ options });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Failed to update prep unit", error);
    return NextResponse.json({ error: "Failed to update unit." }, { status: 500 });
  }
}
