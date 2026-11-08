import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * SERVER ONLY. This bypasses RLS, so every caller must re-check authorization
 * itself before touching another user's row.
 *
 * Returns `null` when the key is absent (production may not have it configured
 * yet). Callers must fall back to the request-scoped client rather than crash.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://bookachef.co.ke"
  );
}

export function shortReference(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}
