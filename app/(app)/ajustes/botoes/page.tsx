import {
  RiAddLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiMenuLine,
  RiSettings3Line,
} from "@remixicon/react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/domain/page-container";
import { PageHeader } from "@/components/domain/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const variants = [
  ["primary", "Salvar alterações"],
  ["secondary", "Gerenciar orçamentos"],
  ["tertiary", "Ver time"],
  ["ghost", "Ação discreta"],
  ["outline", "Alternativa"],
  ["destructive", "Excluir time"],
] as const;

const sizes = ["sm", "default", "lg"] as const;

export default function ButtonShowcasePage() {
  // Internal design reference — never shipped to the customer's product.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PageContainer variant="settings" className="gap-6">
      <PageHeader
        title="Sistema de botões"
        description="Referência interna das variantes, tamanhos e estados oficiais do Denarius."
      />

      <Card>
        <CardHeader><CardTitle>Variantes</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {variants.map(([variant, label]) => (
            <Button
              key={variant}
              variant={variant}
              motion={variant === "tertiary" ? "forward" : "none"}
            >
              {label}
              {variant === "tertiary" ? (
                <RiArrowRightSLine data-icon="inline-end" />
              ) : null}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tamanhos e ícones</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {sizes.map((size) => (
            <Button key={size} size={size} variant="secondary">
              <RiAddLine />
              {size}
            </Button>
          ))}
          <Button variant="ghost" size="icon-sm" aria-label="Abrir ajustes compactos">
            <RiSettings3Line />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Abrir menu">
            <RiMenuLine />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Estados</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button>Disponível</Button>
          <Button disabled>Desabilitado</Button>
          <Button loading loadingText="Salvando...">Salvar</Button>
          <Button variant="destructive" loading loadingText="Excluindo...">
            <RiDeleteBinLine />
            Excluir
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Passe o cursor para conferir o hover, mantenha pressionado para o active e use Tab para o foco visível. Loading preserva as dimensões; disabled remove movimento e interação.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-stone-950 text-stone-50">
        <CardHeader><CardTitle>Fundo escuro</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Ação principal</Button>
          <Button variant="secondary">Ação global</Button>
          <Button variant="tertiary" motion="forward">
            Ação contextual
            <RiArrowRightSLine data-icon="inline-end" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Composição</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="font-medium">Correto</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uma ação primária por contexto; alternativas neutras e ações contextuais terciárias.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button>Salvar</Button>
              <Button variant="outline">Cancelar</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="font-medium">Evitar</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Várias ações laranja, pills para ações comuns ou vermelho em ações reversíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
