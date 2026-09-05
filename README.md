<p align="center">
  <img width="620" alt="Denarius" src="https://github.com/user-attachments/assets/ba4b4810-5e4e-4241-9d44-c3240f1244b4" />
</p>

<p align="center">
  <strong>Observabilidade e inteligência financeira para gastos com IA.</strong><br />
  Transforma dados de consumo em comparações, projeções e uma leitura executiva<br />
  para decisões de orçamento em 10 segundos.
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-MVP%20em%20desenvolvimento-FF5100" />
  <img alt="next" src="https://img.shields.io/badge/Next.js-16-000" />
  <img alt="react" src="https://img.shields.io/badge/React-19-000" />
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-strict-000" />
  <img alt="licença" src="https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-8B0000" />
</p>

> **README provisório.** Cobre o essencial para rodar e se orientar no repositório.
> A documentação completa e canônica vive em [`docs/`](docs/README.md).

---

## O que é

Denarius conecta as **Admin APIs da OpenAI e da Anthropic** (somente leitura), soma o consumo
de tokens ao custo de assentos, converte tudo em **dinheiro**, acompanha esse valor contra
**orçamentos** por organização e por time, e transforma os dados em:

- um **veredito determinístico** (verde / âmbar / vermelho) com uma frase que se justifica;
- **avisos antecipados** por e-mail, com regras anti-fadiga (um alerta por time, nível e período);
- **simulação contextual** de cenários — mexe apenas no gasto que ainda não aconteceu;
- **forecast**, comparações de modelos, métricas de eficiência e um **Executive Digest** conciso.

O fluxo central é **Spend Visibility → Budget → Forecast → Model Comparison → Usage Economics →
Executive Digest → Reports**. O princípio é simples: **o Denarius calcula e compara; a IA
condensa; o usuário decide**.

**Público:** o CEO/CTO de uma empresa de tecnologia de 20–200 pessoas — um executivo, não um
engenheiro, que dedica ~10 segundos por visita.

> **Read-only por design.** Denarius observa e apoia decisões — **nunca bloqueia nem limita** o uso,
> não administra a empresa e não infere contexto de negócio que não possui.

## Princípios que o código respeita

| | |
|---|---|
| **Controle, não vigilância** | Dado por pessoa só em contexto, nunca ranking. Nomes são Admin-only e desligáveis. Prompts e respostas nunca são armazenados. |
| **Número honesto ou número nenhum** | Carimbo “até &lt;data&gt;”, “não precificado” para modelos desconhecidos, banner de sync atrasado, FX congelada divulgada em tela. Mostrar a lacuna, nunca chutar. |
| **Semáforo é só orçamento** | Verde/âmbar/vermelho pertencem ao status de orçamento. Variações (“+18% vs. maio”) são neutras — gastar mais não é ruim por si só. |
| **Calmo por padrão** | Linguagem de alarme só em avisos reais. |

## Stack

- **Next.js 16** (App Router, RSC) · **React 19** · **TypeScript** estrito
- **Tailwind CSS 4** · **shadcn/ui** (Base UI) · **Recharts** (só a linha cumulativa)
- **Supabase** — Postgres + Auth + **RLS** (isolamento por tenant em toda tabela)
- **Vercel** + Vercel Cron (sync diário, digest semanal) · **Resend** (e-mail)
- **Claude Haiku 4.5** — narração apenas; **a IA nunca calcula**

## Começando

```bash
npm install
cp .env.example .env.local   # preencha Supabase + CREDENTIAL_ENCRYPTION_KEY
npm run dev                  # http://localhost:3000
```

O mínimo para subir a aplicação são as três variáveis do Supabase mais
`CREDENTIAL_ENCRYPTION_KEY`. As demais destravam recursos específicos
(narração, e-mail, cron) e estão documentadas com contexto em [`.env.example`](.env.example).

Sem uma Admin key real de provider, use o **provider fake** em desenvolvimento:
defina `ALLOW_FAKE_PROVIDER=1` e cadastre uma chave começando com `sk-fake`.
Ele responde a partir de fixtures canônicas — nunca chama API de verdade.

> Segredos e chaves de provider são **server-only**. Nada de `NEXT_PUBLIC_*` para eles,
> nada em log, nada em commit — `.env*` é gitignored.

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
app/
  (auth)/         login
  (app)/          início · times · explorar · ajustes  (Server Components)
  api/cron/       sync diário + digest semanal (protegidos por CRON_SECRET)
  convite/        aceite de convite (rota pública)
components/
  ui/             primitivos shadcn — não editados à mão
  domain/         componentes de domínio usados por 2+ telas
lib/
  engine/         funções puras: projeção, veredito, thresholds, cenários
  connectors/     seam UsageProvider (OpenAI, Anthropic, fake)
  findings/       apontamentos, desperdício de assentos, planos de controle
  notify/         canais de notificação · narrate/ · privacy/ · fx/
supabase/
  migrations/     schema como código (auto-deploy no merge para main)
tests/            engine, RLS, privacidade   ·   e2e/  Playwright
docs/             documentação do projeto — comece por docs/README.md
```

**Regra de arquitetura:** lógica de negócio mora em `lib/` como função pura; o componente só
exibe. Leitura via RSC, escrita via server action — sem REST interno, sem estado global.

## Invariantes (nunca quebrar)

1. **Isolamento por tenant** — toda tabela tem `tenant_id` + política RLS. Sem exceção.
2. **A IA nunca calcula** — todo número vem de código determinístico e é *injetado* na narração;
   ações de plano de controle saem de um catálogo curado. Testes rejeitam qualquer figura não injetada.
3. **Reconciliação** — `total da org = Σ times + Não atribuído`. Gasto nunca some em silêncio;
   modelo sem preço aparece como “não precificado”, nunca é descartado.
4. **USD é a verdade** — armazenado exatamente como o provider reporta; o display converte pela
   **FX congelada no início do período**, divulgada em tela.
5. **Guarda de projeção** — nenhuma projeção de run-rate antes do **dia 5** do período;
   até lá, “coletando ritmo…”.

## Documentação

Todo o contexto de produto e engenharia está em [`docs/`](docs/README.md), nesta ordem:

1. [`docs/prd.md`](docs/prd.md) — **fonte da verdade**: stories, escopo, decisões P1–P16
2. [`docs/architecture.md`](docs/architecture.md) — shape do sistema, tenancy, modelo de dados
3. [`docs/backend.md`](docs/backend.md) — contratos de módulo, fórmulas do engine, env vars
4. [`docs/frontend.md`](docs/frontend.md) — telas, tokens, padrões de UI

[`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) são a **constituição** do projeto para agentes
de IA: como pensar antes de escrever a primeira linha de código.

## Contribuindo

Branch por issue (`feat/<issue>-slug`) → PR para `main`. Antes de considerar pronto:
testes, lint e typecheck limpos; diff auto-revisado; **docs atualizados no mesmo PR** se
comportamento, arquitetura ou UX mudaram. Commits no imperativo, em inglês, explicando o *porquê*.

## Propriedade e licença

**Software proprietário e confidencial. Todos os direitos reservados.**

© 2026 João Crepaldi. Este repositório e todo o seu conteúdo — código-fonte, documentação,
esquema de banco de dados, design de interface, marca, logo e demais ativos — são **propriedade
privada** do titular. **Este não é um projeto de código aberto.** A ausência de um arquivo de
licença permissiva é deliberada: nenhum direito de uso é concedido, expressa ou tacitamente.

Sem autorização prévia e por escrito do titular, é **vedado**:

- copiar, distribuir, publicar, sublicenciar ou disponibilizar o código a terceiros, no todo ou em parte;
- reproduzir, modificar, adaptar ou criar obras derivadas;
- usar o software — comercialmente, internamente ou em produção — fora do escopo autorizado;
- fazer engenharia reversa, descompilar, desmontar ou extrair componentes do sistema;
- utilizar o nome “Denarius”, a logo ou a identidade visual;
- usar este código para treinar modelos de IA ou compor conjuntos de dados.

O acesso eventualmente concedido a colaboradores, revisores ou avaliadores é **limitado ao
trabalho neste projeto**, não transfere qualquer direito de propriedade intelectual e pode ser
revogado a qualquer tempo. Toda contribuição feita ao repositório é cedida ao titular.

Informações do repositório e do sistema — arquitetura, credenciais, chaves de provider e dados
de clientes — são **confidenciais**. Nunca publique trechos de código, capturas de tela com dados
reais ou variáveis de ambiente fora dos canais autorizados.

Para pedidos de licenciamento, avaliação ou parceria, procure o titular diretamente.

---

<sub>Privado — cópia interna. UI em pt-BR; código, comentários, docs e commits em inglês.</sub>
