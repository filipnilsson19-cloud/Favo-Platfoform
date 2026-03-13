import { redirect } from "next/navigation";

import { FavoShell } from "@/components/favo-shell";
import { hasSupabaseAuthEnv } from "@/lib/supabase/config";
import { getCurrentAppUser, getLocalPreviewUser } from "@/server/auth-store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authEnabled = hasSupabaseAuthEnv();
  const canUseLocalPreview = !authEnabled && process.env.NODE_ENV !== "production";
  const appUser = authEnabled
    ? await getCurrentAppUser()
    : canUseLocalPreview
      ? getLocalPreviewUser()
      : null;

  if (!appUser) {
    redirect("/login");
  }

  return (
    <FavoShell authEnabled={authEnabled} user={appUser}>
      {children}
    </FavoShell>
  );
}
