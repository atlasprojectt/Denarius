# UI/UX Audit Execution Plan — Fable 5

> Status: approved planning document
> Founder directive: 2026-07-11
> Source audit: `C:\Users\joaop\Downloads\AUDITORIA-UI-UX-QA (1)(1).md`
> Implementation status: not started

## 1. Mandate

The complete UI/UX and QA audit is accepted as the new implementation plan. Fable 5 owns the technically complex and trust-sensitive work needed to make every audited behavior real and reliable.

Fable 5 must favor explicit, deterministic, auditable code. It must preserve the Denarius technical invariants while updating earlier behavior and documentation wherever the founder-approved audit changes the plan.

Only these two planning documents are being created in this step. No application code or existing source-of-truth document is changed yet.

## 2. Ownership boundary

Fable 5 owns:

- financial data contracts and deterministic calculations;
- BRL display conversion backed by frozen FX;
- provider-reported versus derived-cost reconciliation;
- cross-screen numeric consistency;
- simulator arithmetic and preset behavior;
- synchronization, freshness, revalidation, and cache consistency;
- hydration diagnosis and theme-script correctness;
- complex client/server form state;
- server-side validation and safe mutation contracts;
- destructive-action authorization and tenant scoping;
- RBAC and privacy enforcement;
- unit, integration, RLS, and technical end-to-end regression tests;
- updates to `docs/backend.md` and `docs/architecture.md`;
- technical contributions to `docs/prd.md` and `docs/frontend.md` coordinated with GPT-5.6 Sol xhigh.

GPT-5.6 Sol xhigh owns information architecture, design-system decisions, route composition, responsive presentation, copy, accessibility presentation, visual QA, and the final UI integration.

## 3. Non-negotiable implementation invariants

Every technical change must preserve:

1. Every stored business row remains tenant-scoped and protected by RLS.
2. No client input is trusted without authoritative server-side zod validation.
3. USD remains the provider source of truth; display conversion uses the period's frozen FX rate.
4. Unknown models remain explicitly uncosted and never disappear from disclosure.
5. Organization reconciliation remains explicit: organization total equals team totals plus Unattributed at the same cost grain.
6. Provider-reported and token-derived values remain distinct data concepts even when the UI presents a bridge between them.
7. No number is computed or invented by an LLM.
8. No projection or projected-breach behavior bypasses the day-5 guard.
9. Denarius remains read-only and cannot enforce provider caps or blocks.
10. Person-level data remains contextual, Admin-only by default, and controlled by privacy settings.
11. All server actions verify tenant and role before mutation.
12. Fake providers, fixed fixtures, and mocked LLM calls are used in tests.

## 4. Financial contract and cross-screen reconciliation

This is the first and highest-priority Fable 5 work package.

### 4.1 Define every monetary concept

Create one explicit technical contract for:

- provider-reported organization API cost in USD;
- token-derived API cost in USD;
- derived per-team API cost;
- derived per-person API cost;
- shared-key/project cost that cannot belong to a person;
- manual seat cost in the tenant display currency;
- accrued seat cost for the current period;
- frozen USD-to-display-currency conversion;
- company governed spend;
- team governed spend;
- Unattributed governed spend;
- uncosted usage;
- reconciliation drift between derived and provider-reported totals.

The same concept must produce the same number on every screen. Different concepts must be labeled and connected through an explicit reconciliation bridge rather than made artificially equal.

### 4.2 Implement BRL-primary display support

Provide the deterministic values required for the audit's presentation rule:

- BRL is the primary display currency throughout the UI;
- original USD is available as secondary detail or tooltip;
- each converted value carries the correct frozen FX rate and period metadata;
- missing FX never causes USD and BRL to be summed;
- missing FX produces an explicit disclosure state;
- all values use the single `money()` formatting path at render time.

### 4.3 Reconcile Home, Explore, team detail, and person detail

Trace and correct the complete data path so that:

- Home company totals reconcile with their documented source;
- each team governed total equals its API and seat components under the correct FX rate;
- team detail uses the same governed total as Home;
- the person table clearly accounts for person-attributable API cost only;
- shared and Anthropic cost remains at team grain when person attribution is impossible;
- Unattributed remains visible;
- the Explore derived-versus-reported notice uses the same period and grain on both sides;
- no stale or mismatched fixture causes contradictory screen values.

### 4.4 Tests

Add exhaustive unit and integration tests for:

- reported versus derived cost separation;
- frozen-FX conversion;
- missing FX;
- seats plus API composition;
- team and organization totals;
- Unattributed reconciliation;
- uncosted usage;
- shared-key attribution;
- cross-screen query equivalence;
- exact audit seed examples where practical.

Audit coverage: S1, QA-03, UX-01, §6.1–6.3, §7, §13 phase 1, §15 item 2.

## 5. Synchronization and freshness propagation

Diagnose and correct QA-02 across the full application.

Required behavior:

- successful provider sync updates connection status, last-sync timestamp, cost data, usage data, and reconciliation state atomically enough to avoid contradictory UI;
- every consuming route is revalidated: Home, Explore, team detail, Connections, Attribution, and any cached layout data;
- the stale banner disappears when all relevant connections become fresh;
- failed providers remain accurately represented when another provider succeeds;
- provider totals update consistently after navigation and refresh;
- fake-provider sync is deterministic under test and cannot randomly create contradictory audit data;
- loading and result states cannot race or display an earlier mutation result;
- daily cron and manual sync reuse the same behavior.

Technical investigation must cover:

- server-action `revalidatePath` coverage;
- RSC/router cache behavior;
- provider connection writes versus usage/cost writes;
- freshness timestamps and status transitions;
- fake-provider fixtures;
- transactional or failure-boundary behavior;
- simultaneous OpenAI and Anthropic state.

Tests must reproduce the audit flow: sync OpenAI, return to Home/Explore, and verify banner and totals agree.

Audit coverage: QA-02, §6.5, §13 phase 1.

## 6. Hydration and theme correctness

Resolve QA-01 and QA-01b without hiding a real mismatch.

Required procedure:

1. Reproduce in a clean browser context with extensions disabled.
2. Reproduce with the audited extension environment if available.
3. Determine whether the mismatch originates from the inline theme script, server/client markup, extension injection, or more than one source.
4. Ensure the no-FOUC theme behavior produces compatible server and client DOM.
5. Avoid blanket suppression beyond the narrowest justified boundary.
6. Ensure the application produces no hydration error without extensions.
7. Verify both light and dark initial loads, saved preference, OS preference, navigation, and refresh.
8. Ensure the development overlay no longer obscures Home controls once the underlying issue is resolved.

Add a regression test where technically feasible and document any browser-extension-only limitation precisely.

Audit coverage: QA-01, QA-01b, QA-09, §13 phase 1, §15 item 1.

## 7. Simulator behavior

Implement the simulator exactly as required by the audit.

### 7.1 Correct the “Fechar no orçamento” preset

The preset must:

- calculate the pace adjustment needed for the selected team to close on its team budget;
- update slider, label, team close, company close, and both margins immediately;
- respect already-spent cost, which cannot be undone;
- disclose when the team budget is mathematically unreachable even at a complete stop;
- remain subject to the projection guard;
- use deterministic client-side arithmetic over injected aggregates;
- never call an LLM or backend to calculate the scenario.

### 7.2 Separate team and company outcomes

Return enough structured result data for the UI to state independently:

- whether the team closes inside its own budget;
- the team's margin against its own budget;
- whether the company closes inside its organization budget;
- the company's margin against its organization budget.

A positive company outcome must never erase or override a breached team outcome.

### 7.3 Tests

Cover:

- exact team break-even;
- team already within budget;
- team unable to return to budget because already-spent cost exceeds it;
- fixed −30% cut;
- company under while team over;
- company over while team under;
- day-5 projection guard;
- slider and preset result agreement;
- no numerical drift caused by rounding the displayed percentage.

Audit coverage: QA-04, QA-10, §6.3, §13 phase 1, §15.

## 8. Attribution form state

Resolve QA-11 at the client/server boundary.

Required behavior:

- selectors are controlled by an explicit local draft or an equivalent robust state model;
- the confirmed server result becomes the new baseline immediately after save;
- route revalidation cannot restore stale props over the confirmed selection;
- the Save action is disabled until the draft differs from the baseline;
- a successful save clears dirty state;
- a failed save preserves the draft and displays the error;
- navigation with unsaved changes follows the UI contract supplied by GPT-5.6;
- clearing a mapping continues to produce Unattributed safely;
- every submitted team belongs to the active tenant.

Add component/integration coverage for change → save → visual value → reload equivalence.

Audit coverage: QA-11, UX-16, §6.6.

## 9. Unified validation and mutation contracts

Implement the technical foundation for the audit's unified form system.

### 9.1 Shared validation

- use shared zod schemas as the single validation truth;
- expose typed field-level errors to client components;
- keep authoritative validation server-side;
- disable native browser validation where it would preempt the product's inline messages;
- retain progressive enhancement where possible;
- normalize pending, success, and error result shapes;
- prevent duplicate submissions.

### 9.2 Subscriptions

- validate tool, seat count, unit price, team, and shared/team scope;
- enforce integer and monetary bounds server-side;
- accept the localized UI input format without losing exact numeric meaning;
- return field-specific errors;
- preserve tenant isolation on create, update, and delete.

### 9.3 Budgets

- support the new single-table batch-edit contract;
- validate organization and team rows together;
- preserve independent guardrails;
- keep sum mismatch informational rather than invalid;
- make batch save atomic or return an unambiguous partial-failure strategy approved in documentation;
- preserve frozen FX rules across creates and edits;
- keep notification-log behavior unchanged unless the audit explicitly requires otherwise.

### 9.4 Roster

- define a safe email-edit contract if email editing is implemented;
- preserve attribution identity and uniqueness;
- implement remove-person safely;
- define how historical usage remains attributed after roster removal;
- prevent cross-tenant edits/removals;
- provide the query support required for search and pagination.

Audit coverage: S2, QA-06, UX-02, UX-09, UX-14, §6.7–6.9, §11.

## 10. Destructive-action safety

Provide secure mutation behavior behind every GPT-5.6 confirmation dialog.

Covered actions:

- revoke OpenAI connection;
- revoke Anthropic connection;
- remove subscription;
- remove organization budget;
- remove team budget;
- remove roster person;
- remove application user where exposed.

Requirements:

- authorization is checked again at execution time;
- every target is scoped explicitly to the active tenant;
- the action is idempotent or returns a safe already-removed result;
- pending state prevents accidental double submission;
- provider credential ciphertext is discarded on revocation;
- consequence copy matches real behavior;
- no confirmation is trusted as authorization;
- tests cover own-tenant success, cross-tenant denial, Viewer denial, missing target, and repeated submission.

Audit coverage: QA-05, UX-05, §6.5, §6.7–6.9, §15 item 3.

## 11. Permissions, privacy, and state fixtures

Provide the data and enforcement needed to exercise every audited state:

- Admin with names visible;
- Admin with names hidden;
- Viewer with aggregate-only access;
- store-per-person disabled;
- no provider connected;
- provider connected but never synced;
- failed sync;
- stale sync;
- fresh sync;
- no budget;
- collecting pace before day 5;
- all clear;
- projected breach;
- realized breach;
- zero spend;
- uncosted usage;
- Unattributed usage;
- empty roster;
- empty subscriptions;
- empty search results;
- first-use setup.

The RLS isolation suite remains the most critical test and must cover any new table, query, RPC, or mutation introduced by the audit work.

Audit coverage: §9, §15 item 6.

## 12. Query support for the revised UI

Build the smallest explicit server-side support needed by the GPT-5.6 interface:

- sortable Explore team/model/subscription results;
- threshold-triggered search and filtering;
- roster search and pagination;
- budget batch-edit reads and writes;
- actionable control-plan link targets;
- consolidated provider freshness summary;
- currency tooltip metadata;
- reconciliation bridge data;
- responsive views without client-side business arithmetic.

Do not introduce internal REST, React Query, global state, or client-side database access. Preserve RSC-first reads and server actions.

## 13. Technical testing program

### 13.1 Unit tests

- financial formulas and conversion;
- reconciliation at each grain;
- scenario arithmetic and break-even;
- freshness classification;
- validation schemas;
- destructive-action policy helpers;
- permission and privacy policy helpers;
- query mapping and stable ordering.

### 13.2 Integration tests

- sync writes followed by coherent reads;
- budget batch mutation;
- subscription validation and deletion;
- attribution save and reload;
- roster email edit/removal semantics;
- provider revocation;
- RLS and tenant isolation;
- Viewer restrictions;
- missing-FX and uncosted behavior.

### 13.3 End-to-end tests

At minimum:

1. Sync provider → Home and Explore totals/banners agree.
2. Home team → team detail → components reconcile.
3. Simulator “Fechar no orçamento” closes the team on budget.
4. Attribution change → save → selector remains correct → reload remains correct.
5. Every destructive action opens confirmation and only then mutates.
6. Subscription invalid submit renders product inline errors, not browser popups.
7. Viewer cannot access person names.
8. Empty, stale, collecting, all-clear, and breached fixtures render successfully.

## 14. Documentation owned by Fable 5

During implementation, update:

### `docs/backend.md`

- monetary concept contract;
- reported/derived reconciliation;
- BRL display conversion inputs;
- revised simulator formulas;
- sync invalidation/revalidation behavior;
- batch budget mutation contract;
- roster identity/removal behavior;
- destructive-action server guarantees;
- new tests and fixtures.

### `docs/architecture.md`

- any changed data flow;
- cache and revalidation boundaries;
- any schema/query changes;
- security and tenancy implications;
- state flow for controlled attribution and batch forms.

### `docs/prd.md` and `docs/frontend.md`

Contribute exact formulas, limitations, and data semantics to the GPT-5.6 documentation update. Product wording and screen composition remain owned by GPT-5.6.

Schema changes, if required, must use versioned migrations with tenant columns and RLS policies.

## 15. Collaboration contracts with GPT-5.6 Sol xhigh

Fable 5 must provide typed, documented contracts for:

- money and reconciliation display models;
- simulator team/company result model;
- consolidated sync/freshness state;
- controlled attribution action result;
- typed field errors;
- batch budget action result;
- destructive-action pending/success/error behavior;
- Viewer/Admin presentation permissions;
- state fixtures used by visual QA.

GPT-5.6 must not reimplement financial or permission logic in React components. Fable 5 must not make independent visual or copy decisions when the GPT-5.6 UI contract exists.

## 16. Definition of done

Fable 5's work is complete only when:

- every assigned audit issue has a root-cause explanation and verified fix;
- the same monetary concept has the same value across all routes;
- reported, derived, seat, converted, Unattributed, and uncosted values remain auditable;
- sync state and data propagate coherently;
- no clean-browser hydration error remains;
- the simulator break-even preset closes the selected team on its own budget;
- team and company scenario outcomes are computed separately;
- attribution state remains correct immediately after save and after reload;
- all destructive mutations are tenant-scoped, role-checked, and regression-tested;
- all forms return typed inline errors from shared validation;
- all new queries and mutations preserve RSC-first architecture;
- RLS isolation and privacy tests pass;
- lint, typecheck, unit, integration, and relevant end-to-end tests pass;
- `docs/backend.md` and `docs/architecture.md` describe the shipped behavior;
- technical sections of `docs/prd.md` and `docs/frontend.md` agree with the implementation.

## 17. Execution sequence

1. Financial contract and cross-screen reconciliation.
2. Sync/freshness propagation.
3. Simulator team break-even and dual-budget results.
4. Attribution state correction.
5. Hydration diagnosis and correction.
6. Shared validation and destructive-action safety.
7. Budget, roster, and subscription mutation support.
8. Permission/state fixtures and complete regression suite.
9. Technical documentation reconciliation.

No audit item may be silently removed, deferred, or reinterpreted out of scope. Any technical ambiguity must be resolved in favor of the audit while preserving security, tenancy, deterministic arithmetic, and honest disclosure.
