# UI/UX Audit Execution Plan — GPT-5.6 Sol xhigh

> Status: approved planning document
> Founder directive: 2026-07-11
> Source audit: `C:\Users\joaop\Downloads\AUDITORIA-UI-UX-QA (1)(1).md`
> Implementation status: not started

## 1. Mandate

The complete UI/UX and QA audit is accepted as the new product-improvement plan. Every modification described in the audit must be implemented as written. Earlier product, UX, or frontend decisions that conflict with the audit must be updated during execution so the repository documentation reflects the new founder direction.

This document defines the work owned by GPT-5.6 Sol xhigh. Its primary responsibility is to turn the audit into a coherent product and interface implementation while preserving Denarius's identity:

- verdict first;
- money as the headline;
- control, not surveillance;
- read-only governance;
- honest data presentation;
- semaphore colors reserved for budget status;
- calm executive communication;
- pt-BR interface copy;
- a ten-second answer for the CEO/CTO.

Only these two planning documents are being created in this step. No application code or existing source-of-truth document is changed yet.

## 2. Ownership boundary

GPT-5.6 Sol xhigh owns:

- product and UX interpretation of every audit recommendation;
- information architecture and navigation changes;
- screen hierarchy and content prioritization;
- visual design system consolidation;
- component-level UI implementation;
- responsive behavior and mobile presentation;
- accessibility and interaction affordances;
- pt-BR copy and microcopy;
- empty, loading, success, error, first-use, and permission-state presentation;
- visual and interaction QA;
- updates to `docs/prd.md`, `docs/frontend.md`, and `docs/README.md` required by the new plan;
- coordination of UI contracts consumed by the Fable 5 technical work.

Fable 5 owns deterministic arithmetic, financial reconciliation, engine changes, synchronization, hydration diagnosis, complex client/server state, security-sensitive mutations, and technical regression suites. Shared items are split explicitly below.

## 3. Required documentation alignment

Before the first implementation slice, GPT-5.6 Sol xhigh must update the repository documentation to make the audit-backed plan authoritative:

1. Update `docs/prd.md`:
   - record the founder's acceptance of the complete audit;
   - add or revise product behavior for currency display, reconciliation presentation, Home hierarchy, Explore organization, Settings organization, responsive tables, feedback, destructive confirmation, and complete states;
   - revise earlier decisions that conflict with the audit;
   - add explicit acceptance criteria from audit §15;
   - preserve the technical invariants unless the audit explicitly changes presentation rather than calculation.
2. Update `docs/frontend.md`:
   - replace the current screen contracts with the audited target contracts;
   - document the unified container system;
   - document the new design-system rules;
   - document toast plus inline validation behavior;
   - document responsive table-to-card behavior;
   - document the new Home, Explore, Settings, and budget-editing structures;
   - document all interaction, accessibility, and state requirements.
3. Update `docs/README.md`:
   - add these execution plans to the reading order while work is active;
   - identify the audit-backed revision as the current UI/UX program.
4. Coordinate with Fable 5 on any required changes to `docs/architecture.md` and `docs/backend.md`.

Documentation changes and implementation changes must ship together in the relevant work slice.

## 4. Information architecture and navigation

### 4.1 Home cockpit

Implement the audited cockpit hierarchy:

- keep the verdict and headline spend immediately visible;
- surface actionable insights directly below the verdict as “Próximas ações”;
- move fine-grained investigation away from Home and into Explore;
- reduce visual competition between the verdict, charts, tables, and observations;
- explain when repeated totals are the same amount shown through different cuts;
- condense multiple provider freshness failures into one banner with a direct recovery action;
- keep no floating element over interactive content;
- make the budget-team row a predictable navigation affordance;
- ensure the verdict and next actions are visible without scrolling at the target desktop viewport.

Audit coverage: S3, S6, §6.1, UX-03, UX-10, UX-11, QA-09, §10, §13 phase 2, §14.

### 4.2 Explore

Reorganize Explore for faster investigation:

- introduce tabs or anchored sections for “Por time”, “Por modelo”, and “Assentos”;
- apply the approved BRL-primary currency presentation supplied by the financial contract;
- show original USD values as secondary detail or tooltip;
- make reconciliation information prominent and readable rather than small footer prose;
- add sortable columns;
- add search/filter behavior when the defined row threshold is exceeded;
- make team rows visibly navigable through hover, focus, and a static chevron;
- explain missing teams or render them with zero values, as specified by the audit;
- preserve explicit Unattributed and uncosted disclosure.

Audit coverage: §6.2, UX-01, UX-08, §10, §13 phases 1, 2, and 4.

### 4.3 Team detail

Improve the team investigation and action surface:

- present governed total, API cost, seat cost, original USD, and frozen FX relationship clearly;
- visually separate team-budget status from company-budget impact;
- consume the corrected simulator contract implemented by Fable 5;
- ensure a scenario cannot communicate company safety as if the team were healthy;
- turn “O que dá para fazer” items into links to models, seats, attribution, or the relevant investigation section;
- preserve contextual, Admin-only person data and the control-not-surveillance framing.

Audit coverage: §6.3, QA-04, QA-10, UX-13.

### 4.4 Settings hub

Implement Settings as a predictable index:

- separate navigation cards from inline editing;
- promote Privacy, Users, and Company/Identity/Currency to dedicated subpages;
- use a consistent card-to-screen pattern with static chevrons;
- add a clear explanation and path for the locked display currency;
- expose the appropriate user invitation state described by the audit;
- maintain role and privacy restrictions.

Audit coverage: §6.4, UX-06, §10, §13 phase 2.

### 4.5 Connections

- add the visual confirmation flow for Revogar;
- use clear destructive styling and consequence copy;
- make successful synchronization state coherent with the global freshness presentation produced by Fable 5;
- move unavailable integrations such as GitHub Copilot into a separate “Em breve” section.

Audit coverage: §6.5, QA-02, QA-05, UX-05.

### 4.6 Attribution

- consume Fable 5's corrected controlled-state implementation;
- show an explicit dirty state;
- disable “Salvar mapeamento” when nothing changed;
- preserve success feedback without allowing the selector to revert visually;
- apply the unified currency presentation.

Audit coverage: §6.6, QA-11, UX-16.

### 4.7 Roster

- clarify why email is immutable or implement email editing as required by the audit;
- add the remove-person action and confirmation;
- add search and pagination behavior for the defined growth threshold;
- preserve the existing CSV import and validation strengths;
- maintain privacy and attribution integrity through the Fable 5 mutation contract.

Audit coverage: §6.7, UX-14.

### 4.8 Subscriptions

- replace native browser validation presentation with the unified inline system;
- add the removal confirmation dialog;
- add monetary input formatting and visible currency;
- expose seat and monetary bounds clearly;
- consume shared zod/server-action errors supplied by Fable 5.

Audit coverage: §6.8, QA-05, QA-06, UX-02, UX-05.

### 4.9 Budgets

- replace repeated budget cards with one editable table;
- render one row per company/team scope as defined in the audited design;
- provide one primary Save action;
- provide one destructive remove control per row with confirmation;
- explain “Aviso em (%)” with concise microcopy;
- keep the team-budget sum mismatch visible and informational;
- preserve independent company and team guardrails while presenting them clearly.

Audit coverage: §6.9, UX-09, QA-05, §10, §13 phase 2.

### 4.10 Profile menu

- stop unnecessary email truncation;
- separate “Sair” from navigation with a divider;
- preserve clear destructive/logout semantics and keyboard behavior.

Audit coverage: §6.10, UX-12, §14.

## 5. Unified design system

GPT-5.6 Sol xhigh must define and implement the complete minimum design system requested by audit §11.

### 5.1 Typography

- define display, page title, card title, label, body, and caption levels;
- apply sentence case;
- preserve tabular numerals for every monetary and numeric value;
- normalize table labels and microcopy sizing.

### 5.2 Spacing and containers

- adopt a 4/8px spacing grid;
- normalize card padding and section gaps;
- define one coherent container system;
- provide deliberate analytical, form, and table variants;
- remove arbitrary width changes between routes.

### 5.3 Colors

- preserve brand orange as the primary action color;
- maintain semantic status tokens;
- reserve green/amber/red budget semaphore meaning where required by product principles;
- normalize destructive, error, and breached treatments without making neutral changes alarming.

### 5.4 Icons

- use one icon library and consistent size/weight;
- standardize hint, status, lock, navigation, edit, and destructive icons;
- ensure icons never carry meaning without an accessible label.

### 5.5 Buttons

- define primary, secondary, and tertiary levels by function;
- define one destructive variant;
- eliminate route-specific Save styling differences;
- normalize pending, disabled, hover, active, and focus-visible states.

### 5.6 Inputs and forms

- define one input, label, help, and inline-error treatment;
- add visible currency and masking for monetary fields;
- use inline validation instead of native browser popups;
- implement a global toast system for cross-screen success/error feedback as required by the audit;
- avoid duplicate or contradictory inline and toast messages.

### 5.7 Tables

- standardize headers, numeric alignment, hover, focus, zebra treatment if used, and clickable rows;
- add standard sorting and threshold-triggered search;
- define the mobile card transformation;
- preserve essential information without horizontal scrolling.

### 5.8 Cards, badges, feedback, and overlays

- normalize card radius, border, shadow, title, description, and content spacing;
- consolidate status badges;
- use skeletons for initial data fetching;
- use the simulator drawer as the modal/drawer accessibility reference;
- guarantee overlays and floating controls never cover interactive content.

Audit coverage: S2, S4, S5, S7, UX-02, UX-04, UX-07, UX-15, §9, §11, §13 phase 3.

## 6. Responsive and accessibility implementation

Implement the audit's complete responsive target:

- sidebar becomes an accessible drawer on mobile;
- collapsed desktop sidebar has tooltips for every icon;
- orphan group titles disappear when collapsed;
- consumption tables become stacked cards or use a documented priority-column pattern;
- critical status, spend, budget, and projection information remains visible without horizontal scrolling;
- all interactive rows, buttons, links, tabs, dialogs, dropdowns, sliders, and form controls have visible focus;
- Esc closes drawers/dialogs and focus returns to the trigger;
- labels, descriptions, errors, and icon-only controls have appropriate accessible names;
- reduced-motion preference is respected;
- contrast is verified in both themes.

Audit coverage: S5, QA-07, QA-08, UX-07, §9, §13 phase 4.

## 7. Complete UI state coverage

Create and visually verify every state required by audit §9:

- loading with screen-shaped skeletons;
- successful mutation feedback;
- data and synchronization error with a direct recovery action;
- inline validation error;
- empty/no-results with contextual CTA;
- first-use setup path: connect provider → import roster → define budget;
- Admin and Viewer permission states;
- explicit zero-spend state;
- uncosted state;
- stale-data state;
- collecting-pace state;
- all-clear state;
- breached state;
- dirty and unchanged form states.

The interface must be tested with purpose-built fixtures instead of assuming a state is absent because seed data does not expose it.

## 8. Audit-to-owner crosswalk

| Audit item | Primary owner | GPT-5.6 responsibility |
|---|---|---|
| QA-01 / QA-01b | Fable 5 | Validate the resulting theme and overlay experience visually |
| QA-02 | Fable 5 | Design and verify coherent global sync feedback |
| QA-03 / UX-01 | Shared | Define currency hierarchy, labels, tooltips, and reconciliation presentation |
| QA-04 | Shared | Define distinct team and company outcome communication |
| QA-05 / UX-05 | Shared | Build confirmation-dialog UI and destructive interaction pattern |
| QA-06 / UX-02 | Shared | Build inline validation and toast presentation |
| QA-07 / UX-07 | GPT-5.6 | Implement collapsed-sidebar affordances |
| QA-08 | GPT-5.6 | Implement responsive tables/cards |
| QA-09 | Shared | Verify no overlay covers controls after the technical error is removed |
| QA-10 | Fable 5 | Integrate and visually verify the corrected preset |
| QA-11 / UX-16 | Shared | Implement and verify dirty/confirmed visual states |
| QA-12 / S7 | GPT-5.6 | Implement the unified container system |
| UX-03 | GPT-5.6 | Implement predictable row navigation |
| UX-04 | GPT-5.6 | Consolidate button hierarchy |
| UX-06 | GPT-5.6 | Restructure Settings |
| UX-08 | GPT-5.6 | Add table sorting/search/filter behavior |
| UX-09 | GPT-5.6 | Consolidate budget editing |
| UX-10 | GPT-5.6 | Elevate next actions on Home |
| UX-11 | GPT-5.6 | Condense freshness banner |
| UX-12 | GPT-5.6 | Refine profile menu |
| UX-13 | GPT-5.6 | Make control-plan items actionable |
| UX-14 | Shared | Build roster UI over safe Fable 5 mutations |
| UX-15 | GPT-5.6 | Add chart axes/tooltips and verify legibility |

## 9. Validation owned by GPT-5.6 Sol xhigh

For every slice:

1. Verify desktop and mobile layouts in the browser.
2. Exercise hover, focus, active, disabled, pending, success, error, empty, and destructive states.
3. Verify keyboard navigation, Esc behavior, and focus return.
4. Inspect both light and dark themes.
5. Confirm pt-BR copy is isolated from JSX according to F2.
6. Confirm no semaphore color is misused for neutral information.
7. Confirm no control implies Denarius can enforce or block provider usage.
8. Confirm Admin-only names and Viewer aggregate behavior remain clear.
9. Run lint, typecheck, unit tests, and relevant Playwright journeys.
10. Compare the implementation against every audit acceptance criterion.

## 10. Definition of done

GPT-5.6 Sol xhigh's work is complete only when:

- every assigned audit item is implemented, not merely documented;
- all shared UI contracts are integrated with the Fable 5 implementation;
- the Home verdict and next actions are visible without scroll at the approved viewport;
- all routes feel like one product through the unified container and design systems;
- mobile tables remain useful without hidden critical columns;
- every destructive action has an explicit confirmation experience;
- every form uses the unified validation and feedback system;
- every required UI state has a reproducible fixture and has been visually verified;
- accessibility behavior is verified by keyboard and semantic inspection;
- `docs/prd.md`, `docs/frontend.md`, and `docs/README.md` match the shipped behavior;
- the complete repository passes lint, typecheck, tests, and the relevant end-to-end journeys.

## 11. Execution sequence

1. Documentation alignment and final UI contracts.
2. Shared design-system foundations.
3. Critical trust surfaces: currency presentation, sync feedback, simulator outcomes, destructive confirmation.
4. Home and Explore restructuring.
5. Settings and form restructuring.
6. Responsive and accessibility completion.
7. Complete state coverage.
8. Final visual QA and documentation reconciliation.

No audit item may be silently removed, deferred, or reinterpreted out of scope. Any implementation ambiguity must be resolved in favor of the audit and recorded in the source-of-truth documentation.
