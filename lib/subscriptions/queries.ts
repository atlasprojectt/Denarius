import "server-only";

import type { SeatSubscription } from "@/lib/engine/accrual";
import { createClient } from "@/lib/supabase/server";

// Read path shared by the Explore root and the subscriptions settings page —
// one select + one row mapping, so the two screens can never drift apart.

type SubscriptionRow = {
  id: string;
  tool: string;
  seat_count: number;
  unit_price: number;
  team_id: string | null;
  team: { name: string } | null;
};

export type SubscriptionList = {
  subscriptions: SeatSubscription[];
  /**
   * Tenant display currency — every stored amount is in it (the row-level
   * `currency` column is the audit trail; FX handling arrives with #17).
   */
  currency: string;
};

export async function listSubscriptions(): Promise<SubscriptionList> {
  const supabase = await createClient();
  const [{ data: subsData }, { data: tenantData }] = await Promise.all([
    supabase
      .from("subscription")
      .select("id, tool, seat_count, unit_price, team_id, team:team_id(name)")
      .order("created_at"),
    supabase.from("tenant").select("display_currency").maybeSingle(),
  ]);

  const rows = (subsData ?? []) as unknown as SubscriptionRow[];
  const currency =
    (tenantData as { display_currency: string } | null)?.display_currency ??
    "BRL";

  return {
    subscriptions: rows.map((row) => ({
      id: row.id,
      tool: row.tool,
      seatCount: row.seat_count,
      unitPrice: row.unit_price,
      teamId: row.team_id,
      teamName: row.team?.name ?? null,
    })),
    currency,
  };
}
