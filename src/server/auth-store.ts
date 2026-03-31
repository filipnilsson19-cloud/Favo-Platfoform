import "server-only";

import { cache } from "react";

import type { User } from "@supabase/supabase-js";

import { getPrismaClient } from "@/lib/prisma";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, AppUser } from "@/types/auth";

function deriveDisplayName(user: Pick<User, "email" | "user_metadata">) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";

  if (fullName.trim()) return fullName.trim();
  if (name.trim()) return name.trim();
  if (user.email) return user.email.split("@")[0];
  return "FAVO-användare";
}

function mapRole(role: string): AppRole {
  return role === "admin" ? "admin" : "personal";
}

export function getLocalPreviewUser(): AppUser {
  return {
    id: "local-preview",
    email: "lokal@favo.test",
    displayName: "Lokalt läge",
    role: "admin",
  };
}

function buildFallbackAppUser(
  user: Pick<User, "id" | "email" | "user_metadata">,
): AppUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: deriveDisplayName(user),
    role: "personal",
  };
}

export async function ensureUserProfileForUser(user: Pick<User, "id" | "email" | "user_metadata">) {
  const prisma = getPrismaClient();
  const existing = await prisma.userProfile.findUnique({
    where: {
      id: user.id,
    },
  });

  const nextEmail = user.email ?? existing?.email ?? "";
  const nextDisplayName = deriveDisplayName(user);

  if (existing) {
    if (existing.email !== nextEmail || existing.displayName !== nextDisplayName) {
      return prisma.userProfile.update({
        where: {
          id: existing.id,
        },
        data: {
          email: nextEmail,
          displayName: nextDisplayName,
        },
      });
    }

    return existing;
  }

  const profileCount = await prisma.userProfile.count();

  return prisma.userProfile.create({
    data: {
      id: user.id,
      email: nextEmail,
      displayName: nextDisplayName,
      role: profileCount === 0 ? "admin" : "personal",
    },
  });
}

export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    try {
      const profile = await ensureUserProfileForUser(user);

      return {
        id: user.id,
        email: user.email ?? profile.email,
        displayName: profile.displayName || deriveDisplayName(user),
        role: mapRole(profile.role),
      };
    } catch (profileError) {
      console.error(
        "Failed to sync user profile. Continuing with a fallback app user.",
        profileError,
      );
      return buildFallbackAppUser(user);
    }
  } catch (error) {
    console.error("Failed to load authenticated app user.", error);
    return null;
  }
});
