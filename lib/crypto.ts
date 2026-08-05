import "server-only";

// The seam the application imports for provider Admin keys at rest.
//
// The implementation lives in lib/credentials/ and carries no `server-only`
// marker on purpose: scripts/rotate-credentials.ts runs under plain node, and
// re-implementing AES-GCM there so it could import something is the one thing
// a rotation path must never do. This file keeps the marker, so nothing in the
// app can pull the primitives into a client bundle by accident.

export {
  decryptCredential,
  encryptCredential,
  isCurrentKeyBlob,
  type CredentialContext,
} from "./credentials/blob.ts";
