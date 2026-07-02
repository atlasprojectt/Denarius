/* ===========================================================
   Denarius — protótipo de frontend
   Camada de dados MOCKADA (simula a resposta da API real).
   Trocar este objeto por fetch() do backend = app real.
   =========================================================== */
const DATA = {
  company: { name: "Acme Tech", currency: "BRL", fx: 5.40, fxFrozen: "jun", asOf: "23/jun 06:00" },
  org: { budget: 50000, spent: 44800, proj: 54200, deltaPct: 18 },
  teams: [
    { name: "Engineering", budget: 25000, spent: 26000, proj: 30000, deltaPct: 28 },
    { name: "Marketing",   budget: 5000,  spent: 4600,  proj: 5900,  deltaPct: 22 },
    { name: "Data",        budget: 10000, spent: 7500,  proj: 9600,  deltaPct: 9  },
    { name: "Product",     budget: 8000,  spent: 5200,  proj: 6800,  deltaPct: -4 },
    { name: "Ops",         budget: 2000,  spent: 1500,  proj: 1900,  deltaPct: 3  },
  ],
  // série acumulada diária (junho, R$): empresa e engineering
  orgCum: [0,2000,4100,6300,8800,11500,14000,16800,19500,22300,25000,27600,30100,32700,35000,37200,39000,40600,42100,43200,44000,44500,44800],
  engCum: [0,1000,2000,3100,4300,5600,7000,8400,9800,11200,12600,14000,15300,16600,18000,19400,20800,22100,23300,24300,25100,25700,26000],
  warnings: [
    { sev:"red",  title:"Engineering estourou o orçamento", meta:"104% (R$ 26.000 / R$ 25.000) · projeção R$ 30.000 (+20%)",
      sent:"alerta por e-mail em 21/jun",
      drivers:["gpt-4o = 62% do gasto","3 usuários = 71% do pico","+R$ 8.000 vs. maio"],
      actions:[
        'Revisar os <b>3 usuários</b> que puxam 71% do gasto — <a href="#" onclick="seePeople();return false"><b>ver em Explore</b></a>',
        'Avaliar <b>gpt-4o-mini / Haiku</b> para tarefas não-críticas (gpt-4o domina o custo)',
        'Confirmar se o aumento de uso de agentes neste mês é esperado' ] },
    { sev:"amber", title:"Marketing a caminho de estourar", meta:"92% agora · projeção 118% (R$ 5.900)",
      sent:"alerta por e-mail em 22/jun",
      drivers:["claude-3.5-sonnet = 48%","campanha de conteúdo novo","+R$ 1.300 vs. maio"],
      actions:[
        'Acompanhar o ritmo — projeção cruza 100% por volta de 27/jun',
        'Confirmar se o pico de conteúdo é pontual ou recorrente' ] },
  ],
  people: [ // contribuintes do pico em Engineering (P7: contextual, Admin-only)
    { n:"Ana Souza",   m:"gpt-4o",            g:9100, p:35 },
    { n:"Bruno Lima",  m:"gpt-4o",            g:5400, p:21 },
    { n:"Carla Dias",  m:"claude-3.5-sonnet", g:4000, p:15 },
    { n:"Diego Alves", m:"gpt-4o-mini",       g:2600, p:10 },
    { n:"+ 9 pessoas", m:"—",                 g:4900, p:19 },
  ],
  models: [
    { m:"gpt-4o",            pv:"OpenAI",    tk:"412M", g:28000, uncosted:false },
    { m:"claude-3.5-sonnet", pv:"Anthropic", tk:"118M", g:9000,  uncosted:false },
    { m:"gpt-4o-mini",       pv:"OpenAI",    tk:"86M",  g:3000,  uncosted:false },
    { m:"o-novo-modelo",     pv:"OpenAI",    tk:"21M",  g:null,  uncosted:true },
  ],
  // apontamentos = observações de apoio à decisão (NÃO são avisos urgentes)
  apontamentos: [
    { ai:"📊", t:"<b>Engineering</b> e <b>Marketing</b> já passaram de <b>90%</b> do limite — concentram o risco do mês." },
    { ai:"⏱️", t:"<b>Marketing</b> acelerou <b>+40%</b> na última semana; no ritmo, cruza 100% por volta de <b>27/jun</b>." },
    { ai:"🧩", t:"3 times concentram <b>87%</b> do gasto: Engineering 58%, Data 17%, Product 12%." },
    { ai:"✅", t:"<b>Data</b>, <b>Product</b> e <b>Ops</b> cruzaram 50% do orçamento na metade do mês — dentro do esperado." },
    { ai:"🔮", t:"No ritmo atual a empresa fecha <b>+8% acima</b> do orçamento (R$ 54.200). Reduzir Engineering ~14% zera o estouro." },
  ],
};

// constantes do cenário (mock)
const SCEN = { orgProjBase: 54200, orgBudget: 50000, engProj: 30000 };

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const money = n => "R$ " + Number(n).toLocaleString("pt-BR");
const pct = t => Math.round(t.spent / t.budget * 100);
const status = t => t.spent >= t.budget ? "red" : (t.proj > t.budget ? "amber" : "green");
const statusLabel = s => s === "red" ? "estourou" : (s === "amber" ? "projetado a estourar" : "dentro");
const sevDot = s => s === "red" ? "🔴" : (s === "amber" ? "🟠" : "🟢");

/* ---------- budget bar (hero viz P5) ---------- */
function bar(t){
  const scale = 1.30;                       // trilho vai de 0 a 130% do orçamento
  const w = v => Math.min(v / t.budget / scale * 100, 100);
  const st = status(t), marker = (1/scale*100).toFixed(1);
  const fillW = w(t.spent), gA = w(t.spent), gB = w(t.proj);
  return `<div class="bteam stat-${st}">
    <div class="hd">
      <span class="name">${t.name} <span class="pill ${st}">${statusLabel(st)}</span></span>
      <span class="vals">${money(t.spent)} / ${money(t.budget)} · ${pct(t)}%</span>
    </div>
    <div class="track" onclick="drillTeam('${t.name}')" title="Abrir ritmo de ${t.name}">
      <div class="fill" style="width:${fillW}%"></div>
      <div class="bghost" style="left:${gA}%;width:${Math.max(gB-gA,0)}%"></div>
      <div class="marker" style="left:${marker}%"></div>
    </div>
    <div class="proj">Projeção ${money(t.proj)} (${Math.round(t.proj/t.budget*100)}%) · run-rate linear</div>
  </div>`;
}

/* ---------- warning + plano (P6 read-only, expansível) ---------- */
// ns = namespace (ex: "ov" ou "bg") evita IDs duplicados entre painéis
function warnCard(w, i, ns="ov"){
  const id = `${ns}_w${i}`;
  return `<div class="warn" id="${id}">
    <div class="wh" onclick="document.getElementById('${id}').classList.toggle('open')">
      <span class="dot">${sevDot(w.sev)}</span>
      <div><div class="wt">${w.title}</div><div class="tiny muted">${w.meta} · ${w.sent}</div></div>
      <span class="chev">›</span>
    </div>
    <div class="body">
      <div class="drivers">${w.drivers.map(d=>`<span class="chip">${d}</span>`).join("")}</div>
      <div class="plan">
        <b class="h">Plano de controle</b>
        <span class="tiny muted">o Denarius recomenda e mostra; a execução é sua — read-only</span>
        <ul>${w.actions.map(a=>`<li>${a}</li>`).join("")}</ul>
      </div>
    </div>
  </div>`;
}

/* ---------- chart SVG (sem dependências) ---------- */
function lineChart(series, budgetVal, projTo, colors){
  const W=520, H=170, pad=34, n=series.length;
  const maxV = Math.max(budgetVal, projTo, ...series) * 1.08;
  const x = i => pad + i/(n-1) * (W-pad-12);
  const y = v => H-26 - v/maxV * (H-26-14);
  const pts = series.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = series[n-1];
  const budgetY = y(budgetVal).toFixed(1);
  // projeção: do último ponto real até a borda direita, no valor projetado
  const projPts = `${x(n-1).toFixed(1)},${y(last).toFixed(1)} ${(W-12).toFixed(1)},${y(projTo).toFixed(1)}`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
    <line x1="${pad}" y1="${H-26}" x2="${W-12}" y2="${H-26}" stroke="var(--line)"/>
    <line x1="${pad}" y1="14" x2="${pad}" y2="${H-26}" stroke="var(--line)"/>
    <line x1="${pad}" y1="${budgetY}" x2="${W-12}" y2="${budgetY}" stroke="var(--faint)" stroke-dasharray="4 4"/>
    <text x="${pad+4}" y="${budgetY-4}" class="chart-x">orçamento ${money(budgetVal)}</text>
    <polyline fill="none" stroke="${colors.line}" stroke-width="2.5" points="${pts}"/>
    <polyline fill="none" stroke="${colors.line}" stroke-width="2" stroke-dasharray="5 4" opacity=".55" points="${projPts}"/>
    <circle cx="${x(n-1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3.5" fill="${colors.line}"/>
    <text x="${pad}" y="${H-8}" class="chart-x">1/jun</text>
    <text x="${W-46}" y="${H-8}" class="chart-x">30/jun</text>
  </svg>`;
}

/* ---------- render ---------- */
function render(){
  const sorted = [...DATA.teams].sort((a,b)=> b.spent/b.budget - a.spent/a.budget);
  $("#ovTeams").innerHTML = sorted.map(bar).join("");
  $("#bgTeams").innerHTML = sorted.map(bar).join("");

  $("#ovWarn").innerHTML = DATA.warnings.map((w,i) => warnCard(w,i,"ov")).join("");
  $("#bgWarn").innerHTML = DATA.warnings.map((w,i) => warnCard(w,i,"bg")).join("");

  $("#expTeam").innerHTML = sorted.map(t=>`<tr class="clickable" onclick="drillTeam('${t.name}')">
    <td><b>${t.name}</b></td><td class="num">${money(t.spent)}</td>
    <td class="num"><span class="pill ${status(t)}">${pct(t)}%</span></td>
    <td class="num">${money(t.proj)}</td>
    <td class="num ${t.deltaPct>=0?'':'down'}" style="color:${t.deltaPct>=0?'var(--red)':'var(--green)'}">${t.deltaPct>=0?'▲':'▼'} ${Math.abs(t.deltaPct)}%</td></tr>`).join("");

  $("#expPerson").innerHTML = DATA.people.map(p=>`<tr>
    <td><b>${p.n}</b></td><td>${p.m}</td><td class="num">${money(p.g)}</td><td class="num">${p.p}%</td></tr>`).join("");

  $("#expModel").innerHTML = DATA.models.map(m=>`<tr>
    <td><b>${m.m}</b></td><td>${m.pv}</td><td class="num">${m.tk}</td>
    <td class="num">${m.uncosted?'<span class="uncosted">não precificado</span>':money(m.g)}</td></tr>`).join("");

  $("#orgChart").innerHTML = lineChart(DATA.orgCum, DATA.org.budget, DATA.org.proj, {line:"var(--brand)"});
  $("#engChart").innerHTML = lineChart(DATA.engCum, 25000, 30000, {line:"var(--red)"});

  $("#apont").innerHTML = DATA.apontamentos.map(a=>`<div class="apont-row"><span class="ai">${a.ai}</span><div>${a.t}</div></div>`).join("");
}

/* ---------- simulador de cenários (P3 pilar: planejamento + apoio à decisão) ---------- */
function renderScenario(pctRaw){
  const pct = Number(pctRaw)||0;
  $("#scenPct").textContent = pct + "%";
  const orgProj = Math.round(SCEN.orgProjBase - SCEN.engProj * pct/100);
  const pctB    = Math.round(orgProj / SCEN.orgBudget * 100);
  const margin  = SCEN.orgBudget - orgProj;                 // + = folga, - = estoura
  const st      = orgProj > SCEN.orgBudget ? "red" : "green";
  const scale=1.30, fillW=Math.min(orgProj/SCEN.orgBudget/scale*100,100), marker=(1/scale*100).toFixed(1);
  $("#scenOut").innerHTML = `
    <div class="row between center wrapg" style="margin:14px 0 6px">
      <div><span style="font-size:25px;font-weight:740">${money(orgProj)}</span> <span class="tiny muted">projeção de fechamento</span></div>
      <span class="pill ${st}">${pctB}% do orçamento · ${margin>=0?'folga':'estoura'} ${money(Math.abs(margin))}</span>
    </div>
    <div class="scen-bar stat-${st}"><div class="fill" style="width:${fillW}%"></div><div class="marker" style="left:${marker}%"></div></div>
    <div class="tiny muted mt8">risco preto = orçamento R$ 50.000 · barra = projeção sob o cenário</div>`;
  const breakeven = Math.ceil((SCEN.orgProjBase - SCEN.orgBudget) / SCEN.engProj * 100); // ~14%
  $("#scenHint").innerHTML = margin >= 0
    ? `✓ Cenário fecha <b>dentro do orçamento</b> — folga projetada de <b>${money(margin)}</b>.`
    : `Reduza o ritmo de Engineering em mais <b>~${breakeven - pct}%</b> para fechar no orçamento.`;
}
function setScenario(v){ $("#scenSlider").value = v; renderScenario(v); }

/* ---------- navegação ---------- */
const titles = {
  overview:["Overview","Status de orçamento da empresa — junho/2026"],
  budgets:["Budgets","Orçamentos, avisos e planos de controle"],
  planning:["Planejamento","Cenários futuros e apontamentos de apoio à decisão"],
  explore:["Explore","Atribuição e drill-down por time / pessoa / modelo"],
  settings:["Settings","Conexões, identidade e privacidade"],
};
function go(tab){
  document.querySelectorAll("[data-panel]").forEach(p=> p.style.display = p.dataset.panel===tab ? "block" : "none");
  document.querySelectorAll(".nav button").forEach(b=> b.classList.toggle("active", b.dataset.tab===tab));
  $("#ttl").textContent = titles[tab][0];
  $("#tsub").textContent = titles[tab][1];
  window.scrollTo(0,0);
}
document.querySelectorAll(".nav").forEach(nav=>nav.addEventListener("click",e=>{
  const b = e.target.closest("button"); if(b) go(b.dataset.tab);
}));

/* drill: barra/linha de time → Explore com a aba certa */
function drillTeam(name){ go("explore"); setView("team"); }
function seePeople(){ go("explore"); setView("person"); }

/* segmented control do Explore */
function setView(v){
  document.querySelectorAll("#expSeg button").forEach(b=> b.classList.toggle("active", b.dataset.view===v));
  document.querySelectorAll("[data-exp]").forEach(p=> p.style.display = p.dataset.exp===v ? "block" : "none");
}
$("#expSeg").addEventListener("click",e=>{ const b=e.target.closest("button"); if(b) setView(b.dataset.view); });

/* toggles de privacidade */
document.querySelectorAll(".toggle").forEach(t=> t.addEventListener("click",()=> t.classList.toggle("off")));

/* período (mock) */
$("#periodBtn").addEventListener("click",()=> alert("Mock: seletor de período (mês atual, últimos 30/90 dias)."));

/* ---------- modal: definir orçamento ---------- */
function openBudget(){ $("#budgetModal").classList.add("show"); }
function closeBudget(){ $("#budgetModal").classList.remove("show"); }
function saveBudget(){
  const scope = $("#bScope").value;
  const amount = Number($("#bAmount").value);
  if(scope !== "org"){
    const t = DATA.teams.find(x=>x.name===scope);
    if(t){ t.budget = amount; }       // muta o mock e re-renderiza (orçamento "salvo")
  } else {
    DATA.org.budget = amount;
  }
  render();
  closeBudget();
}
$("#budgetModal").addEventListener("click",e=>{ if(e.target.id==="budgetModal") closeBudget(); });

/* ---------- cenários: presets + slider ---------- */
const scenPresets = [
  { l:"Ritmo atual", v:0 },
  { l:"Eng −14% · fecha no orçamento", v:14 },
  { l:"Eng −30%", v:30 },
];
$("#scenPresets").innerHTML = scenPresets.map(p=>`<button class="btn ghost sm" onclick="setScenario(${p.v})">${p.l}</button>`).join("");
$("#scenSlider").addEventListener("input", e => renderScenario(e.target.value));

/* ---------- boot ---------- */
render();
renderScenario(0);
