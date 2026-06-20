# PRD — Denarius (v1)

> **Status:** pronto para construir (greenfield)
> **Posicionamento:** governança de gasto de IA para empresas de tech. Denarius conecta as fontes de IA da empresa (assentos + APIs), atribui o custo por time/pessoa e **acha desperdício** — visão executiva para CEO/CTO.
> **Tese de saída:** tração (1–3 clientes pagantes) → venda para um comprador estratégico.

---

## Problem Statement

Sou CEO/CTO de uma empresa de tech de 20–200 funcionários. O gasto com IA da minha empresa está espalhado por várias ferramentas e faturas — assentos de ChatGPT e Copilot, chaves de API da OpenAI/Anthropic usadas por devs, ferramentas que apareceram sem ninguém aprovar. Esse gasto está **crescendo rápido** (o preço por token cai, mas o volume sobe com agentes e mais uso — paradoxo de Jevons), e eu **não tenho uma visão única** de:

- Quanto a empresa gasta de IA, no total e ao longo do tempo;
- Quais **times** consomem mais;
- Onde há **desperdício** (ex.: assentos pagos que ninguém usa);
- Quanto vamos gastar no fim do mês.

Hoje, responder "quanto gastamos de IA, por time, e onde estamos desperdiçando?" exige juntar faturas e planilhas na mão, e mesmo assim fica incompleto e desatualizado. Meu financeiro não consegue prever a despesa de IA.

## Solution

**Denarius** é uma aplicação web B2B que centraliza todo o gasto de IA **dos funcionários** num só lugar.

Da perspectiva do usuário:

1. Crio a conta da minha empresa e convido pessoas (Admin/Viewer).
2. **Vejo valor no minuto zero** alimentando dados manualmente: cadastro as assinaturas/assentos que pagamos (ferramenta, nº de assentos, preço) e subo um **CSV de roster** (funcionário, e-mail, time). Não preciso entregar nenhuma chave para começar a ver o panorama.
3. Quando quiser aprofundar, **conecto a OpenAI** (chave read-only) e o Denarius passa a puxar o uso real diariamente.
4. No **dashboard** vejo: gasto total, tendência no tempo, e a quebra **por time** e **por ferramenta**. A visão padrão é por time (estratégica), e há um drill-down por pessoa para quem tem permissão.
5. O Denarius **acha desperdício automaticamente** — ex.: "12 assentos de Copilot com ~0 uso = US$ 2.400/mês jogados fora" — que é o gancho que paga o produto.
6. Recebo um **digest executivo** em linguagem natural resumindo o mês ("Total US$ X, +18%, puxado por Eng; 12 assentos ociosos; projeção US$ Y").

A métrica-mãe é **gasto em dinheiro** (governança), com token como detalhe de drill-down. O enquadramento é **estratégico** (dinheiro economizado, decisões), não fiscalizador.

## User Stories

**Conta, autenticação e tenancy**
1. Como CEO/CTO, quero criar a conta da minha empresa (tenant), para começar a usar o Denarius.
2. Como Admin, quero convidar colegas por e-mail e atribuir um papel (Admin ou Viewer), para controlar quem acessa o quê.
3. Como usuário, quero entrar com e-mail/senha ou login Google, para acessar sem fricção.
4. Como Admin, quero ter certeza de que os dados da minha empresa estão isolados de outros clientes, para confiar a informação financeira ao produto.
5. Como usuário, quero que minha sessão seja segura e expire adequadamente, para reduzir risco de acesso indevido.

**Roster (identidade)**
6. Como Admin, quero subir um CSV de roster (funcionário, e-mail, time), para que o gasto possa ser atribuído a times e pessoas.
7. Como Admin, quero ver erros de validação do CSV (linhas inválidas, e-mails duplicados), para corrigir antes de importar.
8. Como Admin, quero reimportar/atualizar o roster, para refletir contratações e mudanças de time.
9. Como Admin, quero editar manualmente um funcionário ou seu time, para corrigir casos pontuais sem reimportar tudo.

**Semente manual (valor no dia zero)**
10. Como Admin, quero cadastrar manualmente uma assinatura/assento (ferramenta, nº de assentos, preço, time dono), para ver o gasto antes de conectar qualquer API.
11. Como Admin, quero editar ou remover uma assinatura cadastrada, para manter os dados corretos.
12. Como Admin, quero atribuir uma assinatura a um time (ou marcá-la como compartilhada/empresa), para a quebra por time fazer sentido.

**Conector OpenAI (ingestão real)**
13. Como Admin, quero conectar a OpenAI informando uma Admin Key read-only, para o Denarius puxar o uso real.
14. Como Admin, quero que minha chave seja guardada de forma criptografada e usada só para leitura, para confiar no produto.
15. Como Admin, quero poder testar a conexão na hora de cadastrar a chave, para saber que funcionou.
16. Como Admin, quero rotacionar ou revogar a chave conectada, para manter controle de segurança.
17. Como sistema, quero sincronizar o uso da OpenAI diariamente, para manter o dashboard atualizado sem ação do usuário.
18. Como Admin, quero ver quando foi a última sincronização e se houve erro, para confiar nos números.
19. Como Admin, quero uma orientação de onboarding recomendando "um projeto OpenAI por time", para obter custo de time exato em dólar.

**Visibilidade (dashboard)**
20. Como CEO/CTO, quero ver o gasto total de IA da empresa, para ter o número que hoje não existe.
21. Como CEO/CTO, quero ver a tendência do gasto ao longo do tempo, para perceber crescimento acelerado.
22. Como CEO/CTO, quero ver a quebra do gasto por time, para saber quem consome mais.
23. Como CEO/CTO, quero ver a quebra por ferramenta/fornecedor, para saber onde o dinheiro vai.
24. Como CEO/CTO, quero filtrar por período (mês atual, últimos 30/90 dias), para analisar janelas relevantes.
25. Como Viewer, quero ver os dashboards no nível de time, para acompanhar sem acessar dados individuais.

**Atribuição e drill-down**
26. Como Admin, quero ver o custo por pessoa dentro de um time (drill-down), para investigar um pico específico.
27. Como Admin, quero que o gasto de chaves compartilhadas/de serviço seja atribuído a um time/projeto (não a uma pessoa), para a atribuição ser honesta.
28. Como Admin, quero ver tokens (input/output) como detalhe quando abro um item, para entender a origem do custo.

**Desperdício (feature-herói)**
29. Como CEO/CTO, quero que o Denarius identifique automaticamente assentos ociosos (pagos com ~0 uso por N dias), para cortar custo imediatamente.
30. Como CEO/CTO, quero ver o valor monetário do desperdício encontrado ("US$ X/mês recuperáveis"), para justificar a ação.
31. Como Admin, quero marcar um achado de desperdício como "resolvido" ou "ignorado", para acompanhar o que já foi tratado.
32. Como Admin, quero ver a lista de achados ordenada por economia potencial, para priorizar o que dá mais retorno.

**Digest executivo**
33. Como CEO/CTO, quero um resumo em linguagem natural do mês (total, variação, principais ofensores, projeção, desperdício), para entender a situação em 30 segundos.
34. Como CEO/CTO, quero confiar que os números do resumo são exatos, para usá-los em decisão.
35. Como Admin, quero (futuramente) receber esse digest por e-mail periodicamente, para não precisar entrar no app.

**Papéis e privacidade**
36. Como Admin, quero um toggle "quem pode ver nomes individuais" (só Admin por padrão), para evitar tom fiscalizador.
37. Como Admin, quero um toggle "armazenar dados por pessoa" (ligado por padrão, desligável), para atender a empresa cliente mais preocupada com privacidade.
38. Como Viewer, quando o toggle de nomes está desligado, quero ver dados agregados por time sem nomes, para respeitar a política da empresa.
39. Como Admin, quero saber que o Denarius nunca armazena prompts/respostas, só metadados de uso, para confiar o produto à minha empresa.

**Configurações e conta**
40. Como Admin, quero gerenciar as configurações da empresa (nome, moeda de exibição), para adequar à minha realidade.
41. Como Admin, quero remover um usuário, para revogar acesso de quem saiu.

## Implementation Decisions

**Escopo & produto**
- Foco: consumo de IA **dos funcionários** (assentos + chaves de API), **não** o uso programático embutido nos produtos da empresa (caso B fica fora).
- Métrica-mãe: **gasto em dinheiro**; token é drill-down.
- Pilares do v1: **Visibilidade + Atribuição + Desperdício (herói) + Digest**.

**Ingestão**
- Mecanismo: **conectores read-only + semente manual**. **Sem proxy/gateway** (não cabe no caso de funcionários e adiciona fricção).
- Conector do v1: **OpenAI** (Admin API). Demais conectores (Copilot, Google, Anthropic) e SSO ficam fora do v1.
- Sincronização: **Vercel Cron diário** disparando função serverless que puxa e grava agregados.

**Achados da Fatia 0 (validação da API OpenAI) — viram decisões:**
- A **Usage API** (`/v1/organization/usage/completions`) entrega tokens com `group_by` por **user_id, api_key_id, project_id, model** e bucket diário. Exige **Admin Key**.
- A **Costs API** (`/v1/organization/costs`) entrega **dólares**, mas só agrupa por **`project_id` e `line_item`** (não por usuário/chave).
- Consequência 1: para **custo de time em dólar exato**, recomendar no onboarding **um projeto OpenAI por time** → Costs API entrega direto.
- Consequência 2: para **custo por pessoa/chave**, o conector **calcula** custo a partir dos tokens (Usage API) × uma **tabela de preços por modelo** mantida pelo Denarius.
- Consequência 3: atribuição a **pessoa** depende de chave-por-pessoa (`api_key_id`→pessoa) ou do campo `user`; chave compartilhada cai em **time/projeto**.
- Pendência: confirmação por **chamada real** contra uma org OpenAI com Admin Key (fazer com a própria org no início do build).

**Atribuição**
- Hierarquia: **Organização → Time/Centro de custo → Pessoa → Ferramenta/Fornecedor**.
- Visão executiva padrão: **por time**. Pessoa = **drill-down permissionado**.
- Identidade no v1: **CSV de roster** (SSO fica fora do v1).

**Camada de insight (híbrida)**
- O backend **detecta e rotula** achados com **regra determinística** (ex.: `uso = 0 por 30d ⇒ ocioso`; severidade por limiar).
- Uma **LLM barata** (Claude Haiku 4.5, `claude-haiku-4-5`, **trocável por config / provider-agnostic**) apenas **narra** o achado.
- **Guardrail:** a LLM **nunca calcula nem decide**; todos os **números** vêm da camada determinística e são **injetados** no texto (nunca gerados pela LLM), para não haver cifra alucinada.

**Dados & segurança**
- Armazena **apenas metadados** de uso (contagem, custo, modelo, identificador de usuário/chave, data). **Nunca** prompts ou respostas (consequência estrutural de não usar proxy).
- Credenciais de fornecedor: **read-only**, guardadas **criptografadas** (KMS/secrets), nunca em texto puro nem em log; rotacionáveis/revogáveis.
- Banco: **Postgres** (dado é agregado diário, pequeno — **não** precisa de banco time-series).
- Grão de armazenamento (modelo conceitual de dados):

  | Entidade | Campos principais |
  |---|---|
  | `tenant` | id, nome, moeda_exibição, config (toggles) |
  | `user` (do app) | id, tenant_id, e-mail, papel (Admin/Viewer) |
  | `employee` (roster) | id, tenant_id, e-mail, nome, time |
  | `team` | id, tenant_id, nome |
  | `provider_connection` | id, tenant_id, fornecedor, credencial_cifrada, status, última_sync |
  | `subscription` (assento manual) | id, tenant_id, ferramenta, nº_assentos, preço, time_id/compartilhado |
  | `usage_daily` (agregado) | tenant_id, data, fornecedor, api_key_id/projeto, user_id, modelo, input_tokens, output_tokens, custo_derivado |
  | `cost_daily` (agregado $) | tenant_id, data, fornecedor, project_id, line_item, valor, moeda |
  | `model_price` | fornecedor, modelo, preço_input, preço_output, vigência |
  | `waste_finding` | id, tenant_id, tipo, alvo (time/assento/chave), economia_estimada, status |
- **Toggle por tenant:** armazenar-por-pessoa **ligado por padrão**, desligável (aí só guarda agregado por time — data-minimization para LGPD/clientes sensíveis).

**Multi-tenancy & auth**
- Isolamento: **banco compartilhado com `tenant_id` em toda tabela + Row-Level Security (RLS) do Postgres** como segunda camada (um bug de query não vaza entre clientes — resposta de due diligence).
- Auth: **provider gerenciado, sem auth caseiro.** Espinha dorsal **Supabase** (Postgres + Auth + RLS), app na **Vercel**. Login e-mail/senha + Google.
- RBAC: **Admin / Viewer** + toggle "quem vê nomes individuais" (só Admin por padrão).

**Stack**
- **TypeScript em tudo** (sem Python). **Next.js (App Router)** + **Tailwind** + **shadcn/ui** + **Recharts**.
- Backend = **API routes / server actions** do próprio Next (monolito, um deploy).
- Hospedagem **Vercel**; dados/auth **Supabase**; cron **Vercel Cron**.

**Negócio (contexto que molda o produto)**
- Preço ao cliente: **mensalidade flat por faixa**. **Sem billing self-service no MVP** — cobrança via link Stripe/fatura manual nos primeiros clientes.
- ICP: empresas de tech **20–200**; comprador **CEO/CTO**.

## Testing Decisions

**O que é um bom teste aqui:** testa **comportamento externo** (entrada → saída observável), não detalhe de implementação. Como é greenfield, **não há prior art** — estes seams estabelecem o padrão. Preferir o **seam mais alto** que ainda isola a parte arriscada.

Seams propostos (do mais alto/valioso para o mais específico):

1. **Seam do provedor (conector) — o mais importante para a ingestão.** Abstrair o cliente OpenAI atrás de uma interface `UsageProvider` que devolve payloads de uso/custo. Testes injetam um **provedor fake** com payloads canônicos (sem chamada real à OpenAI). Permite testar toda a ingestão de forma determinística.
2. **Pipeline ingestão → normalização → atribuição.** Dado um payload bruto do provedor + um roster, asseverar os agregados normalizados e a atribuição por time/pessoa (incluindo: chave compartilhada → time, não pessoa; custo por pessoa derivado de tokens × `model_price`).
3. **Detecção de desperdício (regras determinísticas) — funções puras.** Dado um conjunto de uso + inventário de assentos, asseverar os achados de "assento ocioso" e a economia estimada. Alto valor (é o herói) e fácil de testar.
4. **Pipeline do digest.** Asseverar que a montagem do prompt **injeta os números** vindos da camada determinística (e que a saída não contém número gerado pela LLM). A chamada à LLM em si é **mockada**.
5. **Isolamento de tenant (RLS) — o teste mais crítico para o due diligence.** Teste de integração contra um Postgres de teste: um usuário do tenant A **não consegue** ler nenhum dado do tenant B, em todas as tabelas.
6. **RBAC/privacidade.** Asseverar que um Viewer (e/ou com o toggle de nomes desligado) **não** vê nomes individuais, só agregado por time.
7. **Seam HTTP (API routes/server actions).** Testes de integração das rotas com banco de teste (rollback transacional), cobrindo os caminhos felizes e de erro de cada user story de Admin.

Módulos a testar no v1: conector OpenAI (via seam 1), pipeline de atribuição, detector de desperdício, montagem do digest, isolamento RLS, RBAC.

## Out of Scope

- **Caso B** (uso programático de IA embutido nos produtos da empresa) — Denarius mira o consumo dos funcionários.
- **Proxy/gateway** de IA.
- Conectores além da OpenAI no v1 (**Copilot, Microsoft, Google, Anthropic**) e **SSO** (fica o CSV de roster).
- **Orçamento + alertas**, **detecção de anomalia**, **forecast**, **shadow AI** (vários nem funcionam antes de acumular histórico).
- **Billing/assinatura self-service** (cobrança é manual nos primeiros clientes).
- App **mobile** nativo.
- Internacionalização ampla (além de exibir moeda).

## Further Notes

- **Nome:** Denarius (decisão do fundador). Mitigar a leitura "cripto" andando sempre com descritor ("Denarius — governança de gasto de IA") e domínio que afaste cripto (ex.: `denarius.ai`, `getdenarius.com`).
- **Tese de saída:** tração (1–3 clientes pagantes reais) → venda para comprador estratégico (SaaS spend management como Zylo/Productiv/Vendr/Torii, FinOps, ou observabilidade/LLMOps). Lente de toda decisão: *"aumenta o valor de venda / sobrevive ao due diligence?"* — não *"escala para 10 mil clientes?"*.
- **Infra:** free tier no MVP (Supabase + Vercel), mas com banco/segredos tratados com rigor desde o início (criptografia, RLS, isolamento) porque é exatamente o que o comprador audita. Migrar de free tier provavelmente no primeiro cliente pagante.
- **Ordem de construção (slices/tracer bullets):**
  1. Fatia 0 — spike OpenAI (validado por doc; falta confirmação por chamada real).
  2. Esqueleto andante (Next + Supabase auth/RLS + tenant + Admin + casca do dashboard).
  3. Semente manual + roster (dado sem conector).
  4. Dashboard central (Visibilidade + Atribuição).
  5. Conector OpenAI (ingestão real, Cron, atribuição via roster).
  6. Herói: detecção de desperdício/assento ocioso.
  7. Digest executivo (pipeline híbrido).
- **Jogada de vendas embutida na ordem:** as fatias 2–4 permitem demonstrar valor com **dado manual** antes de o cliente confiar a Admin Key — reduzindo o atrito do "me dá sua chave".
- **Publicação:** esta PRD não foi publicada em issue tracker porque o projeto ainda não é um repositório git nem tem tracker configurado. Quando houver GitHub/Linear, dá para publicar e fatiar em issues (ex.: via skill `to-issues`), aplicando o label `ready-for-agent`.
