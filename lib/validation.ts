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
