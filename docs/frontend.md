# Denarius frontend contract

> Status: structural contract, reviewed 2026-10-04.
>
> The product is scheduled for a visual reformulation. This file keeps only the frontend rules that affect behavior, accessibility, privacy, data meaning, and code placement. It is not a visual design system. Do not treat the current palette, typography, spacing, radii, icon set, or motion as approved brand direction.

## Product rules

- UI copy is in pt-BR. Code, comments, and documentation are in English.
- Pages are Server Components. Read data in the page or a server query. Mutations use Server Actions. Use a Client Component only for real browser interaction.
- Business calculations stay in `lib/engine/`. Components render the returned view model and do not recompute spend, margin, projection, thresholds, or permissions.
- Money is the primary value. Use the shared money formatters and keep USD, display currency, uncosted usage, missing FX, and reconciliation differences distinct.
- Green, amber, and red mean budget status only. Use neutral treatment for deltas, freshness, attribution, connection state, and generic feedback.
- Person data appears only in an allowed team context. Admin names follow the tenant policy. Viewers receive aggregates or anonymized data.
- The interface must state when data is stale, collecting, uncosted, unavailable, or only partially reconciled. A missing value is preferable to a guessed value.
- Destructive actions require explicit confirmation. Actions that change a tenant or provider must state their scope and their read-only boundary.

## Routes and screen responsibilities

The authenticated shell exposes five primary destinations. Search is a modal, not a destination. Personal preferences are reached from the account menu.

| Route | Responsibility |
|---|---|
| `/` | Home cockpit: freshness, verdict, setup progress, spend, executive digest, provider composition, current-period pace, and budgeted teams. |
| `/times` | Comparable team index. Keep budgeted, unbudgeted, and unattributed data distinguishable. |
| `/times/[teamId]` | Team diagnosis: summary, cumulative spend, composition, permitted contributors, calculations, control plan, and scenario drawer. |
| `/explorar` | Composition views for models and fixed costs, with sorting, search where needed, reconciliation, and uncosted disclosures. |
| `/relatorios` | Current-period report generation and closed-month files. Preview, print, and PDF use the same report document. |
| `/ajustes` | Navigation index for company, roster, users, connections, attribution, subscriptions, budgets, privacy, and audit. |
| `/preferencias` | Personal profile, avatar, password, theme, and Admin digest preference. `/configuracoes` redirects here. |
| Search modal | `Ctrl+P` and the sidebar control open a bounded search over authorized routes and tenant resources. Recent queries stay in browser storage. |

Public routes include login, signup, recovery, invitation acceptance, privacy, terms, and error pages. Cron and report PDF endpoints are server-only integration routes.

## Screen states

Every data screen handles these states with copy appropriate to the route:

- first use: a useful next action or setup CTA;
- collecting pace: before the fifth day, show realized spend and explain that projection is unavailable;
- all clear: affirm the controlled state;
- stale or failed source: show the last known timestamp and the effect on totals;
- breached or projected breach: show the deterministic budget status and the relevant scope;
- no budget: show spend without claiming a control verdict;
- uncosted or missing FX: keep the unresolved amount visible and separate;
- permission denied, missing item, empty result, load failure, and successful mutation.

Use the RSC loading boundaries and skeletons for page data. Do not add a client spinner for daily reads.

## Component and data boundaries

- `components/ui/` contains generated primitives. Do not add product rules there.
- `components/domain/` contains domain components shared by two or more screens, such as `VerdictLine`, `BudgetBar`, `StatusPill`, `StaleBanner`, and `TeamBudgetTable`.
- `app/<route>/_components/` contains components owned by one screen.
- Keep screen copy in a nearby `copy.ts` or at the top of the component. Do not place product strings inline in JSX.
- Put pure formatting, state, and calculation helpers in `lib/`. Reuse an existing helper before adding another one. Do not create barrel files.
- Use the shared Zod schema for server validation. Use `useActionState` for form actions. Use a native form for a trivial action.
- Charts are explanatory. Budget and pacing bars may use CSS. Use Recharts only where the current data contract requires a cumulative time series. This rule is subject to the UI reformulation review.

## Accessibility and responsive behavior

- Every interactive control has an accessible name and a visible keyboard focus state.
- Dialogs, drawers, menus, and status messages preserve keyboard navigation and announce meaningful changes.
- Respect `prefers-reduced-motion`. Motion is optional; state changes and data meaning are not.
- The layout works at narrow widths. Replace dense tables with readable cards or stacked rows before allowing horizontal scrolling to hide decision fields.
- Do not use color alone to convey budget status. Pair it with text or a label.
- Keep number columns tabular and keep the reading order verdict → spend → projection → scope that needs attention.

## Visual reformulation boundary

The following decisions are deliberately open and belong to the next UI pass:

- color palette and brand accent;
- typography and icon library;
- surface depth, borders, radii, and density;
- spacing scale and container widths;
- motion choreography and decorative illustrations;
- exact card, table, chart, and navigation compositions.

Until that pass lands, `app/globals.css` and the existing components provide compatibility tokens for the running app. Treat those tokens as implementation details. New work must use semantic names and existing primitives so the visual pass can replace them without changing screen contracts.

## Review checklist

Before merging a frontend change, verify:

1. the route still has the required data and permission states;
2. calculations and authorization remain server-side or in pure `lib/` functions;
3. all visible numbers have an honest source and currency label;
4. the narrow layout and keyboard path remain usable;
5. product copy stays in pt-BR and the visual choice does not become a new design-system rule;
6. the relevant tests, lint, typecheck, and build pass.
