'use strict';

const TX_KEY = 'spendly:v1:transactions';
const SET_KEY = 'spendly:v1:settings';

const CATS = {
  expense: [
    { id:'food', name:'Food', ico:'F' },
    { id:'transport', name:'Transport', ico:'T' },
    { id:'shopping', name:'Shopping', ico:'S' },
    { id:'bills', name:'Bills', ico:'B' },
    { id:'fun', name:'Entertainment', ico:'E' },
    { id:'health', name:'Health', ico:'H' },
    { id:'education', name:'Education', ico:'U' },
    { id:'other', name:'Other', ico:'•' },
  ],
  income: [
    { id:'salary', name:'Salary', ico:'$' },
    { id:'freelance', name:'Freelance', ico:'W' },
    { id:'business', name:'Business', ico:'B' },
    { id:'gift', name:'Gift', ico:'G' },
    { id:'invest', name:'Investment', ico:'I' },
    { id:'other', name:'Other', ico:'•' },
  ]
};
const PALETTE = ['#2867FF','#792BFF','#4f8cff','#9d6bff','#28c7ff','#c17bff','#6a5cff','#a0a4c0'];

let txs = [];
let settings = { name:'', currency:'LKR', symbol:'Rs', budget:50000, theme:'light' };
let ui = { page:'home', sheetType:'expense', sheetCat:'food', txFilter:'all', txSearch:'', anRange:'weekly' };

function load(){
  try { txs = JSON.parse(localStorage.getItem(TX_KEY)) || []; } catch { txs = []; }
  try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) settings = Object.assign(settings, s); } catch {}
  if (localStorage.getItem(TX_KEY) === null) { txs = sampleData(); save(); }
  applyTheme(settings.theme || 'light');
}
function save(){ localStorage.setItem(TX_KEY, JSON.stringify(txs)); }
function saveSettings(){ localStorage.setItem(SET_KEY, JSON.stringify(settings)); }

function applyTheme(theme){
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  settings.theme = theme;
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
}

const $ = q => document.querySelector(q);
const $$ = q => Array.from(document.querySelectorAll(q));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const fmt = n => settings.symbol + Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const dayKey = d => d.toISOString().slice(0,10);
const today = () => dayKey(new Date());
const catName = (type,id) => (CATS[type].find(c=>c.id===id)||{name:id,ico:'•'});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.hidden=true,300); }, 2200);
}

function sampleData(){
  const out = [], now = new Date();
  const mk = (daysAgo,type,cat,amt,note)=>{
    const d = new Date(now); d.setDate(d.getDate()-daysAgo);
    out.push({id:uid(),type,category:cat,amount:amt,note,date:dayKey(d),createdAt:d.getTime()});
  };
  for (let m=5;m>=0;m--){
    const base = 20 + m*3;
    mk(base+28,'income','salary',120000,'Monthly salary');
    mk(base+10,'expense','bills',18000,'Utilities');
    mk(base+6,'expense','shopping',9500,'Clothes');
    mk(base+2,'expense','food',6800,'Groceries');
    mk(base+1,'expense','fun',3200,'Cinema night');
  }
  mk(1,'expense','transport',1200,'Fuel');
  mk(1,'expense','food',850,'Lunch');
  mk(2,'expense','health',2400,'Pharmacy');
  mk(3,'income','freelance',25000,'Web project');
  mk(4,'expense','shopping',4300,'Headphones');
  mk(5,'expense','food',1900,'Dinner out');
  mk(7,'expense','education',5000,'Online course');
  return out;
}

function go(page){
  ui.page = page;
  $$('.page').forEach(p=>p.classList.toggle('active', p.dataset.page===page));
  $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.goto===page));
  const el = $('#page-'+page);
  el.querySelectorAll('.anim').forEach(a=>{ a.style.animation='none'; void a.offsetHeight; a.style.animation=''; });
  render();
  window.scrollTo({top:0});
}

function totals(){
  let inc=0, exp=0;
  txs.forEach(t=> t.type==='income' ? inc+=+t.amount : exp+=+t.amount);
  return {inc,exp,bal:inc-exp};
}
function monthSpend(){
  const k = today().slice(0,7);
  return txs.filter(t=>t.type==='expense'&&t.date.slice(0,7)===k).reduce((s,t)=>s+ +t.amount,0);
}

function renderHome(){
  const {inc,exp,bal} = totals();
  const h = new Date().getHours();
  $('#greetTitle').textContent = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const name = settings.name ? ', '+settings.name.split(' ')[0] : '';
  $('#greetSub').textContent = (name?'Welcome back'+name+'!':'Welcome back!')+' Here\'s your money at a glance.';
  $('#balanceValue').textContent = fmt(bal);
  $('#balanceCount').textContent = txs.length + ' transactions';
  $('#balanceMonth').textContent = new Date().toLocaleString('en-US',{month:'long',year:'numeric'});
  $('#statIncome').textContent = fmt(inc);
  $('#statExpense').textContent = fmt(exp);
  $('#statSavings').textContent = inc>0 ? Math.max(0,Math.round((inc-exp)/inc*100))+'%' : '0%';

  const months=[]; const now=new Date();
  for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push(d); }
  const data = months.map(d=>{
    const k = d.toISOString().slice(0,7);
    return { label:d.toLocaleString('en-US',{month:'short'}),
      value: txs.filter(t=>t.type==='expense'&&t.date.slice(0,7)===k).reduce((s,t)=>s+ +t.amount,0) };
  });
  $('#barChart').innerHTML = svgBars(data,{height:150});

  const spent = monthSpend(), budget = +settings.budget||0;
  const pct = budget>0 ? Math.min(100, Math.round(spent/budget*100)) : 0;
  $('#budgetRing').innerHTML = svgRing(pct);
  $('#budgetSpent').textContent = fmt(spent);
  $('#budgetTotal').textContent = fmt(budget);
  $('#budgetTag').textContent = budget>0 ? pct+'% used' : 'No budget';
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() - new Date().getDate();
  $('#budgetNote').textContent = budget>0
    ? (spent<=budget ? fmt(Math.round((budget-spent)/Math.max(1,daysLeft)))+' / day left' : 'Over budget!')
    : 'Set a budget in Profile';

  const recent = [...txs].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,5);
  $('#recentList').innerHTML = recent.length ? recent.map(txRowHTML).join('') : emptyHTML('No transactions yet','Tap the + button to add one');
}

function txRowHTML(t){
  const c = catName(t.type,t.category);
  const d = new Date(t.date+'T00:00:00');
  const ds = d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `<li class="tx-item" data-id="${t.id}">
    <span class="tx-ico" style="background:${t.type==='income'?'#e7f9f2':'var(--lav)'};color:${t.type==='income'?'var(--green)':'var(--purple)'}">${c.ico}</span>
    <div class="tx-meta">
      <div class="tx-cat">${esc(c.name)}</div>
      <div class="tx-sub">${esc(t.note||ds)}</div>
    </div>
    <span class="tx-amt ${t.type}">${t.type==='income'?'+':'−'}${fmt(t.amount)}</span>
    <button class="tx-del" data-del="${t.id}" title="Delete">✕</button>
  </li>`;
}
function emptyHTML(title,sub){
  return `<div class="empty"><div class="e-ico">S</div><b>${title}</b>${sub}</div>`;
}

function renderAnalytics(){
  const weekly = ui.anRange==='weekly';
  const now = new Date();
  let labels=[], inc=[], exp=[];
  if (weekly){
    for(let i=6;i>=0;i--){
      const d=new Date(now); d.setDate(d.getDate()-i);
      const k=dayKey(d);
      labels.push(d.toLocaleDateString('en-US',{weekday:'narrow'}));
      inc.push(sumDay(k,'income')); exp.push(sumDay(k,'expense'));
    }
  } else {
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const k=d.toISOString().slice(0,7);
      labels.push(d.toLocaleString('en-US',{month:'short'}));
      inc.push(sumMonth(k,'income')); exp.push(sumMonth(k,'expense'));
    }
  }
  $('#ivChart').innerHTML = svgGroupedBars(labels,inc,exp,{height:170});

  const mk = today().slice(0,7);
  const byCat = {};
  txs.filter(t=>t.type==='expense'&&t.date.slice(0,7)===mk)
     .forEach(t=> byCat[t.category]=(byCat[t.category]||0)+ +t.amount);
  const entries = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const total = entries.reduce((s,e)=>s+e[1],0);
  if (entries.length){
    $('#donutChart').innerHTML = svgDonut(entries.map(([c,v],i)=>({
      label:catName('expense',c).name, value:v, color:PALETTE[i%PALETTE.length]
    })));
    $('#donutLegend').innerHTML = entries.map(([c,v],i)=>`
      <li><span class="dl-dot" style="background:${PALETTE[i%PALETTE.length]}"></span>
      ${esc(catName('expense',c).name)}
      <span class="dl-val">${fmt(v)} · ${Math.round(v/total*100)}%</span></li>`).join('');
  } else {
    $('#donutChart').innerHTML = '';
    $('#donutLegend').innerHTML = '<div class="empty">No expenses this month</div>';
  }

  const pts=[]; for(let i=29;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); pts.push(sumDay(dayKey(d),'expense')); }
  $('#trendChart').innerHTML = svgArea(pts,{height:140});

  const budget = +settings.budget||0;
  $('#budgetUsage').innerHTML = budget>0 && entries.length
    ? entries.slice(0,5).map(([c,v],i)=>{
        const p=Math.min(100,Math.round(v/budget*100));
        return `<div class="bu-item"><div class="bu-top"><span>${esc(catName('expense',c).name)}</span><span>${fmt(v)} · ${p}%</span></div>
        <div class="bu-track"><div class="bu-fill" data-w="${p}"></div></div></div>`;
      }).join('')
    : '<div class="empty">Set a monthly budget in Profile to see usage.</div>';
  requestAnimationFrame(()=>$$('.bu-fill').forEach(f=>f.style.width=f.dataset.w+'%'));
}
function sumDay(k,type){ return txs.filter(t=>t.date===k&&t.type===type).reduce((s,t)=>s+ +t.amount,0); }
function sumMonth(k,type){ return txs.filter(t=>t.date.slice(0,7)===k&&t.type===type).reduce((s,t)=>s+ +t.amount,0); }

function renderTransactions(){
  let list = [...txs];
  if (ui.txFilter!=='all') list = list.filter(t=>t.type===ui.txFilter);
  if (ui.txSearch){
    const q = ui.txSearch.toLowerCase();
    list = list.filter(t=>(t.note||'').toLowerCase().includes(q)||catName(t.type,t.category).name.toLowerCase().includes(q));
  }
  list.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  if (!list.length){
    $('#txGroups').innerHTML = emptyHTML('Nothing here','Add a transaction with the + button below');
    return;
  }
  const groups={};
  list.forEach(t=>{ (groups[t.date]=groups[t.date]||[]).push(t); });
  $('#txGroups').innerHTML = Object.entries(groups).map(([date,items])=>{
    const d=new Date(date+'T00:00:00');
    const label = date===today()?'Today':date===dayKey(new Date(Date.now()-864e5))?'Yesterday':
      d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return `<div class="tx-group"><h4>${label}</h4><ul class="tx-list">${items.map(txRowHTML).join('')}</ul></div>`;
  }).join('');
}

function renderProfile(){
  const init = (settings.name||'S').trim().charAt(0).toUpperCase();
  $('#pfAvatar').textContent = init; $('#avatarInitial').textContent = init;
  $('#pfName').textContent = settings.name || 'Spendly User';
  $('#set_name').value = settings.name;
  $('#set_currency').value = settings.currency+'|'+settings.symbol;
  $('#set_budget').value = settings.budget;
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
}

function render(){
  if (ui.page==='home') renderHome();
  else if (ui.page==='analytics') renderAnalytics();
  else if (ui.page==='transactions') renderTransactions();
  else renderProfile();
}

function svgBars(data,{height}){
  const W=320,H=height+26,n=data.length,max=Math.max(...data.map(d=>d.value),1);
  const bw=Math.min(34,(W-20)/n*0.55), gap=(W-20-n*bw)/(n-1||1);
  let bars='',labels='';
  data.forEach((d,i)=>{
    const h=Math.max(3,(d.value/max)*(height-8));
    const x=10+i*(bw+gap), y=height-h+8;
    bars+=`<rect class="bar" style="--d:${i*0.07}s" x="${x}" y="${y}" width="${bw}" height="${h}" rx="7" fill="url(#g1)"/>`;
    labels+=`<text x="${x+bw/2}" y="${H-2}" text-anchor="middle" font-size="10" fill="var(--ink-3)" font-weight="600">${d.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2867FF"/><stop offset="1" stop-color="#792BFF"/></linearGradient></defs>
    ${bars}${labels}</svg>`;
}

function svgGroupedBars(labels,inc,exp,{height}){
  const W=320,H=height+26,n=labels.length,max=Math.max(...inc,...exp,1);
  const gw=(W-20)/n, bw=Math.min(14,gw*0.28);
  let out='';
  labels.forEach((lb,i)=>{
    const cx=10+gw*i+gw/2;
    const h1=Math.max(2,inc[i]/max*(height-10)), h2=Math.max(2,exp[i]/max*(height-10));
    out+=`<rect class="bar" style="--d:${i*0.06}s" x="${cx-bw-2}" y="${height-h1+8}" width="${bw}" height="${h1}" rx="5" fill="#2867FF"/>`;
    out+=`<rect class="bar" style="--d:${i*0.06+0.03}s" x="${cx+2}" y="${height-h2+8}" width="${bw}" height="${h2}" rx="5" fill="#792BFF"/>`;
    out+=`<text x="${cx}" y="${H-2}" text-anchor="middle" font-size="10" fill="var(--ink-3)" font-weight="600">${lb}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${out}</svg>`;
}

function svgArea(pts,{height}){
  const W=320,H=height+20,max=Math.max(...pts,1),n=pts.length;
  const step=(W-16)/(n-1);
  const coords=pts.map((v,i)=>[8+i*step, height-v/max*(height-12)+6]);
  const line=coords.map((c,i)=>(i?'L':'M')+c[0].toFixed(1)+' '+c[1].toFixed(1)).join(' ');
  const area=line+` L ${W-8} ${height+6} L 8 ${height+6} Z`;
  return `<svg viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#792BFF" stop-opacity=".28"/><stop offset="1" stop-color="#2867FF" stop-opacity="0"/></linearGradient>
      <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2867FF"/><stop offset="1" stop-color="#792BFF"/></linearGradient></defs>
    <path class="trend-fill" d="${area}" fill="url(#g2)"/>
    <path class="trend-path" d="${line}" fill="none" stroke="url(#g3)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function svgDonut(segs){
  const total=segs.reduce((s,x)=>s+x.value,0)||1;
  let off=0,circles='';
  segs.forEach((s,i)=>{
    const len=s.value/total*100;
    circles+=`<circle class="donut-seg" style="--len:${len-1};--d:${i*0.1}s" cx="60" cy="60" r="42"
      fill="none" stroke="${s.color}" stroke-width="16" stroke-linecap="round"
      stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
    off+=len;
  });
  return `<svg viewBox="0 0 120 120">${circles}
    <text x="60" y="56" text-anchor="middle" font-size="11" font-weight="800" fill="var(--ink)">${fmt(total)}</text>
    <text x="60" y="70" text-anchor="middle" font-size="8" fill="var(--ink-3)" font-weight="600">this month</text></svg>`;
}

function svgRing(pct){
  const r=44,c=2*Math.PI*r,off=c*(1-pct/100);
  return `<svg viewBox="0 0 110 110">
    <defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2867FF"/><stop offset="1" stop-color="#792BFF"/></linearGradient></defs>
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--lav)" stroke-width="10"/>
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="url(#g4)" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 55 55)"
      style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.3,1)" data-off="${off}"/>
    <text x="55" y="60" text-anchor="middle" font-size="18" font-weight="800" fill="var(--ink)">${pct}%</text></svg>`;
}

function openSheet(type){
  ui.sheetType = type || 'expense';
  $('#txDate').value = today();
  $('#amountCur').textContent = settings.symbol;
  syncTypeUI();
  $('#overlay').hidden=false; $('#sheet').hidden=false;
  requestAnimationFrame(()=>{ $('#overlay').classList.add('show'); $('#sheet').classList.add('show'); });
  setTimeout(()=>$('#txAmount').focus(),350);
}
function closeSheet(){
  $('#overlay').classList.remove('show'); $('#sheet').classList.remove('show');
  setTimeout(()=>{ $('#overlay').hidden=true; $('#sheet').hidden=true; },380);
  $('#txAmount').value=''; $('#txNote').value='';
}
function syncTypeUI(){
  $$('#typeSeg .seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===ui.sheetType));
  $('#catGrid').innerHTML = CATS[ui.sheetType].map(c=>`
    <button class="cat-chip ${c.id===ui.sheetCat?'sel':''}" data-cat="${c.id}">
      <span class="c-ico">${c.ico}</span>${c.name}</button>`).join('');
}

document.addEventListener('DOMContentLoaded', ()=>{
  load(); render(); renderProfile();

  $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.goto)));
  $('#openTx').addEventListener('click',()=>openSheet('expense'));
  $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.open)));

  $('#themeToggle').addEventListener('click',()=>{
    const current = settings.theme || 'light';
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    applyTheme(next);
    saveSettings();
    toast('Theme: ' + next);
  });

  $$('.theme-opt').forEach(b=>b.addEventListener('click',()=>{
    applyTheme(b.dataset.theme);
    saveSettings();
    toast('Theme: ' + b.dataset.theme);
  }));

  $('#cancelTx').addEventListener('click',closeSheet);
  $('#overlay').addEventListener('click',closeSheet);
  $$('#typeSeg .seg-btn').forEach(b=>b.addEventListener('click',()=>{
    ui.sheetType=b.dataset.type; ui.sheetCat=CATS[ui.sheetType][0].id; syncTypeUI();
  }));
  $('#catGrid').addEventListener('click',e=>{
    const chip=e.target.closest('[data-cat]'); if(!chip)return;
    ui.sheetCat=chip.dataset.cat; syncTypeUI();
  });
  $('#saveTx').addEventListener('click',()=>{
    const amt=parseFloat($('#txAmount').value);
    if(!amt||amt<=0){ toast('Enter a valid amount'); $('#txAmount').focus(); return; }
    txs.push({ id:uid(), type:ui.sheetType, category:ui.sheetCat, amount:amt,
      note:$('#txNote').value.trim(), date:$('#txDate').value||today(), createdAt:Date.now() });
    save(); closeSheet(); render();
    toast(ui.sheetType==='income'?'Income added ✓':'Expense added ✓');
  });

  document.addEventListener('click',e=>{
    const del=e.target.closest('[data-del]'); if(!del)return;
    if(!del.classList.contains('confirm')){
      $$('.tx-del.confirm').forEach(d=>{d.classList.remove('confirm');d.textContent='✕';});
      del.classList.add('confirm'); del.textContent='Sure?';
      del._t=setTimeout(()=>{del.classList.remove('confirm');del.textContent='✕';},3000);
    } else {
      clearTimeout(del._t);
      txs=txs.filter(t=>t.id!==del.dataset.del); save(); render(); toast('Transaction deleted');
    }
  });

  $$('#anRange .seg-btn').forEach(b=>b.addEventListener('click',()=>{
    $$('#anRange .seg-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); ui.anRange=b.dataset.range; renderAnalytics();
  }));

  $$('#txFilter .seg-btn').forEach(b=>b.addEventListener('click',()=>{
    $$('#txFilter .seg-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); ui.txFilter=b.dataset.f; renderTransactions();
  }));
  $('#txSearch').addEventListener('input',e=>{ ui.txSearch=e.target.value; renderTransactions(); });

  $('#saveSettings').addEventListener('click',()=>{
    settings.name=$('#set_name').value.trim();
    const [code,sym]=$('#set_currency').value.split('|');
    settings.currency=code; settings.symbol=sym;
    settings.budget=Math.max(0,parseFloat($('#set_budget').value)||0);
    saveSettings(); renderProfile(); render(); toast('Settings saved ✓');
  });
  $('#exportData').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(txs,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='spendly-data.json'; a.click(); URL.revokeObjectURL(a.href); toast('Data exported');
  });
  $('#sampleData').addEventListener('click',()=>{ txs=sampleData(); save(); render(); toast('Sample data loaded'); });
  $('#clearData').addEventListener('click',()=>{
    if(confirm('Delete ALL transactions? This cannot be undone.')){ txs=[]; save(); render(); toast('All data cleared'); }
  });

  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
});
