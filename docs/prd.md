# PRD — Denarius (v1)

> **Status:** ready to build (greenfield)
> **Positioning:** AI-spend governance for tech companies. Denarius connects a company's AI APIs (OpenAI + Anthropic), attributes **token spend in money** by team/person, tracks it **against a budget**, and answers *"am I in control?"* in one line — a **verdict** — backed by **projected margin**, **early warnings**, and **contextual what-if simulation**. An executive cockpit for the CEO/CTO who needs to *keep AI cost under control*, not just look at it.
> **Exit thesis:** traction (1–3 paying customers) → sale to a strategic acquirer.
> **Revision note:** this version integrates the founder's focus realignment and the founder-approved 2026-07-11 UI/UX audit. Decision P16 supersedes earlier UI details where they conflict.
> **Status of the build (2026-08-07):** the v1 build order below (slices 2–12, issues #12–#23) is **complete**. What followed is a pre-launch hardening track — stories 60–66, all shipped — covering the credential self-service, the audit trail, LGPD self-service, closed-month reports and the public legal pages, plus non-story infrastructure work (security headers, rate limiting, credential-key rotation, supply-chain gate, RLS in CI, server-side logging, responsive pass). Everything still open is **HITL**: infrastructure and provider access only a human can provision (issues #11, #56, #59, #63, #64, #65, #66, #67).

---

## Problem Statement

I'm the CEO/CTO of a 20–200-person tech company. Our AI spend is **growing fast and unpredictably** — price per token drops, but volume explodes as agents and broader usage spread (Jevons paradox). The money flows through scattered API keys (OpenAI, Anthropic) used across teams, and I have **no way to keep it under control**:

- I don't know how much we're spending **right now**, in total and **by team**, in money (not abstract tokens);
- I have **no budget guardrail** — nothing tells me "Engineering is on pace to blow past its limit this month" until the invoice arrives;
- I can't answer **"how much headroom do I have?"** — the margin between where I am (and where I'll land) and the limit;
- When spend spikes, I find out **late**, can't **simulate what would fix it**, and have **no plan** for what to do about it;
- My finance team treats AI as an uncontrollable variable cost.

The core pain is **control**, not accounting. The product answers three questions:
1. **How much is being spent, and by whom?** (visibility + attribution)
2. **Am I inside or outside the budget — and what's the margin, current and projected?** (governance)
3. **Where will this land, what are my options, and what should I look at?** (planning + decision support: scenarios and pointers — the system points, the CEO decides)

## Solution

**Denarius** is a B2B web app that turns scattered AI **token spend into a governed budget**.

From the user's perspective:

1. I create my company account (tenant) and invite people (Admin/Viewer).
2. I **see value on day zero** by seeding data manually (subscriptions/seats we pay for, plus a **roster CSV** of employee/email/team) — no key required to start seeing the picture.
3. I **connect OpenAI and Anthropic** (read-only Admin keys). Denarius pulls real token usage **daily** and converts it to money.
4. I **set budgets** — for the whole company and per team — and Denarius tracks consumption against them on fresh daily data, always showing the **margin**: how much headroom is left now, and how much will be left (or overrun) at the projected close.
5. Denarius **warns me early**: "Engineering is at 92% of its $3k budget with 8 days left; at the current pace it will land at ~$3.6k (+20%)." Warnings are generated deterministically; the numbers are never invented.
6. Each warning comes with a **control plan** — a prioritized, advisory set of actions ("review the 3 users driving 70% of the spike", "consider Haiku for non-critical tasks") — and from any warning or team I can **simulate a scenario** ("if Engineering slows 15%, where do we close?") in a **side panel**, in context, before deciding.
7. Between warnings, Denarius surfaces **apontamentos** (decision-support pointers). Actionable items become linked **Next actions** immediately below the verdict; non-actionable observations remain in a calm footer feed.
8. On the **home dashboard** I see a **one-line verdict** (in control / attention / over budget), the total spend vs. budget with a **spend-vs-time pacing pair**, the **projected margin** (how much I'll be over/under at close), the teams **that need attention** (healthy ones collapsed), and where the money goes — default view by team, with a permissioned per-person drill-down.
9. I get an **executive digest** in natural language summarizing the period (total, change, top drivers, budget status, margin, projection).
10. *(Secondary)* Denarius flags obvious **waste** — e.g., paying for more seats than the roster has people (seats-vs-roster mismatch).

The headline metric is **spend in money governed against a budget**; tokens are the drill-down detail. The framing is **control and strategy** (stay within budget, decide), not surveillance.

## User Stories

**Account, authentication, and tenancy**
1. As a CEO/CTO, I want to create my company account (tenant), so that I can start using Denarius.
2. As an Admin, I want to invite colleagues by email and assign a role (Admin or Viewer), so that I control who sees what.
3. As a user, I want to sign in with email/password or Google login, so that I can access without friction.
4. As an Admin, I want assurance that my company's data is isolated from other customers, so that I can trust the product with financial information.
5. As a user, I want my session to be secure and expire appropriately, so that the risk of unauthorized access is reduced.

**Roster (identity)**
6. As an Admin, I want to upload a roster CSV (employee, email, team), so that spend can be attributed to teams and people.
7. As an Admin, I want to see CSV validation errors (invalid rows, duplicate emails), so that I can fix them before importing.
8. As an Admin, I want to re-import/update the roster, so that it reflects new hires and team changes.
9. As an Admin, I want to manually edit an employee or their team, so that I can fix individual cases without re-importing everything.

**Manual seed (value on day zero)**
10. As an Admin, I want to manually register a subscription/seat (tool, # of seats, price, owning team), so that I can see spend before connecting any API.
11. As an Admin, I want to edit or remove a registered subscription, so that the data stays correct.
12. As an Admin, I want to assign a subscription to a team (or mark it shared/company-wide), so that the per-team breakdown makes sense.
13. As a CEO/CTO, I want manual seat costs **included in budget tracking, accrued daily** (price ÷ days in period), so that the budget reflects total AI spend without day-one spikes distorting the pace.

**OpenAI connector (metered ingestion — mandatory)**
14. As an Admin, I want to connect OpenAI by providing a read-only Admin Key, so that Denarius can pull real usage.
15. As an Admin, I want my key stored encrypted and used only for reads, so that I can trust the product.
16. As an Admin, I want to test the connection when I save the key, so that I know it worked.
17. As an Admin, I want to rotate or revoke the connected key, so that I keep security control.
18. As the system, I want to sync OpenAI usage daily, so that the dashboard stays current without user action.
19. As an Admin, I want to see the last sync time and any error, so that I can trust the numbers.
20. As an Admin, I want onboarding guidance recommending "one OpenAI project per team," so that I get exact per-team cost in dollars.

**Anthropic connector (metered ingestion — mandatory)**
21. As an Admin, I want to connect Anthropic by providing a read-only Admin key, so that Denarius can pull Claude usage and cost.
22. As an Admin, I want my Anthropic key stored encrypted, tested on save, and rotatable/revocable, so that I keep the same security guarantees as OpenAI.
23. As the system, I want to sync Anthropic usage daily and convert tokens to money, so that Claude spend is governed alongside OpenAI.
24. As an Admin, I want Anthropic usage attributed by workspace/API key → team, so that the per-team budget includes Claude.

**Budgets, margin & control (HERO)**
25. As a CEO/CTO, I want to set a monthly budget for the whole company, so that AI spend has a guardrail.
26. As a CEO/CTO, I want to set a per-team budget, so that each team owns its limit.
27. As a CEO/CTO, I want to see current spend vs. budget (amount and %) for the company and each team, so that I know where I stand at a glance.
28. As a CEO/CTO, I want to see **projected margin** (budget − projection, i.e. how much I'll be over/under at close) as the headline figure for the company and each team, so that "how much room do I have?" is answered by the decision-relevant number — with current headroom (budget − spend) available on drill-down, not competing with it on the home.
29. As a CEO/CTO, I want a **run-rate projection** for the current period (linear pace), so that I see where I'll land before the period ends.
30. As a CEO/CTO, I want the projection to appear **only after enough of the period has elapsed** (minimum-days guard), so that day-2 noise doesn't produce absurd numbers or false alarms.
31. As a CEO/CTO, I want to be **warned** when a team crosses configurable thresholds (e.g., 80% / 100% / projected-to-breach), so that I act before the invoice.
32. As a CEO/CTO, I want each warning to come with a **control plan** — a prioritized list of advisory actions and the top drivers behind it — so that I know what to do, not just that there's a problem.
33. As a CEO/CTO, I want each warning to fire **once per (team, threshold-level, period)** — escalating only on a higher threshold — so that alerts stay rare and meaningful (no daily spam).
34. As an Admin, I want warnings ordered by budget impact (size of overrun / projected overrun), so that I prioritize the biggest risk.
35. As a CEO/CTO, I understand Denarius is read-only and **cannot block usage** — it governs by visibility, warning, and recommendation, not enforcement. *(Honesty note baked into the UX copy.)*

**Verdict, planning & decision support**
36a. As a CEO/CTO, I want a **one-line verdict** with a status color at the top of the home ("in control" / "attention" / "over budget"), so that I get the conclusion in one glance instead of computing it from the numbers.
36. As a CEO/CTO, I want to launch a **scenario simulator from a warning or a team** (a side panel, team pre-loaded) that recomputes the projected close and margin instantly, so that I can test a fix in context without leaving the screen.
37. As a CEO/CTO, I want a calm **"Observations" feed** of apontamentos on the home — deterministic decision-support observations (e.g., "Data, Product and Ops crossed 50%", "3 teams concentrate 87% of spend", "Marketing accelerated 40% week-over-week", "R$ 900 unattributed") — so that I get food for thought without alarm fatigue.
38. As a CEO/CTO, I want apontamentos clearly separated from warnings (footer, in-app only, no email, calm tone), so that the alert channel stays reserved for what's urgent.

**Visibility (dashboard)**
39. As a CEO/CTO, I want to see total company AI spend, budget status, the spend-vs-time pacing pair, and projected margin, so that I have the number and the guardrail that don't exist today.
40. As a CEO/CTO, I want to see the spend trend over time, so that I can notice accelerating growth.
41. As a CEO/CTO, I want to see the spend breakdown by team, so that I know who consumes the most.
42. As a CEO/CTO, I want to see the breakdown by provider/model, so that I know where the money goes (and whether a cheaper model would help).
43. As a CEO/CTO, I want to filter by period (current month, last 30/90 days), so that I can analyze relevant windows.
44. As a Viewer, I want to see dashboards at the team level, so that I can follow along without accessing individual data.

**Attribution and drill-down**
45. As an Admin, I want to see cost per person within a team (drill-down), so that I can investigate a specific spike.
46. As an Admin, I want shared/service-key spend attributed to a team/project (not a person), so that attribution is honest.
47. As a CEO/CTO, I want spend that can't be mapped to any team shown in an explicit **"Unattributed"** bucket, so that the company total **always reconciles** with the sum of its parts (no silent gaps).
48. As an Admin, I want to see tokens (input/output) and model as detail when I open an item, so that I understand the cost's origin.

**Waste (secondary)**
49. As a CEO/CTO, I want Denarius to flag **seats-vs-roster mismatches** (paying for more seats than assigned people), so that I catch over-provisioning without connecting anything new.
50. As an Admin, I want waste flags to appear as secondary findings (below budget/control), so that the product stays focused on controlling token spend, not on chasing already-paid seats.

**Executive digest**
51. As a CEO/CTO, I want a natural-language summary of the period (total, change, top drivers, budget status, margin, projection), so that I understand the situation in 30 seconds.
52. As a CEO/CTO, I want to trust that the digest's numbers are exact, so that I can use them in decisions.
53. As an Admin, I want to receive the digest **by email weekly** (v1, default on for Admins, opt-out), so that governance reaches me without logging in.

**Roles and privacy**
54. As an Admin, I want a "who can see individual names" toggle (Admin-only by default), so that I avoid a surveillance tone.
55. As an Admin, I want a "store per-person data" toggle (on by default, switchable off), so that I can serve a privacy-sensitive customer.
56. As a Viewer, when the names toggle is off, I want to see team-aggregated data without names, so that the company's policy is respected.
57. As an Admin, I want assurance that Denarius never stores prompts/responses, only usage metadata, so that I can trust the product with my company.

**Settings and account**
58. As an Admin, I want to manage company settings (name, display currency), so that it fits my reality.
59. As an Admin, I want to remove a user, so that I can revoke access for someone who left.

**Credential self-service** *(shipped 2026-08-05, issues #68/#69)*
60. As a user, I want to request a recovery link by email when I forget my password, so that losing a password doesn't mean losing the account — and I want the answer to look the same whether or not the address is registered, so that the page can't be used to discover who has an account here.
61. As a user, I want to change my password from settings by confirming the current one, so that an unlocked laptop or a stolen session isn't enough to take the account over; changing it signs every **other** session out.

**Administrative evidence** *(shipped 2026-08-05, issue #73)*
62. As an Admin, I want an append-only trail of administrative actions — who changed a budget, connected or revoked a key, moved a privacy switch, invited or removed someone — so that I can show an auditor (or an acquirer) what happened in the space. **Admin-only**: the trail names people, so a Viewer reads nothing (principle #1). Retention 24 months, stated on screen.

**Data rights** *(shipped 2026-08-07, issue #74 — see "LGPD self-service" under Data & security)*
63. As an Admin, I want to export everything my company's space holds as one file, and to permanently delete the space, so that I exercise LGPD art. 18 myself instead of filing a request. Deleting Denarius removes nothing at OpenAI or Anthropic, and the product says so.

**Documented months** *(shipped 2026-08-07, issues #94/#95)*
64. As a CEO/CTO, I want each finished month frozen the way it actually closed, so that a report I open in six months shows the same numbers it showed on the 1st — seat configuration included, since seats are current state and would otherwise be re-priced with today's.
65. As a CEO/CTO, I want a closed month rendered as one fixed, printable report (same sections, units and caveats every time), so that I can hand it to a board or an accountant without rebuilding it. Admins and Viewers read the same aggregate-only artifact.

**Public trust surface** *(shipped 2026-08-04, issue #57)*
66. As a prospective customer, I want a public privacy policy and terms — sub-processors listed — so that my legal review can start before anyone signs in.

## Implementation Decisions

**Scope & product**
- Focus: **employee** AI consumption (API token spend + manually-seeded seats), **not** the programmatic AI embedded in the company's products (Case B is out).
- Headline metric: **spend in money, governed against a budget, with explicit margin**; tokens are a drill-down.
- v1 pillars: **Verdict + Visibility + Attribution + Budgets/Margin & Control (hero) + contextual Planning (scenario drawer + apontamentos) + Digest**. Waste (seats-vs-roster) is a **secondary** finding type.
- **Verdict is the product's headline output:** a single deterministic sentence + status color that answers "am I in control?" (green = projection within budget / amber = projected to breach / red = a team already breached), always present on the home. Every other number on the home exists to justify the verdict.

**Ingestion**
- Mechanism: **read-only connectors + manual seed**. **No proxy/gateway** (doesn't fit the employee case, adds friction, and — critically — means Denarius governs by *warning*, never by *blocking*).
- v1 mandatory connectors: **OpenAI** (Admin API) and **Anthropic** (Admin API). Both are token-metered, which is the core of the product.
- Sync: **daily Vercel Cron** firing a serverless function that pulls and stores aggregates; plus on-demand sync after connecting. Data freshness is **daily, not real-time** — and the UI says so ("as of <date>").
- **Time base:** all daily buckets remain **UTC** (provider-native). Freshness copy is rendered in `America/Sao_Paulo` as human local time (`Atualizado hoje, às HH:mm`; older dates include `DD/MM/AAAA`), with no per-tenant timezone math in v1.

**Budget semantics (what counts, and the edge rules)**
- A `budget` is set per **org** and per **team** for a period (default monthly).
- **A budget governs total tracked AI spend**: API token spend (from connectors) **plus manual seat subscriptions**. Seats **accrue daily** (price ÷ days-in-period) so a monthly invoice doesn't spike day-one pace or distort the run-rate.
- **Org and team budgets are independent guardrails** — no forced reconciliation. If the sum of team budgets exceeds (or undershoots) the org budget, the UI shows an informational notice, never an error. (Teams may deliberately have headroom the org doesn't, and vice versa.)
- **Mid-period budget edits are allowed.** Findings recompute on the next sync against the new amount. The `notification_log` is **not reset** — an already-sent (team, level, period) alert never re-fires for the same level, even if the edit re-crosses it. Escalation to a *higher* level still fires.
- **Projected margin is the first-class headline metric**: `projected_margin = budget − projection` (how much you'll be over/under at close) is what appears on the home, because it's the decision-relevant number. `current_margin = budget − spend` is **de-emphasized** (mid-period it's almost always positive and reads as false reassurance) — available on drill-down, not on the home. Negative projected margin is the amber/red driver of the verdict.

**Hero = Budgets, Margin & Control**
- The backend computes, deterministically: current spend vs. budget; **current and projected margin**; **linear run-rate projection** for the current period (spend ÷ days-elapsed × days-in-period); and **threshold crossings** (configurable, default 80% / 100% / projected-to-breach).
- **Projection guard:** no projection (and no projected-to-breach warnings) before **day 5** of the period — the UI shows "collecting pace…" instead. Projections are labeled as linear estimates. Protects trust against early-month noise.
- Each crossing becomes a **`finding`** of type `budget_threshold`, carrying: the numbers, the **top drivers** (teams/people/models contributing most to the spend or the delta), and an **advisory control plan** (recommended actions).
- **Read-only honesty:** Denarius cannot cap or block API usage. Control = visibility + early warning + recommendation. This is stated in the product copy and is a deliberate due-diligence-safe boundary.

**Planning layer (contextual — not a destination)**
- **Scenario simulator is a contextual side panel (drawer)**, invoked by a "Simulate" action on a warning or a team — never a standalone nav destination. It opens with that team pre-loaded, so the causal chain (this team is at risk → what fixes it?) is never broken by navigation.
- Mechanics: pure **client-side arithmetic** over the deterministic aggregates already on screen (no LLM, no backend round-trip). v1 lever: adjust the team's projected pace by ±% → recompute org projected close and margin instantly; presets for "current pace", "close on budget" (the break-even reduction), and a fixed cut. Multi-variable/ML scenario modeling is **out** (see Out of Scope).
- **Apontamentos (decision-support pointers):** deterministic observations generated by rules **below the warning threshold**. Items with a useful destination render as calm linked **Next actions** immediately below the verdict; remaining observations stay in the footer. **In-app only, no email, no severity escalation**.
- Distinction is structural: **warnings** = urgent, pushed (email), rare (de-duped), attached to the team row; **apontamentos** = ambient, pull-only, footer, refreshed each sync.

**Attribution**
- Hierarchy: **Organization → Team/Cost center → Person → Provider/Model**.
- Default executive view: **by team**. Person = **permissioned drill-down**.
- **Unattributed bucket (first-class):** any spend that can't be mapped to a team (unknown key, employee missing from roster, unmapped project/workspace) lands in an explicit **"Unattributed"** node in every breakdown. Invariant: **org total = Σ team totals + Unattributed** — the numbers always reconcile. Onboarding nudges the Admin to map what's sitting in Unattributed.
- v1 identity: **roster CSV** (SSO is out of v1).

**Fatia 0 findings (OpenAI API validation) — now decisions:**
- The **Usage API** (`/v1/organization/usage/completions`) returns tokens with `group_by` of **user_id, api_key_id, project_id, model** at daily buckets. Requires an **Admin Key**.
- The **Costs API** (`/v1/organization/costs`) returns **dollars**, but only groups by **`project_id` and `line_item`** (not user/key).
- Consequence 1: for **exact per-team cost in dollars**, onboarding recommends **one OpenAI project per team** → Costs API delivers it directly.
- Consequence 2: for **per-person/per-key cost**, the connector **computes** cost from tokens (Usage API) × a **model price table** maintained by Denarius.
- Consequence 3: **person**-level attribution depends on per-person keys (`api_key_id`→person) or the `user` field; shared keys roll up to **team/project**.

**Anthropic API validation (confirm in the spike):**
- Anthropic exposes an **Admin API** with **Usage & Cost** endpoints returning token usage (and cost) grouped by **API key / workspace / model** at daily granularity, gated by an **Admin key**.
- Same pattern as OpenAI: tokens → money via the `model_price` table when a direct cost figure isn't available at the needed grain; workspace/key → team for attribution.
- **Pending live validation** (Slice 1 spike): confirm exact endpoints, `group_by` dimensions, and whether per-workspace cost is returned directly or must be derived.

**Model price table — ops & reconciliation**
- `model_price` is **versioned** (`effective_date`); price changes create new rows, never overwrite (historical costs stay reproducible).
- **Unknown model** → tokens surface as **"uncosted"** (never silently dropped) + an internal flag prompting a price-table update. Updating the table is a founder ops task in v1 (it's a small, slow-moving list).
- **Reconciliation check (trust feature):** each sync compares **derived cost** (tokens × price table) against the provider's own **Costs API total** at the grain where both exist (project/workspace). A drift beyond a small tolerance surfaces as a data-quality notice. Cheap to compute, and exactly the kind of rigor an acquirer probes.

**Currency & FX (UX P8)**
- **Source of truth is always USD** (what OpenAI/Anthropic report) — stored exact, never converted on ingestion.
- Display uses the tenant's `display_currency`. For the budget comparison, the **FX rate is frozen per budget period** (captured at period start, stored on `budget`), so "spend vs budget" reflects **usage change, not dollar swings**.
- The rate used is **disclosed on screen** ("converted at R$ X.XX/US$"). Rate from a free FX source captured on day 1 of the period.

**Insight layer (hybrid)**
- The backend **detects and labels** findings with **deterministic rules** (budget thresholds, run-rate projection, margin, severity, top drivers; apontamentos; seats-vs-roster).
- A **cheap LLM** (Claude Haiku 4.5, `claude-haiku-4-5`, **swappable via config / provider-agnostic**) only **narrates** the finding and phrases the control-plan actions.
- **Guardrail:** the LLM **never computes or decides**; all **numbers** (spend, %, margin, projection, savings) come from the deterministic layer and are **injected** into the text, so there's no hallucinated figure. Control-plan *actions* are drawn from a curated, rule-mapped catalog — the LLM phrases them, it doesn't invent strategy.

**Data & security**
- Stores **metadata only** (counts, cost, model, user/key identifier, date). **Never** prompts or responses (a structural consequence of not using a proxy).
- Provider credentials: **read-only**, stored **encrypted** (KMS/secrets), never in plaintext or logs; rotatable/revocable.
- Database: **Postgres** (data is small daily aggregates — **no** time-series DB needed).
- Storage grain (conceptual data model):

  | Entity | Key fields |
  |---|---|
  | `tenant` | id, name, display_currency, settings (toggles) |
  | `user` (app) | id, tenant_id, email, role (Admin/Viewer) |
  | `employee` (roster) | id, tenant_id, email, name, team |
  | `team` | id, tenant_id, name (plus the implicit **Unattributed** node per tenant) |
  | `provider_connection` | id, tenant_id, provider (openai/anthropic), encrypted_credential, status, last_sync |
  | `subscription` (manual seat) | id, tenant_id, tool, seat_count, price, team_id/shared (accrues daily against budgets) |
  | `usage_daily` (aggregate) | tenant_id, date (UTC), provider, api_key_id/project, user_id, model, input_tokens, output_tokens, derived_cost |
  | `cost_daily` (aggregate $) | tenant_id, date (UTC), provider, project_id/workspace, line_item, value, currency |
  | `budget` | id, tenant_id, scope (org/team), team_id?, period (monthly), amount, currency, thresholds[], frozen_fx_rate (USD→display, captured at period start), fx_rate_source/date |
  | `model_price` | provider, model, input_price, output_price, effective_date (versioned, append-only) |
  | `finding` | id, tenant_id, type (budget_threshold / apontamento / seats_vs_roster), scope/target, numbers (incl. margin), drivers[], control_plan[], severity (stateless — no user-facing status, see UX P6/P11) |
  | `notification_log` | id, tenant_id, channel (email), finding_key (team + threshold-level + period), sent_at — **system state only** (de-dup so each event alert fires once per period; never user-facing status; not reset by budget edits) |
  | `period_snapshot` | tenant_id, closed period, frozen totals/verdict/team/provider breakdown and honesty flags — aggregates only, immutable after close |
  | `invitation` | id, tenant_id, email, role, token **hash** (never the raw token), invited_by, expires_at (7 days), accepted_at, revoked_at — tenant + role live here, never in self-writable auth metadata |
  | `audit_log` | id, tenant_id, actor_id (nullable), actor_email (snapshotted), action, target, detail (redacted), created_at — append-only, Admin-read, 24-month retention |
  | `rate_limit_hit` | bucket (hashed subject), at — system state only, backs the invitation create/accept limits; fails **open** |
- **Per-tenant toggle:** store-per-person **on by default**, switchable off (then only team aggregates are kept — data minimization for LGPD/sensitive customers).
- **LGPD self-service (art. 18):** an Admin can stream a complete tenant-scoped JSON export or permanently delete the company space in **Ajustes → Privacidade**. The export has explicit safe-field allowlists (never provider ciphertext, invitation token hashes or secrets) and applies the tenant's privacy switches: names are omitted when `show_names` is off and person grain is omitted when `store_per_person` is off. Deletion requires typing the exact company name, revokes every provider connection before erasure, deletes every product row and every linked Auth user, and makes clear that removing Denarius does **not** remove or change anything in OpenAI or Anthropic. Viewers can do neither operation.

**Multi-tenancy & auth**
- Isolation: **shared DB with `tenant_id` on every table + Postgres Row-Level Security (RLS)** as a second layer (a query bug can't leak across customers — the due-diligence answer).
- Auth: **managed provider, no homemade auth.** Backbone is **Supabase** (Postgres + Auth + RLS); app on **Vercel**. Login via email/password + Google.
- RBAC: **Admin / Viewer** + a "who can see individual names" toggle (Admin-only by default).

**Stack**
- **TypeScript everywhere** (no Python). **Next.js (App Router)** + **Tailwind** + **shadcn/ui** + **Recharts**.
- Backend = Next's own **API routes / server actions** (monolith, single deploy).
- **Single repo, single app — not a monorepo.** No Turborepo/Nx/workspace tooling; the deliberate simplicity favors an auditable due-diligence trail over premature scalability.
- Hosting **Vercel**; data/auth **Supabase**; cron **Vercel Cron**.
- **Supabase ↔ GitHub integration**: schema migrations (including RLS policies) live as versioned files in `supabase/migrations`, connected to auto-deploy from the repo — schema-as-code, not dashboard clicks. Directly serves the due-diligence story: an acquirer's engineers can audit the exact history of how tenant isolation was implemented, commit by commit.
- **Transactional email: Resend** (or equivalent) for event alerts + weekly digest — required by the notification decisions (P4/P11). Free tier is sufficient for MVP volume.

**Business (context that shapes the product)**
- Customer pricing: **flat monthly tier** by band. **No self-serve billing in the MVP** — charge via Stripe payment link / manual invoice for the first customers.
- ICP: tech companies **20–200**; buyer **CEO/CTO**.

## UX Decisions

Resolved in a dedicated UX grilling (P1–P11), extended by the founder's focus realignment (P12–P14), then **restructured by a full UX critique (P15) that collapsed navigation to 3 destinations and made the verdict the headline output**. The product is an **executive cockpit** whose job is to answer *"am I in control of AI spend?"* in **≤10 seconds**, push early warnings, and stay honest about its own limits (read-only, externally-sourced numbers).

**Navigation & screens (P1, P2 — superseded by P15 and P16)**
- Left sidebar, **5 destinations: Home / Times / Explore / Reports / Settings.** P15 originally collapsed the prototype to three; Times later earned a comparable operational index, and Reports earns a durable documentation surface for closed months. Budgets and Planning remain excluded — they duplicate Home or break the causal chain (see below).
- **Home** — condensed freshness → verdict → linked Next actions → spend hero/composition → pace → one team table → remaining calm observations. The verdict and Next actions fit above the fold at the target desktop viewports.
- **Explore** — anchored sections for team, model, and seats; sortable tables; threshold-triggered search; explicit reconciliation; team drill-down with contributors and separate team/company budget outcomes.
- **Settings** — a navigation-only index. Company/currency, Privacy, and Users live on dedicated subpages alongside Connections, Attribution, Roster, Seats, and Budgets.
- **Budget editing is inline, not a destination:** a pencil on each team row and on the org hero opens the budget modal. Setting a budget happens once + rare edits — it doesn't deserve a nav slot.

**Verdict & pacing (P15 — new, the headline)**
- The home opens with a **single verdict sentence + status color** answering "am I in control?": red ("Engineering exceeded its budget by 19%" — the named team's **own** overrun, plus a "Ver time" action linking to that team; the org projection lives in the hero one glance below), amber ("Attention — projected R$ 4.2k over budget"), green ("In control — projected R$ 3.1k under budget"). Deterministic; the CEO reads a conclusion, not ingredients. (Shortened 2026-07-17, founder-directed — the original longer templates carried the org projection and the close date inside the sentence.)
- The hero pairs **% of budget spent against % of the period elapsed** — a percentage of budget is meaningless without the time context; the pairing is the real control signal (spending faster than time passes = trouble). Since the 2026-07-17 de-noise the pairing renders as ONE bar: the fixed medium brand-accent spend bar (red only after a real org breach) with a neutral "hoje · dia N de M" time marker on the same scale, not a second bar. This visual accent does not replace the green/amber/red semantic verdict and status pills.
- **All-clear is a designed, affirmative state** (the most common state of a healthy account): green verdict + "✓ Everything under control · next digest Friday", never an empty-looking screen.

**Onboarding (P3)**
- **Non-blocking checklist** (not a blocking wizard): user lands on Home; a persistent, dismissible card guides *connect → roster → **set budget***, and the dashboard fills in as steps complete. The **budget step is pushed prominently** (without a budget there is no verdict/warning, i.e. no hero). Supports delegating the technical steps (keys) to a CTO without blocking the CEO. On connect, the sync runs **immediately** (not just the daily cron) so the first "we found R$ X this month" moment happens in seconds, not 24h. A nudge surfaces when meaningful spend sits in **Unattributed**.

**Budget visualization (P5, P12 — superseded by P15)**
- The home leads with the **verdict**, then the **org number + a spend-vs-time pacing pair** + **projected margin in money** as the single headline margin figure. **Current margin was removed from the home** (contradictory signal mid-period — P12 half-reverted).
- **Per-team bars are split by state**: at-risk teams appear as **rich rows in "Needs attention"** (bar with run-rate "ghost", the warning line, and inline **[Investigate] [Simulate]** actions); healthy teams collapse into **"Under control (N) ✓"**. Ordered by **projected risk, not alphabetically**. The glanceable "who's hot" without the healthy teams as noise.
- Bars: filled to current spend, black marker at budget, dashed "ghost" extension = run-rate projection; green within / amber projected-to-breach / red breached.
- The **cumulative time-series** (spend vs budget + dashed projection) lives in **Explore's team detail** — the "why / what pace," not a 5-second read. The home shows **composition by provider as a ranked bar list** (a donut was rejected: low information density, hard to compare).

**Warnings & control plans (P4, P6, P11)**
- Channel: **in-app + email**. Notification channel built as a **pluggable interface** (Slack deferred to v1.5/v2).
- Two message types: **event alert** (fires when daily sync detects a threshold crossing — the "early warning") and **weekly digest** (steady heartbeat, fires regardless; default on for Admins, opt-out). Both reuse the Haiku narration pipeline.
- **Anti-fatigue (P11):** an event alert fires **once per (team, threshold-level, period)**; escalates only on a **new higher threshold** (80% → 100% → projected-breach); resets next period. Backed by `notification_log` (system state, not user-facing status).
- **Control plan is read-only (P6):** shows the recommended actions (from a curated, rule-mapped catalog, phrased by the LLM) + top drivers. **No per-action status tracking, no "resolved" state** — findings are stateless/informational. Keeps the MVP lean; the digest does not report follow-through.

**Planning & apontamentos (P13, P14 — restructured by P15)**
- **Simulator is a contextual drawer, not a tab (P15):** invoked by **[Simulate]** on a warning or a team (also from Explore's team detail). Opens with that team pre-loaded — the causal chain "this team is at risk → what fixes it?" is never broken by navigation. One lever (team pace ±%), instant recompute of projected close + margin, presets ("current pace", "close on budget" = break-even, fixed cut). Copy makes explicit that scenarios are estimates and the system **does not decide** — it shows effects.
- **P14 — Apontamentos ≠ warnings:** actionable apontamentos render as calm linked **Next actions** below the verdict; the rest remain in the footer. They never use urgency styling or email. **Warnings** remain urgent and pushed.

**P16 — 2026-07-11 UI/UX audit (founder-approved; supersedes conflicting UI details)**
- Display currency is consistent across the product: BRL is primary and original USD is secondary detail. Reported, derived, seat, governed, Unattributed, and uncosted values remain explicitly labeled and reconciled.
- Home prioritizes the verdict and Next actions above the fold; provider freshness is condensed; team rows are predictable full-row links with static chevrons.
- Explore uses anchored team/model/seat sections, sorting, search above ten rows, visible reconciliation, zero-value teams, and responsive cards below `md`.
- The team drill exposes governed-spend composition and independent team/company scenario outcomes; control-plan items link to the relevant investigation or setting.
- Settings is a pure index. Company, Privacy, and Users become dedicated routes. Budgets use one editable table and one batch Save action.
- The UI uses one container system (`wide`, `default`, `form`), one button hierarchy, inline field validation, Base UI global toasts, explicit destructive confirmation, collapsed-sidebar tooltips, and complete loading/success/error/empty/first-use/permission states.
- Roster supports email edit, removal, search above ten records, and pages of 25. Monetary inputs use visible currency and pt-BR formatting.
- All audit acceptance criteria are regression-tested at 1440×900, 1024×768, and 390×844 in both themes.

**Privacy / per-person (P7)**
- Per-person data is **never a standalone leaderboard**. It appears **only contextually** when drilling into a specific spike/finding, framed as **"contributors to this spike" (cost drivers)**, not a ranking of people. Names **Admin-only**; anonymized for Viewers. Reinforces "control, not surveillance."

**Device (P9, superseded by P16)**
- **Desktop-first, responsive web throughout.** Below `md`, data tables become cards so critical values never hide behind horizontal scrolling. Configuration remains desktop-optimized but usable on mobile. **No native mobile app.**

**Data-quality transparency (P10)**
- The product is honest about its own gaps and **never blocks** on them: every key number carries an **"as of <date>"**; a **banner** appears when a connector's last sync failed or is stale ("Anthropic hasn't synced in 3 days — totals may be understated"); tokens from an **unknown model** show as **"uncosted"** rather than silently dropping; a **reconciliation notice** appears if derived cost drifts from the provider's own cost total.

## Testing Decisions

**What makes a good test here:** it tests **external behavior** (input → observable output), not implementation detail. Since this is greenfield, there is **no prior art** — these seams establish the pattern. Prefer the **highest** seam that still isolates the risky part.

Proposed seams (highest/most valuable to most specific):

1. **Provider (connector) seam — most important for ingestion.** Abstract each provider client behind an interface (e.g., `UsageProvider`) returning usage/cost payloads. Tests inject a **fake provider** with canonical OpenAI/Anthropic payloads (no live calls). Lets the whole ingestion be tested deterministically.
2. **Ingestion → normalization → attribution pipeline.** Given a raw provider payload + a roster, assert the normalized aggregates and team/person attribution — including: shared key → team, not person; per-person cost derived from tokens × `model_price`; unmappable spend lands in **Unattributed**; and the reconciliation invariant **org total = Σ teams + Unattributed** holds.
3. **Budget, margin & control engine (deterministic rules) — pure functions. THE HERO.** Given spend + budgets + dates, assert: spend-vs-budget; **current and projected margin**; **linear run-rate projection** including the **minimum-days guard** (no projection before day 5); **seat daily accrual** (price ÷ days, no day-one spike); **threshold crossings**; severity ordering; top-driver extraction; **frozen-FX conversion**; **mid-period budget edit semantics** (recompute against new amount, no re-fire for an already-sent level); and **alert de-dup** (a crossing already sent this period does not re-fire; a new higher threshold does).
4. **Planning layer — pure functions.** Scenario arithmetic (pace lever → projected close + margin, break-even preset) and apontamento rules (50% crossing, concentration, acceleration) asserted against fixed inputs.
5. **Seats-vs-roster (secondary waste) — pure function.** Given subscriptions + roster, assert mismatch findings and estimated savings.
6. **Digest / narration pipeline.** Assert prompt assembly **injects** numbers (and control-plan actions from the catalog) and that output contains no LLM-generated figure or invented action. The LLM call itself is **mocked**.
7. **Tenant isolation (RLS) — the most critical due-diligence test.** Integration test against a test Postgres: a user from tenant A **cannot** read any data from tenant B, across all tables.
8. **RBAC/privacy.** Assert a Viewer (and/or with the names toggle off) **cannot** see individual names, only team aggregates.
9. **HTTP seam (API routes/server actions).** Integration tests of routes against a test DB (transactional rollback), covering each Admin user story's happy and error paths.

Modules tested in v1: OpenAI + Anthropic connectors (via seam 1), attribution pipeline (incl. Unattributed), **budget/margin/control engine**, planning layer, seats-vs-roster detector, digest assembly, RLS isolation, RBAC.

## Success Metrics (traction evidence for the exit thesis)

What an acquirer will ask: "how do you know it works?" Small, honest set — measurable from day one:

- **Activation:** % of new tenants with ≥1 connector synced **and** ≥1 budget set within **7 days** of signup (the product's "aha" requires both).
- **Time-to-value:** median time from signup → first budget-status screen with real data.
- **Engagement:** weekly digest email open rate; % of weeks a tenant's Admin opens the app.
- **Hero usage:** # of warnings delivered per tenant/month; % of tenants that adjusted a budget or roster after a warning (proxy for "acted on it").
- **Trust proxy:** % of spend sitting in **Unattributed** (falling over time = the attribution loop is working).
- **Commercial:** 1–3 paying customers, logo-quality (real tech companies in ICP), retention through ≥2 renewal cycles.

## Risks & Mitigations (top 5)

1. **Provider Admin APIs change or restrict** (endpoints, granularity, rate limits). → Connector seam isolates the blast radius; both providers behind one interface; reconciliation check detects silent drift; document API versions used.
2. **Trust collapse from one wrong number** (bad FX, stale price table, missing sync). → Structural honesty: as-of stamps, stale-sync banners, uncosted flags, reconciliation notice, frozen FX disclosed. Never show a number the system can't defend.
3. **"Give me your Admin key" friction blocks adoption.** → Day-zero manual value (seats + roster) before any key; read-only scope prominently explained; encrypted storage + rotate/revoke controls; the sales flow demos with manual data first.
4. **Alert fatigue kills the hero.** → De-dup by (team, level, period), escalation-only re-fire, projection guard suppressing early-month false alarms, apontamentos channel absorbing non-urgent signals.
5. **Scope creep vs. the exit thesis** (more connectors, enforcement, forecasting). → The Out of Scope section is a contract; every addition passes "does this raise sale value / survive due diligence?"; v1.5/v2 parking lot below.

## Out of Scope

- **Case B** (programmatic AI embedded in the company's products) — Denarius targets employee consumption.
- AI **proxy/gateway** and therefore any **hard enforcement / blocking** of usage — Denarius governs by warning and recommendation, not by capping.
- Connectors beyond **OpenAI and Anthropic** in v1. **GitHub Copilot** (and the per-seat `last_activity_at` idle detection it enables) is **deferred to v1.5/v2**; **Perplexity, Microsoft 365 Copilot, Google**, etc. → **v2**. **SSO** out (roster CSV stays).
- **Historical/multi-period forecasting** and **anomaly detection** (need accumulated history). *Intra-period **linear run-rate projection** is IN — it needs no history.* **Also IN (#94/#95): DISPLAYING a closed month.** Freezing each month into `period_snapshot` and printing it as a report is documentation of what happened, not a model of what will happen — nothing in the product reads more than one period to compute a number, and the run-rate projection stays intra-period. The line this scope item draws is between *showing* history and *forecasting on* it; only the second is out.
- **Advanced scenario modeling** (multi-variable, seasonality, ML). The v1 simulator is a single-lever linear what-if — deliberately simple and explainable.
- **Shadow AI detection**.
- **Self-serve billing/subscription** (charging is manual for the first customers).
- Native **mobile** app.
- Broad internationalization (beyond displaying a currency).

## Further Notes

- **Name:** Denarius (founder's decision). Mitigate the "crypto" reading by always pairing it with a descriptor ("Denarius — AI spend governance") and a domain that distances it from crypto (e.g., `denarius.ai`, `getdenarius.com`).
- **Exit thesis:** traction (1–3 real paying customers) → sale to a strategic acquirer (SaaS spend management like Zylo/Productiv/Vendr/Torii, FinOps, or observability/LLMOps). The lens for every decision: *"does this raise sale value / survive due diligence?"* — not *"does this scale to 10,000 customers?"*.
- **Infra:** free tier for the MVP (Supabase + Vercel), but DB/secrets treated rigorously from day one (encryption, RLS, `tenant_id` isolation) because that is exactly what an acquirer audits. Likely move off free tier at the first paying customer.
- **Prototype (historical):** a high-fidelity static frontend with mocked data seeded the UX decisions **through P15** (3-destination nav, verdict, pacing pair, projected margin, "Needs attention" rows, contextual simulator drawer, apontamentos footer). It was removed once the real screens shipped in #12–#15; [frontend.md](frontend.md) and the running app are now the visual contract.
- **Build order (slices / tracer bullets):**
  1. Provision infra (Supabase + Vercel) + live API spike (**OpenAI** Usage/Costs **+ Anthropic** Usage/Cost).
  2. Walking skeleton (Next + Supabase auth/RLS + tenant + Admin + dashboard shell).
  3. Roster CSV import.
  4. Manual seats + dashboard (Visibility + Attribution, incl. Unattributed + seat accrual).
  5. OpenAI connector + on-demand sync.
  6. Anthropic connector.
  7. Attribution + per-person cost + daily Cron + reconciliation check.
  8. **Hero: Budgets, Margin & Control engine** (budgets, projected margin, run-rate projection + guard, threshold findings, top drivers, control plans, FX freeze) — plus the **verdict** (deterministic sentence + status) and the home layout (pacing pair, "Needs attention" rows, "Under control" collapse).
  9. Notifications: event alerts + weekly digest (email via Resend) + `notification_log` de-dup.
  10. **Contextual planning: scenario simulator drawer (from a warning/team) + apontamentos footer.**
  11. Secondary: seats-vs-roster waste finding.
  12. Privacy & roles controls.
- **Navigation is 5 destinations** (Home / Times / Explore / Reports / Settings); budget editing is inline; the simulator is a contextual drawer — no Budgets or Planning tab.
- **Sales play baked into the order:** slices 2–4 let you demo value with **manual data** before the customer trusts you with keys — reducing the "give me your key" friction. The hero (verdict + budgets + projected margin) lands once real token data flows in slices 5–8; contextual planning (slice 10) is the demo closer.
