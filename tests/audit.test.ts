import { describe, expect, it, vi } from "vitest";

import { ACTION_LABEL } from "@/app/(app)/ajustes/auditoria/copy";
import type { AuditAction } from "@/lib/audit/log";
import {
  REDACTED,
  redactDetail,
  redactTarget,
  redactValue,
} from "@/lib/audit/redact";

// Audit trail for administrative actions (issue #73). The write seam is pure
// here on purpose: the one rule the log must never break — record THAT the key
// was rotated, never the key — is enforced by a function, not by discipline.

describe("no credential ever reaches an audit entry", () => {
  it("drops a value that looks like a provider Admin Key", () => {
    for (const secret of [
      "sk-proj-0123456789abcdefghijklmnop",
      "sk-ant-admin01-AAAAAAAAAAAAAAAAAAAAAA",
      "sk_live_0123456789",
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    ]) {
      expect(redactValue(secret)).toBe(REDACTED);
      expect(redactTarget(secret)).toBe(REDACTED);
      expect(redactDetail({ whatever: secret })).toEqual({ whatever: REDACTED });
    }
  });

  it("drops any value under a key that names a secret, whatever it holds", () => {
    expect(
      redactDetail({
        password: "trocar",
        adminKey: "abc",
        token_hash: "9f8e",
        chave: "1234",
        provider: "openai",
      }),
    ).toEqual({
      password: REDACTED,
      adminKey: REDACTED,
      token_hash: REDACTED,
      chave: REDACTED,
      provider: "openai",
    });
  });

  it("drops long opaque strings — a token nobody labelled as one", () => {
    expect(redactValue("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0")).toBe(REDACTED);
    expect(redactValue("0123456789abcdef0123456789abcdef")).toBe(REDACTED);
  });

  it("recurses into nested detail rather than trusting the top level", () => {
    expect(
      redactDetail({
        changed: [{ scope: "org", secret: "sk-proj-abcdefghijklmnopqrstuv" }],
        nested: { token: "abc", amount: 1500 },
      }),
    ).toEqual({
      changed: [{ scope: "org", secret: REDACTED }],
      nested: { token: REDACTED, amount: 1500 },
    });
  });

  it("keeps the auditable substance intact", () => {
    // What the call sites actually record: amounts, counts, switches, e-mails,
    // team ids and tool names. None of it may be mistaken for a secret.
    expect(
      redactDetail({
        scope: "org",
        from: 1000,
        to: 1500,
        warnPct: 80,
        showNames: false,
        storePerPerson: true,
        teamId: "11111111-1111-1111-1111-111111111111",
        currency: "BRL",
        role: "viewer",
        imported: 42,
        teamsCreated: 3,
        empty: null,
      }),
    ).toEqual({
      scope: "org",
      from: 1000,
      to: 1500,
      warnPct: 80,
      showNames: false,
      storePerPerson: true,
      teamId: "11111111-1111-1111-1111-111111111111",
      currency: "BRL",
      role: "viewer",
      imported: 42,
      teamsCreated: 3,
      empty: null,
    });
  });

  it("keeps the target labels the screens show", () => {
    for (const target of [
      "Empresa",
      "OpenAI",
      "Claude Code",
      "pessoa@empresa.com.br",
      "GitHub Copilot Business",
      "11111111-1111-1111-1111-111111111111",
      "BRL",
    ]) {
      expect(redactTarget(target)).toBe(target);
    }
    expect(redactTarget(null)).toBeNull();
    expect(redactTarget(undefined)).toBeNull();
  });
});

describe("action phrasing", () => {
  it("phrases every action in pt-BR, in the UI and not in the row", () => {
    const actions = Object.keys(ACTION_LABEL) as AuditAction[];
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(ACTION_LABEL[action].trim().length).toBeGreaterThan(0);
      // The enum value itself is never what a reader sees.
      expect(ACTION_LABEL[action]).not.toContain(".");
    }
  });
});

describe("reading the trail — a failed read is not an empty trail", () => {
  // The one failure mode an evidence surface must not have. A swallowed error
  // rendered "Nenhuma ação registrada ainda", which is a confident claim that
  // no administrative action ever happened — and deploying before the
  // migration lands produces exactly that (#73).
  async function readWith(result: { data: unknown; error: unknown }) {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        from: () => {
          const query = {
            select: () => query,
            order: () => query,
            limit: () => Promise.resolve(result),
          };
          return query;
        },
      }),
    }));
    const { listAuditEntries } = await import("@/lib/audit/queries");
    return listAuditEntries();
  }

  it("reports a failed read instead of claiming the trail is empty", async () => {
    const read = await readWith({ data: null, error: { code: "42P01" } });

    expect(read.ok).toBe(false);
    expect(read.entries).toEqual([]);
  });

  it("still reports a genuinely empty trail as a successful read", async () => {
    const read = await readWith({ data: [], error: null });

    expect(read.ok).toBe(true);
    expect(read.entries).toEqual([]);
  });

  it("maps rows on a successful read", async () => {
    const read = await readWith({
      data: [
        {
          id: "a-1",
          actor_email: "admin@tenant.test",
          action: "budget.updated",
          target: "Empresa",
          created_at: "2026-08-05T12:00:00Z",
        },
      ],
      error: null,
    });

    expect(read.ok).toBe(true);
    expect(read.entries[0]).toEqual({
      id: "a-1",
      actorEmail: "admin@tenant.test",
      action: "budget.updated",
      target: "Empresa",
      createdAt: "2026-08-05T12:00:00Z",
    });
  });
});
