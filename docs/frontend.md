# Denarius frontend contract

> Status: structural contract, reviewed 2026-10-04.
>
> The product is scheduled for a visual reformulation. This file keeps only the frontend rules that affect behavior, accessibility, privacy, data meaning, and code placement. It is not a visual design system. Do not treat the current palette, typography, spacing, radii, icon set, or motion as approved brand direction.
>
> The approved target visual system is [DESIGN.md](../DESIGN.md) (founder-directed 2026-10-04, not yet implemented). It defines the type styles, ink ladder, radius ladder, spacing roles and component recipes that the visual pass lands.

## Product rules

- UI copy is in pt-BR. Code, comments, and documentation are in English.
- Pages are Server Components. Read data in the page or a server query. Mutations use Server Actions. Use a Client Component only for real browser interaction.
- Business calculations stay in `lib/engine/`. Components render the returned view model and do not recompute spend, margin, projection, thresholds, or permissions.
- Money is the primary value. Use the shared money formatters and keep USD, display currency, uncosted usage, missing FX, and reconciliation differences distinct.
- Green, amber, and red mean budget status. Use neutral treatment for deltas, freshness, attribution, connection state, and generic feedback. The one exception (founder-directed, 2026-10-04) is the week-over-week line under the Home spend figure: plain text, no pill, the signed percent in `text-status-red-fg` when spend rose and `text-status-green-fg` when it fell, followed by a muted "X semana anterior". The sign carries the direction, so color is never the only cue.
- Person data appears only in an allowed team context. Admin names follow the tenant policy. Viewers receive aggregates or anonymized data.
- The interface must state when data is stale, collecting, uncosted, unavailable, or only partially reconciled. A missing value is preferable to a guessed value.
- Destructive actions require explicit confirmation. Actions that change a tenant or provider must state their scope and their read-only boundary.
- Every confirmation goes through `components/domain/confirmation-dialog.tsx` (#171): destructive medallion with a per-action icon, title as a question, description stating the consequence, footer "Cancelar" (outline, focused on open) + the destructive verb, with a pending label while the action runs. No corner close button; the dialog scrolls on short screens and gives buttons 44px targets on phones. Use `ConfirmationDialog` with a `trigger`, or controlled `open`/`onOpenChange` when the opener unmounts first (the account menu's "Sair"). Multi-step flows (account deletion) compose `ConfirmationDialogContent` + `ConfirmationDialogHeader` and keep the same footer order.
- Every six-digit e-mail code screen (signup confirmation, password change, account deletion) renders `components/domain/email-code-field.tsx` (#171). It opens with "Digite o código de 6 dígitos que enviamos para <e-mail>.", the address in primary ink at 500. Under the label "Código de verificação" sit six boxes in two groups of three (input recipe: `sm` radius, hairline-tinted fill, digits at 22px/400 tabular, the focus ring and a blinking caret on the active box, solid under reduced motion). One line follows: the expiry ("O código expira em 10 minutos.", from `lib/auth/email-code-policy.ts`; "1 hora" for signup, Supabase's OTP expiry), "Enviamos um novo código." after a resend, or the error in its place, with the resend link on the right and a 60 s cooldown ("Reenviar em 52s"). The two modals (signup, account deletion) share the neutral mail medallion (a 6% ink wash) and the footer "Cancelar" + "Confirmar código", disabled until six digits; password change keeps the same block inline in `/preferencias`. The signup e-mail carries no link, so a closed signup dialog leaves "Digitar o código" under the form to reopen it.

## Relations as symbols

Founder-directed, 2026-10-05. When copy relates a figure to another figure (above or below, versus, per), a symbol carries the relation and the word is dropped. A symbol reads faster than a word, and a word next to a symbol only repeats it.

| Relation | Instead of | Write | Example |
|---|---|---|---|
| Above or below a reference | "acima", "abaixo", "a mais", "a menos", "excede em", "ultrapassou em", "mais rápido", "mais devagar" | the signed figure | `+R$ 1.200,00`, `−R$ 300,00`, `−30%` |
| Versus | "vs", "vs.", "versus", "comparado a", "em relação a", "para um orçamento de" | uppercase `X` between spaces | "Projeção X orçamento: +R$ 1.200,00" |
| Rate | "por mês", "por US$ 1", "por 1M tokens" | `/` | "R$ 5,50/US$", "Custo/1M tokens" |
| Approximation | "cerca de", "aproximadamente" | `≈` | "≈ R$ 820,00/mês" |
| From and to | "de R$ 10,00 para R$ 12,00" | `→` | "R$ 10,00 → R$ 12,00" |
| Range | "entre A e B", "de A a B" | `–` between spaces | "R$ 9.800,00 – R$ 11.200,00" |
| Formula | "vezes", "dividido por", "soma de" | `×`, `÷`, `Σ`, `+` | "tokens × preço", "preço ÷ dias" |

- **The sign is the position against the named reference:** `+` is above it, `−` is below it. Format signed figures with `signedMoney()` (`lib/money.ts`) and `signedPercent()` (`lib/format.ts`). They write the true minus (U+2212), which matches the plus sign's width in tabular columns, and leave a figure that rounds to zero unsigned. Never concatenate a sign by hand.
- **Name the reference once.** When the subject is not beside the figure, write "subject X reference: signed figure" ("Projeção X orçamento: +R$ 1.200,00"). When the subject is the figure just above or before it, write "signed figure X reference" ("+12,4% X semana anterior", "−R$ 300,00 X orçamento do time"). Two absolute values read "Projeção R$ 13.200,00 X orçamento R$ 12.000,00".
- **Drop the word the symbol replaces.** "+R$ 1.200,00 acima" says it twice.
- **`X` means versus only.** Multiplication inside a formula is `×` (U+00D7), so the two never collide.
- **Symbols go where figures are scanned:** metric rows, table cells and headers, list context lines, chart tooltips, drawer results, notification titles and details, chips, and one-line notices.
- **Words stay where sentences are read:** the verdict sentence, the digest narrative, card conclusions, help and explanatory paragraphs, validation messages, legal text, and e-mails. Accessible names and descriptions keep words because they are read aloud. A category label without a figure ("Acima do orçamento" in a legend) names a state and stays.
- **A margin keeps its own sign.** The projected margin is budget − projection (PRD story 28), so a positive margin is headroom. Do not show a margin and a signed difference for the same fact in one view.
- **The sign is not the semaphore.** A signed figure uses neutral ink unless the budget-status rules or the week-over-week exception above apply.

## Routes and screen responsibilities

The authenticated shell exposes five primary destinations. Search is a modal, not a destination. Personal preferences are reached from the account menu.

| Route | Responsibility |
|---|---|
| `/` | Home cockpit: freshness, verdict, spend, executive digest, provider composition, current-period pace, and budgeted teams. Without an org budget (cold start) it states that no verdict exists yet; Admins get "Retomar configuração". `?bem-vindo=1` opens the one-time welcome dialog after the guided setup; closing it removes the flag from the URL. |
| `/configuracao` | Guided setup outside the app shell (PRD P3): logo bar with "Sair", a four-step stepper (Empresa → Fontes de gasto → Times → Orçamento), and one centered card. `?etapa=` picks the step (default: first missing step); `?modo=apis` or `?modo=assinaturas` picks the spend-source option. Each step reuses the Ajustes form component (`ProviderConnectionCard`, `SubscriptionForm`, `RosterUpload`, `BudgetTableForm` in `components/domain/`). Footer: "Voltar", then "Fazer depois" until the step is done and "Continuar" after; the last step finishes with "Concluir e abrir o painel" or "Pular e abrir o painel". Admin-only; Viewers are redirected to `/`. |
| `/times` | Comparable team index (spent, budget, projection, progress). Rows only link to diagnosis; investigation and simulation actions live in `/times/[teamId]`. Keep budgeted, unbudgeted, and unattributed data distinguishable. |
| `/times/[teamId]` | Team diagnosis: summary, cumulative spend, composition, permitted contributors, calculations, control plan, and scenario drawer. The drawer charts the scenario (2026-10-05): realized spend through today, then the current-pace and simulated paths to the close, against the team budget as a flat line, on a y axis fixed to the lever's full range so dragging moves the line and not the scale. |
| `/explorar` | Composition views for models and fixed costs, with sorting, search where needed, reconciliation, and uncosted disclosures. |
| `/relatorios` | Current-period report generation and closed-month files. Preview, print, and PDF use the same report document. |
| `/ajustes` | Navigation index for company, roster, users, connections, attribution, subscriptions, budgets, privacy, and audit. |
| `/preferencias` | Personal profile, avatar, password, theme, and Admin digest preference, one card per section with an icon beside its title. The avatar is its own control: hover or focus reveals a camera overlay (touch screens get a permanent camera badge), a click opens the file picker, and the chosen file uploads immediately. Password change asks for a code e-mailed to the account, then takes the code with the new password. The digest switch saves when flipped. `/configuracoes` redirects here. |
| `/suporte` | Help, support, and bug reports. A route handler that redirects to Gmail's compose window addressed to the support inbox (`lib/support/contact.ts`), with a short report template and no session or tenant data. Reached from "Ajuda e suporte" in the account menu, which opens it in a new tab. |
| Search modal | `Ctrl+P` and the sidebar control open a bounded search over authorized routes and tenant resources. Recent queries stay in browser storage. The search field has no close button and no native clear control; `Esc`, `Ctrl+P`, or a click outside the modal closes it. |

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
- `components/domain/` contains domain components shared by two or more screens, such as `VerdictLine`, `BudgetBar`, `StatusPill`, `StaleBanner`, `TeamBudgetTable`, and `OneTimeCodeInput` (the six-box e-mail code field shared by account deletion and password change).
- `app/<route>/_components/` contains components owned by one screen.
- Keep screen copy in a nearby `copy.ts` or at the top of the component. Do not place product strings inline in JSX.
- Put pure formatting, state, and calculation helpers in `lib/`. Reuse an existing helper before adding another one. Do not create barrel files.
- Use the shared Zod schema for server validation. Use `useActionState` for form actions. Use a native form for a trivial action.
- Charts are explanatory. Budget and pacing bars may use CSS. Use Recharts only where the current data contract requires a cumulative time series. This rule is subject to the UI reformulation review.
- Range levers use the `Slider` primitive (`components/ui/slider.tsx`, Base UI): an ink fill up to the thumb over a neutral `--input` track. Do not use a native `<input type="range">` — its dark-mode track renders the same color on both sides of the thumb.

## Accessibility and responsive behavior

- Every interactive control has an accessible name and a visible keyboard focus state.
- Dialogs, drawers, menus, and status messages preserve keyboard navigation and announce meaningful changes.
- Respect `prefers-reduced-motion`. Motion is optional; state changes and data meaning are not.
- The layout works at narrow widths. Replace dense tables with readable cards or stacked rows before allowing horizontal scrolling to hide decision fields.
- Do not use color alone to convey budget status. Pair it with text or a label.
- Keep number columns tabular and keep the reading order verdict → spend → projection → scope that needs attention.

## Decided visual direction

Founder-directed, 2026-10-04. These hold until the founder changes them:

- **Monochrome first.** The interface is neutral ink on neutral surfaces. Primary buttons, links, focus rings, charts, and composition bars use neutral tokens (`--primary`, `--focus-ring`, `--chart-*`, `foreground` tones). The hero pacing bar is the founder-directed exception (2026-10-05): it uses four hues (`--pace-*`), described below.
- **Orange is a punctual signal.** `--brand-accent` / `--brand-action` appear only on an ON state or a brand mark: checked switches, the selected theme option, the unread-report dot, the logo coin, and the loading mark. Do not use orange for fills, hovers, data series, or decoration. Founder-directed exception (2026-10-05): a link inside the executive digest turns its underline `--brand-accent` on hover and keyboard focus.
- **Provider badges** (2026-10-05). `ProviderIcon` renders OpenAI and Anthropic as round badges: a white mark on a filled disc, black for OpenAI and Claude orange (`#E76A2A`) for Anthropic, at `size-5` (20px) wherever they appear. The Claude orange is a third-party brand mark, not the product orange, so it does not break the orange rule.
- **The semaphore is unchanged.** Green, amber, and red still mean budget status (plus the week-over-week exception above).
- **Soft outlines.** Card edges are a faint `ring-foreground/6` (skeletons match) and the inset shell border is `border-border/60`; surfaces separate by tone first, the outline only confirms the edge.
- **Card headers have no separator.** A card's title and description flow straight into its content; tables keep their own row and header rules.
- **Tight shell frame.** Route content sits close to the inset shell's walls (`px-3 py-4`, `md:px-5 md:py-5` on `[data-app-content]`) so the cockpit uses the space instead of framing it. Home's greeting row adds `mb-1 md:mb-2` to the `gap-3` row gap, so it has the same air above and below (16px, 20px from md).
- **Verdict without a pill.** Next to the Home greeting, the verdict is the pulsing status dot plus its words — no pill, no divider. The greeting (`text-base`, 80% ink) and the verdict words (70% ink) are secondary on Home; the dot keeps its full semaphore color.
- **Header figures.** Card header metrics (e.g. "Evolução do mês") are a `<dl>`: a quiet `text-xs` label over a `text-base` value, a larger gap from the title than from their footnote.
- **Hero pacing bar** (revised 2026-10-05). A meta row above the bar pairs a quiet `dia N de M` (left) with the spent percentage (right); there is no day marker on the track. The track is split into adjacent colored segments, with no lines or overlays, in reading order (`pacingSegments()` in `lib/bars.ts`): **gasto** (spent inside the budget, `--pace-spent`), **projeção** (what the current pace will still spend inside the budget, `--pace-projected`), **acima do orçamento** (spend already above the budget in `--status-red`, and what the pace will still add above it in `--pace-over`) and **sobra** (budget left free: at the close with a pace, or right now before day 5, `--pace-leftover`). The budget is the ruler, so the limit is exactly where the bar turns red in every state. Hue says where the money sits (orange inside, red above, gray free); lightness says when (strong = spent, light = still to come). Overrun and leftover are mutually exclusive, and the segments always tile the track. The legend has up to four entries; before day 5, it omits **projeção** and describes the pace as still being collected.

## Visual reformulation boundary

[DESIGN.md](../DESIGN.md) now specifies typography, the ink ladder, surface depth, borders, radii, density, the spacing scale, and card, table, chart and navigation recipes. Its Adoption section maps current classes to targets and lists where it supersedes the bullets above (header figures, greeting and verdict inks).

Still deliberately open for the next UI pass:

- icon library;
- motion choreography and decorative illustrations.

Until the pass lands, `app/globals.css` and the existing components provide compatibility tokens for the running app. Treat those tokens as implementation details. New work must use semantic names and existing primitives, and pick a named style from DESIGN.md rather than raw values, so the visual pass can replace them without changing screen contracts.

## Review checklist

Before merging a frontend change, verify:

1. the route still has the required data and permission states;
2. calculations and authorization remain server-side or in pure `lib/` functions;
3. all visible numbers have an honest source and currency label;
4. the narrow layout and keyboard path remain usable;
5. product copy stays in pt-BR and the visual choice does not become a new design-system rule;
6. relations next to figures use symbols, and sentences written to be read keep words (see Relations as symbols);
7. the relevant tests, lint, typecheck, and build pass.
