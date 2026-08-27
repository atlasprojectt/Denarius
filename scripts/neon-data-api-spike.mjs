// DISPOSABLE SPIKE — Supabase→Neon migration stage 2 (data-access compatibility).
// READ-ONLY against the Neon Data API (PostgREST-compatible). No writes, no deletes.
// Delete this file after the migration is decided.
//
// Required env (no secrets committed):
//   NEON_DATA_API_URL   e.g. https://ep-xxx.apirest.<region>.aws.neon.build/<db>/rest/v1
//   NEON_DATA_API_JWT   a JWT accepted by the Data API ("anonymous" role token works
//                        if any policy grants anon read; an "authenticated" token is
//                        needed for the app's own RLS policies)
//   NEON_SPIKE_TABLE    optional table name to probe (default: "team")
//
// Run: node scripts/neon-data-api-spike.mjs

const base = process.env.NEON_DATA_API_URL?.replace(/\/$/, "");
const jwt = process.env.NEON_DATA_API_JWT;
const table = process.env.NEON_SPIKE_TABLE ?? "team";

if (!base || !jwt) {
  console.error(
    "SKIP: missing env. Set NEON_DATA_API_URL and NEON_DATA_API_JWT " +
      "(a Neon JWT for the anonymous or authenticated role). Nothing was executed.",
  );
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${jwt}`,
  Accept: "application/json",
};
let pass = 0;
let fail = 0;

function report(name, ok, detail) {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(url, extra = {}) {
  const res = await fetch(url, { headers: { ...headers, ...extra } });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, contentRange: res.headers.get("content-range") };
}

// 1. Simple SELECT ... LIMIT 1
{
  const r = await get(`${base}/${table}?select=*&limit=1`);
  const rows = Array.isArray(r.body) ? r.body : null;
  report(
    "SELECT * LIMIT 1",
    r.status === 200 && rows !== null,
    r.status === 200 ? `${rows.length} row(s)` : JSON.stringify(r.body),
  );
}

// 2. .eq() filter equivalent (?col=eq.value) — probes id=eq.00000000-0000-0000-0000-000000000000 (empty result expected)
{
  const r = await get(`${base}/${table}?select=id&id=eq.00000000-0000-0000-0000-000000000000&limit=1`);
  report("FILTER ?id=eq.<uuid>", r.status === 200 && Array.isArray(r.body), `status=${r.status}`);
}

// 3. .order() equivalent (?order=...)
{
  const r = await get(`${base}/${table}?select=*&order=id.asc&limit=3`);
  report("ORDER ?order=id.asc", r.status === 200 && Array.isArray(r.body), `status=${r.status}`);
}

// 4. maybeSingle/single equivalent (Accept: application/vnd.pgrst.object+json)
{
  const r = await get(
    `${base}/${table}?select=*&id=eq.00000000-0000-0000-0000-000000000000`,
    { Accept: "application/vnd.pgrst.object+json" },
  );
  // PostgREST: 406/PGRST116 when the object representation finds 0 or >1 rows.
  // supabase-js's maybeSingle treats that as data=null; we only assert the API answers.
  report(
    "SINGLE-ROW REPRESENTATION (vnd.pgrst.object)",
    r.status === 200 || r.status === 406,
    `status=${r.status} code=${r.body?.code ?? "-"}`,
  );
}

// 5. count: "exact", head:true equivalent (HEAD-style: Prefer=count=exact + Range 0-0)
{
  const r = await get(`${base}/${table}?select=id`, {
    Prefer: "count=exact",
    Range: "0-0",
  });
  report(
    'COUNT "exact" (Prefer: count=exact)',
    r.status === 206 || r.status === 200,
    `status=${r.status} content-range=${r.contentRange ?? "-"}`,
  );
}

console.log(`\n${pass} passed, ${fail} failed against ${base}`);
process.exit(fail === 0 ? 0 : 1);
