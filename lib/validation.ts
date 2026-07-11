import { z } from "zod";

import { normalizePtBrMoney } from "@/lib/locale-money";

// Shared zod schemas — the single source of validation truth (F4).
// Server actions validate authoritatively with these; clients may reuse them.
// Error messages are user-facing copy → pt-BR.

/**
 * Typed field-level errors for the unified inline-validation system (2026-07-11
 * audit, S2/QA-06): first message per field, keyed by the form field name.
 * Actions attach this next to the flat `error` so the UI can mark the exact
 * field instead of relying on the browser's native popup.
 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/** Monetary input: accepts the localized pt-BR format ("1.234,56") as typed —
 *  normalized server-side so the client hidden-input trick is a convenience,
 *  never a requirement (authoritative validation stays here). */
function moneyInput<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizePtBrMoney(value);
    // "" would coerce to 0 — garbage or an empty field must FAIL, not become
    // a free subscription/budget.
    return normalized === "" ? undefined : normalized;
  }, schema);
}

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

export const profileNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Informe seu nome (mínimo 2 caracteres).")
    .max(80, "Nome muito longo (máximo 80 caracteres)."),
});

export const companySettingsSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa (mínimo 2 caracteres).")
    .max(80, "Nome da empresa muito longo (máximo 80 caracteres)."),
});

export const digestPreferenceSchema = z.object({
  // A checkbox posts "on" or nothing; the action coerces to boolean first.
  receiveDigest: z.boolean(),
});

// Privacy toggles (#23) — the action coerces the two checkboxes to booleans.
export const privacySettingsSchema = z.object({
  showNames: z.boolean(),
  storePerPerson: z.boolean(),
});

export const removeUserSchema = z.object({
  userId: z.uuid("Usuário inválido."),
});

// Supported display currencies — editable only at day zero (no budgets/seats),
// so a frozen-FX budget can never be silently re-denominated.
export const displayCurrencySchema = z.object({
  currency: z.enum(["BRL", "USD", "EUR", "GBP"], {
    message: "Escolha uma moeda válida.",
  }),
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
  unitPrice: moneyInput(
    z.coerce
      .number("Informe o preço por assento.")
      .min(0, "O preço não pode ser negativo.")
      .max(10000000, "Preço muito alto."),
  ),
  teamId: z.uuid("Escolha um time válido.").nullable(),
});

export const subscriptionUpdateSchema = subscriptionSchema.extend({
  subscriptionId: z.uuid("Assinatura inválida."),
});

export const subscriptionDeleteSchema = z.object({
  subscriptionId: z.uuid("Assinatura inválida."),
});

// Provider Admin keys (issues #15, #16). Loose shape checks only — real
// validity comes from testConnection; keys are never logged or echoed back.
export const openAiKeySchema = z.object({
  adminKey: z
    .string()
    .trim()
    .min(20, "Cole a Admin Key completa (ela começa com sk-).")
    .max(400, "Chave longa demais — confira o que foi colado.")
    .refine((value) => value.startsWith("sk-"), {
      message: "Uma Admin Key da OpenAI começa com sk-.",
    }),
});

export const anthropicKeySchema = z.object({
  adminKey: z
    .string()
    .trim()
    .min(20, "Cole a Admin Key completa (ela começa com sk-ant-).")
    .max(400, "Chave longa demais — confira o que foi colado.")
    .refine((value) => value.startsWith("sk-ant-"), {
      message: "Uma Admin Key da Anthropic começa com sk-ant-.",
    }),
});

// Project/workspace → team mapping (issue #17). One row per provider project
// id; teamId null means "unmap" → the project falls back to Unattributed.
export const projectMapEntrySchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  projectId: z.string().trim().min(1).max(200),
  teamId: z.uuid("Escolha um time válido.").nullable(),
});

// Budgets (issue #18). Amount is in the tenant display currency; the warning
// threshold is a whole percent (100% + projected-to-breach are implicit). The
// server action normalizes an empty team select to null before parsing and
// enforces the scope↔team pairing (org ⇒ no team, team ⇒ a team).
export const budgetSchema = z
  .object({
    scope: z.enum(["org", "team"]),
    teamId: z.uuid("Escolha um time válido.").nullable(),
    amount: moneyInput(
      z.coerce
        .number("Informe o valor do orçamento.")
        .positive("O valor do orçamento deve ser maior que zero.")
        .max(1_000_000_000, "Valor muito alto."),
    ),
    warnPct: z.coerce
      .number()
      .int("O aviso deve ser um número inteiro.")
      .min(50, "O aviso deve ser de pelo menos 50%.")
      .max(99, "O aviso deve ser abaixo de 100%.")
      .default(80),
  })
  .refine(
    (data) => (data.scope === "team" ? data.teamId !== null : data.teamId === null),
    { message: "Selecione o time deste orçamento.", path: ["teamId"] },
  );

export const budgetDeleteSchema = z.object({
  budgetId: z.uuid("Orçamento inválido."),
});

export const employeeUpdateSchema = z.object({
  employeeId: z.uuid("funcionário inválido"),
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto (mínimo 2 caracteres).")
    .max(120, "Nome muito longo (máximo 120 caracteres)."),
  // Email is editable (2026-07-11 audit, UX-14). It is the roster-import
  // identity — (tenant_id, email) is the CSV upsert key — so uniqueness is
  // enforced and a re-import under the OLD address creates a new person by
  // design. The employee id (and thus history) is untouched by an email edit.
  email: z.email("Informe um e-mail válido.").transform((v) => v.toLowerCase()),
  teamId: z.uuid("Escolha um time válido."),
});

export const employeeDeleteSchema = z.object({
  employeeId: z.uuid("Funcionário inválido."),
});
