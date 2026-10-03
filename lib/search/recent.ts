import { z } from "zod";

import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "./search";

export const SEARCH_RECENT_KEY = "denarius:search-recent:v1";
export const MAX_RECENT_SEARCHES = 5;

const recentSearchSchema = z.string()
  .trim()
  .min(MIN_SEARCH_LENGTH)
  .max(MAX_SEARCH_LENGTH);
const recentSearchesSchema = z.array(z.unknown());

export function parseRecentSearches(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = recentSearchesSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return [];

    const validQueries = parsed.data.flatMap((entry) => {
      const query = recentSearchSchema.safeParse(entry);
      return query.success ? [query.data] : [];
    });
    return [...new Set(validQueries)].slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function addRecentSearch(recent: string[], value: string): string[] {
  const query = value.trim();
  if (query.length < MIN_SEARCH_LENGTH || query.length > MAX_SEARCH_LENGTH) {
    return recent;
  }

  return [query, ...recent.filter((entry) => entry !== query)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
}

export function serializeRecentSearches(recent: string[]): string {
  return JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES));
}
