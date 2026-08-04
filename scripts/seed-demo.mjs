// Seeds (or re-seeds) the demo tenant used for landing-page mockups.
//
// Everything is deterministic: one seeded PRNG drives the whole usage series, so
// re-running produces the same numbers and a screenshot taken today matches one
// taken next week. Budgets are DERIVED from the generated series (not authored),
// so the verdict each scope lands on is a property of the data, not a guess.
//
//   node scripts/seed-demo.mjs          seed / re-seed
//   node scripts/seed-demo.mjs --drop   remove the tenant and its auth user
//
// Reads SUPABASE + CREDENTIAL_ENCRYPTION_KEY from .env.local. The demo tenant
// lives in the SAME Supabase project as production — it is deliberately named so
// nobody mistakes it for a customer, and --drop removes it completely.

import { createRequire } from "node:module";
import { createCipheriv, randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: new URL("../.env.local", import.meta.url).pathname.slice(1) });

const { createClient } = require("@supabase/supabase-js");

const COMPANY = "Vega Tecnologia";
const EMAIL = "demo@denarius-demo.dev";
const PASSWORD = "DemoDenarius!2026";
const CURRENCY = "BRL";
const FX_RATE = 5.42;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// --- deterministic PRNG ----------------------------------------------------

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- shape of the demo company ---------------------------------------------

const teams = [
  { key: "engenharia", name: "Engenharia", headcount: 24 },
  { key: "dados", name: "Dados", headcount: 6 },
  { key: "produto", name: "Produto", headcount: 8 },
  { key: "suporte", name: "Suporte", headcount: 9 },
  { key: "marketing", name: "Marketing", headcount: 7 },
];

const subscriptions = [
  // 30 seats against 24 people — the seats-vs-roster finding has something real
  // to say, which is the point of showing it on a landing page.
  { tool: "GitHub Copilot", seatCount: 30, unitPrice: 115, team: "engenharia" },
  { tool: "ChatGPT Team", seatCount: 25, unitPrice: 152, team: null },
  { tool: "Claude Pro", seatCount: 8, unitPrice: 118, team: "dados" },
];

// One project per team, plus a deliberately UNMAPPED sandbox so the Unattributed
// bucket is non-zero and the reconciliation disclosure has a reason to appear.
const projects = [
  { provider: "openai", id: "proj_engenharia", team: "engenharia", share: 0.32 },
  { provider: "openai", id: "proj_produto", team: "produto", share: 0.13 },
  { provider: "openai", id: "proj_suporte", team: "suporte", share: 0.11 },
  { provider: "openai", id: "proj_marketing", team: "marketing", share: 0.07 },
  { provider: "openai", id: "proj_sandbox", team: null, share: 0.08 },
  { provider: "anthropic", id: "wrkspc_engenharia", team: "engenharia", share: 0.11 },
  { provider: "anthropic", id: "wrkspc_dados", team: "dados", share: 0.18 },
];

const models = {
  openai: [
    { model: "gpt-4o", share: 0.62, inPerUsd: 380000, outPerUsd: 95000 },
    { model: "gpt-4o-mini", share: 0.3, inPerUsd: 6600000, outPerUsd: 1650000 },
    // No price row → the product shows it as "uncosted" instead of guessing.
    { model: "gpt-5-preview", share: 0.08, uncosted: true },
  ],
  anthropic: [
    { model: "claude-sonnet-4-5", share: 0.72, inPerUsd: 333000, outPerUsd: 66000 },
    { model: "claude-haiku-4-5", share: 0.28, inPerUsd: 4000000, outPerUsd: 800000 },
  ],
};

const contributors = ["user_ana", "user_bruno", "user_caio", "user_duda", "user_edu"];

const firstNames = "Ana Bruno Caio Duda Eduardo Fernanda Gabriel Helena Igor Julia Lucas Marina Nina Otavio Paula Rafael Sofia Tiago Vitor Yara".split(" ");
const lastNames = "Almeida Barbosa Cardoso Dias Esteves Freitas Gomes Henriques Iglesias Junqueira".split(" ");

const DAILY_USD_BASE = 168; // org-wide provider cost on a typical weekday

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Jul 1 → today, inclusive. Weekends dip; a mild upward drift over the window. */
function buildDays() {
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
  const days = [];
  for (let t = start; t <= end; t += 86400000) {
    days.push(new Date(t));
  }
  return days;
}

async function findTenant() {
  const { data } = await admin.from("tenant").select("id").eq("name", COMPANY).maybeSingle();
  return data?.id ?? null;
}

async function findAuthUser() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === EMAIL) ?? null;
}

async function drop() {
  const tenantId = await findTenant();
  if (tenantId) {
    const { error } = await admin.from("tenant").delete().eq("id", tenantId);
    console.log("tenant deleted:", error ? error.message : tenantId);
  } else {
    console.log("no demo tenant found");
  }
  const user = await findAuthUser();
  if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    console.log("auth user deleted:", error ? error.message : user.id);
  } else {
    console.log("no demo auth user found");
  }
}

function encryptCredential(plaintext) {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  let key = null;
  for (const encoding of ["base64", "hex"]) {
    const candidate = Buffer.from(raw ?? "", encoding);
    if (candidate.length === 32) {
      key = candidate;
      break;
    }
  }
  if (!key) throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    ciphertext.toString("base64"),
    cipher.getAuthTag().toString("base64"),
  ].join(".");
}

async function seed() {
  await drop();

  // --- auth user + tenant --------------------------------------------------
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (userError) throw userError;
  const authUserId = created.user.id;

  const { data: tenant, error: tenantError } = await admin
    .from("tenant")
    .insert({ name: COMPANY, display_currency: CURRENCY })
    .select("id")
    .single();
  if (tenantError) throw tenantError;
  const tenantId = tenant.id;

  await admin.from("app_user").insert({
    id: authUserId,
    tenant_id: tenantId,
    email: EMAIL,
    display_name: "Joana Prado",
    role: "admin",
  });

  // --- teams (+ the unattributed bucket the app expects) -------------------
  const { data: teamRows, error: teamError } = await admin
    .from("team")
    .insert([
      // is_unattributed is spelled out on every row: a mixed-shape batch makes
      // PostgREST send NULL for the absent column instead of taking the default.
      ...teams.map((t) => ({
        tenant_id: tenantId,
        name: t.name,
        is_unattributed: false,
      })),
      { tenant_id: tenantId, name: "unattributed", is_unattributed: true },
    ])
    .select("id, name");
  if (teamError) throw teamError;
  const teamIdByKey = new Map(
    teams.map((t) => [t.key, teamRows.find((r) => r.name === t.name).id]),
  );

  // --- roster --------------------------------------------------------------
  const rnd = mulberry32(20260802);
  const employees = [];
  let n = 0;
  for (const team of teams) {
    for (let i = 0; i < team.headcount; i += 1) {
      const first = firstNames[Math.floor(rnd() * firstNames.length)];
      const last = lastNames[Math.floor(rnd() * lastNames.length)];
      n += 1;
      employees.push({
        tenant_id: tenantId,
        team_id: teamIdByKey.get(team.key),
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${n}@vega.dev`,
      });
    }
  }
  const { error: employeeError } = await admin.from("employee").insert(employees);
  if (employeeError) throw employeeError;

  // --- seats ---------------------------------------------------------------
  const { error: subError } = await admin.from("subscription").insert(
    subscriptions.map((s) => ({
      tenant_id: tenantId,
      tool: s.tool,
      seat_count: s.seatCount,
      unit_price: s.unitPrice,
      currency: CURRENCY,
      team_id: s.team ? teamIdByKey.get(s.team) : null,
    })),
  );
  if (subError) throw subError;

  // --- connections (real ciphertext, so a manual sync would still work) ----
  const now = new Date().toISOString();
  const { error: connError } = await admin.from("provider_connection").insert([
    {
      tenant_id: tenantId,
      provider: "openai",
      encrypted_credential: encryptCredential("sk-fake-demo-openai-key-000001"),
      status: "active",
      last_sync_at: now,
    },
    {
      tenant_id: tenantId,
      provider: "anthropic",
      encrypted_credential: encryptCredential("sk-ant-fake-demo-anthropic-000001"),
      status: "active",
      last_sync_at: now,
    },
  ]);
  if (connError) throw connError;

  // --- attribution ---------------------------------------------------------
  const { error: mapError } = await admin.from("project_map").insert(
    projects
      .filter((p) => p.team)
      .map((p) => ({
        tenant_id: tenantId,
        provider: p.provider,
        project_id: p.id,
        team_id: teamIdByKey.get(p.team),
      })),
  );
  if (mapError) throw mapError;

  // --- the usage series ----------------------------------------------------
  const days = buildDays();
  const costRows = [];
  const usageRows = [];
  const monthStart = isoDate(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
  const apiUsdByTeamThisMonth = new Map();
  let apiUsdThisMonth = 0;

  days.forEach((day, index) => {
    const date = isoDate(day);
    const weekday = day.getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const drift = 1 + index * 0.006; // slow organic growth across the window
    const noise = 0.86 + rnd() * 0.28;
    const dayUsd = DAILY_USD_BASE * drift * noise * (weekend ? 0.34 : 1);

    for (const project of projects) {
      const projectUsd = dayUsd * project.share;
      // Provider-reported cost: the headline truth.
      costRows.push({
        tenant_id: tenantId,
        date,
        provider: project.provider,
        project_id: project.id,
        line_item: "api",
        amount: Number(projectUsd.toFixed(6)),
        currency: "usd",
      });

      if (date >= monthStart) {
        apiUsdThisMonth += projectUsd;
        if (project.team) {
          apiUsdByTeamThisMonth.set(
            project.team,
            (apiUsdByTeamThisMonth.get(project.team) ?? 0) + projectUsd,
          );
        }
      }

      // Token usage: derived cost lands a few percent under the reported total,
      // which is the honest reality the product discloses rather than hides.
      for (const m of models[project.provider]) {
        const modelUsd = projectUsd * m.share * 0.97;
        const contributor =
          contributors[Math.floor(rnd() * contributors.length)];
        usageRows.push({
          tenant_id: tenantId,
          date,
          provider: project.provider,
          project_id: project.id,
          api_key_id: "",
          user_id: contributor,
          model: m.model,
          input_tokens: m.uncosted
            ? Math.round(modelUsd * 250000)
            : Math.round(modelUsd * m.inPerUsd),
          output_tokens: m.uncosted
            ? Math.round(modelUsd * 60000)
            : Math.round(modelUsd * m.outPerUsd),
          derived_cost: m.uncosted ? null : Number(modelUsd.toFixed(6)),
          uncosted: Boolean(m.uncosted),
        });
      }
    }
  });

  for (const [table, rows] of [["cost_daily", costRows], ["usage_daily", usageRows]]) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from(table).insert(rows.slice(i, i + 500));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  }

  // --- budgets, derived from the series ------------------------------------
  // Project each scope's full-month spend from the seeded daily rate, then set
  // the budget as a multiple of it. The verdict each scope lands on is therefore
  // a property of the data — not a number typed to force a colour.
  const today = new Date();
  const dayOfPeriod = today.getUTCDate();
  const daysInPeriod = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const monthFactor = daysInPeriod / dayOfPeriod;

  const seatsMonthlyByTeam = new Map();
  let seatsMonthlyShared = 0;
  for (const s of subscriptions) {
    const total = s.seatCount * s.unitPrice;
    if (s.team) {
      seatsMonthlyByTeam.set(s.team, (seatsMonthlyByTeam.get(s.team) ?? 0) + total);
    } else {
      seatsMonthlyShared += total;
    }
  }

  const projectedOrg =
    apiUsdThisMonth * monthFactor * FX_RATE +
    [...seatsMonthlyByTeam.values()].reduce((a, b) => a + b, 0) +
    seatsMonthlyShared;

  // Headroom per scope — this is what decides each verdict once the day-5
  // projection guard lifts.
  const headroom = {
    org: 1.07, // green, with a visible margin
    engenharia: 1.03, // green but tight
    dados: 0.99, // projected to close just over → amber
    produto: 1.18,
    suporte: 1.14,
    marketing: 0.82, // clearly over → the team the verdict will name
  };

  const budgets = [
    {
      tenant_id: tenantId,
      scope: "org",
      team_id: null,
      period_month: monthStart,
      amount: Math.round((projectedOrg * headroom.org) / 100) * 100,
      currency: CURRENCY,
      frozen_fx_rate: FX_RATE,
      fx_rate_source: "demo-seed",
      fx_rate_date: monthStart,
    },
  ];
  for (const team of teams) {
    const projectedTeam =
      (apiUsdByTeamThisMonth.get(team.key) ?? 0) * monthFactor * FX_RATE +
      (seatsMonthlyByTeam.get(team.key) ?? 0);
    if (projectedTeam <= 0) continue;
    budgets.push({
      tenant_id: tenantId,
      scope: "team",
      team_id: teamIdByKey.get(team.key),
      period_month: monthStart,
      amount: Math.max(100, Math.round((projectedTeam * headroom[team.key]) / 50) * 50),
      currency: CURRENCY,
      frozen_fx_rate: FX_RATE,
      fx_rate_source: "demo-seed",
      fx_rate_date: monthStart,
    });
  }
  const { error: budgetError } = await admin.from("budget").insert(budgets);
  if (budgetError) throw budgetError;

  // --- report --------------------------------------------------------------
  const brl = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  console.log(`\ntenant      ${COMPANY}  (${tenantId})`);
  console.log(`login       ${EMAIL} / ${PASSWORD}`);
  console.log(`roster      ${employees.length} pessoas em ${teams.length} times`);
  console.log(`séries      ${days.length} dias (${isoDate(days[0])} → ${isoDate(days.at(-1))})`);
  console.log(`            ${costRows.length} linhas cost_daily · ${usageRows.length} usage_daily`);
  console.log(`\nmês corrente (dia ${dayOfPeriod}/${daysInPeriod})`);
  console.log(`  API até agora        ${brl(apiUsdThisMonth * FX_RATE)}  (US$ ${apiUsdThisMonth.toFixed(2)} × ${FX_RATE})`);
  console.log(`  projeção do mês      ${brl(projectedOrg)}`);
  console.log(`  orçamento da empresa ${brl(budgets[0].amount)}`);
  console.log(`\norçamentos por time`);
  for (const team of teams) {
    const row = budgets.find((b) => b.team_id === teamIdByKey.get(team.key));
    if (row) console.log(`  ${team.name.padEnd(12)} ${brl(row.amount).padStart(14)}   folga ${headroom[team.key]}×`);
  }
  if (dayOfPeriod < 5) {
    console.log(
      `\n⚠  dia ${dayOfPeriod} do período: o guard de projeção (dia 5) mantém o veredicto em "coletando".`,
    );
  }
}

if (process.argv.includes("--drop")) {
  await drop();
} else {
  await seed();
}
