# Denarius — documento integral de produto para análise

> **Finalidade:** reunir o produto inteiro em uma visão não técnica, orientada à análise de problema, proposta de valor, experiência, fluxos, regras, limites e evidências necessárias para decidir se o Denarius resolve o problema a que se propõe.
>
> **Escopo desta fotografia:** tudo o que a pessoa encontra, configura, consulta e consegue fazer no produto em 27 de agosto de 2026, incluindo seus limites e as condições necessárias para entregar valor.

---

## 1. Resumo executivo

O Denarius é uma plataforma de observabilidade e inteligência financeira para gastos com inteligência artificial, voltada a CEOs e CTOs de empresas de tecnologia com aproximadamente 20 a 200 pessoas. Seu trabalho central é transformar dados em comparação, entendimento e decisão — respondendo, em cerca de dez segundos:

> **“O gasto da empresa com IA está sob controle?”**

O produto reúne custos variáveis de OpenAI e Anthropic com custos fixos de assinaturas por assento, organiza esse gasto por empresa, time, provedor e modelo, compara o total com orçamentos mensais, projeta o fechamento, mede eficiência e transforma os resultados em uma conclusão objetiva. O Forecast, as comparações de modelos e a camada de Usage Economics mostram para onde o consumo está caminhando e quais alternativas financeiras existem. A IA atua como síntese do que foi calculado; não inventa contexto nem decide pela liderança.

O Denarius não é um sistema de bloqueio, procurement ou contabilidade. Ele não impede uso, não aplica limites nos provedores e não substitui a fatura oficial. Sua proposta é dar visibilidade, guardrails, aviso antecipado e contexto para decisão.

### A promessa do produto em uma frase

Transformar gastos dispersos e tardios com IA em informação financeira comparável e projetada, com uma resposta diária, antecipada e defensável sobre o risco do mês.

### O princípio operacional

**O Denarius calcula e compara. A IA condensa. O usuário decide.** O produto não administra a empresa,
não afirma equivalência técnica entre modelos e não usa métricas de negócio que suas integrações não
observam de forma confiável.

### O ciclo de valor esperado

O fluxo de inteligência do produto é: **Spend Visibility → Budget → Forecast → Model Comparison → Usage Economics → Executive Digest → Reports**.

1. A empresa informa quem são seus times e quais assinaturas por assento paga.
2. Conecta suas fontes de consumo de OpenAI e Anthropic em modo somente leitura.
3. Mapeia projetos e workspaces para os times responsáveis.
4. Define um orçamento mensal para a empresa e, opcionalmente, para cada time.
5. Recebe um veredito diário sobre controle, risco ou estouro.
6. Investiga o time, provedor, modelo ou contribuição que explica o gasto.
7. Simula uma mudança de ritmo e escolhe uma ação fora do Denarius.
8. Recebe alertas raros e um resumo semanal.
9. Fecha o mês com um relatório imutável, imprimível e compartilhável.

---

## 2. Problema que o Denarius resolve

O problema de origem não é simplesmente “não saber a fatura”. É não conseguir governar um custo variável que cresce rápido, passa por várias ferramentas e só se torna óbvio tarde demais.

### Dores principais

- A liderança não sabe quanto a empresa está gastando agora, em dinheiro, somando fontes diferentes.
- O gasto fica espalhado entre projetos, workspaces, chaves e assinaturas.
- Tokens são difíceis de traduzir em impacto financeiro executivo.
- Não existe uma referência clara de limite para a empresa e para cada time.
- A liderança descobre um estouro na fatura, quando já não há tempo para corrigir o mês.
- Não é fácil saber quanto de margem ainda existe ou onde o mês deve terminar.
- Quando aparece um risco, falta uma sequência clara de investigação e decisão.
- Financeiro e liderança passam a tratar IA como custo imprevisível e sem responsável.
- Qualquer tentativa de detalhar pessoas pode rapidamente parecer vigilância.

### As três perguntas que organizam o produto

1. **Visibilidade:** quanto está sendo gasto e onde esse dinheiro está concentrado?
2. **Governança:** o gasto está dentro ou fora do orçamento, hoje e no fechamento projetado?
3. **Decisão:** qual time ou fonte merece atenção, quais opções existem e qual seria o efeito de uma mudança?

---

## 3. Público, contexto e papéis

### Cliente ideal

- Empresa de tecnologia com 20 a 200 pessoas.
- Uso relevante de ferramentas de IA por funcionários.
- Consumo distribuído principalmente entre OpenAI, Anthropic e assinaturas por assento.
- Liderança que já percebe crescimento de custo, mas ainda não tem uma rotina formal de governança.
- Necessidade de uma resposta executiva rápida, não de uma plataforma analítica ampla.

### Usuário principal

CEO ou CTO. Entra poucas vezes, dedica pouco tempo e precisa primeiro da conclusão. Espera poder aprofundar apenas quando algo exige decisão.

### Usuários secundários

- Lideranças de times que acompanham orçamento e consumo agregado.
- Financeiro, que precisa de números mensais explicáveis e relatórios.
- Administradores que configuram acessos, fontes, times, assinaturas, atribuição e orçamento.
- Auditores, compradores estratégicos ou jurídico, que precisam de evidências de controle e transparência.

### Papéis no produto

| Capacidade | Administrador | Visualizador |
|---|---:|---:|
| Ver cockpit, times, exploração e relatórios agregados | Sim | Sim |
| Ver nomes de pessoas em um contexto de investigação | Sim, se a política da empresa permitir | Não |
| Conectar, trocar ou revogar fontes de gasto | Sim | Não |
| Definir e editar orçamentos | Sim | Não |
| Importar e editar o quadro de pessoas | Sim | Somente leitura quando a área permitir |
| Registrar assinaturas e assentos | Sim | Não; a área informa a restrição |
| Mapear projetos e workspaces para times | Sim | Não |
| Convidar e remover usuários | Sim | Não |
| Alterar nome, moeda e políticas de privacidade | Sim | Não |
| Exportar ou excluir todos os dados da empresa | Sim | Não |
| Ver trilha de auditoria com autoria | Sim | Não |
| Alterar perfil, senha e tema pessoais | Sim | Sim |
| Receber resumo semanal | Sim, por padrão, com opção de sair | Não no fluxo atual |

### Princípio de privacidade

O produto governa gasto, não desempenho individual. Dados por pessoa só aparecem dentro do diagnóstico de um time, como contribuição para explicar um custo. Não há ranking geral de pessoas. Visualizadores nunca veem nomes; administradores também deixam de vê-los quando a política da empresa desativa essa exposição.

---

## 4. Modelo mental do produto

### Período

O Denarius trabalha primariamente com o mês corrente. Orçamentos são mensais, a projeção termina no fechamento do mês e os alertas reiniciam no período seguinte. Meses encerrados viram relatórios congelados.

### Gasto governado

O valor acompanhado pelo orçamento combina:

- consumo de OpenAI;
- consumo de Anthropic;
- assinaturas e assentos cadastrados manualmente, acumulados ao longo dos dias do mês.

### Escopos de controle

- **Empresa:** orçamento e veredito geral.
- **Time:** orçamento, gasto, projeção, margem e diagnóstico próprios.
- **Não atribuído:** gasto real que ainda não pôde ser ligado a um time. Ele permanece no total da empresa e nunca desaparece silenciosamente.

### Estados de orçamento

- **No controle:** gasto e projeção permanecem dentro do limite.
- **Atenção:** um limite de aviso foi atingido ou o ritmo indica risco de ultrapassar o orçamento.
- **Estourado:** o gasto realizado já passou do orçamento.
- **Coletando ritmo:** ainda é cedo demais no mês para apresentar uma projeção responsável.
- **Sem orçamento:** há gasto, mas o produto ainda não consegue emitir um veredito de controle para aquele escopo.

As cores verde, âmbar e vermelha são reservadas para esses estados de orçamento. Crescimento semanal, diferenças de custo, falta de atribuição ou atraso de dados usam linguagem e aparência neutras.

### Margem

- **Margem atual:** orçamento menos gasto já realizado.
- **Margem projetada:** orçamento menos o fechamento estimado.

Na Home, a margem projetada é a informação decisória; a margem atual fica disponível no aprofundamento do time.

### Projeção

A projeção é uma estimativa linear baseada no ritmo do mês corrente. Ela não aparece antes do quinto dia, para evitar conclusões frágeis com pouca evidência. O produto a apresenta como estimativa, nunca como garantia.

### Honestidade dos números

- Cada visão informa até quando os dados estão atualizados.
- Uma fonte atrasada ou com erro gera aviso de que o total pode estar subestimado.
- Um modelo sem preço conhecido aparece como não precificado, em vez de virar custo zero.
- Diferenças entre valor informado pelo provedor e valor detalhado pelo produto aparecem explicitamente.
- Conversão de moeda usa uma taxa congelada no início do período e a origem em dólar continua disponível como referência.
- Se não for possível converter com segurança, o valor original em dólar permanece separado.

---

## 5. Mapa completo da experiência

O produto autenticado possui cinco destinos principais:

| Destino | Trabalho do usuário |
|---|---|
| **Início** | Obter a resposta executiva do dia e identificar o que merece atenção. |
| **Times** | Comparar times e aprofundar diagnóstico, causa, margem, plano e cenário. |
| **Explorar** | Entender composição por modelo e por assentos, com reconciliação financeira. |
| **Relatórios** | Consultar o mês em andamento e preservar meses fechados para terceiros. |
| **Ajustes** | Configurar empresa, fontes, estrutura, orçamento, privacidade e acessos. |

O menu da conta também dá acesso às preferências pessoais e à saída da sessão.

### Áreas de Ajustes

- Empresa e moeda.
- Conexões.
- Atribuição.
- Quadro de pessoas.
- Assinaturas e assentos.
- Orçamentos.
- Privacidade.
- Usuários e convites.
- Auditoria administrativa.

### Superfícies públicas

- Entrar e criar conta.
- Recuperar senha e escolher nova senha.
- Aceitar convite.
- Política de privacidade.
- Termos de uso.
- Páginas de erro e endereço inexistente.

---

## 6. Jornada completa, do primeiro acesso ao fechamento do mês

### Fluxo 1 — Conhecer as condições antes de entrar

1. Uma pessoa pode abrir a Política de privacidade e os Termos sem estar autenticada.
2. A política explica quais dados entram no produto, quais nunca entram, como os nomes são tratados, quais fornecedores participam do serviço e como exercer direitos de exportação e exclusão.
3. Os termos deixam claro que o Denarius observa e recomenda, mas não bloqueia uso nem substitui contabilidade ou fatura.

**Resultado esperado:** reduzir a barreira de confiança antes de pedir uma credencial de provedor ou importar o quadro de pessoas.

### Fluxo 2 — Criar a primeira conta da empresa

1. Na tela de entrada, a pessoa escolhe **Criar conta**.
2. Informa nome da empresa, e-mail e uma senha com pelo menos dez caracteres, sem regras artificiais de símbolo, número ou maiúscula.
3. Também pode continuar com Google.
4. Quando o cadastro por e-mail exige confirmação, recebe um código de seis dígitos e pode solicitar novo envio depois do intervalo indicado.
5. A confirmação por link continua possível.
6. Depois de confirmar, a pessoa cria ou confirma o espaço isolado da empresa.
7. O primeiro usuário assume o papel de administrador.
8. A pessoa chega à Home, mesmo sem terminar toda a configuração.

**Resultado esperado:** criar o espaço com baixo atrito e levar o usuário rapidamente ao lugar em que a proposta de valor será construída.

### Fluxo 3 — Entrar, sair e recuperar acesso

1. Um usuário existente entra com e-mail e senha ou com Google.
2. Se esquecer a senha, informa seu e-mail para receber um link de recuperação.
3. A resposta não revela se aquele e-mail possui conta.
4. Pelo link recebido, escolhe uma nova senha.
5. Em Preferências, quem usa senha pode trocá-la informando a senha atual; as demais sessões são encerradas.
6. Quem entra apenas com Google vê a explicação de que senha e verificação pertencem à conta Google.
7. O menu da conta permite encerrar a sessão.

**Estados do fluxo:** credencial inválida, sessão expirada, link de recuperação inválido ou vencido, erro temporário e retorno seguro ao login.

### Fluxo 4 — Entrar por convite

1. Um administrador informa o e-mail e escolhe o papel **Administrador** ou **Visualizador**.
2. O convite é válido por sete dias e dá acesso somente ao espaço daquela empresa.
3. Se o envio por e-mail estiver disponível, a pessoa recebe o convite. Caso não esteja, o administrador recebe um link copiável para enviar por outro canal.
4. O link só é mostrado naquele momento; o administrador deve guardá-lo.
5. A pessoa convidada abre o link, vê a empresa e o e-mail fixo do convite e escolhe uma senha.
6. Ao aceitar, entra no espaço com o papel definido.
7. Convites pendentes mostram papel e expiração.
8. Um administrador pode revogar um convite; o link deixa de funcionar imediatamente.
9. Links vencidos, já usados ou revogados apresentam o mesmo estado de convite inválido e orientam pedir um novo.
10. Um e-mail pertence a um único espaço de empresa. Se já existir uma conta para o endereço convidado, a pessoa é orientada a entrar na conta existente, em vez de criar uma segunda associação.

**Resultado esperado:** delegar configuração e acompanhamento sem compartilhar uma conta única.

### Fluxo 5 — Construir valor antes de conectar uma fonte

O onboarding não é um assistente bloqueante. A Home mostra uma lista de três passos e o restante do produto continua disponível:

1. Conectar uma fonte.
2. Importar o quadro de pessoas.
3. Definir um orçamento.

Antes de conectar OpenAI ou Anthropic, o administrador pode:

1. Importar pessoas e times por CSV.
2. Cadastrar assinaturas por assento.
3. Associar cada assinatura a um time ou marcá-la como compartilhada pela empresa.
4. Definir orçamento da empresa e dos times.
5. Ver os custos de assentos acumularem diariamente no mês.

**Valor entregue sem credencial de provedor:** estrutura de times, custo fixo conhecido e começo da disciplina de orçamento. O retrato ainda é parcial até as fontes variáveis serem conectadas.

### Fluxo 6 — Importar e manter o quadro de pessoas

1. O administrador baixa um modelo ou prepara um CSV com nome, e-mail e time.
2. O produto aceita cabeçalhos em português ou inglês e arquivos separados por vírgula ou ponto e vírgula.
3. O arquivo é validado antes de qualquer importação.
4. Erros de linha, campos inválidos e e-mails duplicados são exibidos para correção.
5. Se existir qualquer erro, nada é importado.
6. Quando o arquivo é válido, o produto mostra uma prévia com número de pessoas e novos times.
7. O administrador confirma a importação completa.
8. Reimportações atualizam pessoas reconhecidas pelo e-mail; pessoas ausentes do novo arquivo não são apagadas silenciosamente.
9. Na lista, o administrador pode editar nome, e-mail ou time de uma pessoa.
10. Pode também remover uma pessoa, com confirmação.
11. Listas maiores oferecem busca e paginação.

**Efeito no produto:** o roster dá nomes e tamanho aos times, ajuda na atribuição e permite comparar assentos pagos com pessoas ativas. Remover alguém não apaga o histórico financeiro do time.

### Fluxo 7 — Registrar assinaturas e assentos

1. O administrador informa ferramenta, quantidade de assentos, preço por assento e moeda já escolhida pela empresa.
2. A assinatura é atribuída a um time ou marcada como compartilhada.
3. O produto mostra custo mensal contratado e custo acumulado até o dia atual.
4. O custo entra gradualmente no total do mês, evitando um pico artificial no primeiro dia.
5. O administrador pode editar ferramenta, quantidade, preço e atribuição.
6. Pode remover a assinatura com confirmação.
7. Ao remover, o custo deixa de entrar nos totais e orçamentos do período; nada é cancelado no fornecedor da assinatura.

**Estado de permissão:** visualizadores não acessam a gestão e recebem uma explicação de que ela é restrita a administradores.

### Fluxo 8 — Conectar OpenAI e Anthropic

1. O administrador abre Conexões e escolhe OpenAI ou Anthropic.
2. A tela explica que a credencial deve ter acesso administrativo de leitura e que o Denarius não bloqueia nem altera uso.
3. O administrador informa a credencial.
4. A conexão é validada e uma primeira atualização é iniciada, para evitar esperar até o dia seguinte pelo primeiro valor.
5. Cada conexão mostra um dos estados: não conectada, ativa, erro de atualização ou revogada.
6. A área informa a última atualização bem-sucedida ou que nunca houve atualização.
7. O administrador pode solicitar **Sincronizar agora**.
8. Pode trocar a credencial mantendo a mesma fonte.
9. Pode revogar a conexão com confirmação.
10. Revogar interrompe atualizações futuras, mas preserva o histórico já importado.

**Orientação de configuração:** usar um projeto OpenAI por time e um workspace Anthropic por time melhora a precisão da atribuição.

### Fluxo 9 — Atribuir consumo aos times

1. Depois de conectar e atualizar as fontes, o produto lista projetos OpenAI e workspaces Anthropic encontrados.
2. Cada item mostra sua fonte, identificador, gasto do mês e time atual.
3. O administrador escolhe o time responsável por cada item.
4. Alterações ainda não salvas ficam evidentes antes de sair.
5. Itens sem mapeamento continuam em **Não atribuído**.
6. O gasto não atribuído participa do total da empresa e é destacado em Home, Times, Explorar e relatórios quando relevante.
7. A liderança pode partir do aviso de não atribuído diretamente para a área de mapeamento.

**Limite de atribuição:** a qualidade por time depende da disciplina de projetos e workspaces no provedor. Uso compartilhado permanece honestamente compartilhado ou não atribuído.

### Fluxo 10 — Definir orçamento e limites de aviso

1. O administrador define um orçamento mensal para a empresa.
2. Pode definir orçamentos independentes para cada time.
3. O produto mostra todos os escopos do período em uma mesma visão.
4. O administrador define o percentual de aviso; o limite de estouro permanece o próprio orçamento.
5. A soma dos orçamentos dos times pode ser diferente do orçamento da empresa. O produto mostra a diferença, mas não força igualdade.
6. O câmbio do período é apresentado junto aos valores aplicáveis.
7. Um orçamento pode ser alterado durante o mês.
8. O veredito e a projeção passam a usar o novo valor.
9. Um alerta já enviado para o mesmo nível não é reenviado apenas porque a edição fez o valor cruzar novamente aquele nível.
10. A progressão para um nível mais grave ainda pode gerar novo alerta.

**Consequência central:** sem orçamento, o produto consegue mostrar gasto, mas não consegue responder plenamente se ele está sob controle.

### Fluxo 11 — Receber a primeira resposta na Home

Quando existem dados e orçamento, a Home muda de configuração para cockpit:

1. A tela informa a atualidade das fontes.
2. Um veredito de uma linha aparece primeiro: no controle, atenção, estouro ou coleta de ritmo.
3. Se um time for o maior problema, o veredito pode nomeá-lo e oferecer acesso direto ao diagnóstico.
4. O card **Gasto do mês** mostra gasto realizado, orçamento, consumo do limite, avanço do período e fechamento projetado.
5. **Gasto por fonte** separa OpenAI, Anthropic e assentos e mostra participação de cada um.
6. Um gráfico de evolução do mês mostra acumulado realizado, continuação projetada, orçamento, hoje e eventual data estimada de cruzamento.
7. A tabela de times apresenta todos os times orçados, ordenando primeiro os de maior risco.
8. Um aviso separado mostra gasto não atribuído quando houver.
9. Se tudo estiver bem, o produto afirma explicitamente o estado saudável em vez de deixar a tela parecer vazia.
10. Enquanto algum passo inicial estiver incompleto, a lista de configuração permanece de forma compacta.

**Leitura em dez segundos:** veredito → gasto contra orçamento → projeção → time que exige atenção.

### Fluxo 12 — Entender a lista de times

1. A área Times compara o período corrente entre todos os times.
2. Times com orçamento são separados em **Precisa de atenção** e **No controle**.
3. Cada linha mostra gasto, orçamento, percentual consumido, projeção e margem projetada quando disponível.
4. Times sem orçamento continuam visíveis em um grupo próprio; o gasto não é escondido.
5. Gasto sem atribuição aparece em bloco neutro e separado dos estados de orçamento.
6. O administrador pode ir à gestão de orçamentos.
7. Selecionar um time abre seu diagnóstico dedicado.
8. Um time em risco pode abrir diretamente o simulador.

**Resultado esperado:** responder “quem precisa de atenção primeiro?” sem transformar a tela em uma lista de culpados.

### Fluxo 13 — Diagnosticar um time

O diagnóstico reúne o contexto necessário para passar do alerta à decisão:

1. Estado do orçamento do time ou indicação de que não há orçamento.
2. Resumo executivo com gasto, orçamento, projeção e margem projetada.
3. Evolução acumulada ao longo do mês.
4. Comparação com o ritmo esperado e o fechamento estimado.
5. Composição do gasto do time entre OpenAI, Anthropic e assentos.
6. Explicação de valores não convertidos ou não precificados.
7. Para administradores, contribuições individuais quando a fonte e a política permitirem.
8. Para visualizadores, somente agregados e uma explicação de privacidade.
9. Uso compartilhado ou de serviço permanece identificado como tal, sem atribuição falsa a uma pessoa.
10. Detalhes de cálculo explicam a origem do valor.
11. Um plano de controle recomenda ações compatíveis com o nível de risco.
12. O administrador pode editar o orçamento do time no próprio contexto.
13. Qualquer usuário autorizado pode abrir o simulador de cenário.

### Fluxo 14 — Usar o plano de controle

O plano é uma lista consultiva, priorizada e limitada a ações pré-definidas, como:

- revisar os modelos mais caros do período;
- migrar tarefas simples para modelos menores;
- conversar com o time de maior consumo;
- rever assentos ociosos frente ao quadro de pessoas;
- definir um limite no console do próprio provedor;
- reavaliar se o orçamento ainda representa o plano da empresa.

Algumas ações levam a uma área do Denarius para investigação. Ações de limitação acontecem fora do produto, no provedor. Não existe botão “resolver”, responsável, prazo ou acompanhamento de execução: o plano informa e a liderança decide.

### Fluxo 15 — Simular uma mudança de ritmo

1. O usuário abre **Simular cenário** a partir de um time ou alerta.
2. O time já vem selecionado.
3. Um único controle altera o ritmo restante do time entre redução total e aumento de 100%, em passos de 5%.
4. Atalhos permitem voltar ao ritmo atual, testar uma redução fixa ou calcular o ritmo aproximado para fechar no orçamento.
5. O painel recalcula separadamente o fechamento e a margem do time.
6. Também mostra o efeito no fechamento e na margem da empresa.
7. Se o time já gastou mais que o orçamento, reduzir o ritmo futuro não torna o estouro passado recuperável; a tela explica essa limitação.
8. Antes do quinto dia, o simulador não oferece uma projeção baseada em ritmo insuficiente.
9. Nenhuma simulação altera orçamento, fonte ou uso real.

**Resultado esperado:** transformar “precisamos gastar menos” em uma pergunta mensurável: “quanto o ritmo precisa mudar e qual seria o efeito?”.

### Fluxo 16 — Explorar modelos e assentos

#### Aba Modelos

1. O resumo compara o total informado pelos provedores, o total detalhado por modelo e o valor ainda não precificado.
2. Modelos são ordenados por gasto para facilitar comparação.
3. Cada item mostra dinheiro como informação principal e tokens como detalhe.
4. Valores originais e convertidos permanecem distinguíveis.
5. Modelos sem preço ficam em uma seção própria, nunca misturados como zero.
6. Uma diferença de reconciliação recebe aviso explícito.
7. Em listas maiores, o usuário pode pesquisar e ordenar.

#### Aba Assentos

1. Mostra o custo acumulado das assinaturas no mês.
2. Agrupa ou atribui o gasto aos times e mantém o compartilhado ou não atribuído visível.
3. Apresenta um total reconciliado.
4. Oferece acesso à correção de atribuição quando necessário.

**Resultado esperado:** explicar onde o dinheiro está, sem transformar a Home em uma ferramenta analítica pesada.

### Fluxo 17 — Receber alertas sem fadiga

1. O produto reavalia orçamento quando recebe dados novos.
2. Um alerta nasce quando o gasto atinge o limite de aviso, quando o ritmo projeta estouro ou quando o gasto realizado estoura o orçamento.
3. O sino no cabeçalho mostra alertas ativos do período.
4. O painel diferencia **Limite atingido**, **Risco projetado** e **Estourado**.
5. Cada item traz o fato, os valores de apoio e um link para o escopo relevante.
6. O mesmo time e o mesmo nível geram apenas um aviso por mês.
7. Um agravamento pode gerar um novo aviso.
8. No mês seguinte, o ciclo recomeça.
9. Alertas importantes também podem chegar por e-mail aos administradores.
10. Apontamentos não urgentes não entram nesse canal.

**Estados do centro de alertas:** carregando, falha com tentativa novamente, lista ativa e tudo sob controle.

### Fluxo 18 — Receber o resumo semanal

1. Administradores recebem, por padrão, um resumo às sextas-feiras.
2. O resumo cobre veredito, gasto, orçamento, percentual consumido, projeção ou coleta de ritmo, mudança semanal e principais direcionadores.
3. Os números do texto são os mesmos números já apresentados pelo produto.
4. A linguagem pode ser tornada mais natural, mas não cria valores, conclusões numéricas ou estratégias novas.
5. Cada administrador pode desativar ou reativar o próprio recebimento em Preferências.
6. Alertas de orçamento continuam independentes dessa escolha.

**Resultado esperado:** levar a governança até a liderança mesmo quando ela não abre o produto naquela semana.

### Fluxo 19 — Consultar e compartilhar relatórios

1. A central de Relatórios destaca o **Relatório atual**, disponível durante o mês.
2. O relatório atual é uma fotografia do momento e pode mudar à medida que novos dados chegam.
3. A mesma central lista meses encerrados do mais recente para o mais antigo.
4. Cada mês fechado preserva os valores e configurações com que realmente encerrou.
5. O relatório usa sempre a mesma ordem de seções:
   - resumo executivo;
   - visão geral de gasto, orçamento e status;
   - gasto por provedor;
   - gasto por time;
   - assinaturas e assentos;
   - gasto não atribuído;
   - ressalvas de qualidade, câmbio, preço e atualidade.
6. O documento pode ser expandido na tela, impresso ou baixado em PDF.
7. Administradores e visualizadores recebem a mesma versão agregada, sem nomes individuais.
8. Quando o relatório atual não pode ser montado, o produto informa a indisponibilidade sem esconder o histórico.

**Resultado esperado:** permitir que liderança, conselho ou contabilidade recebam um registro consistente sem reconstruir o mês manualmente.

### Fluxo 20 — Administrar empresa, moeda e acessos

#### Empresa e moeda

1. O administrador altera o nome da empresa.
2. Escolhe BRL, USD, EUR ou GBP como moeda de exibição enquanto ainda não existem orçamentos ou assinaturas denominados nela.
3. Depois disso, a moeda fica travada para preservar consistência histórica.
4. Para trocar, o produto orienta revisar e remover primeiro os registros ligados à moeda.

#### Usuários

1. Todos veem quem possui acesso e qual é o papel de cada pessoa.
2. Administradores convidam novas pessoas e revogam convites pendentes.
3. Administradores removem outros usuários com confirmação.
4. A remoção corta o acesso imediatamente e preserva dados históricos.
5. O usuário atual não pode remover a si mesmo por essa lista.

#### Auditoria

1. Administradores consultam um histórico de ações administrativas, ordenado do mais recente para o mais antigo.
2. O histórico identifica quem realizou ações como mudar orçamento, conexão, roster, assinatura, atribuição, convite, usuário, privacidade, empresa, exportação ou exclusão.
3. A retenção declarada é de 24 meses.
4. Visualizadores não acessam essa área porque ela identifica pessoas.

### Fluxo 21 — Gerenciar preferências pessoais

1. O usuário vê nome, e-mail e papel.
2. Pode editar o nome de exibição; o e-mail permanece a identidade da conta.
3. Pode trocar a senha quando usa credencial própria do Denarius.
4. Escolhe tema claro, escuro ou o tema do sistema.
5. A preferência visual vale somente naquele navegador e não afeta colegas.
6. Administradores podem ativar ou desativar o resumo semanal por e-mail.

### Fluxo 22 — Exercitar direitos de dados e encerrar a empresa

1. A área Privacidade explica as escolhas vigentes para nomes e dados por pessoa.
2. Um administrador pode desativar a exibição de nomes para todos.
3. Pode desativar o armazenamento de dados por pessoa; novos dados passam a ser mantidos apenas no nível agregado.
4. Pode exportar os dados completos da empresa em um único arquivo.
5. A exportação respeita as escolhas de privacidade e exclui credenciais e links secretos.
6. Para excluir o espaço, o administrador digita exatamente o nome da empresa e confirma a ação destrutiva.
7. A exclusão remove acessos, pessoas, times, uso, custos, orçamentos, alertas e demais dados mantidos pelo Denarius.
8. A ação é irreversível.
9. Excluir o Denarius não cancela ferramentas, não apaga dados nos provedores e não interrompe gastos de OpenAI ou Anthropic.

---

## 7. Inventário de funcionalidades por objetivo

### Visibilidade financeira

- Gasto total do mês em dinheiro.
- Separação entre custo variável de provedores e custo de assentos.
- Composição por OpenAI, Anthropic e assinaturas.
- Composição por time.
- Composição por modelo.
- Tokens como detalhe de origem, não como manchete.
- Evolução acumulada durante o mês.
- Variação semanal neutra.
- Gasto compartilhado e não atribuído explícitos.
- Valor original em dólar e valor convertido.
- Modelos não precificados separados.
- Reconciliação entre total informado e detalhamento calculado.

### Governança

- Orçamento mensal da empresa.
- Orçamento mensal por time.
- Limite de aviso configurável.
- Gasto realizado e percentual consumido.
- Comparação entre percentual do orçamento e percentual do tempo transcorrido.
- Projeção de fechamento a partir do quinto dia.
- Margem projetada da empresa e do time.
- Veredito determinístico.
- Ordenação dos times por risco.
- Alertas dentro do produto e por e-mail.
- Proteção contra repetição do mesmo alerta.
- Estado saudável afirmativo.

### Investigação e decisão

- Diagnóstico dedicado por time.
- Evolução, composição e contribuição no mesmo contexto.
- Acesso individual somente quando permitido.
- Plano consultivo de controle.
- Links para investigação relevante.
- Simulador de mudança no ritmo do time.
- Resultado separado para time e empresa.
- Relatório atual e meses fechados.

### Configuração e confiança

- Cadastro manual de assinaturas antes das conexões.
- Importação, validação e manutenção do quadro de pessoas.
- Conexões somente leitura, com troca e revogação.
- Atualização automática e atualização manual.
- Mapeamento de projetos e workspaces.
- Controle de papéis e convites.
- Políticas de nomes e armazenamento individual.
- Exportação e exclusão da empresa.
- Trilha de auditoria.
- Política de privacidade e termos públicos.
- Estados claros de vazio, atraso, erro, indisponibilidade e permissão.

---

## 8. Regras que mudam a interpretação do produto

### 8.1 O total nunca deve esconder uma lacuna

O total da empresa deve equivaler à soma dos times mais o valor não atribuído. Se algo ainda não foi mapeado, aparece em uma categoria própria. Isso é parte da confiança do produto, não um detalhe de organização.

### 8.2 Gasto não precificado não é gasto zero

Tokens de um modelo sem preço conhecido continuam registrados e recebem o rótulo **não precificado**. O produto não inventa preço e não omite o consumo.

### 8.3 Atualidade condiciona confiança

Se uma fonte não atualiza, o produto informa qual está atrasada e que os totais podem estar abaixo do real. A conclusão deve ser lida junto da data de atualização.

### 8.4 O orçamento da empresa é independente da soma dos times

A empresa pode manter reserva central, times sem orçamento ou limites deliberadamente não equivalentes. A diferença é mostrada, não “corrigida” automaticamente.

### 8.5 Projeção não existe cedo demais

Nos quatro primeiros dias, o produto coleta ritmo. Sem projeção, também não deve disparar um alerta de estouro projetado.

### 8.6 Um estouro realizado é mais grave que um risco futuro

O produto prioriza o fato consumado sobre uma estimativa, ainda que a projeção de outro time represente valor maior.

### 8.7 Alterar orçamento não apaga a memória dos alertas

Uma edição muda o estado atual, mas não faz o mesmo nível de alerta ser disparado novamente no mesmo mês. Isso evita usar a edição como um reset artificial.

### 8.8 Assentos acumulam ao longo do período

O custo mensal contratado é distribuído pelos dias do mês. Essa escolha torna a comparação de ritmo mais coerente e evita consumir todo o custo fixo no dia 1.

### 8.9 Câmbio é uma referência do período

O gasto dos provedores nasce em dólar. A moeda de exibição usa uma taxa mantida para o mês, evitando que o mesmo consumo pareça variar diariamente apenas por oscilação cambial.

### 8.10 O sistema aponta; a pessoa decide

Veredito, alertas, plano e cenário não executam nenhuma medida. O usuário decide conversar com o time, mudar modelo, revisar orçamento ou configurar um limite fora do Denarius.

---

## 9. Estados e exceções que a análise precisa cobrir

| Situação | Comportamento esperado do produto |
|---|---|
| Empresa nova, sem dados | Explica o que falta, mostra CTAs e a lista de configuração. |
| Assentos cadastrados, sem provedor | Entrega valor parcial e deixa claro que a visão variável ainda não existe. |
| Provedor conectado, sem orçamento | Mostra gasto, mas não finge ter um veredito de controle. |
| Orçamento definido, antes do dia 5 | Mostra realizado e estado de coleta; omite projeção e risco projetado. |
| Tudo dentro do orçamento | Afirma “sob controle” e mantém a tela informativa. |
| Limite de aviso atingido | Apresenta atenção, alerta raro e acesso ao diagnóstico. |
| Projeção acima do orçamento | Mostra risco futuro sem usar vermelho de estouro realizado. |
| Orçamento já estourado | Usa estado vermelho e informa o excesso realizado. |
| Time sem orçamento | Mantém o time e seu gasto visíveis; oferece definição de orçamento. |
| Gasto sem time | Mantém no total e oferece mapeamento. |
| Modelo sem preço | Mostra tokens e rótulo não precificado; não soma como zero silencioso. |
| Fonte atrasada | Mostra aviso de atualidade e possível subestimação. |
| Divergência de reconciliação | Expõe a diferença e as bases comparadas. |
| Câmbio indisponível | Mantém valor em dólar separado e explica a limitação. |
| Anthropic sem detalhe individual | Atribui por workspace/time e não inventa pessoa. |
| Nomes desativados | Remove nomes inclusive para administradores. |
| Armazenamento individual desativado | Trabalha com agregados de time ou projeto. |
| Visualizador tenta administrar | Esconde ações ou mostra estado de restrição claro. |
| Lista vazia | Mostra próximo passo contextual, não tabela vazia. |
| Carregamento | Mantém a forma aproximada da tela para evitar saltos. |
| Falha de página | Preserva navegação quando possível, oferece tentar novamente e voltar ao início. |
| Time ou endereço inexistente | Informa que o item não existe e oferece retorno seguro. |
| Convite vencido, usado ou revogado | Informa que não é mais válido e orienta pedir outro. |
| Relatório atual indisponível | Mantém histórico acessível e comunica a falha. |
| Empresa sem mês fechado | Explica quando o primeiro relatório histórico surgirá. |
| Exclusão de empresa | Exige nome exato, confirmação clara e explica o que permanece nos provedores. |

---

## 10. O que o produto deliberadamente não faz

- Não bloqueia, limita ou interrompe consumo de IA.
- Não funciona como proxy ou gateway das chamadas.
- Não substitui a fatura do provedor nem a contabilidade oficial.
- Não cobre IA embarcada no produto da própria empresa como caso principal; foca consumo por funcionários.
- Não detecta ferramentas de IA desconhecidas ou uso clandestino.
- Não conecta ferramentas além de OpenAI e Anthropic.
- Não cobre GitHub Copilot.
- Não possui SSO; o quadro de pessoas entra por CSV.
- Não cria previsão histórica, sazonal ou baseada em vários meses.
- Não faz detecção avançada de anomalias.
- Não oferece cenários multivariáveis ou recomendações automáticas complexas.
- Não executa o plano de controle nem acompanha ações como concluídas.
- Não possui aplicativo móvel nativo; é uma experiência web responsiva.
- Não cobra o cliente dentro do produto.
- Não oferece internacionalização ampla; a interface é em português, embora aceite diferentes moedas de exibição.
- Não guarda prompts, respostas, arquivos ou conteúdo das conversas com IA.

---

## 11. Limitações relevantes do produto atual

### 11.1 Janela de análise

A análise operacional se concentra no mês corrente. Meses fechados podem ser consultados individualmente em relatórios, mas não existe uma visão contínua e comparável de 30 ou 90 dias nem previsão baseada em vários períodos.

### 11.2 Cobertura de fontes

O gasto automático cobre OpenAI e Anthropic. Outras ferramentas só entram quando podem ser representadas como assinaturas manuais; não há leitura automática de GitHub Copilot, Microsoft Copilot, Google, Perplexity ou outras fontes.

### 11.3 Descoberta não urgente

A Home não possui uma área contínua de observações calmas sobre concentração, aceleração ou padrões secundários. Fora dos alertas de orçamento, o usuário encontra esses sinais explorando as telas e comparações disponíveis.

### 11.4 Desperdício de assentos

O quadro de pessoas e as assinaturas permitem comparar pessoas ativas e assentos pagos, e o plano de controle pode recomendar rever assentos ociosos. Porém, não existe uma área dedicada que liste automaticamente todas as incompatibilidades de assentos como achados independentes.

### 11.5 Decisão sem execução

O simulador altera apenas o ritmo restante de um time. Não combina variáveis, não considera sazonalidade e não executa a medida testada. O plano de controle também não possui responsáveis, prazos, estado de conclusão ou acompanhamento.

### 11.6 Precisão da atribuição

O detalhe por time depende de projetos e workspaces bem organizados. O detalhe por pessoa depende da fonte conectada e da política de privacidade da empresa. Uso compartilhado pode permanecer agregado ou não atribuído.

### 11.7 Comunicação por e-mail

Convites sempre geram um link copiável. Se o envio de e-mail não estiver disponível, o administrador precisa encaminhar esse link manualmente. Da mesma forma, alertas e resumos só chegam fora do produto quando a entrega de e-mail está disponível.

---

## 12. Cadeia de valor: entrada, entendimento e decisão

| Etapa | O que entra | O que o Denarius organiza | O que o usuário recebe |
|---|---|---|---|
| Estrutura | Pessoas, e-mails, times | Quadro e responsabilidades | Base para leitura por time |
| Custo fixo | Ferramenta, assentos, preço, time | Acúmulo mensal proporcional | Gasto conhecido desde o dia zero |
| Custo variável | Uso de OpenAI e Anthropic | Dinheiro por fonte, modelo, projeto e workspace | Total atualizado do mês |
| Atribuição | Mapa de projeto/workspace para time | Times + Não atribuído | Total reconciliado e responsabilidade explícita |
| Guardrail | Orçamento da empresa e dos times | Consumo, ritmo, projeção e margem | Veredito e priorização |
| Investigação | Time em risco | Evolução, composição, contribuições e causas | Diagnóstico explicável |
| Planejamento | Mudança hipotética de ritmo | Efeito no time e na empresa | Base para decisão humana |
| Comunicação | Estado do período | Alertas, resumo semanal e relatório | Governança recorrente e compartilhável |

---

## 13. Como avaliar se o Denarius resolve o problema

### Pergunta 1 — A liderança descobre quanto está gastando agora?

**Resposta de produto:** sim, desde que as fontes relevantes estejam conectadas ou cadastradas e atualizadas. O total combina provedores e assentos, prioriza dinheiro e mostra sua atualidade.

**Evidência necessária:** comparar o total do Denarius com os valores oficiais de OpenAI, Anthropic e assinaturas em três fechamentos consecutivos.

**Risco residual:** ferramentas fora das duas conexões atuais ou assinaturas não cadastradas ficam fora do retrato.

### Pergunta 2 — A liderança sabe quem é responsável pelo gasto?

**Resposta de produto:** em grande parte. Projetos e workspaces podem ser mapeados para times; o não atribuído fica explícito; detalhe por pessoa é restrito e depende da fonte e da política.

**Evidência necessária:** medir a parcela do gasto não atribuído e sua redução depois do onboarding.

**Risco residual:** atribuição depende da organização que já existe nos provedores. Chaves compartilhadas e workspaces amplos limitam a precisão.

### Pergunta 3 — O produto avisa antes da fatura?

**Resposta de produto:** sim, por orçamento realizado e projeção a partir do quinto dia, com alertas dentro do produto e por e-mail.

**Evidência necessária:** demonstrar um cruzamento real de cada nível, confirmar entrega uma única vez e confirmar nova entrega apenas na escalada.

**Risco residual:** atualização atrasada ou comunicação de e-mail não operacional reduz o caráter antecipado.

### Pergunta 4 — O usuário entende a gravidade em dez segundos?

**Resposta de produto:** a Home foi desenhada para isso: veredito, gasto, orçamento, ritmo, projeção e times em risco aparecem na sequência decisória.

**Evidência necessária:** teste moderado com CEOs/CTOs, pedindo que expliquem estado, margem e time prioritário após dez segundos, sem ajuda.

**Risco residual:** densidade visual, termos como projeção/margem e excesso de dados podem exigir aprendizado inicial.

### Pergunta 5 — O produto ajuda a decidir, não apenas observar?

**Resposta de produto:** parcialmente. O diagnóstico, o plano de controle e o simulador tornam a decisão mais concreta. A execução acontece fora do Denarius e não existe acompanhamento das ações.

**Evidência necessária:** observar se alertas levam a conversas, mudança de modelo, revisão de orçamento ou configuração de limites no provedor.

**Risco residual:** sem fechamento do ciclo de ação, o produto depende do processo de gestão do cliente.

### Pergunta 6 — Os números são confiáveis o suficiente para uma decisão executiva?

**Resposta de produto:** a proposta de confiança é forte porque o produto mostra atraso, falta de preço, câmbio, não atribuído e divergência. Ainda assim, a fatura oficial permanece soberana.

**Evidência necessária:** reconciliação mensal documentada, incluindo os casos de modelo desconhecido, fonte atrasada e câmbio.

**Risco residual:** uma única divergência silenciosa pode destruir confiança; a transparência precisa funcionar em todos os estados reais.

### Pergunta 7 — O produto evita virar vigilância?

**Resposta de produto:** sim na estrutura proposta: pessoa aparece apenas no diagnóstico, visualizador não vê nomes e a empresa pode desativar nomes ou armazenamento individual.

**Evidência necessária:** teste de todas as telas com os dois papéis e com cada política de privacidade ligada e desligada.

**Risco residual:** mesmo uma lista contextual pode ser mal utilizada culturalmente; copy e permissões precisam permanecer consistentes.

### Pergunta 8 — O valor existe antes da integração completa?

**Resposta de produto:** parcialmente. Roster, assinaturas e orçamento criam uma primeira visão sem credencial, mas o principal problema de consumo variável só é resolvido depois das conexões.

**Evidência necessária:** medir se clientes conseguem completar um primeiro caso útil apenas com assentos e quanto tempo levam até a primeira fonte sincronizada.

### Pergunta 9 — O fechamento serve para conselho e financeiro?

**Resposta de produto:** sim como documento de governança, não como documento contábil. O relatório é consistente, agregado, congelado e imprimível.

**Evidência necessária:** validar com um CFO se o relatório responde às perguntas mensais sem planilha paralela, deixando claras as ressalvas.

### Pergunta 10 — O produto cobre o gasto de IA relevante do cliente ideal?

**Resposta de produto:** depende da composição do cliente. É forte quando OpenAI, Anthropic e assinaturas manuais representam quase todo o gasto. É fraco quando Copilot, Microsoft, Google, Perplexity ou IA embarcada concentram uma parcela relevante.

**Evidência necessária:** medir, no processo comercial, qual percentual do gasto total de IA de cada prospect está dentro do escopo atual.

---

## 14. Avaliação preliminar de aderência problema × solução

| Dimensão | Cobertura atual | Leitura |
|---|---|---|
| Saber o gasto atual em dinheiro | Forte | É a espinha dorsal do produto, com fontes e assentos combinados. |
| Controlar contra orçamento | Forte | Orçamento, ritmo, projeção, margem e veredito formam uma proposta coerente. |
| Descobrir risco antes da fatura | Forte, condicionada à operação | Requer atualização e comunicação recorrentes funcionando em produção. |
| Entender onde o dinheiro está | Forte por fonte/modelo; moderada por time | Atribuição depende da estrutura no provedor. |
| Investigar causa | Moderada a forte | Boa no contexto de time; detalhe individual varia por fonte e privacidade. |
| Decidir o que fazer | Moderada | Plano e cenário ajudam; execução e acompanhamento ficam fora. |
| Evitar fadiga de alertas | Forte na regra | Precisa ser comprovado em uso mensal real. |
| Gerar confiança | Forte na proposta | Transparência de lacunas é diferenciadora; reconciliação real é o teste definitivo. |
| Entregar valor sem chave | Moderada | Assentos ajudam, mas não substituem o gasto variável. |
| Cobrir todo o ecossistema de IA | Fraca a moderada | O produto cobre somente OpenAI e Anthropic, mais cadastro manual. |
| Servir como contabilidade | Fora da proposta | O produto declara corretamente que não substitui faturas. |
| Evitar vigilância | Forte | Permissões, agregação e políticas sustentam o princípio. |
| Sustentar auditoria e due diligence | Forte | Relatórios congelados, direitos de dados, termos e trilha administrativa ajudam. |

### Síntese preliminar

O Denarius resolve bem o núcleo do problema **quando o cliente concentra gasto em OpenAI, Anthropic e assinaturas conhecidas, aceita configurar orçamentos e consegue organizar projetos/workspaces por time**. Nessa condição, a sequência “veredito → risco → diagnóstico → cenário → decisão → relatório” é consistente com a promessa de governança.

Ele resolve menos bem empresas cujo gasto está disperso em ferramentas ainda não conectadas, cuja estrutura de chaves impede atribuição, ou que esperam bloqueio automático, contabilidade, detecção de shadow AI ou planejamento avançado. Também ainda precisa provar em uso real que alertas, resumo e ações mudam comportamento — tela bem organizada não é, por si só, controle financeiro.

---

## 15. Evidências que devem ser coletadas com clientes

### Ativação

- Percentual de empresas com ao menos uma fonte atualizada e um orçamento definido em até sete dias.
- Tempo entre cadastro e primeiro veredito com dados reais.
- Percentual que conclui fonte, roster e orçamento.
- Onde o onboarding trava: credencial, CSV, atribuição ou decisão do valor de orçamento.

### Precisão e confiança

- Diferença mensal entre Denarius e faturas oficiais.
- Percentual de gasto não atribuído.
- Percentual de gasto não precificado.
- Frequência e duração de dados atrasados.
- Capacidade de um usuário explicar a origem de um valor sem ajuda.

### Clareza executiva

- Percentual de CEOs/CTOs que identifica corretamente o veredito em dez segundos.
- Percentual que identifica o time prioritário e a margem projetada.
- Confusão entre gasto realizado, projeção, orçamento e margem.
- Confusão entre “risco projetado” e “estouro realizado”.

### Mudança de comportamento

- Quantidade de alertas por empresa e por mês.
- Percentual de alertas que leva a alguma decisão observável.
- Tipos de ação tomados: conversa, mudança de modelo, limite no provedor, ajuste de orçamento ou assentos.
- Tempo entre alerta e ação.
- Frequência com que o simulador é usado antes da decisão.

### Recorrência

- Abertura do resumo semanal.
- Semanas em que um administrador abre o produto.
- Consulta e download de relatórios.
- Retenção por dois ou mais ciclos de renovação.
- Se a empresa abandona planilhas paralelas ou apenas adiciona o Denarius a elas.

### Cobertura comercial

- Percentual do gasto de IA do prospect coberto pelo produto.
- Quantos prospects são bloqueados pela ausência de Copilot ou outro conector.
- Quantos recusam fornecer credencial mesmo com a proposta somente leitura.
- Disposição a pagar pela governança, separada do interesse por um dashboard bonito.

---

## 16. Roteiro recomendado para teste de produto

### Teste de primeira sessão

1. Peça ao participante para criar uma empresa.
2. Observe se entende o que ganha ao completar os três passos.
3. Peça para começar sem credencial, usando roster e uma assinatura.
4. Verifique se o valor parcial é percebido como útil e honesto.
5. Peça para definir o primeiro orçamento.
6. Registre dúvidas e abandonos sem ensinar o caminho.

### Teste do cockpit

1. Mostre a Home por dez segundos.
2. Oculte a tela.
3. Pergunte: “Estamos sob controle?”, “Quanto gastamos?”, “Onde o mês deve fechar?” e “Qual time exige atenção?”.
4. Reabra e peça para provar cada resposta na interface.

### Teste de investigação

1. Dê um cenário com um time em risco, gasto não atribuído e um modelo não precificado.
2. Peça para descobrir o maior risco.
3. Peça para explicar de onde vem o custo.
4. Peça para encontrar a ressalva de qualidade.
5. Peça para propor a próxima ação sem sugerir qual tela usar.

### Teste de decisão

1. Peça para simular uma redução que faça o time fechar dentro do orçamento.
2. Pergunte o efeito no time e na empresa.
3. Confirme se o participante entende que a simulação não aplica nenhuma mudança.
4. Pergunte o que faria fora do Denarius.

### Teste de confiança e privacidade

1. Compare Administrador e Visualizador.
2. Desative nomes e confirme que somem de toda a experiência.
3. Desative armazenamento individual e confirme a explicação do novo comportamento.
4. Peça para encontrar a data dos dados, câmbio, não atribuído e não precificado.
5. Peça para exportar os dados e localizar a explicação de exclusão.

### Teste de fechamento

1. Abra o relatório atual e um mês fechado.
2. Peça para explicar qual pode mudar e qual é definitivo.
3. Imprima ou baixe o relatório.
4. Valide o documento com liderança e financeiro sem apoio do produto aberto.

---

## 17. Checklist final para decidir “resolve ou não resolve?”

Marcar **sim** somente com evidência observada, não com base na existência da tela.

### Problema

- [ ] O cliente sente dor relevante de imprevisibilidade, e não apenas curiosidade analítica?
- [ ] OpenAI, Anthropic e assentos conhecidos representam a maior parte do gasto?
- [ ] Existe alguém com autoridade e motivação para definir orçamento?
- [ ] A empresa consegue organizar consumo ao menos por time?

### Proposta de valor

- [ ] A liderança entende o veredito em até dez segundos?
- [ ] A projeção muda uma decisão antes da fatura?
- [ ] A margem projetada é mais útil que apenas mostrar gasto?
- [ ] O alerta chega cedo e não gera fadiga?
- [ ] O diagnóstico reduz tempo de investigação?
- [ ] O cenário torna uma ação mais concreta?

### Confiança

- [ ] Os totais reconciliam com as fontes oficiais?
- [ ] Lacunas de preço, atribuição, câmbio e atualização são sempre visíveis?
- [ ] O usuário sabe diferenciar estimativa de fato realizado?
- [ ] Administradores e visualizadores respeitam todas as restrições de pessoa?
- [ ] A empresa aceita a conexão somente leitura depois de ler as garantias?

### Adoção

- [ ] A empresa chega ao primeiro veredito em até sete dias?
- [ ] O resumo semanal traz usuários de volta?
- [ ] Alertas geram alguma ação observável?
- [ ] O relatório mensal substitui uma tarefa manual existente?
- [ ] A empresa continua usando e pagando após dois ciclos?

### Limites

- [ ] O cliente aceita que o Denarius não bloqueia uso?
- [ ] Aceita que a fatura continua sendo oficial?
- [ ] Não depende de conectores ausentes para enxergar a maior parte do gasto?
- [ ] Não espera forecast histórico ou cenário avançado?
- [ ] Não espera acompanhamento de execução dentro do produto?

### Critério de conclusão

O Denarius pode ser considerado uma solução comprovada quando clientes reais conseguem, de forma recorrente:

1. chegar rapidamente a um total reconciliado;
2. definir um guardrail que faça sentido;
3. identificar o risco correto antes da fatura;
4. tomar uma decisão melhor ou mais cedo por causa do alerta, diagnóstico ou cenário;
5. confiar nas ressalvas e nos números;
6. repetir o ciclo mensal e continuar pagando.

Sem evidência dos itens 3 e 4, o produto é principalmente um dashboard de visibilidade. Com eles comprovados, torna-se de fato uma ferramenta de governança.

---

## 18. Glossário de produto

| Termo | Significado para o usuário |
|---|---|
| **Veredito** | A conclusão de uma linha sobre o controle do gasto no período. |
| **Gasto governado** | Consumo de provedores mais custos de assinaturas acompanhados contra orçamento. |
| **Margem projetada** | Quanto deve sobrar ou faltar em relação ao orçamento no fechamento. |
| **Ritmo** | Velocidade de gasto observada no mês atual. |
| **Projeção** | Extensão linear do ritmo atual até o fim do mês, somente a partir do dia 5. |
| **Não atribuído** | Gasto real que ainda não foi ligado a um time. |
| **Não precificado** | Uso conhecido cujo preço ainda não pode ser determinado com segurança. |
| **Reconciliação** | Comparação que garante que totais e partes não escondem diferenças. |
| **Plano de controle** | Lista consultiva de ações possíveis; não é execução automática. |
| **Apontamento** | Observação calma e não urgente para apoiar decisão. Sua presença atual é parcial. |
| **Alerta** | Evento urgente ligado a limite ou risco de orçamento. |
| **Relatório atual** | Fotografia do mês em andamento, sujeita a mudar. |
| **Relatório fechado** | Registro imutável de um mês já encerrado. |
| **Administrador** | Pessoa que configura e governa o espaço da empresa. |
| **Visualizador** | Pessoa que acompanha dados agregados sem poderes administrativos nem nomes individuais. |

---

## 19. Conclusão do documento

O Denarius apresenta uma tese de produto coesa: **controle de gasto com IA por meio de números atuais, orçamento, projeção, alerta e decisão contextual**. Sua principal força não é apenas consolidar custo, mas transformar esse custo em uma conclusão e em uma sequência de investigação.

A análise, porém, deve preservar quatro condições:

1. o valor depende da cobertura real das fontes do cliente;
2. atribuição depende da organização de projetos, workspaces e times;
3. alertas dependem de dados e comunicação recorrentes funcionando;
4. o produto não executa a decisão — a mudança de comportamento precisa acontecer na empresa ou nos provedores.

Por isso, a pergunta final não é somente “as telas cobrem as funcionalidades?”. É:

> **O Denarius faz uma liderança descobrir um risco real mais cedo, entender sua causa e tomar uma decisão melhor antes que o mês feche?**

Esse é o teste que separa visibilidade de governança e deve orientar toda análise do produto.
