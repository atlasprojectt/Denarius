import type { SearchResult } from "./types";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function rank(result: SearchResult, query: string): number {
  const title = normalizeSearchText(result.title);
  const secondary = normalizeSearchText(
    [result.subtitle, result.metadata].filter(Boolean).join(" "),
  );
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  if (secondary.includes(query)) return 3;
  return 4;
}

export function rankSearchResults(
  results: SearchResult[],
  rawQuery: string,
): SearchResult[] {
  const query = normalizeSearchText(rawQuery);
  return [...results].sort((left, right) => {
    const rankDifference = rank(left, query) - rank(right, query);
    if (rankDifference !== 0) return rankDifference;
    const updatedDifference =
      Date.parse(right.updatedAt ?? "1970-01-01") -
      Date.parse(left.updatedAt ?? "1970-01-01");
    if (updatedDifference !== 0) return updatedDifference;
    return left.title.localeCompare(right.title, "pt-BR");
  });
}
