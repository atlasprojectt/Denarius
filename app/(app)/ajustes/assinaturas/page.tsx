import { CoinsIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/domain/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { seatAccrual } from "@/lib/engine/accrual";
import { currentPeriod } from "@/lib/engine/period";
import { money } from "@/lib/money";
import { listSubscriptions } from "@/lib/subscriptions/queries";
import { listTeams } from "@/lib/teams/queries";

import { SubscriptionForm } from "./_components/subscription-form";
import { SubscriptionTable } from "./_components/subscription-table";

const copy = {
  back: "Ajustes",
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

export default async function SubscriptionsPage() {
  const period = currentPeriod();

  const [{ subscriptions, currency }, teams] = await Promise.all([
    listSubscriptions(),
    listTeams(),
  ]);

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      <SubscriptionForm teams={teams} currency={currency} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CoinsIcon />}
          title={copy.emptyTitle}
          description={copy.emptyBody}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {copy.listTitle}{" "}
              <span className="font-normal text-muted-foreground">
                ({rows.length})
              </span>
            </CardTitle>
            <CardDescription className="tabular-nums">
              {copy.accruedNote(
                period.monthLabel,
                period.dayOfPeriod,
                period.daysInPeriod,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionTable subscriptions={rows} teams={teams} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
