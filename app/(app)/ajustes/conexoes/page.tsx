import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item";
import { createClient } from "@/lib/supabase/server";

import { ProviderConnectionCard } from "./_components/provider-connection-card";

const copy = {
  back: "Ajustes",
  title: "Conexões",
  subtitle:
    "Chaves admin somente-leitura, criptografadas em repouso. O Denarius observa uso e custo — nunca altera nada nos provedores.",
  comingSoon: [
    {
      name: "GitHub Copilot",
      description: "Assentos e uso do Copilot direto da organização GitHub.",
      status: "Planejado para a v1.5",
    },
  ],
};

const PROVIDERS = ["openai", "anthropic"] as const;

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("provider_connection")
    .select("provider, status, last_sync_at, last_sync_error");
  const connections = (data ?? []) as ConnectionRow[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        backHref="/ajustes"
        backLabel={copy.back}
      />

      {PROVIDERS.map((provider) => {
        const connection = connections.find((c) => c.provider === provider);
        return (
          <ProviderConnectionCard
            key={provider}
            provider={provider}
            status={connection?.status ?? null}
            lastSyncAt={connection?.last_sync_at ?? null}
            lastSyncError={connection?.last_sync_error ?? null}
          />
        );
      })}

      {copy.comingSoon.map((item) => (
        <Item key={item.name} variant="outline" className="border-dashed">
          <ItemContent>
            <ItemTitle>{item.name}</ItemTitle>
            <ItemDescription>{item.description}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Badge variant="outline" className="text-muted-foreground">
              {item.status}
            </Badge>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
