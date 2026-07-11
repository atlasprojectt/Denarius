export function normalizePtBrMoney(value: string): string {
  const trimmed = value.trim().replace(/[^\d,.-]/g, "");
  if (trimmed.includes(",")) {
    return trimmed.replace(/\./g, "").replace(",", ".");
  }
  return trimmed;
}

export function formatPtBrMoneyInput(value: number | string | undefined): string {
  if (value === undefined || value === "") return "";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}
