# PRD — Denarius (v1)

> **Status:** ready to build (greenfield)
> **Positioning:** AI-spend governance for tech companies. Denarius connects a company's AI sources (seats + APIs), attributes cost by team/person, and **finds waste** — an executive view for the CEO/CTO.
> **Exit thesis:** traction (1–3 paying customers) → sale to a strategic acquirer.

---

## Problem Statement

I'm the CEO/CTO of a 20–200-person tech company. My company's AI spend is scattered across many tools and invoices — ChatGPT and Copilot seats, OpenAI/Anthropic API keys used by devs, tools that appeared without anyone approving them. That spend is **growing fast** (price per token drops, but volume rises with agents and broader usage — Jevons paradox), and I have **no single view** of:

- How much we spend on AI, in total and over time;
- Which **teams** consume the most;
- Where there is **waste** (e.g., paid seats nobody uses);
- How much we'll spend by end of month.

Today, answering "how much do we spend on AI, by team, and where are we wasting it?" requires manually stitching invoices and spreadsheets, and even then it's incomplete and stale. My finance team can't forecast AI spend.

## Solution

**Denarius** is a B2B web app that centralizes all **employee** AI spend in one place.

From the user's perspective:

1. I create my company account (tenant) and invite people (Admin/Viewer).
2. I **see value on day zero** by seeding data manually: I register the subscriptions/seats we pay for (tool, # of seats, price) and upload a **roster CSV** (employee, email, team). I don't have to hand over any key to start seeing the picture.
3. When I want depth, I **connect OpenAI** (read-only key) and **GitHub Copilot** (read-only), and Denarius pulls real usage daily.
4. On the **dashboard** I see: total spend, trend over time, and the breakdown **by team** and **by tool**. The default view is by team (strategic), with a permissioned per-person drill-down.
5. Denarius **finds waste automatically** — e.g., "12 Copilot seats with no activity in 30 days = US$ 2,400/mo wasted" — which is the hook that pays for the product.
6. I get an **executive digest** in natural language summarizing the month ("Total US$ X, +18%, driven by Eng; 12 idle seats; projected US$ Y").

The headline metric is **spend in money** (governance), with tokens as a drill-down detail. The framing is **strategic** (money saved, decisions), not surveillance.

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

**OpenAI connector (metered ingestion)**
13. As an Admin, I want to connect OpenAI by providing a read-only Admin Key, so that Denarius can pull real usage.
14. As an Admin, I want my key stored encrypted and used only for reads, so that I can trust the product.
15. As an Admin, I want to test the connection when I save the key, so that I know it worked.
16. As an Admin, I want to rotate or revoke the connected key, so that I keep security control.
17. As the system, I want to sync OpenAI usage daily, so that the dashboard stays current without user action.
18. As an Admin, I want to see the last sync time and any error, so that I can trust the numbers.
19. As an Admin, I want onboarding guidance recommending "one OpenAI project per team," so that I get exact per-team cost in dollars.

**GitHub Copilot connector (seat activity — powers the hero)**
20. As an Admin, I want to connect GitHub Copilot (read-only), so that Denarius can see which Copilot seats are actually used.
21. As an Admin, I want Denarius to pull each Copilot seat's last activity, so that idle seats can be detected.
22. As an Admin, I want Copilot seats matched to roster employees, so that the per-team view includes Copilot.

**Visibility (dashboard)**
23. As a CEO/CTO, I want to see total company AI spend, so that I have the number that doesn't exist today.
24. As a CEO/CTO, I want to see the spend trend over time, so that I can notice accelerating growth.
25. As a CEO/CTO, I want to see the spend breakdown by team, so that I know who consumes the most.
26. As a CEO/CTO, I want to see the breakdown by tool/provider, so that I know where the money goes.
27. As a CEO/CTO, I want to filter by period (current month, last 30/90 days), so that I can analyze relevant windows.
28. As a Viewer, I want to see dashboards at the team level, so that I can follow along without accessing individual data.

**Attribution and drill-down**
29. As an Admin, I want to see cost per person within a team (drill-down), so that I can investigate a specific spike.
30. As an Admin, I want shared/service-key spend attributed to a team/project (not a person), so that attribution is honest.
31. As an Admin, I want to see tokens (input/output) as detail when I open an item, so that I understand the cost's origin.

**Waste (hero feature)**
32. As a CEO/CTO, I want Denarius to automatically identify idle seats (paid, no activity for N days), so that I can cut cost immediately.
33. As a CEO/CTO, I want to see the monetary value of the waste found ("US$ X/mo recoverable"), so that I can justify the action.
34. As a CEO/CTO, I want to see seats-vs-roster mismatches (paying for more seats than assigned people), so that I catch over-provisioning.
35. As an Admin, I want to mark a waste finding as "resolved" or "ignored", so that I can track what's been handled.
36. As an Admin, I want the findings list ordered by potential savings, so that I prioritize the highest return.

**Executive digest**
37. As a CEO/CTO, I want a natural-language summary of the month (total, change, top drivers, projection, waste), so that I understand the situation in 30 seconds.
38. As a CEO/CTO, I want to trust that the digest's numbers are exact, so that I can use them in decisions.
39. As an Admin, I want (eventually) to receive this digest by email periodically, so that I don't have to log in.

**Roles and privacy**
40. As an Admin, I want a "who can see individual names" toggle (Admin-only by default), so that I avoid a surveillance tone.
41. As an Admin, I want a "store per-person data" toggle (on by default, switchable off), so that I can serve a privacy-sensitive customer.
42. As a Viewer, when the names toggle is off, I want to see team-aggregated data without names, so that the company's policy is respected.
43. As an Admin, I want assurance that Denarius never stores prompts/responses, only usage metadata, so that I can trust the product with my company.

**Settings and account**
44. As an Admin, I want to manage company settings (name, display currency), so that it fits my reality.
45. As an Admin, I want to remove a user, so that I can revoke access for someone who left.

## Implementation Decisions

**Scope & product**
- Focus: **employee** AI consumption (seats + API keys), **not** the programmatic AI embedded in the company's products (Case B is out).
- Headline metric: **spend in money**; tokens are a drill-down.
- v1 pillars: **Visibility + Attribution + Waste (hero) + Digest**.

**Ingestion**
- Mechanism: **read-only connectors + manual seed**. **No proxy/gateway** (doesn't fit the employee case and adds friction).
- v1 connectors: **OpenAI** (Admin API) and **GitHub Copilot** (seat activity). Other connectors (Microsoft 365 Copilot, Google, Anthropic) and SSO are out of v1.
- Sync: **daily Vercel Cron** firing a serverless function that pulls and stores aggregates.

**Hero feature data dependency (Decision A → A2)**
- True "idle seat" detection requires **per-seat activity**, which the OpenAI connector (API tokens) does not provide. Therefore **GitHub Copilot is included in v1**: its seats API exposes `last_activity_at` per seat, enabling real idle-seat detection.
- v1 waste signals combine: (1) **idle Copilot seats** (no activity for N days), (2) **seats-vs-roster mismatch** (paying for more seats than assigned/active people, computable from manual subscriptions + roster), and (3) idle OpenAI API keys (informational; API is usage-billed so lower-value).

**Fatia 0 findings (OpenAI API validation) — now decisions:**
- The **Usage API** (`/v1/organization/usage/completions`) returns tokens with `group_by` of **user_id, api_key_id, project_id, model** at daily buckets. Requires an **Admin Key**.
- The **Costs API** (`/v1/organization/costs`) returns **dollars**, but only groups by **`project_id` and `line_item`** (not user/key).
- Consequence 1: for **exact per-team cost in dollars**, onboarding recommends **one OpenAI project per team** → Costs API delivers it directly.
- Consequence 2: for **per-person/per-key cost**, the connector **computes** cost from tokens (Usage API) × a **model price table** maintained by Denarius.
- Consequence 3: **person**-level attribution depends on per-person keys (`api_key_id`→person) or the `user` field; shared keys roll up to **team/project**.
- Pending: confirmation via a **live call** against an OpenAI org with an Admin Key, plus a quick validation of the **GitHub Copilot seats API** (both in the Slice 1 spike).

**Attribution**
- Hierarchy: **Organization → Team/Cost center → Person → Tool/Provider**.
- Default executive view: **by team**. Person = **permissioned drill-down**.
- v1 identity: **roster CSV** (SSO is out of v1).

**Insight layer (hybrid)**
- The backend **detects and labels** findings with **deterministic rules** (e.g., `activity = 0 for 30d ⇒ idle`; severity by threshold).
- A **cheap LLM** (Claude Haiku 4.5, `claude-haiku-4-5`, **swappable via config / provider-agnostic**) only **narrates** the finding.
- **Guardrail:** the LLM **never computes or decides**; all **numbers** come from the deterministic layer and are **injected** into the text (never generated by the LLM), so there's no hallucinated figure.

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
  | `provider_connection` | id, tenant_id, provider, encrypted_credential, status, last_sync |
  | `subscription` (manual seat) | id, tenant_id, tool, seat_count, price, team_id/shared |
  | `usage_daily` (aggregate) | tenant_id, date, provider, api_key_id/project, user_id, model, input_tokens, output_tokens, derived_cost |
  | `cost_daily` (aggregate $) | tenant_id, date, provider, project_id, line_item, value, currency |
  | `seat_activity` | tenant_id, provider, seat/user_id, employee_id, last_activity_at |
  | `model_price` | provider, model, input_price, output_price, effective_date |
  | `waste_finding` | id, tenant_id, type, target (team/seat/key), estimated_savings, status |
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

## Testing Decisions

**What makes a good test here:** it tests **external behavior** (input → observable output), not implementation detail. Since this is greenfield, there is **no prior art** — these seams establish the pattern. Prefer the **highest** seam that still isolates the risky part.

Proposed seams (highest/most valuable to most specific):

1. **Provider (connector) seam — most important for ingestion.** Abstract each provider client behind an interface (e.g., `UsageProvider` / `SeatProvider`) returning usage/cost/seat payloads. Tests inject a **fake provider** with canonical payloads (no live OpenAI/GitHub calls). Lets the whole ingestion be tested deterministically.
2. **Ingestion → normalization → attribution pipeline.** Given a raw provider payload + a roster, assert the normalized aggregates and team/person attribution (including: shared key → team, not person; per-person cost derived from tokens × `model_price`).
3. **Waste detection (deterministic rules) — pure functions.** Given usage + seat activity + subscriptions, assert idle-seat findings, seats-vs-roster findings, and estimated savings. High value (it's the hero) and easy to test.
4. **Digest pipeline.** Assert prompt assembly **injects** numbers from the deterministic layer (and that output contains no LLM-generated figure). The LLM call itself is **mocked**.
5. **Tenant isolation (RLS) — the most critical due-diligence test.** Integration test against a test Postgres: a user from tenant A **cannot** read any data from tenant B, across all tables.
6. **RBAC/privacy.** Assert a Viewer (and/or with the names toggle off) **cannot** see individual names, only team aggregates.
7. **HTTP seam (API routes/server actions).** Integration tests of routes against a test DB (transactional rollback), covering each Admin user story's happy and error paths.

Modules tested in v1: OpenAI + Copilot connectors (via seam 1), attribution pipeline, waste detector, digest assembly, RLS isolation, RBAC.

## Out of Scope

- **Case B** (programmatic AI embedded in the company's products) — Denarius targets employee consumption.
- AI **proxy/gateway**.
- Connectors beyond OpenAI and GitHub Copilot in v1 (**Microsoft 365 Copilot, Google, Anthropic**) and **SSO** (roster CSV stays).
- **Budgets + alerts**, **anomaly detection**, **forecasting**, **shadow AI detection** (several can't even work before history accumulates).
- **Self-serve billing/subscription** (charging is manual for the first customers).
- Native **mobile** app.
- Broad internationalization (beyond displaying a currency).

## Further Notes

- **Name:** Denarius (founder's decision). Mitigate the "crypto" reading by always pairing it with a descriptor ("Denarius — AI spend governance") and a domain that distances it from crypto (e.g., `denarius.ai`, `getdenarius.com`).
- **Exit thesis:** traction (1–3 real paying customers) → sale to a strategic acquirer (SaaS spend management like Zylo/Productiv/Vendr/Torii, FinOps, or observability/LLMOps). The lens for every decision: *"does this raise sale value / survive due diligence?"* — not *"does this scale to 10,000 customers?"*.
- **Infra:** free tier for the MVP (Supabase + Vercel), but DB/secrets treated rigorously from day one (encryption, RLS, `tenant_id` isolation) because that is exactly what an acquirer audits. Likely move off free tier at the first paying customer.
- **Build order (slices / tracer bullets):**
  1. Provision infra (Supabase + Vercel) + live API spike (OpenAI Usage/Costs + GitHub Copilot seats).
  2. Walking skeleton (Next + Supabase auth/RLS + tenant + Admin + dashboard shell).
  3. Roster CSV import.
  4. Manual seats + dashboard (Visibility + Attribution).
  5. OpenAI connector + on-demand sync.
  6. Attribution + per-person cost + daily Cron.
  7. GitHub Copilot seat connector.
  8. Hero: waste detection (idle seats + seats-vs-roster).
  9. Executive digest (hybrid pipeline).
  10. Privacy & roles controls.
- **Sales play baked into the order:** slices 2–4 let you demo value with **manual data** before the customer trusts you with keys — reducing the "give me your key" friction.
