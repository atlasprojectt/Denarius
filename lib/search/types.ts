import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchResultType =
  | "team"
  | "report"
  | "subscription"
  | "connection";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  metadata?: string;
  updatedAt?: string;
};

export type SearchGroup = {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
};

export type SearchResponse = {
  status: "idle" | "ok" | "partial" | "error";
  groups: SearchGroup[];
};

export type SearchContext = {
  tenantId: string;
  role: string;
  client: SupabaseClient;
};

export type SearchProvider = {
  type: SearchResultType;
  label: string;
  adminOnly?: boolean;
  search(context: SearchContext, query: string): Promise<SearchResult[]>;
};
