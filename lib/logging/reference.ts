// The reference a user can quote (issue #79). Pure, and deliberately importable
// from a Client Component: the error boundaries render it.
//
// #70 gave failure a calm pt-BR face and — correctly — put no stack trace,
// exception message or digest detail on the screen. On its own that leaves the
// user with nothing to say and the operator with nothing to search, so a failure
// gets reported as "não funcionou" and can never be reproduced. This is the one
// string that closes that gap, and it discloses nothing about the failure: Next
// derives the digest from the error server-side, and only the server-side log
// knows what it stands for.

/** How many characters of the digest the screen shows. Long enough to be
 *  unambiguous in a day's logs, short enough to read over the phone. */
const REFERENCE_LENGTH = 8;

/**
 * Turns Next's error digest into the reference line's token, or null when there
 * is no digest at all (a client-side error, or dev mode). Null means the UI
 * shows NO reference — an invented one would send someone searching for a
 * string that appears in no log.
 */
export function referenceId(digest: string | undefined | null): string | null {
  if (typeof digest !== "string") return null;
  const compact = digest.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (compact === "") return null;
  return compact.slice(0, REFERENCE_LENGTH);
}
