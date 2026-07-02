/* ===========================================================
   Denarius — protótipo de frontend (v2, pós-crítica de UX)
   Camada de dados MOCKADA (simula a API real).
   =========================================================== */
const DATA = {
  company: { asOf: "hoje 06:00", dayOfPeriod: 23, daysInPeriod: 30, fx: 5.40 },
  org: { budget: 50000, spent: 44800, proj: 54200 },
  teams: [
    { name:"Engineering", budget:25000, spent:26000, proj:30000, deltaPct:28 },
    { name:"Marketing",   budget:5000,  spent:4600,  proj:5900,  deltaPct:22 },
    { name:"Data",        budget:10000, spent:7500,  proj:9600,  deltaPct:9  },
    { name:"Product",     budget:8000,  spent:4300,  proj:5600,  deltaPct:-4 },
    { name:"Ops",         budget:2000,  spent:1500,  proj:1900,  deltaPct:3  },
  ],
  unattributed: { spent:900, note:"chave sem projeto mapeado" },
  engCum: [0,1000,2000,3100,4300,5600,7000,8400,9800,11200,12600,14000,15300,16600,18000,19400,20800,22100,23300,24300,25100,25700,26000],
  people: [
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
  providers: [
    { n:"OpenAI",    g:27800, pct:62, c:"#10a37f" },
    { n:"Anthropic", g:14800, pct:33, c:"#d97706" },
    { n:"Outros",    g:2200,  pct:5,  c:"#94a3b8" },
  ],
  obs: [
    { i:"◔", t:"<b>Data</b>, <b>Product</b> e <b>Ops</b> cruzaram 50% do orçamento na metade do mês — dentro do esperado." },
    { i:"◱", t:"3 times concentram <b>87%</b> do gasto: Engineering 58%, Data 17%, Product 10%." },
    { i:"↗", t:"<b>Marketing</b> acelerou <b>+40%</b> na última semana; no ritmo, cruza 100% por volta de 27/jun." },
    { i:"◇", t:"R$ 900 estão em <b>Não atribuído</b> (chave sem projeto). <a onclick=\"go('explore')\" style=\"cursor:pointer\">Mapear →</a>" },
  ],
};

const $ = s => document.querySelector(s);
const money = n => "R$ " + Math.round(n).toLocaleString("pt-BR");
const pct = t => Math.round(t.spent / t.budget * 100);
const projPct = t => Math.round(t.proj / t.budget * 100);
const status = t => t.spent >= t.budget ? "red" : (t.proj > t.budget ? "amber" : "green");
const stLabel = s => s==="red" ? "estourou" : (s==="amber" ? "projeta estourar" : "dentro");
const daysLeft = () => DATA.company.daysInPeriod - DATA.company.dayOfPeriod;

/* ---------- VEREDITO ---------- */
function renderVerdict(){
  const o = DATA.org;
  const breached = DATA.teams.filter(t=>status(t)==="red");
  const overMargin = o.proj - o.budget;
  let sev, icon, title, meta;
  if (breached.length){
    sev="red"; icon="●";
    title = `Fora do orçamento — ${breached.map(t=>t.name).join(", ")} estourou`;
    meta = `A empresa projeta fechar em ${projPct(o)}% (${money(o.proj)}) · ${daysLeft()} dias restantes`;
  } else if (overMargin > 0){
    sev="amber"; icon="◐";
    title = `Atenção — no ritmo atual, estoura ${money(overMargin)} (${projPct(o)-100}%)`;
    meta = `Projeção de fechamento ${money(o.proj)} em ${daysLeft()} dias`;
  } else {
    sev="green"; icon="○";
    title = `Sob controle — projeção fecha ${money(-overMargin)} abaixo do orçamento`;
    meta = `Tudo dentro do previsto · próximo digest sexta-feira`;
  }
  $("#verdict").innerHTML = `<div class="verdict ${sev}">
    <span class="vi">${icon}</span>
    <div><div class="vt">${title}</div><div class="vm">${meta}</div></div>
  </div>`;
}

/* ---------- HERO: barras pareadas (gasto % × mês %) ---------- */
function renderHero(){
  const o = DATA.org, scale=1.15, mk=(1/scale*100).toFixed(1);
  const spendPct = o.spent/o.budget*100, monthPct = DATA.company.dayOfPeriod/DATA.company.daysInPeriod*100, pPct = o.proj/o.budget*100;
  const wSpend = Math.min(spendPct/scale,100), wMonth=Math.min(monthPct/scale,100), wProjEnd=Math.min(pPct/scale,100);
  $("#pair").innerHTML = `
    <div class="prow"><span class="pl">Gasto</span>
      <div class="ptrack"><div class="pfill fill-amber" style="width:${wSpend}%"></div><div class="pghost" style="left:${wSpend}%;width:${Math.max(wProjEnd-wSpend,0)}%"></div><div class="pmark" style="left:${mk}%"></div></div>
      <span class="pv">${Math.round(spendPct)}%</span></div>
    <div class="prow"><span class="pl">Mês</span>
      <div class="ptrack"><div class="pfill fill-mut" style="width:${wMonth}%"></div><div class="pmark" style="left:${mk}%"></div></div>
      <span class="pv">dia ${DATA.company.dayOfPeriod} de ${DATA.company.daysInPeriod}</span></div>`;
  const over = o.proj - o.budget;
  $("#hcallout").innerHTML = over>0
    ? `<span style="color:var(--amber);font-size:16px">◐</span> No ritmo atual, fecha em <b>${money(o.proj)}</b> — <b style="color:var(--red)">estoura ${money(over)} (${projPct(o)-100}%)</b> <span class="tiny muted">· gastando mais rápido que o mês passa</span>`
    : `<span style="color:var(--green);font-size:16px">○</span> No ritmo atual, fecha em <b>${money(o.proj)}</b> — <b style="color:var(--green)">folga de ${money(-over)}</b>`;
}

/* ---------- barra de time com ghost ---------- */
function teamBar(t){
  const scale=1.30, w=v=>Math.min(v/t.budget/scale*100,100), st=status(t), mk=(1/scale*100).toFixed(1);
  const a=w(t.spent), b=w(t.proj);
  return `<div class="tbar"><div class="f fill-${st}" style="width:${a}%"></div><div class="g" style="left:${a}%;width:${Math.max(b-a,0)}%"></div><div class="m" style="left:${mk}%"></div></div>`;
}

/* ---------- PRECISA DE ATENÇÃO ---------- */
function renderAttention(){
  const risk = DATA.teams.filter(t=>status(t)!=="green").sort((x,y)=>projPct(y)-projPct(x));
  const ok = DATA.teams.filter(t=>status(t)==="green").sort((x,y)=>projPct(y)-projPct(x));
  $("#attnCount").textContent = `(${risk.length})`;

  $("#attn").innerHTML = risk.map(t=>{
    const st=status(t);
    const warn = st==="red"
      ? `Estourou: ${money(t.spent)} de ${money(t.budget)} (${pct(t)}%) · projeção ${money(t.proj)} (+${projPct(t)-100}%)`
      : `${pct(t)}% agora · projeção ${money(t.proj)} (${projPct(t)}%) · cruza 100% antes do fim do mês`;
    return `<div class="trisk ${st}">
      <div class="hd"><span class="nm">${t.name}</span><span class="pill ${st}">${stLabel(st)}</span>
        <span class="vals">${money(t.spent)} / ${money(t.budget)}</span></div>
      <div class="warn">${warn}</div>
      ${teamBar(t)}
      <div class="acts">
        <button class="btn ghost sm" onclick="drillTeam('${t.name}')">Investigar</button>
        <button class="btn sm" onclick="openSim('${t.name}')">Simular</button>
        <button class="iconbtn" style="margin-left:auto" title="Editar orçamento" onclick="openBudget('${t.name}')">✎</button>
      </div>
    </div>`;
  }).join("");

  $("#okWrap").innerHTML = ok.length ? `<div class="collapse" id="okc">
    <div class="ch" onclick="document.getElementById('okc').classList.toggle('open')">
      <span style="color:var(--green);font-size:15px">✓</span>
      <b style="font-size:14px">Sob controle</b><span class="ct" style="color:var(--faint);font-weight:600">(${ok.length}) times dentro do previsto</span>
      <span class="chev">›</span>
    </div>
    <div class="cb">${ok.map(t=>`<div class="okline">
        <span class="nm">${t.name} <span class="pill green" style="font-weight:600">${projPct(t)}%</span></span>
        ${teamBar(t)}
        <span class="tnum tiny muted" style="text-align:right">${money(t.spent)} / ${money(t.budget)}</span>
      </div>`).join("")}</div>
  </div>` : "";
}

/* ---------- observações + composição ---------- */
function renderObs(){
  $("#obs").innerHTML = DATA.obs.map(o=>`<div class="obs"><span class="oi">${o.i}</span><div>${o.t}</div></div>`).join("");
  const max = Math.max(...DATA.providers.map(p=>p.g));
  $("#comp").innerHTML = DATA.providers.map(p=>`<div class="comp">
    <span class="cn">${p.n}</span>
    <div class="cbar"><i style="width:${p.g/max*100}%;background:${p.c}"></i></div>
    <span class="cv">${money(p.g)} · ${p.pct}%</span></div>`).join("");
}

/* ================= EXPLORAR ================= */
function renderExploreRoot(){
  const rows = [...DATA.teams].sort((a,b)=>b.spent-a.spent).map(t=>`<tr class="clickable" onclick="drillTeam('${t.name}')">
    <td><b>${t.name}</b></td><td class="num">${money(t.spent)}</td>
    <td class="num"><span class="pill ${status(t)}">${pct(t)}%</span></td>
    <td class="num">${money(t.proj)}</td>
    <td class="num" style="color:${t.deltaPct>=0?'var(--muted)':'var(--green)'}">${t.deltaPct>=0?'+':''}${t.deltaPct}%</td>
    <td class="num muted">›</td></tr>`).join("");
  const u = DATA.unattributed;
  $("#expRoot").innerHTML = `
    <div class="seg" id="expSeg">
      <button data-view="team" class="active">Por time</button>
      <button data-view="model">Por modelo</button>
    </div>
    <div data-ev="team">
      <div class="card">
        <div class="sechd" style="margin-top:0"><h2>Gasto por time — junho</h2><span class="rt tiny muted">clique num time para investigar</span></div>
        <table><thead><tr><th>Time</th><th class="num">Gasto</th><th class="num">% orç.</th><th class="num">Projeção</th><th class="num">vs. maio</th><th></th></tr></thead>
        <tbody>${rows}
          <tr class="unatt"><td>Não atribuído</td><td class="num">${money(u.spent)}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num" style="color:var(--amber)">mapear</td></tr>
        </tbody></table>
        <div class="tiny muted mt8">Total da empresa = soma dos times + não atribuído = <b>${money(DATA.org.spent)}</b> — sempre reconcilia.</div>
      </div>
    </div>
    <div data-ev="model" style="display:none">
      <div class="card">
        <div class="sechd" style="margin-top:0"><h2>Gasto por modelo — empresa</h2></div>
        <table><thead><tr><th>Modelo</th><th>Provedor</th><th class="num">Tokens</th><th class="num">Gasto</th></tr></thead>
        <tbody>${DATA.models.map(m=>`<tr><td><b>${m.m}</b></td><td>${m.pv}</td><td class="num">${m.tk}</td>
          <td class="num">${m.uncosted?'<span class="uncosted">não precificado</span>':money(m.g)}</td></tr>`).join("")}</tbody></table>
        <div class="tiny muted mt8">Modelos sem preço aparecem como <span class="uncosted">não precificado</span> em vez de sumir do total.</div>
      </div>
    </div>`;
  $("#expSeg").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    document.querySelectorAll("#expSeg button").forEach(x=>x.classList.toggle("active",x===b));
    document.querySelectorAll("[data-ev]").forEach(p=>p.style.display=p.dataset.ev===b.dataset.view?"block":"none");});
}

/* drill → detalhe do time (ritmo + drivers + contribuintes) */
function drillTeam(name){
  const t = DATA.teams.find(x=>x.name===name) || DATA.teams[0];
  go("explore");
  $("#expRoot").style.display="none";
  const d=$("#expDetail"); d.style.display="block";
  const st=status(t);
  d.innerHTML = `
    <div class="crumb"><a onclick="backToExplore()">Explorar</a> <span>›</span> <b style="color:var(--ink)">${t.name}</b></div>
    <div class="card" style="margin-bottom:16px">
      <div class="row between center">
        <div><span class="lbl">${t.name} · junho</span>
          <div style="display:flex;align-items:baseline;gap:9px;margin-top:6px"><span style="font-size:26px;font-weight:740">${money(t.spent)}</span>
          <span class="muted">de ${money(t.budget)} · ${pct(t)}%</span> <span class="pill ${st}">${stLabel(st)}</span></div></div>
        <button class="btn sm" onclick="openSim('${t.name}')">Simular</button>
      </div>
      <div style="margin-top:14px">${teamBar(t)}</div>
      <div class="tiny muted mt8">Projeção ${money(t.proj)} (${projPct(t)}%) · risco preto = orçamento · tracejado = projeção</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="sechd" style="margin-top:0"><h2>Ritmo — gasto acumulado vs. orçamento</h2></div>
      <div id="dChart"></div>
      <div class="legend"><span><i style="background:var(--red)"></i>gasto</span><span><i style="background:var(--faint)"></i>orçamento ${money(t.budget)}</span><span><i style="background:var(--red);opacity:.5"></i>projeção</span></div>
    </div>
    <div class="card">
      <div class="sechd" style="margin-top:0"><h2>Contribuintes deste pico</h2><span class="rt tiny muted">Admin · drivers de custo, não ranking</span></div>
      <table><thead><tr><th>Pessoa</th><th>Modelo principal</th><th class="num">Gasto</th><th class="num">% do pico</th></tr></thead>
      <tbody>${DATA.people.map(p=>`<tr><td><b>${p.n}</b></td><td>${p.m}</td><td class="num">${money(p.g)}</td><td class="num">${p.p}%</td></tr>`).join("")}</tbody></table>
    </div>`;
  $("#dChart").innerHTML = lineChart(DATA.engCum, t.budget, t.proj);
  window.scrollTo(0,0);
}
function backToExplore(){ $("#expDetail").style.display="none"; $("#expRoot").style.display="block"; window.scrollTo(0,0); }

function lineChart(series, budgetVal, projTo){
  const W=520,H=150,pad=34,n=series.length,maxV=Math.max(budgetVal,projTo,...series)*1.08;
  const x=i=>pad+i/(n-1)*(W-pad-12), y=v=>H-24-v/maxV*(H-24-14);
  const pts=series.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const by=y(budgetVal).toFixed(1), last=series[n-1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
    <line x1="${pad}" y1="${H-24}" x2="${W-12}" y2="${H-24}" stroke="var(--line)"/>
    <line x1="${pad}" y1="${by}" x2="${W-12}" y2="${by}" stroke="var(--faint)" stroke-dasharray="4 4"/>
    <text x="${pad+4}" y="${by-4}" font-size="10" fill="var(--faint)">orçamento ${money(budgetVal)}</text>
    <polyline fill="none" stroke="#dc2626" stroke-width="2.4" points="${pts}"/>
    <polyline fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 4" opacity=".55" points="${x(n-1).toFixed(1)},${y(last).toFixed(1)} ${(W-12).toFixed(1)},${y(projTo).toFixed(1)}"/>
    <text x="${pad}" y="${H-6}" font-size="10" fill="var(--faint)">1 jun</text>
    <text x="${W-40}" y="${H-6}" font-size="10" fill="var(--faint)">30 jun</text></svg>`;
}

/* ================= DRAWER: simulador ================= */
let simTarget = null;
function openSim(name){
  simTarget = DATA.teams.find(t=>t.name===name);
  $("#simTeam").textContent = name; $("#simTitle").textContent = `Simular — ${name}`;
  const presets=[{l:"Ritmo atual",v:0},{l:"Fechar no orçamento",v:breakeven()},{l:"−30%",v:30}];
  $("#simPresets").innerHTML = presets.map(p=>`<button class="btn ghost sm" onclick="setSim(${p.v})">${p.l}</button>`).join("");
  $("#simSlider").value=0; renderSim(0);
  $("#scrim").classList.add("show"); $("#drawer").classList.add("show");
}
function closeSim(){ $("#scrim").classList.remove("show"); $("#drawer").classList.remove("show"); }
function setSim(v){ $("#simSlider").value=v; renderSim(v); }
function breakeven(){ if(!simTarget) return 0; return Math.min(50,Math.ceil((DATA.org.proj-DATA.org.budget)/simTarget.proj*100)); }
function renderSim(pctRaw){
  const p=Number(pctRaw)||0; $("#simPct").textContent=p+"%";
  const orgProj=Math.round(DATA.org.proj - simTarget.proj*p/100);
  const pctB=Math.round(orgProj/DATA.org.budget*100), margin=DATA.org.budget-orgProj;
  const st=orgProj>DATA.org.budget?"red":"green", scale=1.30, fw=Math.min(orgProj/DATA.org.budget/scale*100,100), mk=(1/scale*100).toFixed(1);
  $("#simOut").innerHTML=`<div class="row between center wrapg" style="margin:12px 0 4px">
      <div><span style="font-size:24px;font-weight:740">${money(orgProj)}</span> <span class="tiny muted">projeção da empresa</span></div>
      <span class="pill ${st}">${pctB}% · ${margin>=0?'folga':'estoura'} ${money(Math.abs(margin))}</span></div>
    <div class="scen-bar"><div class="f fill-${st}" style="width:${fw}%"></div><div class="m" style="left:${mk}%"></div></div>`;
  const need=Math.max(0,breakeven()-p);
  $("#simHint").innerHTML = margin>=0
    ? `✓ Este cenário fecha <b>dentro do orçamento</b> — folga de <b>${money(margin)}</b>.`
    : `Reduza <b>${simTarget.name}</b> em mais <b>~${need}%</b> para a empresa fechar no orçamento.`;
}

/* ================= navegação ================= */
const titles = {
  home:["Início","Você está no controle do gasto com IA?"],
  explore:["Explorar","Atribuição e investigação por time, pessoa e modelo"],
  settings:["Ajustes","Conexões, identidade e privacidade"],
};
function go(tab){
  document.querySelectorAll("[data-panel]").forEach(p=>p.style.display=p.dataset.panel===tab?"block":"none");
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $("#ttl").textContent=titles[tab][0]; $("#tsub").textContent=titles[tab][1];
  if(tab==="explore" && $("#expDetail").style.display!=="block"){ $("#expRoot").style.display="block"; }
  window.scrollTo(0,0);
}
document.querySelector(".nav").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.tab);});
document.querySelectorAll(".toggle").forEach(t=>t.addEventListener("click",()=>t.classList.toggle("off")));
$("#periodBtn").addEventListener("click",()=>alert("Mock: seletor de período (mês atual · 30d · 90d)."));

/* modal orçamento */
function openBudget(scope){ $("#bScope").value=scope; if(scope!=="org"){const t=DATA.teams.find(x=>x.name===scope); if(t)$("#bAmount").value=t.budget;} else $("#bAmount").value=DATA.org.budget; $("#budgetModal").classList.add("show"); }
function closeBudget(){ $("#budgetModal").classList.remove("show"); }
function saveBudget(){ const s=$("#bScope").value,a=Number($("#bAmount").value);
  if(s==="org") DATA.org.budget=a; else { const t=DATA.teams.find(x=>x.name===s); if(t)t.budget=a; }
  renderAll(); closeBudget(); }
$("#budgetModal").addEventListener("click",e=>{if(e.target.id==="budgetModal")closeBudget();});

/* ---------- boot ---------- */
function renderAll(){ renderVerdict(); renderHero(); renderAttention(); renderObs(); renderExploreRoot(); }
renderAll();
