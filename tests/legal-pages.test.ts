import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED_AT,
  privacyCopy,
  termsCopy,
  type LegalDocument,
} from "@/app/(legal)/copy";
import { PUBLIC_PREFIXES, proxy } from "@/proxy";

// Issue #57. These pages are the product's public claims about itself: a wrong
// sentence here is a compliance problem, not a UI bug. The assertions guard the
// three things that would silently rot — the routes falling back behind auth,
// a sub-processor losing its disclosure, and the pages losing the date and the
// contact channel that make them readable as maintained.

const documents: [string, LegalDocument][] = [
  ["privacidade", privacyCopy],
  ["termos", termsCopy],
];

function allText(doc: LegalDocument): string {
  const parts = [doc.title, doc.lead];
  for (const section of doc.sections) {
    parts.push(section.heading);
    for (const block of section.blocks) {
      switch (block.kind) {
        case "text":
          parts.push(...block.paragraphs);
          break;
        case "list":
          parts.push(...block.items);
          break;
        case "definitions":
          parts.push(...block.items.flatMap((i) => [i.term, i.description]));
          break;
        case "subprocessors":
          parts.push(
            ...block.items.flatMap((i) => [i.name, i.purpose, i.receives, i.location]),
          );
          break;
      }
    }
  }
  return parts.join("\n");
}

describe("the legal routes stay public", () => {
  it("is what PUBLIC_PREFIXES says", () => {
    expect(PUBLIC_PREFIXES).toContain("/privacidade");
    expect(PUBLIC_PREFIXES).toContain("/termos");
  });

  // The proxy builds a Supabase client on this path, so the case only runs
  // where that env exists — same gate as tests/proxy-cron-bypass.test.ts.
  it.skipIf(
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )("serves them to a visitor with no session", async () => {
    for (const path of ["/privacidade", "/termos"]) {
      const response = await proxy(new NextRequest(`http://localhost${path}`));
      // A redirect would mean the policy sits behind the login it describes.
      expect(response.headers.get("location"), path).toBeNull();
    }
  });
});

describe.each(documents)("the %s document", (_name, doc) => {
  it("has a title, a lead and sections that all carry content", () => {
    expect(doc.title.trim()).not.toBe("");
    expect(doc.lead.trim()).not.toBe("");
    expect(doc.sections.length).toBeGreaterThanOrEqual(5);
    for (const section of doc.sections) {
      expect(section.heading.trim(), section.id).not.toBe("");
      expect(section.blocks.length, section.id).toBeGreaterThan(0);
    }
  });

  it("carries a last-updated date and the LGPD contact channel", () => {
    // A policy without a date reads as unmaintained; one without a channel
    // gives a data subject nowhere to go.
    expect(LEGAL_UPDATED_AT.trim()).not.toBe("");
    expect(allText(doc)).toContain(LEGAL_CONTACT_EMAIL);
  });

  it("uses unique section ids, so the anchors are addressable", () => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the privacy policy's substantive claims", () => {
  const text = allText(privacyCopy);

  it("states that prompts and responses are never stored", () => {
    expect(text).toMatch(/nunca são armazenados|não coletamos prompts/i);
    expect(text).toMatch(/prompts/i);
  });

  it("describes the per-person switches and key encryption", () => {
    expect(text).toMatch(/Mostrar nomes/);
    expect(text).toMatch(/Armazenar dados por pessoa/);
    expect(text).toMatch(/AES-256-GCM/);
  });

  it("discloses every sub-processor with what it receives and where it sits", () => {
    const block = privacyCopy.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.kind === "subprocessors");
    if (block?.kind !== "subprocessors") throw new Error("no sub-processor block");

    // The four the product actually reaches. Anthropic is the one a reader
    // cannot infer from the outside — the weekly digest is narrated by Claude.
    expect(block.items.map((i) => i.name).sort()).toEqual([
      "Anthropic",
      "Resend",
      "Supabase",
      "Vercel",
    ]);
    for (const item of block.items) {
      expect(item.receives.trim(), item.name).not.toBe("");
      expect(item.location.trim(), item.name).not.toBe("");
    }
  });

  it("says what the Anthropic hop does and does not send", () => {
    expect(text).toMatch(/nomes de time e os valores já calculados/i);
    expect(text).toMatch(/Não vão prompts, respostas, nomes de pessoas/i);
  });

  it("states a retention window and only the rights the app can honor today", () => {
    expect(text).toMatch(/em até 30 dias/);
    // Export and full deletion are manual until #74 ships self-service; the
    // policy must not promise a button that does not exist.
    expect(text).toMatch(/atendidos manualmente/i);
    expect(text).not.toMatch(/exporte seus dados|baixar seus dados/i);
  });
});
