import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES RLS. Server-only, for deliberate cross-RLS
 * writes (tenant bootstrap on signup; cron sync later). Never reach for this
 * when the user-scoped client (lib/supabase/server.ts) can do the job.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
