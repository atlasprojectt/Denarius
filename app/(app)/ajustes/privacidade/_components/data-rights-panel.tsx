import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Download02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const copy = {
  title: "Seus dados",
  description:
    "Exporte uma cópia completa ou encerre definitivamente este espaço.",
  exportTitle: "Exportar dados",
  exportDescription:
    "Baixa um arquivo JSON com os dados deste espaço. Credenciais e hashes de convite nunca entram no arquivo.",
  exportAction: "Baixar exportação",
  accountAction: "Gerenciar encerramento",
  accountDescription:
    "A exclusão agora exige confirmação por e-mail e uma frase final, para evitar apagamentos acidentais.",
  providerWarning:
    "Isto não cancela nem altera nada na OpenAI ou na Anthropic. O Denarius é somente leitura; o gasto nos provedores continua até sua empresa agir diretamente neles.",
};

const exportHref = "/ajustes/privacidade/exportar";

export function DataRightsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">{copy.exportTitle}</p>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.exportDescription}
            </p>
          </div>
          <Button variant="secondary" asChild>
            <a href={exportHref} download>
              <HugeiconsIcon icon={Download02Icon} aria-hidden />
              {copy.exportAction}
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Encerramento da conta</p>
            <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
              {copy.accountDescription}
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/configuracoes#account-deletion">
              {copy.accountAction}
              <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden />
            </Link>
          </Button>
        </div>

        <p className="text-xs/relaxed text-muted-foreground">
          {copy.providerWarning}
        </p>
      </CardContent>
    </Card>
  );
}
