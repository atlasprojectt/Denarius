import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PROFILE_AVATAR_BUCKET } from "./avatar";

/**
 * Removes every object below each user prefix, including files left behind by
 * an interrupted avatar replacement. The caller uses the service-role client
 * and stops destructive account deletion when Storage cannot confirm removal.
 */
export async function removeProfileAvatarObjects(
  client: SupabaseClient,
  userIds: string[],
): Promise<boolean> {
  for (const userId of userIds) {
    const { data, error } = await client.storage
      .from(PROFILE_AVATAR_BUCKET)
      .list(userId, { limit: 1000 });
    if (error) return false;

    const paths = (data ?? [])
      .map((file) => file.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
      .map((name) => `${userId}/${name}`);
    if (paths.length === 0) continue;

    const { error: removeError } = await client.storage
      .from(PROFILE_AVATAR_BUCKET)
      .remove(paths);
    if (removeError) return false;
  }

  return true;
}
