import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_ID = "b49083f3-9291-46d1-8a7e-d7b21bcd4a49";

const { data: appUser, error: uErr } = await admin
  .from("app_user").select("tenant_id").eq("id", USER_ID).single();
if (uErr) throw uErr;
const tenantId = appUser.tenant_id;

const { data: usage } = await admin
  .from("usage_daily")
  .select("provider, project_id, derived_cost")
  .eq("tenant_id", tenantId);
const byProject = new Map();
for (const r of usage ?? []) {
  const k = `${r.provider}:${r.project_id}`;
  byProject.set(k, (byProject.get(k) ?? 0) + Number(r.derived_cost ?? 0));
}
console.log("usage by project:", Object.fromEntries(byProject));

const { data: cost } = await admin
  .from("cost_daily").select("provider, amount").eq("tenant_id", tenantId);
const reportedUsd = (cost ?? []).reduce((s, r) => s + Number(r.amount), 0);
console.log("reported USD total:", reportedUsd);

const teams = [
  { tenant_id: tenantId, name: "Engenharia" },
  { tenant_id: tenantId, name: "Marketing" },
  { tenant_id: tenantId, name: "Dados" },
];
const { data: teamRows, error: tErr } = await admin.from("team").upsert(teams, { onConflict: "tenant_id,name" }).select("id, name");
if (tErr) throw tErr;
const teamId = Object.fromEntries(teamRows.map((t) => [t.name, t.id]));

const maps = [];
for (const [k] of byProject) {
  const [provider, project] = k.split(":");
  if (!project) continue;
  const team = /eng/i.test(project) ? "Engenharia" : "Marketing";
  maps.push({ tenant_id: tenantId, provider, project_id: project, team_id: teamId[team] });
}
if (maps.length > 0) {
  const { error } = await admin.from("project_map").upsert(maps, { onConflict: "tenant_id,provider,project_id" });
  if (error) throw error;
}

const employees = [
  ["Ana Souza", "ana@qa.dev", "Engenharia"],
  ["Bruno Lima", "bruno@qa.dev", "Engenharia"],
  ["Carla Reis", "carla@qa.dev", "Engenharia"],
  ["Diego Alves", "diego@qa.dev", "Marketing"],
  ["Elisa Prado", "elisa@qa.dev", "Marketing"],
  ["Fábio Nunes", "fabio@qa.dev", "Dados"],
].map(([name, email, team]) => ({ tenant_id: tenantId, name, email, team_id: teamId[team] }));
{
  const { error } = await admin.from("employee").upsert(employees, { onConflict: "tenant_id,email" });
  if (error) throw error;
}

const { data: existingSubs } = await admin.from("subscription").select("id").eq("tenant_id", tenantId);
if ((existingSubs ?? []).length === 0) {
  const { error } = await admin.from("subscription").insert([
    { tenant_id: tenantId, tool: "GitHub Copilot", seat_count: 8, unit_price: 90, currency: "BRL", team_id: teamId["Engenharia"] },
    { tenant_id: tenantId, tool: "ChatGPT Team", seat_count: 12, unit_price: 120, currency: "BRL", team_id: null },
  ]);
  if (error) throw error;
}

const FX = 5.0;
const engUsd = [...byProject.entries()].filter(([k]) => /eng/i.test(k)).reduce((s, [, v]) => s + v, 0);
const mktUsd = [...byProject.entries()].filter(([k]) => /marketing/i.test(k)).reduce((s, [, v]) => s + v, 0);
const now = new Date();
const periodMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
const day = now.getUTCDate();
const daysIn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
const pace = daysIn / day;

const engSeatsMo = 8 * 90;
const engSpend = engUsd * FX + (engSeatsMo * day) / daysIn;
const mktSpend = mktUsd * FX;
const engBudget = Math.round(engSpend * 0.95);
const mktBudget = Math.round((mktSpend * pace) * 1.1);
const dadosBudget = 3000;
const orgReported = reportedUsd * FX + (engSeatsMo + 12 * 120) * (day / daysIn);
const orgBudget = Math.round(orgReported * pace * 1.05);

const budgets = [
  { scope: "org", team_id: null, amount: orgBudget },
  { scope: "team", team_id: teamId["Engenharia"], amount: engBudget },
  { scope: "team", team_id: teamId["Marketing"], amount: mktBudget },
  { scope: "team", team_id: teamId["Dados"], amount: dadosBudget },
].map((b) => ({
  ...b,
  tenant_id: tenantId,
  period_month: periodMonth,
  currency: "BRL",
  thresholds: [0.8, 1.0],
  frozen_fx_rate: FX,
  fx_rate_source: "qa-seed",
  fx_rate_date: periodMonth,
}));

const { data: existingBudgets } = await admin.from("budget").select("id").eq("tenant_id", tenantId);
if ((existingBudgets ?? []).length === 0) {
  const { error } = await admin.from("budget").insert(budgets);
  if (error) throw error;
}

console.log(JSON.stringify({ tenantId, teamId, engUsd, mktUsd, engBudget, mktBudget, orgBudget }, null, 1));
