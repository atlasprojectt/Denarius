// The set of keys that can decrypt a provider Admin Key, and the one that
// encrypts new ones (issue #75).
//
// Why a set and not a variable: the previous format carried "v1", which
// versions the ALGORITHM, not the key — nothing in a stored row said which
// CREDENTIAL_ENCRYPTION_KEY produced it. The day a key has to be rotated (a
// leak, a departure, a buyer's questionnaire, plain hygiene) the only recovery
// available was asking every customer to paste their organisation Admin Key
// again. A rotation needs a window where BOTH keys read, so keys are plural
// here and each blob names the one that wrote it.
//
// Deliberately free of Next's `server-only` marker so the rotation script
// (scripts/rotate-credentials.ts) can import it under plain node. The
// server-only seam the app imports is lib/crypto.ts.

const KEYS_VAR = "CREDENTIAL_ENCRYPTION_KEYS";
const CURRENT_ID_VAR = "CREDENTIAL_ENCRYPTION_KEY_ID";
const LEGACY_VAR = "CREDENTIAL_ENCRYPTION_KEY";

/** The id given to the single pre-rotation key, and the one `v1` blobs use. */
export const LEGACY_KEY_ID = "legacy";

const KEY_ID_PATTERN = /^[a-z0-9_-]{1,16}$/;

export type CredentialKey = { id: string; material: Buffer };

/** Key material, base64 or hex, refused unless it is exactly 32 bytes. */
function decodeKey(raw: string, label: string): Buffer {
  const trimmed = raw.trim();
  // base64 first, hex second — the order the single-key format already used,
  // and 64 hex chars decode to 48 bytes as base64, so hex still wins its case.
  for (const encoding of ["base64", "hex"] as const) {
    const key = Buffer.from(trimmed, encoding);
    if (key.length === 32) return key;
  }
  throw new Error(`${label} must decode to 32 bytes (base64 or hex)`);
}

/**
 * Every key that may DECRYPT, by id. During a rotation this holds the new key
 * and the retired one at once, which is what makes the rotation windowless.
 */
export function readKeyring(): Map<string, CredentialKey> {
  const keyring = new Map<string, CredentialKey>();

  const legacy = process.env[LEGACY_VAR];
  if (legacy) {
    keyring.set(LEGACY_KEY_ID, {
      id: LEGACY_KEY_ID,
      material: decodeKey(legacy, LEGACY_VAR),
    });
  }

  const configured = process.env[KEYS_VAR];
  if (configured) {
    for (const entry of configured.split(",")) {
      const trimmed = entry.trim();
      if (trimmed === "") continue;
      const separator = trimmed.indexOf(":");
      if (separator < 1) {
        throw new Error(`${KEYS_VAR} entries must be written as <id>:<key>`);
      }
      const id = trimmed.slice(0, separator).trim();
      if (!KEY_ID_PATTERN.test(id)) {
        throw new Error(
          `${KEYS_VAR} key ids must match ${KEY_ID_PATTERN.source}`,
        );
      }
      if (id === LEGACY_KEY_ID) {
        // Reserved: it names the pre-rotation key, whose material comes from
        // its own variable. Letting it be redefined here would silently give
        // two meanings to the id stamped on every v1 row.
        throw new Error(`${KEYS_VAR} cannot redefine the reserved id "${LEGACY_KEY_ID}"`);
      }
      keyring.set(id, {
        id,
        material: decodeKey(trimmed.slice(separator + 1), `${KEYS_VAR} key "${id}"`),
      });
    }
  }

  return keyring;
}

/**
 * The key new credentials are encrypted under. Named explicitly whenever more
 * than one is configured — guessing which of two keys is "current" during a
 * rotation is exactly the mistake that strands rows.
 */
export function currentKey(): CredentialKey {
  const keyring = readKeyring();
  if (keyring.size === 0) {
    throw new Error(`${LEGACY_VAR} is not set`);
  }

  const requested = process.env[CURRENT_ID_VAR]?.trim();
  if (requested) {
    const key = keyring.get(requested);
    if (!key) {
      throw new Error(`${CURRENT_ID_VAR} names a key that is not configured`);
    }
    return key;
  }

  if (keyring.size > 1) {
    throw new Error(
      `${CURRENT_ID_VAR} must name the key to encrypt with when more than one is configured`,
    );
  }
  return [...keyring.values()][0];
}

/** The key that wrote a blob, or null when it is not configured here. */
export function keyById(id: string): CredentialKey | null {
  return readKeyring().get(id) ?? null;
}
