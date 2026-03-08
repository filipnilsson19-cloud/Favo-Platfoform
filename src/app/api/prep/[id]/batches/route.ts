import { NextResponse } from "next/server";

import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { addDaysToDate } from "@/lib/prep-utils";
import { getCurrentAppUser } from "@/server/auth-store";
import { getRecentBatchesForApp, logPrepBatchForApp } from "@/server/prep-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (hasSupabaseAuthEnv()) {
    const appUser = await getCurrentAppUser();
    if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const batches = await getRecentBatchesForApp(id);
  return NextResponse.json({ batches });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (hasSupabaseAuthEnv()) {
      const appUser = await getCurrentAppUser();
      if (!appUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const appUser = await getCurrentAppUser();
    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      batchYield?: string;
      shelfLifeDays?: number;
      notes?: string;
    };

    const shelfLifeDays = body.shelfLifeDays ?? 3;
    const bestBefore = addDaysToDate(new Date(), shelfLifeDays);

    const batch = await logPrepBatchForApp({
      prepRecipeId: id,
      madeById: appUser.id,
      batchYield: body.batchYield ?? "",
      bestBefore,
      notes: body.notes ?? "",
    });

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("Failed to log prep batch", error);
    return NextResponse.json({ error: "Failed to log batch." }, { status: 500 });
  }
}
