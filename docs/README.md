# Denarius — project context (`docs/`)

Everything an engineer or agent needs to work on Denarius. Read in this order:

| Doc | What it holds | Read when |
|---|---|---|
| [prd.md](prd.md) | **Source of truth.** Problem, solution, 59 user stories, all product/UX/testing decisions (P1–P15), success metrics, risks, build order (13 issues) | Always first |
| [architecture.md](architecture.md) | System shape: stack, repo layout, multi-tenancy/RLS, data flow, data model, environments | Before touching any code |
| [backend.md](backend.md) | Module-by-module backend spec: connectors, sync, budget engine formulas, findings rules, notifications, LLM guardrails, env vars | Before backend issues (#13–#18, #20–#23) |
| [frontend.md](frontend.md) | Screens, component contracts, design tokens, interaction patterns, UI states | Before frontend issues (#19, UI parts of others) |
| [ui-ux-audit-gpt56-sol-xhigh-plan.md](ui-ux-audit-gpt56-sol-xhigh-plan.md) | Founder-approved UI/UX execution plan: product, interface, responsive behavior, accessibility, and visual QA | During the 2026-07 UI/UX audit program |
| [ui-ux-audit-fable5-plan.md](ui-ux-audit-fable5-plan.md) | Technical companion plan: financial contracts, sync, simulator, state, security, and regression coverage | Before audit work that depends on Fable 5 contracts |

Fixed conventions:

- **Docs and code in English**; product copy (UI strings) in **pt-BR**.
- **[frontend.md](frontend.md) is the visual contract** for the frontend (design tokens + component contracts); the running app is the live reference. (A static `prototype/` seeded these decisions and was removed once the real screens shipped in #12–#15.)
- **2026-07-11 UI/UX program:** the founder accepted the complete audit as the active improvement plan. The two execution plans above and PRD decision P16 supersede earlier UI details where they conflict.
- Work is sliced into GitHub issues **#11–#23** (`ready-for-agent`), dependency-ordered; #11 is HITL (founder provisions infra + Admin keys).
- Every decision passes the exit-thesis filter: *"does this raise sale value / survive due diligence?"* — not "does this scale?".
