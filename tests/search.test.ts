import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { escapeLikePattern, normalizeSearchText, rankSearchResults } from "@/lib/search/ranking";
import { addRecentSearch, parseRecentSearches } from "@/lib/search/recent";
import { SEARCH_SCOPES, routesSearchProvider } from "@/lib/search/routes";
import { aggregateSearch, parseSearchQuery, SEARCH_GROUP_LIMIT, SEARCH_TOTAL_LIMIT } from "@/lib/search/search";
import type { SearchContext, SearchProvider, SearchResult } from "@/lib/search/types";

const context = (role = "admin"): SearchContext => ({ tenantId: "tenant-a", role, client: {} as SupabaseClient });
const result = (id: string, title: string, subtitle?: string): SearchResult => ({ id, type: "team", title, subtitle, href: `/times/${id}` });
function provider(type: SearchProvider["type"], label: string, results: SearchResult[], adminOnly = false): SearchProvider {
  return { type, label, adminOnly, search: vi.fn().mockResolvedValue(results) };
}

describe("global search", () => {
  it("keeps recent searches trimmed, unique, and bounded", () => {
    const recent = addRecentSearch(["times", "relatórios"], " times ");
    expect(recent).toEqual(["times", "relatórios"]);

    const bounded = addRecentSearch(
      ["one", "two", "three", "four", "five"],
      "six",
    );
    expect(bounded).toEqual(["six", "one", "two", "three", "four"]);
  });

  it("ignores malformed or invalid recent-search storage", () => {
    expect(parseRecentSearches("not-json")).toEqual([]);
    expect(parseRecentSearches(JSON.stringify(["a", "valid query"]))).toEqual([
      "valid query",
    ]);
  });

  it("does not search empty, whitespace, or one-character queries", async () => {
    const search = provider("team", "Times", [result("1", "Alpha")]);
    for (const query of ["", "  ", "a"]) expect(await aggregateSearch(context(), query, [search])).toEqual({ status: "idle", groups: [] });
    expect(vi.mocked(search.search).mock.calls).toHaveLength(0);
  });

  it("validates and trims the query contract", () => {
    expect(parseSearchQuery("  eng  ")).toBe("eng");
    expect(parseSearchQuery("a")).toBeNull();
    expect(parseSearchQuery("x".repeat(81))).toBeNull();
  });

  it("keeps scope suggestions attached to their app destinations", () => {
    expect(SEARCH_SCOPES).toEqual([
      { label: "Times", query: "times", href: "/times" },
      { label: "Relatórios", query: "relatórios", href: "/relatorios" },
      { label: "Assinaturas", query: "assinaturas", href: "/ajustes/assinaturas" },
      { label: "Conexões", query: "conexões", href: "/ajustes/conexoes" },
    ]);
  });

  it("searches app routes and keeps admin-only routes private", async () => {
    const viewerRoutes = await routesSearchProvider.search(context("viewer"), "times");
    expect(viewerRoutes).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Times", href: "/times" }),
    ]));

    const viewerAdminRoutes = await routesSearchProvider.search(context("viewer"), "conexões");
    expect(viewerAdminRoutes).toHaveLength(0);

    const adminRoutes = await routesSearchProvider.search(context("admin"), "conexões");
    expect(adminRoutes).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Conexões", href: "/ajustes/conexoes" }),
    ]));
  });

  it("ranks exact, prefix, title contains, then secondary matches", () => {
    const ranked = rankSearchResults([result("4", "Platform", "Engineering"), result("3", "Platform Engineering"), result("2", "Engineering Platform"), result("1", "Engineering")], "engineering");
    expect(ranked.map(({ id }) => id)).toEqual(["1", "2", "3", "4"]);
  });

  it("normalizes accents and escapes LIKE wildcard characters", () => {
    expect(normalizeSearchText("  Relatório ÁGIL ")).toBe("relatorio agil");
    expect(escapeLikePattern("50%_\\done' OR 1=1 --")).toBe("50\\%\\_\\\\done' OR 1=1 --");
  });

  it("groups providers, preserves hrefs, and respects limits", async () => {
    const providers = ["team", "report", "subscription", "connection"].map((type, group) => provider(type as SearchProvider["type"], `Group ${group}`, Array.from({ length: 10 }, (_, index) => ({ ...result(`${group}-${index}`, `Match ${index}`), type: type as SearchProvider["type"], href: `/destination/${group}/${index}` }))));
    const response = await aggregateSearch(context(), "match", providers);
    expect(response.groups).toHaveLength(4);
    expect(response.groups.every((group) => group.results.length <= SEARCH_GROUP_LIMIT)).toBe(true);
    expect(response.groups.flatMap((group) => group.results)).toHaveLength(SEARCH_TOTAL_LIMIT);
    expect(response.groups[0].results[0].href).toBe("/destination/0/0");
  });

  it("does not execute protected providers for viewers", async () => {
    const visible = provider("team", "Times", [result("1", "Engineering")]);
    const protectedProvider = provider("connection", "Conexões", [], true);
    await aggregateSearch(context("viewer"), "eng", [visible, protectedProvider]);
    expect(visible.search).toHaveBeenCalledOnce();
    expect(vi.mocked(protectedProvider.search).mock.calls).toHaveLength(0);
  });

  it("keeps successful groups when one provider fails and errors if all fail", async () => {
    const good = provider("team", "Times", [result("1", "Engineering")]);
    const bad = provider("report", "Relatórios", []);
    vi.mocked(bad.search).mockRejectedValue(new Error("database unavailable"));
    const onError = vi.fn();
    const partial = await aggregateSearch(context(), "eng", [good, bad], onError);
    expect(partial.status).toBe("partial");
    expect(partial.groups[0].results[0].title).toBe("Engineering");
    expect(onError).toHaveBeenCalledOnce();
    expect((await aggregateSearch(context(), "eng", [bad])).status).toBe("error");
  });
});

