// Re-encrypt every stored provider Admin Key under the current key (issue #75).
//
// Run:  npm run rotate:credentials -- [--tenant <uuid>] [--dry-run]
//
// A rotation path nobody has written down is a rotation path nobody can
// execute at 2am, so this is a script and not a paragraph. The procedure it
// belongs to is in docs/backend.md §1 — generate, add as current while the old
// key stays readable, run this, verify, retire the old key.
//
// It runs under plain node (native type stripping), not Next, which is why the
// crypto primitives live in lib/credentials/ without the `server-only` marker.
// It never prints a key, a key id's material or a plaintext credential.

import { createClient } from "@supabase/supabase-js";

import {
  decryptCredential,
  encryptCredential,
  isCurrentKeyBlob,
} from "../lib/credentials/blob.ts";
import { currentKey } from "../lib/credentials/keyring.ts";

type ConnectionRow = {
  id: string;
  tenant_id: string;
  provider: string;
  encrypted_credential: string;
};

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} needs a value`);
  }
  return value;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  const dryRun = process.argv.includes("--dry-run");
  const tenantId = argValue("--tenant");
  // Fails here if the keyring is misconfigured — before a single row is read.
  const target = currentKey();

  console.log(
    `[rotate] re-encrypting under key "${target.id}"` +
      `${tenantId ? ` for tenant ${tenantId}` : " for every tenant"}` +
      `${dryRun ? " (dry run)" : ""}`,
  );

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /**
   * Every connection with a stored credential, read in pages.
   *
   * A single unpaginated select is silently truncated by PostgREST's
   * `max-rows`, and this script would still tally clean and exit 0 — after
   * which step 6 of the procedure retires the old key and every unscanned row
   * becomes permanently unreadable. That is the exact outcome the format
   * exists to prevent, so the read is exhaustive or it fails loudly.
   *
   * It advances by the number of rows actually returned and stops only on an
   * EMPTY page, never on a short one: `max-rows` may be smaller than the page
   * asked for, and treating a short page as the last would reintroduce the
   * truncation this fixes. `order("id")` keeps the window stable, or a row
   * could come back twice while another is skipped.
   *
   * A closure rather than a top-level function so the client's type is
   * inferred — naming it would mean writing out Supabase's generic parameters.
   */
  const listConnections = async (): Promise<ConnectionRow[]> => {
    const PAGE = 500;
    const collected: ConnectionRow[] = [];

    for (let from = 0; ; ) {
      let query = admin
        .from("provider_connection")
        .select("id, tenant_id, provider, encrypted_credential")
        .not("encrypted_credential", "is", null)
        .order("id")
        .range(from, from + PAGE - 1);
      if (tenantId) query = query.eq("tenant_id", tenantId);

      const { data, error } = await query;
      if (error) throw new Error(`could not list connections: ${error.code}`);

      const page = (data ?? []) as ConnectionRow[];
      if (page.length === 0) return collected;
      collected.push(...page);
      from += page.length;
    }
  };

  const rows = await listConnections();
  const tally = { scanned: rows.length, alreadyCurrent: 0, rotated: 0, failed: 0 };

  for (const row of rows) {
    if (isCurrentKeyBlob(row.encrypted_credential)) {
      tally.alreadyCurrent += 1;
      continue;
    }

    const context = { tenantId: row.tenant_id, provider: row.provider };
    let reencrypted: string;
    try {
      reencrypted = encryptCredential(
        decryptCredential(row.encrypted_credential, context),
        context,
      );
    } catch {
      // One row nobody can read must not stop the rest: the remaining rows are
      // other customers' connections. The row is reported and left untouched,
      // and the tenant sees it as a connection to reconnect.
      tally.failed += 1;
      console.error(`[rotate] FAILED ${row.provider} connection ${row.id}`);
      continue;
    }

    if (dryRun) {
      tally.rotated += 1;
      continue;
    }

    // Matched on the exact blob that was read: a key saved by an Admin while
    // this runs is newer than what is in hand and must not be overwritten.
    const { error: writeError, count } = await admin
      .from("provider_connection")
      .update({ encrypted_credential: reencrypted }, { count: "exact" })
      .eq("id", row.id)
      .eq("encrypted_credential", row.encrypted_credential);
    if (writeError || count !== 1) {
      tally.failed += 1;
      console.error(`[rotate] WRITE FAILED ${row.provider} connection ${row.id}`);
      continue;
    }
    tally.rotated += 1;
  }

  console.log(`[rotate] ${JSON.stringify(tally)}`);
  if (tally.failed > 0) process.exitCode = 1;
}

await main();
