import Link from "next/link";

import { seatAccrual } from "@/lib/engine/accrual";
import { currentPeriod } from "@/lib/engine/period";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { createClient } from "@/lib/supabase/server";

import { SubscriptionForm } from "./_components/subscription-form";
import { SubscriptionTable } from "./_components/subscription-table";

const copy = {
  back: "← Ajustes",
  title: "Assinaturas e assentos",
  subtitle:
    "Registre manualmente os planos por assento que a empresa paga — vê o gasto por time antes de conectar qualquer API. O custo é distribuído dia a dia no período (preço ÷ dias), sem pico no dia 1.",
  emptyTitle: "Nenhuma assinatura registrada ainda",
  emptyBody:
    "Adicione um plano acima (ferramenta, nº de assentos, preço por assento e o time dono — ou marque como compartilhada).",
  listTitle: "Assinaturas",
  accruedNote: (label: string, day: number, days: number) =>
    `Acumulado até hoje — ${label}, dia ${day} de ${days}.`,
};

type TeamRow = { id: string; name: string };

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const period = currentPeriod();

  const [{ subscriptions, currency }, { data: teamsData }] = await Promise.all([
    listSubscriptions(),
    supabase
      .from("team")
      .select("id, name")
      .eq("is_unattributed", false)
      .order("name"),
  ]);
  const teams = (teamsData ?? []) as TeamRow[];

  const rows = subscriptions.map((sub) => ({
    id: sub.id,
    tool: sub.tool,
    seatCount: sub.seatCount,
    unitPrice: sub.unitPrice,
    teamId: sub.teamId,
    teamName: sub.teamName,
    monthly: money(sub.seatCount * sub.unitPrice, currency),
    accrued: money(
      seatAccrual({
        seatCount: sub.seatCount,
        unitPrice: sub.unitPrice,
        dayOfPeriod: period.dayOfPeriod,
        daysInPeriod: period.daysInPeriod,
      }),
      currency,
    ),
  }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/ajustes"
          className="text-sm text-muted-foreground hover:underline"
        >
          {copy.back}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <SubscriptionForm teams={teams} currency={currency} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">{copy.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {copy.emptyBody}
          </p>
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">
            {copy.listTitle}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({rows.length})
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.accruedNote(
              period.monthLabel,
              period.dayOfPeriod,
              period.daysInPeriod,
            )}
          </p>
          <SubscriptionTable subscriptions={rows} teams={teams} />
        </section>
      )}
    </div>
  );
}
