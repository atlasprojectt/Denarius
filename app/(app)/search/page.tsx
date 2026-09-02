import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { searchWorkspace } from "@/lib/search/actions";
import { parseSearchQuery } from "@/lib/search/search";
import { SearchPage } from "./_components/search-page";

const copy = {
  title: "Pesquisa",
  description: "Encontre recursos do workspace e abra o destino diretamente.",
};

export default async function SearchRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const rawQuery = (await searchParams).q?.slice(0, 80) ?? "";
  const validQuery = parseSearchQuery(rawQuery);
  const initialResponse = validQuery
    ? await searchWorkspace(validQuery)
    : { status: "idle" as const, groups: [] };

  return (
    <PageContainer variant="wide" className="gap-6">
      <PageHeader title={copy.title} description={copy.description} />
      <SearchPage initialQuery={rawQuery} initialResponse={initialResponse} />
    </PageContainer>
  );
}
