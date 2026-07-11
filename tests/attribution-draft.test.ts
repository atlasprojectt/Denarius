import { describe, expect, it } from "vitest";

import {
  adoptServerRows,
  baselineFromSaved,
  draftFromRows,
  isDirty,
  rowKey,
  UNATTRIBUTED,
} from "@/lib/attribution/draft";

// WP4 of the 2026-07-11 audit plan (QA-11/UX-16): the attribution selects are
// controlled by a draft vs baseline; the baseline advances ONLY to what the
// server confirmed; revalidated props may add rows but never overwrite state.

const rows = [
  { provider: "openai", projectId: "proj_eng", teamId: "team-eng" },
  { provider: "anthropic", projectId: "wrkspc_mkt", teamId: null },
];

describe("draftFromRows / isDirty — the Save gate", () => {
  it("starts clean: draft equals baseline, Save disabled", () => {
    const draft = draftFromRows(rows);
    expect(isDirty(draft, draftFromRows(rows))).toBe(false);
    expect(draft[rowKey("anthropic", "wrkspc_mkt")]).toBe(UNATTRIBUTED);
  });

  it("flags dirty on any changed selection, including clearing to Não atribuído", () => {
    const baseline = draftFromRows(rows);
    const changed = { ...baseline, [rowKey("openai", "proj_eng")]: "team-data" };
    expect(isDirty(changed, baseline)).toBe(true);

    const cleared = { ...baseline, [rowKey("openai", "proj_eng")]: UNATTRIBUTED };
    expect(isDirty(cleared, baseline)).toBe(true);
  });
});

describe("baselineFromSaved — the confirmed server result wins", () => {
  it("turns the action payload into the new baseline (null → sentinel)", () => {
    const saved = [
      { key: "openai|proj_eng", teamId: "team-data" },
      { key: "anthropic|wrkspc_mkt", teamId: null },
    ];
    const baseline = baselineFromSaved(saved);
    expect(baseline["openai|proj_eng"]).toBe("team-data");
    expect(baseline["anthropic|wrkspc_mkt"]).toBe(UNATTRIBUTED);
  });

  it("save → confirm → clean: the audit's change-Eng-to-Dados flow", () => {
    const baseline = draftFromRows(rows);
    const draft = { ...baseline, [rowKey("openai", "proj_eng")]: "team-data" };
    expect(isDirty(draft, baseline)).toBe(true);

    // Server confirms exactly what was submitted → baseline := confirmed.
    const confirmed = baselineFromSaved([
      { key: "openai|proj_eng", teamId: "team-data" },
      { key: "anthropic|wrkspc_mkt", teamId: null },
    ]);
    expect(isDirty(draft, confirmed)).toBe(false);

    // A later edit re-arms Save (the effect-on-draft bug locked it disabled).
    const edited = { ...draft, [rowKey("anthropic", "wrkspc_mkt")]: "team-mkt" };
    expect(isDirty(edited, confirmed)).toBe(true);
  });
});

describe("adoptServerRows — revalidation cannot restore stale props (QA-11)", () => {
  it("keeps the confirmed selection when stale props arrive after a save", () => {
    // Client just saved proj_eng → team-data; a racing revalidation still
    // carries the OLD mapping (team-eng). The client's truth must survive.
    const client = { "openai|proj_eng": "team-data" };
    const staleServer = { "openai|proj_eng": "team-eng" };
    expect(adoptServerRows(client, staleServer)).toEqual({
      "openai|proj_eng": "team-data",
    });
  });

  it("adopts genuinely new rows (a sync surfaced a new project)", () => {
    const client = { "openai|proj_eng": "team-data" };
    const server = {
      "openai|proj_eng": "team-eng",
      "openai|proj_new": "team-mkt",
    };
    expect(adoptServerRows(client, server)).toEqual({
      "openai|proj_eng": "team-data",
      "openai|proj_new": "team-mkt",
    });
  });

  it("keeps an in-progress (unsaved) edit across a background revalidation", () => {
    const baseline = draftFromRows(rows);
    const draft = { ...baseline, [rowKey("openai", "proj_eng")]: "team-data" };

    const revalidated = draftFromRows(rows); // server still has the old value
    const nextDraft = adoptServerRows(draft, revalidated);
    const nextBaseline = adoptServerRows(baseline, revalidated);
    expect(nextDraft[rowKey("openai", "proj_eng")]).toBe("team-data");
    expect(isDirty(nextDraft, nextBaseline)).toBe(true); // still needs saving
  });
});
