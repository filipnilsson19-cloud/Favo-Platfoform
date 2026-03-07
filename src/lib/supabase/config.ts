function readUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function readPublishableKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function hasSupabaseAuthEnv() {
  return Boolean(readUrl() && readPublishableKey());
}

export function getSupabaseAuthEnv() {
  const url = readUrl();
  const publishableKey = readPublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase auth is not configured. Add SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url,
    publishableKey,
  };
}
