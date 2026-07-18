# Denarius

**Governança de gasto com IA.** Denarius conecta as Admin APIs (somente leitura) da OpenAI e da Anthropic, transforma o consumo de tokens em **dinheiro**, acompanha esse valor contra **orçamentos** e responde a uma única pergunta — *"estou no controle?"* — com um **veredito** determinístico, avisos antecipados e simulação de cenários.

Feito para o CEO/CTO de uma empresa de tecnologia de 20–200 pessoas: um executivo, não um engenheiro, que dedica ~10 segundos por visita. O sistema aponta; o CEO decide.

> Read-only por design: Denarius observa e recomenda — nunca bloqueia nem limita o uso.

## Stack

- **Next.js** (App Router, RSC) + **React 19** + **TypeScript** estrito
- **Tailwind CSS 4** + **shadcn/ui** + **Recharts**
- **Supabase** (Postgres + Auth + RLS) — isolamento por tenant em toda tabela
- **Vercel** + Vercel Cron (sync diário) · **Resend** (alertas + digest semanal)
- **Claude Haiku 4.5** — narração apenas; a IA nunca calcula números

## Começando

```bash
npm install
npm run dev          # http://localhost:3000
```

Copie `.env.example` para `.env.local` e preencha as variáveis (Supabase, chave de criptografia, etc.). As chaves de provider e segredos ficam apenas server-side — nunca em `NEXT_PUBLIC_*`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes end-to-end (Playwright) |

## Estrutura

```
app/         rotas (App Router): (auth), início, times, explorar, ajustes + API
components/  ui/ (shadcn) + domain/ (componentes de domínio compartilhados)
lib/         engine/ (funções puras: projeção, veredito, thresholds),
             connectors/, findings/, notify/, privacy/, fx/ …
supabase/    migrations/ (schema como código, auto-deploy no merge para main)
tests/       testes do engine, RLS e privacidade
e2e/         Playwright
docs/        documentação do projeto (comece por docs/README.md)
```

## Invariantes (nunca quebrar)

1. **Isolamento por tenant** — toda tabela tem `tenant_id` + política RLS.
2. **A IA nunca calcula** — todo número vem de código determinístico e é injetado na narração.
3. **Reconciliação** — `total da org = Σ times + Não atribuído`; nada some silenciosamente.
4. **USD é a verdade** — armazenado como o provider reporta; display converte pela FX congelada no início do período.

## Documentação

Todo o contexto de produto e engenharia está em [`docs/`](docs/README.md). A ordem de leitura:

1. [`docs/prd.md`](docs/prd.md) — **fonte da verdade** (produto, stories, decisões P1–P16)
2. [`docs/architecture.md`](docs/architecture.md) — shape do sistema, tenancy, modelo de dados
3. [`docs/backend.md`](docs/backend.md) — contratos de módulo, fórmulas do engine, env vars
4. [`docs/frontend.md`](docs/frontend.md) — telas, tokens, padrões de UI

`CLAUDE.md` / `AGENTS.md` são a **constituição** do projeto para agentes de IA — como pensar antes de escrever código.

---

Privado — cópia interna. UI em pt-BR; código, comentários e docs em inglês.
