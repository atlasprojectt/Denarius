import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// AES-256-GCM for provider Admin keys at rest (security rule: never plaintext).
// Blob format: "v1.<iv b64>.<ciphertext b64>.<auth tag b64>" — versioned so a
// future algorithm change can coexist with old rows.

const VERSION = "v1";
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set");
  }
  for (const encoding of ["base64", "hex"] as const) {
    const key = Buffer.from(raw, encoding);
    if (key.length === 32) return key;
  }
  throw new Error(
    "CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes (base64 or hex)",
  );
}

export function encryptCredential(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

export function decryptCredential(blob: string): string {
  const [version, ivB64, ciphertextB64, tagB64] = blob.split(".");
  if (version !== VERSION || !ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error("credential blob is malformed");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
