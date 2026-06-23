# PRD — Denarius (v1)

> **Status:** ready to build (greenfield)
> **Positioning:** AI-spend governance for tech companies. Denarius connects a company's AI APIs (OpenAI + Anthropic), attributes **token spend** by team/person, tracks it **against a budget**, and **warns early with control plans** — an executive cockpit for the CEO/CTO who needs to *keep AI cost under control*, not just look at it.
> **Exit thesis:** traction (1–3 paying customers) → sale to a strategic acquirer.

---

## Problem Statement

I'm the CEO/CTO of a 20–200-person tech company. Our AI spend is **growing fast and unpredictably** — price per token drops, but volume explodes as agents and broader usage spread (Jevons paradox). The money flows through scattered API keys (OpenAI, Anthropic) used across teams, and I have **no way to keep it under control**:

- I don't know how much we're spending **right now**, in total and **by team**, in money (not abstract tokens);
- I have **no budget guardrail** — nothing tells me "Engineering is on pace to blow past its limit this month" until the invoice arrives;
- When spend spikes, I find out **late** and have **no plan** for what to do about it;
- My finance team treats AI as an uncontrollable variable cost.

The core pain is **control**, not accounting. I don't just want a prettier invoice — I want to **set a budget, be warned before I breach it, and know what to do** to bring spend back in line.

## Solution

**Denarius** is a B2B web app that turns scattered AI **token spend into a governed budget**.

From the user's perspective:

1. I create my company account (tenant) and invite people (Admin/Viewer).
2. I **see value on day zero** by seeding data manually (subscriptions/seats we pay for, plus a **roster CSV** of employee/email/team) — no key required to start seeing the picture.
3. I **connect OpenAI and Anthropic** (read-only Admin keys). Denarius pulls real token usage daily and converts it to money.
4. I **set budgets** — for the whole company and per team — and Denarius tracks consumption against them in real time.
5. Denarius **warns me early**: "Engineering is at 92% of its $3k budget with 8 days left; at the current pace it will land at ~$3.6k (+20%)." Warnings are generated deterministically; the numbers are never invented.
6. Each warning comes with a **control plan** — a prioritized, advisory set of actions ("review the 3 users driving 70% of the spike", "consider Haiku for non-critical tasks", "Marketing's spend doubled week-over-week — investigate").
7. On the **dashboard** I see total spend, budget status, trend over time, and the breakdown **by team** and **by provider/model** — default view by team, with a permissioned per-person drill-down.
8. I get an **executive digest** in natural language summarizing the period (total, change, top drivers, budget status, projection).
9. *(Secondary)* Denarius flags obvious **waste** — e.g., paying for more seats than the roster has people (seats-vs-roster mismatch).

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

**OpenAI connector (metered ingestion — mandatory)**
13. As an Admin, I want to connect OpenAI by providing a read-only Admin Key, so that Denarius can pull real usage.
14. As an Admin, I want my key stored encrypted and used only for reads, so that I can trust the product.
15. As an Admin, I want to test the connection when I save the key, so that I know it worked.
16. As an Admin, I want to rotate or revoke the connected key, so that I keep security control.
17. As the system, I want to sync OpenAI usage daily, so that the dashboard stays current without user action.
18. As an Admin, I want to see the last sync time and any error, so that I can trust the numbers.
19. As an Admin, I want onboarding guidance recommending "one OpenAI project per team," so that I get exact per-team cost in dollars.

**Anthropic connector (metered ingestion — mandatory)**
20. As an Admin, I want to connect Anthropic by providing a read-only Admin key, so that Denarius can pull Claude usage and cost.
21. As an Admin, I want my Anthropic key stored encrypted, tested on save, and rotatable/revocable, so that I keep the same security guarantees as OpenAI.
22. As the system, I want to sync Anthropic usage daily and convert tokens to money, so that Claude spend is governed alongside OpenAI.
23. As an Admin, I want Anthropic usage attributed by workspace/API key → team, so that the per-team budget includes Claude.

**Budgets & control (HERO)**
24. As a CEO/CTO, I want to set a monthly budget for the whole company, so that AI spend has a guardrail.
25. As a CEO/CTO, I want to set a per-team budget, so that each team owns its limit.
26. As a CEO/CTO, I want to see current spend vs. budget (amount and %) for the company and each team, so that I know where I stand at a glance.
27. As a CEO/CTO, I want a **run-rate projection** for the current period (linear pace), so that I see where I'll land before the period ends.
28. As a CEO/CTO, I want to be **warned** when a team crosses configurable thresholds (e.g., 80% / 100% / projected-to-breach), so that I act before the invoice.
29. As a CEO/CTO, I want each warning to come with a **control plan** — a prioritized list of advisory actions and the top drivers behind it — so that I know what to do, not just that there's a problem.
30. As an Admin, I want to mark a warning/plan as "acknowledged" or "resolved", so that I can track what's been handled.
31. As an Admin, I want warnings ordered by budget impact (size of overrun / projected overrun), so that I prioritize the biggest risk.
32. As a CEO/CTO, I understand Denarius is read-only and **cannot block usage** — it governs by visibility, warning, and recommendation, not enforcement. *(Honesty note baked into the UX copy.)*

**Visibility (dashboard)**
33. As a CEO/CTO, I want to see total company AI spend and budget status, so that I have the number and the guardrail that don't exist today.
34. As a CEO/CTO, I want to see the spend trend over time, so that I can notice accelerating growth.
35. As a CEO/CTO, I want to see the spend breakdown by team, so that I know who consumes the most.
36. As a CEO/CTO, I want to see the breakdown by provider/model, so that I know where the money goes (and whether a cheaper model would help).
37. As a CEO/CTO, I want to filter by period (current month, last 30/90 days), so that I can analyze relevant windows.
38. As a Viewer, I want to see dashboards at the team level, so that I can follow along without accessing individual data.

**Attribution and drill-down**
39. As an Admin, I want to see cost per person within a team (drill-down), so that I can investigate a specific spike.
40. As an Admin, I want shared/service-key spend attributed to a team/project (not a person), so that attribution is honest.
41. As an Admin, I want to see tokens (input/output) and model as detail when I open an item, so that I understand the cost's origin.

**Waste (secondary)**
42. As a CEO/CTO, I want Denarius to flag **seats-vs-roster mismatches** (paying for more seats than assigned people), so that I catch over-provisioning without connecting anything new.
43. As an Admin, I want waste flags to appear as secondary findings (below budget/control), so that the product stays focused on controlling token spend, not on chasing already-paid seats.

**Executive digest**
44. As a CEO/CTO, I want a natural-language summary of the period (total, change, top drivers, budget status, projection), so that I understand the situation in 30 seconds.
45. As a CEO/CTO, I want to trust that the digest's numbers are exact, so that I can use them in decisions.
46. As an Admin, I want (eventually) to receive this digest by email periodically, so that I don't have to log in.

**Roles and privacy**
47. As an Admin, I want a "who can see individual names" toggle (Admin-only by default), so that I avoid a surveillance tone.
48. As an Admin, I want a "store per-person data" toggle (on by default, switchable off), so that I can serve a privacy-sensitive customer.
49. As a Viewer, when the names toggle is off, I want to see team-aggregated data without names, so that the company's policy is respected.
50. As an Admin, I want assurance that Denarius never stores prompts/responses, only usage metadata, so that I can trust the product with my company.

**Settings and account**
51. As an Admin, I want to manage company settings (name, display currency), so that it fits my reality.
52. As an Admin, I want to remove a user, so that I can revoke access for someone who left.

## Implementation Decisions

**Scope & product**
- Focus: **employee** AI consumption (API token spend + manually-seeded seats), **not** the programmatic AI embedded in the company's products (Case B is out).
- Headline metric: **spend in money, governed against a budget**; tokens are a drill-down.
- v1 pillars: **Visibility + Attribution + Budgets & Control (hero) + Digest**. Waste (seats-vs-roster) is a **secondary** finding type.

**Ingestion**
- Mechanism: **read-only connectors + manual seed**. **No proxy/gateway** (doesn't fit the employee case, adds friction, and — critically — means Denarius governs by *warning*, never by *blocking*).
- v1 mandatory connectors: **OpenAI** (Admin API) and **Anthropic** (Admin API). Both are token-metered, which is the core of the product.
- Sync: **daily Vercel Cron** firing a serverless function that pulls and stores aggregates; plus on-demand sync after connecting.

**Hero = Budgets & Control (replaces idle-seat waste)**
- A `budget` is set per **org** and per **team** for a period (default monthly).
- The backend computes, deterministically: current spend vs. budget; **linear run-rate projection** for the current period (spend ÷ days-elapsed × days-in-period); and **threshold crossings** (configurable, default 80% / 100% / projected-to-breach).
- Each crossing becomes a **`finding`** of type `budget_threshold`, carrying: the numbers, the **top drivers** (teams/people/models contributing most to the spend or the delta), and an **advisory control plan** (recommended actions).
- **Read-only honesty:** Denarius cannot cap or block API usage. Control = visibility + early warning + recommendation. This is stated in the product copy and is a deliberate due-diligence-safe boundary.

**Idle-seat / Copilot (reversed from prior Decision A2 — now deferred)**
- The earlier plan made GitHub Copilot a v1 connector to power idle-seat detection as the hero. With the hero now being **token-spend budget control**, idle-seat is **secondary**, so the **Copilot connector is deferred to v1.5/v2**.
- The v1 waste signal that survives is **seats-vs-roster mismatch**, computable from manual subscriptions + roster with **no extra connector**. True per-seat idle detection (`last_activity_at`) returns with the Copilot connector later.

**Fatia 0 findings (OpenAI API validation) — now decisions:**
- The **Usage API** (`/v1/organization/usage/completions`) returns tokens with `group_by` of **user_id, api_key_id, project_id, model** at daily buckets. Requires an **Admin Key**.
- The **Costs API** (`/v1/organization/costs`) returns **dollars**, but only groups by **`project_id` and `line_item`** (not user/key).
- Consequence 1: for **exact per-team cost in dollars**, onboarding recommends **one OpenAI project per team** → Costs API delivers it directly.
- Consequence 2: for **per-person/per-key cost**, the connector **computes** cost from tokens (Usage API) × a **model price table** maintained by Denarius.
- Consequence 3: **person**-level attribution depends on per-person keys (`api_key_id`→person) or the `user` field; shared keys roll up to **team/project**.

**Anthropic API validation (new — confirm in the spike):**
- Anthropic exposes an **Admin API** with **Usage & Cost** endpoints returning token usage (and cost) grouped by **API key / workspace / model** at daily granularity, gated by an **Admin key**.
- Same pattern as OpenAI: tokens → money via the `model_price` table when a direct cost figure isn't available at the needed grain; workspace/key → team for attribution.
- **Pending live validation** (Slice 1 spike): confirm exact endpoints, `group_by` dimensions, and whether per-workspace cost is returned directly or must be derived.

**Attribution**
- Hierarchy: **Organization → Team/Cost center → Person → Provider/Model**.
- Default executive view: **by team**. Person = **permissioned drill-down**.
- v1 identity: **roster CSV** (SSO is out of v1).

**Currency & FX (UX P8)**
- **Source of truth is always USD** (what OpenAI/Anthropic report) — stored exact, never converted on ingestion.
- Display uses the tenant's `display_currency`. For the budget comparison, the **FX rate is frozen per budget period** (captured at period start, stored on `budget`), so "spend vs budget" reflects **usage change, not dollar swings**.
- The rate used is **disclosed on screen** ("converted at R$ X.XX/US$"). Rate from a free FX source captured on day 1 of the period.

**Insight layer (hybrid)**
- The backend **detects and labels** findings with **deterministic rules** (budget thresholds, run-rate projection, severity, top drivers; seats-vs-roster).
- A **cheap LLM** (Claude Haiku 4.5, `claude-haiku-4-5`, **swappable via config / provider-agnostic**) only **narrates** the finding and phrases the control-plan actions.
- **Guardrail:** the LLM **never computes or decides**; all **numbers** (spend, %, projection, savings) come from the deterministic layer and are **injected** into the text, so there's no hallucinated figure. Control-plan *actions* are drawn from a curated, rule-mapped catalog — the LLM phrases them, it doesn't invent strategy.

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
  | `team` | id, tenant_id, name |
  | `provider_connection` | id, tenant_id, provider (openai/anthropic), encrypted_credential, status, last_sync |
  | `subscription` (manual seat) | id, tenant_id, tool, seat_count, price, team_id/shared |
  | `usage_daily` (aggregate) | tenant_id, date, provider, api_key_id/project, user_id, model, input_tokens, output_tokens, derived_cost |
  | `cost_daily` (aggregate $) | tenant_id, date, provider, project_id/workspace, line_item, value, currency |
  | `budget` | id, tenant_id, scope (org/team), team_id?, period (monthly), amount, currency, thresholds[], **frozen_fx_rate** (USD→display currency, captured at period start), **fx_rate_source/date** |
  | `model_price` | provider, model, input_price, output_price, effective_date |
  | `finding` | id, tenant_id, type (budget_threshold / seats_vs_roster), scope/target, numbers, drivers[], control_plan[], severity (status omitted — findings are stateless, see UX P6/P11) |
  | `notification_log` | id, tenant_id, channel (email), finding_key (team + threshold-level + period), sent_at — **system state only** (de-dup so each event alert fires once per period; never user-facing status) |
- **Per-tenant toggle:** store-per-person **on by default**, switchable off (then only team aggregates are kept — data minimization for LGPD/sensitive customers).

**Multi-tenancy & auth**
- Isolation: **shared DB with `tenant_id` on every table + Postgres Row-Level Security (RLS)** as a second layer (a query bug can't leak across customers — the due-diligence answer).
- Auth: **managed provider, no homemade auth.** Backbone is **Supabase** (Postgres + Auth + RLS); app on **Vercel**. Login via email/password + Google.
- RBAC: **Admin / Viewer** + a "who can see individual names" toggle (Admin-only by default).

**Stack**
- **TypeScript everywhere** (no Python). **Next.js (App Router)** + **Tailwind** + **shadcn/ui** + **Recharts**.
- Backend = Next's own **API routes / server actions** (monolith, single deploy).
- Hosting **Vercel**; data/auth **Supabase**; cron **Vercel Cron**.

**Business (context that shapes the product)**
- Customer pricing: **flat monthly tier** by band. **No self-serve billing in the MVP** — charge via Stripe payment link / manual invoice for the first customers.
- ICP: tech companies **20–200**; buyer **CEO/CTO**.

## UX Decisions

Resolved in a dedicated UX grilling. The product is an **executive cockpit** whose job is to answer *"am I in control of AI spend?"* in seconds, push early warnings, and stay honest about its own limits (read-only, externally-sourced numbers).

**Navigation & screens (P1, P2)**
- Left sidebar, **4 destinations: Overview / Budgets / Explore / Settings**.
- **Overview** — home. Org budget status + projection, the digest with active warnings, spend charts. Anchored in **value with graceful degradation**: before any data/budget, the budget status is replaced by a CTA to connect sources / set the first budget (never an empty screen).
- **Budgets** — the hero. Set org & per-team budgets; spend-vs-budget per team (value, %, run-rate projection); event warnings ordered by impact; open a warning to see top drivers + control plan; seats-vs-roster waste as a secondary footer section.
- **Explore** — attribution drill-down by team / person / provider / model; token detail. Where the CEO goes to answer "who/what inside the team drove this."
- **Settings** — connect OpenAI + Anthropic, roster CSV, manual seats, users/roles, privacy toggles, display currency.

**Onboarding (P3)**
- **Non-blocking checklist** (not a blocking wizard): user lands in Overview; a persistent, dismissible card guides *connect → roster → **set budget***, and the dashboard fills in as steps complete. The **budget step is pushed prominently** (without a budget there is no warning, i.e. no hero). Supports delegating the technical steps (keys) to a CTO without blocking the CEO.

**Budget visualization (P5)**
- Overview leads with the **org-level number** + a **per-team progress-bar list** (filled to current spend, marker at budget, dashed "ghost" extension = run-rate projection; green within / amber projected-to-breach / red breached). The glanceable "who's hot."
- The **cumulative time-series** (spend line vs budget line + dashed projection) lives **one level down** (open a team / Explore) — the "why / what pace," not a 5-second read.

**Warnings & control plans (P4, P6, P11)**
- Channel: **in-app + email**. Notification channel built as a **pluggable interface** (Slack deferred to v1.5/v2).
- Two message types: **event alert** (fires when daily sync detects a threshold crossing — the "early warning") and **weekly digest** (steady heartbeat, fires regardless). Both reuse the Haiku narration pipeline.
- **Anti-fatigue (P11):** an event alert fires **once per (team, threshold-level, period)**; escalates only on a **new higher threshold** (80% → 100% → projected-breach); resets next period. Backed by `notification_log` (system state, not user-facing status).
- **Control plan is read-only (P6):** shows the recommended actions (from a curated, rule-mapped catalog, phrased by the LLM) + top drivers. **No per-action status tracking, no "resolved" state** — findings are stateless/informational. Keeps the MVP lean; the digest does not report follow-through.

**Privacy / per-person (P7)**
- Per-person data is **never a standalone leaderboard**. It appears **only contextually** when drilling into a specific spike/finding, framed as **"contributors to this spike" (cost drivers)**, not a ranking of people. Names **Admin-only**; anonymized for Viewers. Reinforces "control, not surveillance."

**Device (P9)**
- **Desktop-first.** Consumption screens (Overview, an open warning, the budget glance) are **mobile-legible** because that's where the email click-through lands. Config/admin screens stay desktop-only. **No native mobile app.**

**Data-quality transparency (P10)**
- The product is honest about its own gaps and **never blocks** on them: every key number carries an **"as of <date>"**; a **banner** appears when a connector's last sync failed or is stale ("Anthropic hasn't synced in 3 days — totals may be understated"); tokens from an **unknown model** show as **"uncosted"** rather than silently dropping.

## Testing Decisions

**What makes a good test here:** it tests **external behavior** (input → observable output), not implementation detail. Since this is greenfield, there is **no prior art** — these seams establish the pattern. Prefer the **highest** seam that still isolates the risky part.

Proposed seams (highest/most valuable to most specific):

1. **Provider (connector) seam — most important for ingestion.** Abstract each provider client behind an interface (e.g., `UsageProvider`) returning usage/cost payloads. Tests inject a **fake provider** with canonical OpenAI/Anthropic payloads (no live calls). Lets the whole ingestion be tested deterministically.
2. **Ingestion → normalization → attribution pipeline.** Given a raw provider payload + a roster, assert the normalized aggregates and team/person attribution (including: shared key → team, not person; per-person cost derived from tokens × `model_price`).
3. **Budget & control engine (deterministic rules) — pure functions. THE HERO.** Given spend + budgets + dates, assert: spend-vs-budget, **linear run-rate projection**, **threshold crossings**, severity ordering, top-driver extraction, and **frozen-FX conversion**. Plus **alert de-dup** (given a `notification_log`, a crossing already sent this period does not re-fire; a new higher threshold does). Highest value and easy to test.
4. **Seats-vs-roster (secondary waste) — pure function.** Given subscriptions + roster, assert mismatch findings and estimated savings.
5. **Digest / narration pipeline.** Assert prompt assembly **injects** numbers (and control-plan actions from the catalog) and that output contains no LLM-generated figure or invented action. The LLM call itself is **mocked**.
6. **Tenant isolation (RLS) — the most critical due-diligence test.** Integration test against a test Postgres: a user from tenant A **cannot** read any data from tenant B, across all tables.
7. **RBAC/privacy.** Assert a Viewer (and/or with the names toggle off) **cannot** see individual names, only team aggregates.
8. **HTTP seam (API routes/server actions).** Integration tests of routes against a test DB (transactional rollback), covering each Admin user story's happy and error paths.

Modules tested in v1: OpenAI + Anthropic connectors (via seam 1), attribution pipeline, **budget/control engine**, seats-vs-roster detector, digest assembly, RLS isolation, RBAC.

## Out of Scope

- **Case B** (programmatic AI embedded in the company's products) — Denarius targets employee consumption.
- AI **proxy/gateway** and therefore any **hard enforcement / blocking** of usage — Denarius governs by warning and recommendation, not by capping.
- Connectors beyond **OpenAI and Anthropic** in v1. **GitHub Copilot** (and the per-seat `last_activity_at` idle detection it enables) is **deferred to v1.5/v2**; **Perplexity, Microsoft 365 Copilot, Google**, etc. → **v2**. **SSO** out (roster CSV stays).
- **Historical/multi-period forecasting** and **anomaly detection** (need accumulated history). *Note: intra-period **linear run-rate projection** is IN — it needs no history.*
- **Shadow AI detection**.
- **Self-serve billing/subscription** (charging is manual for the first customers).
- Native **mobile** app.
- Broad internationalization (beyond displaying a currency).

## Further Notes

- **Name:** Denarius (founder's decision). Mitigate the "crypto" reading by always pairing it with a descriptor ("Denarius — AI spend governance") and a domain that distances it from crypto (e.g., `denarius.ai`, `getdenarius.com`).
- **Exit thesis:** traction (1–3 real paying customers) → sale to a strategic acquirer (SaaS spend management like Zylo/Productiv/Vendr/Torii, FinOps, or observability/LLMOps). The lens for every decision: *"does this raise sale value / survive due diligence?"* — not *"does this scale to 10,000 customers?"*.
- **Infra:** free tier for the MVP (Supabase + Vercel), but DB/secrets treated rigorously from day one (encryption, RLS, `tenant_id` isolation) because that is exactly what an acquirer audits. Likely move off free tier at the first paying customer.
- **Build order (slices / tracer bullets):**
  1. Provision infra (Supabase + Vercel) + live API spike (**OpenAI** Usage/Costs **+ Anthropic** Usage/Cost).
  2. Walking skeleton (Next + Supabase auth/RLS + tenant + Admin + dashboard shell).
  3. Roster CSV import.
  4. Manual seats + dashboard (Visibility + Attribution).
  5. OpenAI connector + on-demand sync.
  6. Anthropic connector.
  7. Attribution + per-person cost + daily Cron.
  8. **Hero: Budgets & Control engine** (budgets, run-rate projection, threshold findings, top drivers, control plans).
  9. Secondary: seats-vs-roster waste finding.
  10. Executive digest (hybrid pipeline).
  11. Privacy & roles controls.
- **Sales play baked into the order:** slices 2–4 let you demo value with **manual data** before the customer trusts you with keys — reducing the "give me your key" friction. The hero (budgets) lands once real token data flows in slices 5–7.
