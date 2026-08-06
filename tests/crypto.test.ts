import { createCipheriv, randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptCredential,
  encryptCredential,
  isCurrentKeyBlob,
} from "@/lib/crypto";

// Credential encryption at rest (issues #15, #75). The keyring reads env on
// every call, so these tests configure it by setting env — there is no module
// cache to defeat. .env.local is loaded by vitest.config.ts, so every variable
// is cleared first: a leaked real key would make a failing test pass.

const KEY_VARS = [
  "CREDENTIAL_ENCRYPTION_KEY",
  "CREDENTIAL_ENCRYPTION_KEYS",
  "CREDENTIAL_ENCRYPTION_KEY_ID",
] as const;

const original = new Map<string, string | undefined>();

const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");

const ROW = { tenantId: "11111111-1111-1111-1111-111111111111", provider: "openai" };
const OTHER_TENANT = { tenantId: "22222222-2222-2222-2222-222222222222", provider: "openai" };
const OTHER_PROVIDER = { tenantId: ROW.tenantId, provider: "anthropic" };

const SECRET = "sk-admin-super-secret-0123456789";

/** A pre-#75 blob: "v1.<iv>.<ciphertext>.<tag>", written with no AAD. */
function legacyBlob(plaintext: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyB64, "base64"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    ciphertext.toString("base64"),
    cipher.getAuthTag().toString("base64"),
  ].join(".");
}

beforeEach(() => {
  for (const name of KEY_VARS) {
    original.set(name, process.env[name]);
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of KEY_VARS) {
    const value = original.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("credential encryption (AES-256-GCM)", () => {
  it("round-trips a credential and never stores it in the clear", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;

    const blob = encryptCredential(SECRET, ROW);

    expect(blob).not.toContain(SECRET);
    expect(blob.startsWith("v2.k1.")).toBe(true);
    expect(decryptCredential(blob, ROW)).toBe(SECRET);
  });

  it("produces a different blob per call (random IV)", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;

    expect(encryptCredential(SECRET, ROW)).not.toBe(encryptCredential(SECRET, ROW));
  });

  it("accepts hex key material and refuses anything that is not 32 bytes", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${randomBytes(32).toString("hex")}`;
    expect(decryptCredential(encryptCredential(SECRET, ROW), ROW)).toBe(SECRET);

    process.env.CREDENTIAL_ENCRYPTION_KEYS = "k1:too-short";
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/32 bytes/);

    delete process.env.CREDENTIAL_ENCRYPTION_KEYS;
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/not set/);
  });
});

describe("key identity and rotation", () => {
  it("names the writing key in the blob and resolves it on read", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A},k2:${KEY_B}`;
    process.env.CREDENTIAL_ENCRYPTION_KEY_ID = "k2";

    const blob = encryptCredential(SECRET, ROW);

    expect(blob.split(".")[1]).toBe("k2");
    expect(decryptCredential(blob, ROW)).toBe(SECRET);
  });

  it("reads both keys during a rotation, so no window fails", () => {
    // Before: one key, and every stored row was written under it.
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;
    const beforeRotation = encryptCredential(SECRET, ROW);

    // During: the new key writes, the retired one still reads.
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A},k2:${KEY_B}`;
    process.env.CREDENTIAL_ENCRYPTION_KEY_ID = "k2";

    expect(decryptCredential(beforeRotation, ROW)).toBe(SECRET);
    expect(isCurrentKeyBlob(beforeRotation)).toBe(false);

    const afterRotation = encryptCredential(SECRET, ROW);
    expect(isCurrentKeyBlob(afterRotation)).toBe(true);
    expect(decryptCredential(afterRotation, ROW)).toBe(SECRET);
  });

  it("refuses to guess which key is current when more than one is configured", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A},k2:${KEY_B}`;

    expect(() => encryptCredential(SECRET, ROW)).toThrow(
      /CREDENTIAL_ENCRYPTION_KEY_ID/,
    );

    process.env.CREDENTIAL_ENCRYPTION_KEY_ID = "k3";
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/not configured/);
  });

  it("fails closed when the key that wrote a blob is no longer configured", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;
    const blob = encryptCredential(SECRET, ROW);

    // The retired key was dropped from the keyring before the rows moved.
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k2:${KEY_B}`;
    expect(() => decryptCredential(blob, ROW)).toThrow();
  });

  it("rejects a keyring that redefines the reserved legacy id or is malformed", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `legacy:${KEY_A}`;
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/legacy/);

    process.env.CREDENTIAL_ENCRYPTION_KEYS = KEY_A;
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/<id>:<key>/);

    process.env.CREDENTIAL_ENCRYPTION_KEYS = `WRONG CASE:${KEY_A}`;
    expect(() => encryptCredential(SECRET, ROW)).toThrow(/key ids/);
  });
});

describe("binding to the row (AAD)", () => {
  it("refuses a blob moved to another tenant's or another provider's row", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;
    const blob = encryptCredential(SECRET, ROW);

    expect(() => decryptCredential(blob, OTHER_TENANT)).toThrow();
    expect(() => decryptCredential(blob, OTHER_PROVIDER)).toThrow();
    expect(decryptCredential(blob, { ...ROW })).toBe(SECRET);
  });
});

describe("legacy v1 blobs", () => {
  it("still decrypts under the single pre-rotation key — no flag day", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY_A;

    const blob = legacyBlob(SECRET, KEY_A);
    expect(decryptCredential(blob, ROW)).toBe(SECRET);
    // v1 carried no AAD, so it is readable from any row: that is exactly the
    // weakness v2 closes, and why re-encryption is worth running.
    expect(decryptCredential(blob, OTHER_TENANT)).toBe(SECRET);
    expect(isCurrentKeyBlob(blob)).toBe(false);
  });

  it("is re-encrypted into a bound v2 blob under the current key", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY_A;
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k2:${KEY_B}`;
    process.env.CREDENTIAL_ENCRYPTION_KEY_ID = "k2";

    const rotated = encryptCredential(
      decryptCredential(legacyBlob(SECRET, KEY_A), ROW),
      ROW,
    );

    expect(isCurrentKeyBlob(rotated)).toBe(true);
    expect(decryptCredential(rotated, ROW)).toBe(SECRET);
    expect(() => decryptCredential(rotated, OTHER_TENANT)).toThrow();
  });

  it("does not read a v1 blob when the legacy key is not configured", () => {
    const blob = legacyBlob(SECRET, KEY_A);
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;

    expect(() => decryptCredential(blob, ROW)).toThrow();
  });
});

describe("failing closed", () => {
  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEYS = `k1:${KEY_A}`;
  });

  it("rejects a tampered ciphertext and a tampered tag (GCM)", () => {
    const [version, keyId, iv, ciphertext, tag] = encryptCredential(
      SECRET,
      ROW,
    ).split(".");

    const flippedCiphertext = Buffer.from(ciphertext, "base64");
    flippedCiphertext[0] ^= 0xff;
    expect(() =>
      decryptCredential(
        [version, keyId, iv, flippedCiphertext.toString("base64"), tag].join("."),
        ROW,
      ),
    ).toThrow();

    const flippedTag = Buffer.from(tag, "base64");
    flippedTag[0] ^= 0xff;
    expect(() =>
      decryptCredential(
        [version, keyId, iv, ciphertext, flippedTag.toString("base64")].join("."),
        ROW,
      ),
    ).toThrow();
  });

  it("rejects a truncated tag instead of letting Node accept it", () => {
    // Node's setAuthTag takes a 4-byte GCM tag without complaint, which would
    // leave an attacker who can write the row forging at 2^32 instead of
    // 2^128 — the one the AAD binding exists to stop.
    const [version, keyId, iv, ciphertext, tag] = encryptCredential(
      SECRET,
      ROW,
    ).split(".");

    for (const bytes of [4, 8, 12, 15]) {
      const truncated = Buffer.from(tag, "base64").subarray(0, bytes);
      expect(() =>
        decryptCredential(
          [version, keyId, iv, ciphertext, truncated.toString("base64")].join("."),
          ROW,
        ),
        `${bytes}-byte tag`,
      ).toThrow();
    }

    // A legacy v1 blob is held to the same length — it was written with a full
    // tag too, and being unbound already makes it the weaker of the two.
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY_A;
    const [, legacyIv, legacyCt, legacyTag] = legacyBlob(SECRET, KEY_A).split(".");
    const truncatedLegacy = Buffer.from(legacyTag, "base64").subarray(0, 4);
    expect(() =>
      decryptCredential(
        ["v1", legacyIv, legacyCt, truncatedLegacy.toString("base64")].join("."),
        ROW,
      ),
    ).toThrow();
  });

  it("rejects malformed blobs and unknown formats", () => {
    for (const blob of ["", "not-a-blob", "v2.k1.only-two", "v9.k1.a.b.c"]) {
      expect(() => decryptCredential(blob, ROW)).toThrow();
    }
  });

  it("never puts plaintext or key material in the error", () => {
    const blob = encryptCredential(SECRET, ROW);

    let message = "";
    try {
      decryptCredential(blob, OTHER_TENANT);
    } catch (cause) {
      message = cause instanceof Error ? cause.message : String(cause);
    }

    expect(message).toBe("credential could not be decrypted");
    expect(message).not.toContain(SECRET);
    expect(message).not.toContain(KEY_A);
    expect(message).not.toContain("k1");
  });
});
