import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { decryptCredential, encryptCredential } from "@/lib/crypto";

describe("credential encryption (AES-256-GCM)", () => {
  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a credential and never stores it in the clear", () => {
    const secret = "sk-admin-super-secret-0123456789";
    const blob = encryptCredential(secret);
    expect(blob).not.toContain(secret);
    expect(blob.startsWith("v1.")).toBe(true);
    expect(decryptCredential(blob)).toBe(secret);
  });

  it("produces a different blob per call (random IV)", () => {
    const secret = "sk-admin-same-input";
    expect(encryptCredential(secret)).not.toBe(encryptCredential(secret));
  });

  it("rejects a tampered blob (GCM auth tag)", () => {
    const blob = encryptCredential("sk-admin-tamper-me-please");
    const [v, iv, ct, tag] = blob.split(".");
    const flipped = Buffer.from(ct, "base64");
    flipped[0] ^= 0xff;
    const tampered = [v, iv, flipped.toString("base64"), tag].join(".");
    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("rejects decryption under a rotated key", () => {
    const blob = encryptCredential("sk-admin-old-key");
    process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptCredential(blob)).toThrow();
  });

  it("accepts hex keys and refuses keys that are not 32 bytes", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    expect(decryptCredential(encryptCredential("ok"))).toBe("ok");

    process.env.CREDENTIAL_ENCRYPTION_KEY = "too-short";
    expect(() => encryptCredential("nope")).toThrow(/32 bytes/);

    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(() => encryptCredential("nope")).toThrow(/not set/);
  });
});
