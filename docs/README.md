# Denarius — project context (`docs/`)

Everything an engineer or agent needs to work on Denarius. Read in this order:

| Doc | What it holds | Read when |
|---|---|---|
| [prd.md](prd.md) | **Source of truth.** Problem, solution, 59 user stories, all product/UX/testing decisions (P1–P15), success metrics, risks, build order (13 issues) | Always first |
| [architecture.md](architecture.md) | System shape: stack, repo layout, multi-tenancy/RLS, data flow, data model, environments | Before touching any code |
| [backend.md](backend.md) | Module-by-module backend spec: connectors, sync, budget engine formulas, findings rules, notifications, LLM guardrails, env vars | Before backend issues (#13–#18, #20–#23) |
| [frontend.md](frontend.md) | Screens, component contracts, design tokens, interaction patterns, UI states | Before frontend issues (#19, UI parts of others) |

Fixed conventions:

- **Docs and code in English**; product copy (UI strings) in **pt-BR**.
- **[frontend.md](frontend.md) is the visual contract** for the frontend (design tokens + component contracts); the running app is the live reference. (A static `prototype/` seeded these decisions and was removed once the real screens shipped in #12–#15.)
- **UI/UX decisions** from the 2026-07 audit program live in the PRD (decision P16) and in [frontend.md](frontend.md); the working audit/handoff notes were retired once the redesign shipped.
- Work is sliced into GitHub issues **#11–#23** (`ready-for-agent`), dependency-ordered; #11 is HITL (founder provisions infra + Admin keys).
- Every decision passes the exit-thesis filter: *"does this raise sale value / survive due diligence?"* — not "does this scale?".
