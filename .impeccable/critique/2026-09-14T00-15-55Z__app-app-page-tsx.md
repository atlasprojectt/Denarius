---
score: 26
applicable_max: 40
p0: 0
p1: 2
p2: 5
p3: 1
target_identity: "file:C:\\Users\\joaop\\OneDrive\\Desktop\\Denarius\\app-app-page-tsx"
timestamp: 2026-09-14T00-15-55Z
slug: app-app-page-tsx
---
# Revisão Impeccable — Plano de melhoria da Home

## Síntese
A Home tem uma base coerente e específica para governança de gasto: status derivado do engine, números determinísticos, reconciliação de FX/atribuição e digest contextual. A principal oportunidade é reforçar a hierarquia de resposta em 10 segundos e remover ambiguidades semânticas em interações de tabela.

## Prioridades
- **P1 — Hierarquia responsiva:** abaixo de xl, o digest com order-first aparece antes do Hero e atrasa o gasto principal. Reordenar para saudação/status → Hero → Digest → composição; em 1024px considerar uma composição de duas colunas para reduzir rolagem.
- **P1 — Semântica da tabela:** TeamStatus usa botão/tooltip dentro de Link e dentro de tr role=link. Migrar para um único alvo nativo por linha/célula, mantendo a explicação acessível fora do link.
- **P2 — Títulos e landmarks:** CardTitle renderiza div. Permitir h2/h3 ou aria-labelledby para que os cinco cards sejam navegáveis por leitores de tela.
- **P2 — Explicações persistentes:** legendas do pacing, motivos de status e semântica de projeção dependem de hover/tooltip. Tornar a explicação visível em touch/teclado e manter sr-only como redundância.
- **P2 — Densidade mobile:** separar orçamento do valor principal em telas estreitas, reduzir métricas do gráfico a duas essenciais e preservar o Hero como primeira leitura.
- **P2 — Estados de dados:** quando lastSyncAt é nulo, exibir estado explícito de “ainda não sincronizado”; oferecer ação contextual para stale, FX ausente e estouro sem depender apenas da sidebar.
- **P2 — Contraste e tokens:** validar muted text, links e superfícies nos temas claro/escuro; fortalecer somente papéis que falharem AA.
- **P3 — Polimento:** substituir abreviações (“ref.”, “ritmo esperado”), reduzir uniformidade dos bordes e tornar “Atribuir” mais descobrível.

## Sequenciamento
1. Corrigir semântica da tabela e landmarks.
2. Reorganizar a hierarquia responsiva e alinhar o loading ao Home full-width.
3. Tornar legendas/razões acessíveis sem hover.
4. Ajustar densidade, copy e contraste por tokens.
5. Fazer revisão visual final em 1440×900, 1024×768 e 390×844, nos dois temas.

## Critérios
- Primeiro viewport responde “estou no controle?” sem rolagem desnecessária.
- Um único alvo de foco por linha de time; teclado e leitor de tela anunciam contexto.
- Digest e Hero mantêm prioridade visual; gráfico/tabela continuam íntegros.
- Nenhuma informação importante depende de hover.
- TypeScript, ESLint, Vitest, diff check e detector Impeccable aprovados.

## Auditoria
Nielsen: 26/40 (Aceitável). Auditoria técnica: 14/20 (Bom). Detector CLI: 0 achados. Browser: autenticação redirecionou localhost para /login; não houve evidência visual autenticada.
