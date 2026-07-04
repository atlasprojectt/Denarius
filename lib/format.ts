// Shared pt-BR display formatting beyond money() (lib/money.ts).

/** Sync stamps: "03/07/2026, 20:17:16 UTC" — always UTC, disclosed as such. */
export function utcStamp(iso: string): string {
  return (
    new Date(iso).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC"
  );
}
