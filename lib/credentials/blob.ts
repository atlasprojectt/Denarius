import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { LEGACY_KEY_ID, currentKey, keyById } from "./keyring.ts";

// AES-256-GCM for provider Admin keys at rest (security rule: never plaintext).
//
// Blob format (issue #75):
//   v2.<key id>.<iv b64>.<ciphertext b64>.<auth tag b64>
//
// Two things the original "v1.<iv>.<ct>.<tag>" could not do:
//
//  * name its key. "v1" versions the algorithm; the key was implicit, so no
//    stored row said which CREDENTIAL_ENCRYPTION_KEY produced it and a
//    rotation had no way to read old rows while writing new ones.
//  * bind itself to its row. AES-GCM takes additional authenticated data for
//    free; passing (tenant_id, provider) turns "a blob copied from one
//    provider_connection row into another decrypts perfectly" into a
//    decryption failure. It costs one argument.
//
// v1 blobs stay readable under the legacy key, with no AAD — they were written
// without one. No flag day, and no customer re-entering an Admin Key.
//
// Deliberately free of Next's `server-only` marker: the rotation script imports
// it under plain node. lib/crypto.ts is the seam the app imports.

const LEGACY_VERSION = "v1";
const VERSION = "v2";
const IV_BYTES = 12;

/** The row a credential belongs to. Authenticated, not encrypted — it is not
 *  a secret, it is what the ciphertext is bound to. */
export type CredentialContext = { tenantId: string; provider: string };

/** One message for every failure mode: a malformed blob, an unknown key id, a
 *  tampered tag and a blob from another row are indistinguishable to the
 *  caller, and none of them carries plaintext or key material. */
const UNREADABLE = "credential could not be decrypted";

function additionalData(context: CredentialContext): Buffer {
  return Buffer.from(`${context.tenantId}:${context.provider}`, "utf8");
}

export function encryptCredential(
  plaintext: string,
  context: CredentialContext,
): string {
  const key = currentKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key.material, iv);
  cipher.setAAD(additionalData(context));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    key.id,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    cipher.getAuthTag().toString("base64"),
  ].join(".");
}

function open(
  material: Buffer,
  ivB64: string,
  ciphertextB64: string,
  tagB64: string,
  context: CredentialContext | null,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    material,
    Buffer.from(ivB64, "base64"),
  );
  if (context) decipher.setAAD(additionalData(context));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptCredential(
  blob: string,
  context: CredentialContext,
): string {
  try {
    const parts = blob.split(".");

    if (parts[0] === LEGACY_VERSION) {
      const [, iv, ciphertext, tag] = parts;
      if (!iv || !ciphertext || !tag) throw new Error(UNREADABLE);
      const key = keyById(LEGACY_KEY_ID);
      if (!key) throw new Error(UNREADABLE);
      // No AAD: v1 rows were written without one. Binding is what v2 adds.
      return open(key.material, iv, ciphertext, tag, null);
    }

    if (parts[0] === VERSION) {
      const [, keyId, iv, ciphertext, tag] = parts;
      if (!keyId || !iv || !ciphertext || !tag) throw new Error(UNREADABLE);
      const key = keyById(keyId);
      if (!key) throw new Error(UNREADABLE);
      return open(key.material, iv, ciphertext, tag, context);
    }

    throw new Error(UNREADABLE);
  } catch {
    // Fail closed, and say nothing: which key, which field and whether the tag
    // or the AAD failed are all information an attacker would use.
    throw new Error(UNREADABLE);
  }
}

/** True when a stored blob was written by the key that writes today — the
 *  question the rotation script asks to know what is left to re-encrypt. */
export function isCurrentKeyBlob(blob: string): boolean {
  const parts = blob.split(".");
  return parts[0] === VERSION && parts[1] === currentKey().id;
}
