# Denarius — project context (`docs/`)

Everything an engineer or agent needs to work on Denarius. Read in this order:

| Doc | What it holds | Read when |
|---|---|---|
| [prd.md](prd.md) | **Source of truth.** Problem, solution, 66 user stories, all product/UX/testing decisions (P1–P16), success metrics, risks, build order | Always first |
| [architecture.md](architecture.md) | System shape: stack, repo layout, multi-tenancy/RLS, browser security boundary, data flow, data model, environments, supply-chain policy | Before touching any code |
| [backend.md](backend.md) | Module-by-module backend spec: connectors, sync, budget engine formulas, findings rules, notifications, LLM guardrails, auth/RBAC (password rule, recovery, rate limits, audit log, data rights), credential encryption, period snapshot, server logging, env vars | Before any backend work |
| [frontend.md](frontend.md) | Screens, component contracts, design tokens, interaction patterns, UI states, the responsive contract, the closed-month print layer | Before any frontend work |

Fixed conventions:

- **Docs and code in English**; product copy (UI strings) in **pt-BR**.
- **[frontend.md](frontend.md) is the visual contract** for the frontend (design tokens + component contracts); the running app is the live reference. (A static `prototype/` seeded these decisions and was removed once the real screens shipped in #12–#15.)
- **UI/UX decisions** from the 2026-07 audit program live in the PRD (decision P16) and in [frontend.md](frontend.md); the working audit/handoff notes were retired once the redesign shipped.
- **Where the work stands (2026-08-07):** the v1 build order (issues **#12–#23**) is complete, and so is the pre-launch hardening track that followed (**#57–#95**: legal pages, password policy + recovery + change, security headers, rate limiting, role gating, error boundaries and branded 404, audit log, tenant data rights, rotatable credential encryption, supply-chain gate, RLS isolation running in CI, structured server logging, responsive pass, period snapshot + closed-month reports). Everything still open is **HITL** — infrastructure and provider access a human must provision: **#11, #56, #59, #63, #64, #65, #66, #67**.
- Every decision passes the exit-thesis filter: *"does this raise sale value / survive due diligence?"* — not "does this scale?".
