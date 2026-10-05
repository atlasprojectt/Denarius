# Denarius — project context (`docs/`)

> Reviewed 2026-10-04. The repository is an implemented beta. Read [current-state.md](current-state.md) first when you need the gap between the code and the product promise.

Everything an engineer or agent needs to work on Denarius. Read in this order:

| Doc | What it holds | Read when |
|---|---|---|
| [current-state.md](current-state.md) | Audited snapshot of shipped behavior, known limits, and documentation/code conflicts | When checking whether a claim matches the repository |
| [prd.md](prd.md) | **Product source of truth.** Problem, promise, user stories, scope, and product rules | When changing product behavior or scope |
| [product-analysis.md](product-analysis.md) | Complete Portuguese, non-technical product map: problem, roles, end-to-end flows, visible rules, states, gaps, evaluation framework and validation script | When assessing whether the product solves the customer problem |
| [architecture.md](architecture.md) | System shape: stack, repo layout, multi-tenancy/RLS, browser security boundary, data flow, data model, environments, supply-chain policy | Before touching any code |
| [backend.md](backend.md) | Module-by-module backend spec: connectors, sync, budget engine formulas, findings rules, notifications, LLM guardrails, auth/RBAC (password rule, recovery, rate limits, audit log, data rights), credential encryption, period snapshot, server logging, env vars | Before any backend work |
| [frontend.md](frontend.md) | Route responsibilities, UI states, component boundaries, accessibility, and responsive rules. Visual tokens are intentionally minimal during the UI reformulation. | Before any frontend work |
| [../DESIGN.md](../DESIGN.md) | **Target visual system** (approved 2026-10-04, not yet implemented): primitive tokens, named text styles (size + weight + ink + case), the ink ladder, radius ladder, spacing roles, component recipes, and when, where and never for each. In Impeccable's DESIGN.md format, at the repo root so design tooling finds it. | Before any visual or styling change |

Fixed conventions:

- **Docs and code in English**; product copy (UI strings) in **pt-BR**.
- **[frontend.md](frontend.md) is a structural contract**, not a final visual system. The running app is the behavior reference while the UI is being reformulated. The old static prototype is historical and was removed. The visual target lives in [../DESIGN.md](../DESIGN.md).
- **Product rules belong in the PRD.** The frontend doc records route and implementation contracts, not a second visual source of truth.
- **Current implementation status:** the v1 cockpit, provider connectors, attribution, budgets, alerts, reports, account controls, privacy controls, and hardening work are in the repository. See [current-state.md](current-state.md) for limits and unresolved code/documentation conflicts.
- Every decision passes the exit-thesis filter: *"does this raise sale value / survive due diligence?"* — not "does this scale?".
