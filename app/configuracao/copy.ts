import type { SetupStep } from "@/lib/setup/steps";

export const setupCopy = {
  logout: "Sair",
  stepper: "Etapas da configuração",
  stepOf: (index: number, total: number) => `Etapa ${index} de ${total}`,
  done: "concluída",
  back: "Voltar",
  next: "Continuar",
  skip: "Fazer depois",
  finish: "Concluir e abrir o painel",
  finishing: "Abrindo o painel…",
  finishSkipping: "Pular e abrir o painel",
  laterNote: "Tudo o que ficar para depois continua disponível em Ajustes.",
  steps: {
    empresa: {
      label: "Empresa",
      title: "Qual é o nome da sua empresa?",
      description:
        "Isso cria o espaço da sua empresa no Denarius. Seus dados ficam isolados dos demais clientes.",
    },
    fontes: {
      label: "Fontes de gasto",
      title: "De onde vem o gasto com IA?",
      description:
        "Conecte as APIs para ler uso e custo direto dos provedores, ou registre à mão os planos por assento que a empresa paga.",
    },
    times: {
      label: "Times",
      title: "Quem gasta, em qual time?",
      description:
        "Importe as pessoas e seus times. É a base para dividir o gasto por time e para orçamentos por time.",
    },
    orcamento: {
      label: "Orçamento",
      title: "Qual é o limite mensal?",
      description:
        "O orçamento da empresa destrava o veredito, a projeção de fechamento e os avisos antecipados. Limites por time são opcionais.",
    },
  } satisfies Record<SetupStep, { label: string; title: string; description: string }>,
  company: {
    field: "Nome da empresa",
    hint: "Você poderá ajustar isso depois em Ajustes.",
    submit: "Criar empresa e continuar",
    submitting: "Criando…",
  },
  sources: {
    modes: "Como registrar o gasto",
    apis: {
      title: "Conectar APIs",
      body: "OpenAI e Anthropic, com uma Admin Key somente leitura. Uso e custo reais, sincronizados todo dia.",
    },
    assinaturas: {
      title: "Registrar assinaturas",
      body: "ChatGPT Team, Claude Pro e outros planos por assento. Sem chaves, preenchido à mão.",
    },
    apisNote: "Um provedor já basta para seguir. O outro pode ser conectado depois.",
    readOnly:
      "O Denarius só lê. Nenhuma chave consegue alterar, limitar ou bloquear o uso nos provedores.",
    subscriptionsTitle: "Registradas",
    subscriptionLine: (tool: string, seats: string, monthly: string) =>
      `${tool} · ${seats} · ${monthly}/mês`,
    sharedTeamsNote:
      "Sem times ainda, as assinaturas entram como compartilhadas. Depois de importar o roster, atribua cada uma ao seu time em Ajustes.",
  },
  roster: {
    imported: (people: string, teams: string) => `${people} em ${teams}.`,
    reimport: "Importar de novo atualiza a lista. Quem não estiver no arquivo é mantido.",
  },
  budget: {
    orgRow: "Empresa",
  },
} as const;
