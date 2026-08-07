// pt-BR copy for the two public legal pages (issue #57). Isolated here per the
// frontend standard (F2) and structured as data so both documents render
// through the same presenter — a policy and a terms page that drift apart in
// shape read as two unrelated documents.
//
// EVERY sentence here has to be true of the app as built. What backs each
// claim, so a future edit can re-check it rather than trust it:
//   - no prompts/responses stored: there is no proxy; the connectors read the
//     providers' Admin/Usage APIs, which return counts and cost only.
//   - per-person switches: tenant.show_names / tenant.store_per_person
//     (migration 20260707120000_privacy.sql), enforced in lib/privacy/.
//   - keys encrypted at rest: lib/crypto.ts (AES-256-GCM), never rendered back.
//   - the Anthropic hop: lib/narrate/ sends the weekly digest draft — team
//     names and already-computed figures — to the Claude API for rephrasing.
//   - export/full deletion: Admin-only self-service in Ajustes, backed by
//     lib/privacy/export.ts and lib/privacy/delete.ts.

export const LEGAL_CONTACT_EMAIL = "privacidade@denarius.app";

/** Shown on both documents. Bump it whenever the text below changes. */
export const LEGAL_UPDATED_AT = "7 de agosto de 2026";

export const legalChrome = {
  backToLogin: "Voltar para o login",
  privacy: "Privacidade",
  terms: "Termos de uso",
  updatedPrefix: "Última atualização:",
  contactPrefix: "Dúvidas sobre dados pessoais:",
};

export type Subprocessor = {
  name: string;
  purpose: string;
  receives: string;
  location: string;
};

export type LegalBlock =
  | { kind: "text"; paragraphs: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "definitions"; items: { term: string; description: string }[] }
  | { kind: "subprocessors"; items: Subprocessor[] };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  lead: string;
  sections: LegalSection[];
};

export const privacyCopy: LegalDocument = {
  title: "Política de privacidade",
  lead:
    "O Denarius mede o gasto da sua empresa com IA. Para isso ele lê, em modo somente leitura, as APIs de administração dos provedores — e nada além de metadados de uso e custo. O conteúdo do que sua equipe escreve para a IA nunca passa por aqui.",
  sections: [
    {
      id: "resumo",
      heading: "Em uma frase",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Coletamos quanto foi gasto, com qual modelo, em qual dia e — quando a empresa escolhe assim — por qual pessoa. Não coletamos prompts, respostas, arquivos ou qualquer conteúdo das conversas com a IA.",
          ],
        },
      ],
    },
    {
      id: "dados",
      heading: "Que dados tratamos",
      blocks: [
        {
          kind: "definitions",
          items: [
            {
              term: "Dados de conta",
              description:
                "Nome da empresa, e-mail e papel (administrador ou visualizador) de cada pessoa com acesso ao Denarius.",
            },
            {
              term: "Metadados de uso",
              description:
                "Por dia, por modelo e por projeto ou workspace do provedor: número de requisições, contagem de tokens e custo em dólar. Quando a empresa mantém o dado por pessoa ligado, o identificador de usuário do provedor acompanha esses totais.",
            },
            {
              term: "Quadro de pessoas (opcional)",
              description:
                "Nome, e-mail e time importados por CSV, usados apenas para atribuir gasto a times e para comparar assentos pagos com pessoas ativas.",
            },
            {
              term: "Assinaturas e orçamentos",
              description:
                "Quantidade de assentos, preço por assento e os orçamentos que a empresa define — informados manualmente por um administrador.",
            },
            {
              term: "Credenciais dos provedores",
              description:
                "As chaves de administração da OpenAI e da Anthropic, cifradas em repouso com AES-256-GCM. Depois de salvas elas nunca são exibidas de volta, nem para quem as cadastrou.",
            },
            {
              term: "Registros de sistema",
              description:
                "O histórico de alertas já enviados, que existe para não repetir o mesmo aviso, e os registros técnicos de execução da hospedagem.",
            },
          ],
        },
      ],
    },
    {
      id: "nunca",
      heading: "O que nunca é coletado",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Prompts, respostas, anexos e qualquer outro conteúdo das interações com a IA. Isso não é uma promessa de configuração: o Denarius não fica no caminho das chamadas da sua equipe. Ele conversa com as APIs de administração dos provedores depois do fato, e essas APIs devolvem contagem e custo — não texto.",
          ],
        },
      ],
    },
    {
      id: "pessoas",
      heading: "Dados por pessoa",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "O produto existe para dar controle de orçamento, não para vigiar pessoas. Por isso o dado individual aparece só em contexto — quem puxou um pico neste mês — e nunca como ranking.",
            "Cada empresa controla dois interruptores, em Ajustes:",
          ],
        },
        {
          kind: "list",
          items: [
            "Mostrar nomes: com ele desligado, nomes somem até para administradores; visualizadores nunca veem nomes, em nenhuma configuração.",
            "Armazenar dados por pessoa: com ele desligado, o gasto é somado no grão de time ou projeto antes de ser gravado — o identificador da pessoa não chega ao banco.",
          ],
        },
        {
          kind: "text",
          paragraphs: [
            "Um administrador pode remover uma pessoa a qualquer momento; o acesso é cortado na mesma hora.",
          ],
        },
      ],
    },
    {
      id: "seguranca",
      heading: "Segurança",
      blocks: [
        {
          kind: "list",
          items: [
            "As chaves de administração ficam cifradas em repouso e são usadas apenas para leitura — o Denarius não consegue bloquear, limitar nem gastar nada na sua conta de provedor.",
            "Cada empresa é isolada no banco por política de acesso por linha, verificada por teste automatizado a cada mudança.",
            "O acesso ao produto exige autenticação; senhas seguem uma política mínima de comprimento e são verificadas contra bases públicas de vazamento no cadastro.",
          ],
        },
      ],
    },
    {
      id: "subprocessadores",
      heading: "Com quem os dados são compartilhados",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Não vendemos dados e não usamos os dados de um cliente para outro. Quatro fornecedores participam da operação do serviço:",
          ],
        },
        {
          kind: "subprocessors",
          items: [
            {
              name: "Supabase",
              purpose: "Banco de dados e autenticação",
              receives:
                "Dados de conta, metadados de uso e custo, quadro de pessoas, orçamentos e as chaves já cifradas.",
              location: "Infraestrutura AWS na região de São Paulo (sa-east-1).",
            },
            {
              name: "Vercel",
              purpose: "Hospedagem e execução da aplicação",
              receives:
                "O tráfego das páginas e os registros técnicos de execução. Os dados do produto só passam por ela em trânsito.",
              location: "Região padrão do projeto na Vercel, nos Estados Unidos.",
            },
            {
              name: "Resend",
              purpose: "Entrega de e-mail",
              receives:
                "O endereço de quem recebe e o conteúdo do alerta ou do resumo semanal — valores agregados e nomes de time.",
              location: "Estados Unidos.",
            },
            {
              name: "Anthropic",
              purpose: "Redação do resumo semanal",
              receives:
                "O rascunho do resumo: nomes de time e os valores já calculados pelo Denarius.",
              location: "Estados Unidos.",
            },
          ],
        },
        {
          kind: "text",
          paragraphs: [
            "Sobre a Anthropic, vale o detalhe: uma vez por semana o Denarius manda o rascunho do resumo executivo para a API do Claude apenas para reescrevê-lo em linguagem corrente. O que vai nesse texto são nomes de time e números que o próprio Denarius já calculou. Não vão prompts, respostas, nomes de pessoas nem qualquer dado individual, e o modelo não calcula nada — se a redação devolvida contiver um número que não foi enviado, ela é descartada e o texto determinístico é usado no lugar.",
            "Se a empresa não quiser receber o resumo semanal, cada pessoa pode desativá-lo em Configurações; sem envio, não há esse compartilhamento.",
          ],
        },
      ],
    },
    {
      id: "retencao",
      heading: "Por quanto tempo guardamos",
      blocks: [
        {
          kind: "list",
          items: [
            "O histórico de uso, custo e orçamento é mantido enquanto a empresa tiver conta ativa — comparar meses é a função do produto.",
            "Quando um administrador exclui o espaço em Ajustes, apagamos imediatamente os dados ativos da empresa e os acessos vinculados. Cópias de segurança da infraestrutura expiram nos ciclos dos fornecedores acima.",
            "Remover uma pessoa apaga imediatamente o acesso dela; o gasto histórico do time permanece, já sem vínculo com a conta removida.",
            "Prompts e respostas não têm prazo de retenção porque nunca são armazenados.",
          ],
        },
      ],
    },
    {
      id: "direitos",
      heading: "Seus direitos (LGPD, art. 18)",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Descrevemos aqui o que o produto faz hoje, não o que pretendemos fazer:",
          ],
        },
        {
          kind: "list",
          items: [
            "Acesso e correção: um administrador vê e edita, na própria interface, os dados de conta, o quadro de pessoas, as assinaturas e os orçamentos.",
            "Eliminação de acesso: um administrador remove uma pessoa em Ajustes, sem precisar falar conosco.",
            "Exportação dos dados da empresa: um administrador baixa um arquivo JSON completo em Ajustes. A exportação respeita as escolhas de nomes e armazenamento por pessoa e nunca inclui credenciais ou tokens de convite.",
            "Exclusão total da conta: um administrador confirma digitando o nome exato da empresa em Ajustes. Isso apaga o espaço e os acessos no Denarius, mas não altera nem exclui nada na OpenAI ou na Anthropic.",
            "Informação sobre compartilhamento: é a lista de fornecedores desta página.",
          ],
        },
      ],
    },
    {
      id: "contato",
      heading: "Contato",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            `Pedidos e dúvidas sobre dados pessoais: ${LEGAL_CONTACT_EMAIL}. Respondemos em até 30 dias.`,
            "Se esta política mudar, atualizamos a data no topo e avisamos os administradores por e-mail antes de a mudança valer.",
          ],
        },
      ],
    },
  ],
};

export const termsCopy: LegalDocument = {
  title: "Termos de uso",
  lead:
    "Estes termos valem para o uso do Denarius, um serviço de governança de gasto com IA. Ao criar uma conta ou aceitar um convite, a empresa e a pessoa concordam com o que está aqui.",
  sections: [
    {
      id: "servico",
      heading: "O que o serviço faz",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "O Denarius conecta-se, em modo somente leitura, às APIs de administração dos provedores de IA contratados pela empresa, converte consumo em dinheiro, compara com os orçamentos definidos pela própria empresa e avisa quando o mês está fora do trilho.",
          ],
        },
        {
          kind: "list",
          items: [
            "Ele aponta; a decisão é sempre da empresa.",
            "Ele não bloqueia, não limita e não interrompe o uso de nenhuma ferramenta de IA — não tem como fazer isso, por construção.",
            "Ele não é ferramenta de avaliação individual de desempenho e não deve ser usado como tal.",
          ],
        },
      ],
    },
    {
      id: "conta",
      heading: "Conta, acesso e responsabilidades",
      blocks: [
        {
          kind: "list",
          items: [
            "Cada e-mail pertence a um único espaço de empresa.",
            "Administradores convidam e removem pessoas, conectam provedores e definem orçamentos; visualizadores só leem, e nunca veem nomes.",
            "A empresa é responsável por conectar apenas credenciais que ela tem autorização para usar, e por manter o acesso das suas pessoas atualizado.",
            "A empresa é responsável pelo conteúdo que importa no quadro de pessoas, inclusive por ter base legal para tratar esses dados.",
          ],
        },
      ],
    },
    {
      id: "numeros",
      heading: "Sobre os números",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "O Denarius mostra o que os provedores reportam. Isso tem limites, e eles aparecem na tela em vez de serem escondidos:",
          ],
        },
        {
          kind: "list",
          items: [
            "Modelos sem preço conhecido aparecem como não custeados, nunca como zero.",
            "A conversão para reais usa a taxa de câmbio congelada no início do período, informada junto do valor.",
            "A projeção de fechamento é uma estimativa linear de ritmo e só aparece a partir do quinto dia do período; não é previsão, e não deve ser tratada como garantia.",
            "Quando a última sincronização está atrasada, a tela avisa antes de mostrar qualquer conclusão.",
          ],
        },
        {
          kind: "text",
          paragraphs: [
            "A fatura do provedor continua sendo o documento oficial de cobrança. O Denarius é ferramenta de apoio à decisão e não substitui a contabilidade da empresa.",
          ],
        },
      ],
    },
    {
      id: "disponibilidade",
      heading: "Disponibilidade e suporte",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "O serviço é oferecido em regime de melhor esforço, sem garantia de disponibilidade contratada nesta fase. Manutenções e indisponibilidades dos provedores podem atrasar a sincronização diária; quando isso acontece, o produto informa a data do último dado em vez de exibir um número desatualizado como se fosse atual.",
          ],
        },
      ],
    },
    {
      id: "comercial",
      heading: "Condições comerciais",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Preço, prazo e condições de pagamento são definidos em contrato próprio entre a empresa e a Denarius. Não há cobrança feita dentro do produto.",
          ],
        },
      ],
    },
    {
      id: "propriedade",
      heading: "Propriedade",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Os dados da empresa são da empresa. O software, a marca e a documentação do Denarius são da Denarius. Usar o serviço não transfere nenhum desses direitos.",
          ],
        },
      ],
    },
    {
      id: "limites",
      heading: "Limitação de responsabilidade",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "As decisões de gasto são da empresa. O Denarius não responde por prejuízos decorrentes de decisões tomadas a partir das suas indicações, nem por indisponibilidade, erro ou mudança de comportamento das APIs dos provedores.",
          ],
        },
      ],
    },
    {
      id: "encerramento",
      heading: "Encerramento",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "A empresa pode encerrar o uso a qualquer momento pela área de Ajustes ou pelo canal de contato. Podemos encerrar uma conta em caso de uso em desacordo com estes termos. Em qualquer dos casos, os dados são apagados conforme a seção de retenção da política de privacidade.",
          ],
        },
      ],
    },
    {
      id: "lei",
      heading: "Lei aplicável e mudanças",
      blocks: [
        {
          kind: "text",
          paragraphs: [
            "Aplica-se a legislação brasileira, incluindo a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
            `Mudanças nestes termos são publicadas nesta página com nova data de atualização e comunicadas aos administradores antes de valer. Contato: ${LEGAL_CONTACT_EMAIL}.`,
          ],
        },
      ],
    },
  ],
};
