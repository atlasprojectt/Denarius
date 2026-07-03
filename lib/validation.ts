import { z } from "zod";

// Shared zod schemas — the single source of validation truth (F4).
// Server actions validate authoritatively with these; clients may reuse them.
// Error messages are user-facing copy → pt-BR.

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const signupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa (mínimo 2 caracteres).")
    .max(80, "Nome da empresa muito longo (máximo 80 caracteres)."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export const onboardingSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa (mínimo 2 caracteres).")
    .max(80, "Nome da empresa muito longo (máximo 80 caracteres)."),
});

export const rosterRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "nome muito curto (mínimo 2 caracteres)")
    .max(120, "nome muito longo (máximo 120 caracteres)"),
  email: z.email("e-mail inválido").transform((value) => value.toLowerCase()),
  team: z
    .string()
    .trim()
    .min(1, "time vazio")
    .max(80, "nome de time muito longo (máximo 80 caracteres)")
    .refine((value) => value.toLowerCase() !== "unattributed", {
      // Reserved internal bucket (spend that maps to no team) — not a people team.
      message: 'o nome de time "unattributed" é reservado pelo sistema',
    }),
});

// Manual seat subscription (issue #14). `teamId` null = shared/company-wide.
// The server action normalizes an empty team select to null before parsing.
export const subscriptionSchema = z.object({
  tool: z
    .string()
    .trim()
    .min(2, "Informe a ferramenta (mínimo 2 caracteres).")
    .max(80, "Nome da ferramenta muito longo (máximo 80 caracteres)."),
  seatCount: z.coerce
    .number()
    .int("O número de assentos deve ser inteiro.")
    .min(1, "Pelo menos 1 assento.")
    .max(100000, "Número de assentos muito alto."),
  unitPrice: z.coerce
    .number()
    .min(0, "O preço não pode ser negativo.")
    .max(10000000, "Preço muito alto."),
  teamId: z.uuid("Escolha um time válido.").nullable(),
});

export const subscriptionUpdateSchema = subscriptionSchema.extend({
  subscriptionId: z.uuid("Assinatura inválida."),
});

export const subscriptionDeleteSchema = z.object({
  subscriptionId: z.uuid("Assinatura inválida."),
});

export const employeeUpdateSchema = z.object({
  employeeId: z.uuid("funcionário inválido"),
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto (mínimo 2 caracteres).")
    .max(120, "Nome muito longo (máximo 120 caracteres)."),
  teamId: z.uuid("Escolha um time válido."),
});
