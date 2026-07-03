import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { OpenAIConnectionCard } from "./_components/openai-connection-card";

const copy = {
  back: "← Ajustes",
  title: "Conexões",
  subtitle:
    "Chaves admin somente-leitura, criptografadas em repouso. O Denarius observa uso e custo — nunca altera nada nos provedores.",
  comingSoon: [
    { name: "Anthropic", status: "Chega na próxima versão" },
    { name: "GitHub Copilot", status: "Planejado para a v1.5" },
  ],
};

type ConnectionRow = {
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("provider_connection")
    .select("status, last_sync_at, last_sync_error")
    .eq("provider", "openai")
    .maybeSingle();
  const connection = data as ConnectionRow | null;

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

      <OpenAIConnectionCard
        status={connection?.status ?? null}
        lastSyncAt={connection?.last_sync_at ?? null}
        lastSyncError={connection?.last_sync_error ?? null}
      />

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <ul className="flex flex-col gap-3">
          {copy.comingSoon.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span className="font-medium">{item.name}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
