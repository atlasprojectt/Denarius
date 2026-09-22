# Agent skills (`docs/skills.md`)

Local, project-scoped skills that agents use during development. This file is the
**documentation**; the skills themselves live in `.agents/skills/` and are
**never committed** (see `.gitignore`). Skills and docs stay separate: nothing
under `.agents/skills/` is edited — it is byte-identical to the upstream repos.
Provenance, usage guidance, and known limitations live here.

## Installed skills (essentials only)

| Skill | Source | Local path | Use when |
|---|---|---|---|
| `how` | `cursor/plugins` → `pstack/skills/how` | `.agents/skills/how/` | "How does X work?" before changing a subsystem; placement/ownership/layering questions |
| `blast-radius` | `cursor/plugins` → `pstack/skills/blast-radius` | `.agents/skills/blast-radius/` | Before shipping a change you don't trust: what could it break beyond the diff |
| `typescript-best-practices` | `cursor/plugins` → `pstack/skills/typescript-best-practices` | `.agents/skills/typescript-best-practices/` | Reading or editing any `.ts`/`.tsx` file |
| `improve-codebase-architecture` | `mattpocock/skills` → `skills/engineering/improve-codebase-architecture` | `.agents/skills/improve-codebase-architecture/` | Periodic upkeep: survey deepening opportunities, pick one, grill it — never changes code itself |
| `to-tickets` | `mattpocock/skills` → `skills/engineering/to-tickets` | `.agents/skills/to-tickets/` | Breaking a spec/plan into tracer-bullet vertical slices with blocking edges |
| `tdd` | `mattpocock/skills` → `skills/engineering/tdd` | `.agents/skills/tdd/` | Building a behaviour test-first (red → green); agreeing the test seam before any test exists |
| `code-review` | `mattpocock/skills` → `skills/engineering/code-review` | `.agents/skills/code-review/` | Local pre-PR review of `HEAD` vs a fixed point, Standards axis + Spec axis |
| `handoff` | `mattpocock/skills` → `skills/productivity/handoff` | `.agents/skills/handoff/` | Compacting a session into a handoff doc for a fresh agent (written to OS temp dir) |

Upstream notes:

- The `mattpocock/skills` links in the original request pointed at
  `docs/engineering/*.md` (descriptive doc pages). The installable skills live
  under `skills/<area>/<name>/SKILL.md`; those canonical paths were verified
  and installed instead, with all auxiliary files (`references/`, `*.md`
  companions, `agents/openai.yaml`) preserved.
- The complementary skills (`diagnosing-bugs`, `architect`,
  `create-verification-skill`, `interrogate`) were deliberately **not**
  installed, per scope: essentials only.

## Proportionality rule

Skills are tools, not gates. Match the ceremony to the task:

- **Small change** (one file, obvious scope, covered by existing tests): no
  skill needed. Follow AGENTS.md §§6–7 directly.
- **Medium change** (a subsystem, a new engine function, a migration):
  `how` to orient, `tdd` to build, `blast-radius` before merging if the diff
  touches shared code.
- **Large change** (multi-layer feature, structural refactor): `to-tickets`
  first, then per-ticket `tdd`, then `code-review` against the branch point.
- **Periodic, outside any chain**: `improve-codebase-architecture` to queue
  upkeep work; it produces a report + decision, never a diff.

Never run `code-review` or `improve-codebase-architecture` in a loop until
clean — both are designed to always find something. Act on findings with a
cited rule behind them, then stop.

## Denarius-specific bindings

- `typescript-best-practices` reinforces AGENTS.md §13 (strict TS, no `any`
  without justification, zod schemas at boundaries). Where the skill names
  `type-system-discipline` / `boundary-discipline` principle skills, read them
  as "this repo's §13 + zod `infer`" — those sibling skills are not installed.
- `tdd` seams in this repo: engine pure functions in `lib/engine/`
  (preferred — deterministic, fast), server actions (via `safeParse` +
  integration tests), RLS policies (isolation suite). Per the skill's own open
  gap: Playwright browser tests are written **after** the behaviour works, not
  red-first — they are too slow for the loop.
- `code-review` is the **local** pre-PR pass. It does not replace CodeRabbit
  on the PR (AGENTS.md §5/§7). Standards axis sources: AGENTS.md + `docs/`.
  Spec axis source: the originating GitHub issue or spec file — hand its path
  to the agent when invoking.
- `to-tickets` local-files mode writes under `.scratch/` (gitignored). GitHub
  mode maps onto repo issues; do not apply a `ready-for-agent` label unless
  the tracker is configured for it.
- `blast-radius` aligns with AGENTS.md §10 invariants: every safety claim
  about spend, isolation, or reconciliation must be proven by running code
  (step 4 of its certainty ladder), never asserted.
- `handoff` output goes to the OS temp dir, never the workspace. Redact
  secrets per AGENTS.md §14; reference specs/plans/ADRs by path, don't paste
  them.

## Known limitations (documented, not worked around)

1. **Cursor-specific machinery in pstack skills.** `how` names Cursor
   `subagent_type`/`model` values and sibling skills (`why`, `unslop`,
   `arena`); `blast-radius` cites `why` step 2. None of those exist here.
   Adapt: explore with the available agents (read-only), cite real `file:line`,
   prove the safety fact by running code. Do not simulate the missing skills'
   output.
2. **Missing Matt Pocock siblings.** `improve-codebase-architecture` expects
   `codebase-design` (vocabulary), `grilling`, `domain-modeling`;
   `to-tickets`/`code-review` expect `/setup-matt-pocock-skills` tracker
   config (`docs/agents/issue-tracker.md`, triage labels); `tdd` leans on
   `codebase-design`. Without them the skills still run but with degraded
   vocabulary/tracker integration. This repo has no `CONTEXT.md` or
   `docs/adr/` — domain terms come from `docs/prd.md` and `docs/*.md` instead.
3. **`code-review` fan-out bug.** Upstream reports sub-agents re-invoking the
   skill and spawning dozens of agents. Guard each invocation explicitly:
   "perform this review directly; do not invoke further skills or spawn
   additional agents." It diffs `<fixed-point>...HEAD` only — commit first,
   then review.
4. **`code-review` name collision.** This skill shadows the built-in
   bug-hunting review of some harnesses. Here it is strictly the
   Standards-vs-Spec review defined in its SKILL.md.
5. **`improve-codebase-architecture` report needs network** (Tailwind +
   Mermaid CDNs) when opened; in offline/locked-down environments ask for
   inline CSS + hand-built SVG instead.
6. **`disable-model-invocation: true`.** All eight skills declare this: the
   agent never auto-invokes them. A human (or explicit instruction) triggers
   them — consistent with "the system points, the CEO decides" applying to
   process as well as product.

## Maintenance

- Re-sync a skill by re-copying its upstream directory over
  `.agents/skills/<name>/`; verify with a hash comparison, then confirm
  `git status` shows nothing under `.agents/skills/` (still ignored).
- Adding a skill = new directory under `.agents/skills/` + `.gitignore`
  entry + row in the table above. No other file changes.
- Complementary skills remain out of scope unless a future task earns one;
  each new skill is due-diligence surface (AGENTS.md §8).
