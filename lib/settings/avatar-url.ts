import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PROFILE_AVATAR_BUCKET } from "./avatar";

const PROFILE_AVATAR_URL_TTL_SECONDS = 60 * 60;

export async function profileAvatarUrl(
  client: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await client.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrl(path, PROFILE_AVATAR_URL_TTL_SECONDS);

  return error ? null : data.signedUrl;
}
