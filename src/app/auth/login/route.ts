import { NextResponse } from "next/server";

import { loginWithPassword, sanitizeNextPath } from "@/server/login-store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/"));

  const result = await loginWithPassword({
    nextPath,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  return NextResponse.redirect(new URL(result.redirectTo, request.url), {
    status: 303,
  });
}
