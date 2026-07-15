import "server-only";

import { createHash, randomBytes } from "node:crypto";

// Invitation tokens. The raw token travels in the link (email + the copy the
// Admin gets); only its hash is stored, so a database read can never mint a
// working link. 32 bytes = 256 bits of entropy — not guessable, and the hash
// needs no salt/stretching for the same reason (it is not a human password).

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
