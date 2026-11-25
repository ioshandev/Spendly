/* ============================================
   SPENDLY v2.0 — App Logic
   ============================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const STORE_KEY = 'spendly_v2_data';
const SET_KEY = 'spendly_v2_settings';

const DEFAULT_SETTINGS = {
  name: 'Spendly User',
  currencyCode: 'LKR',
  currencySymbol: 'Rs',
  budget: 50000,
  theme: 'light'
};

const CATEGORIES = {
  expense: [
    { id: 'food', emoji: '🍔', name: 'Food' },
    { id: 'transport', emoji: '🚗', name: 'Transport' },
    { id: 'shopping', emoji: '🛍', name: 'Shopping' },
    { id: 'bills', emoji: '💡', name: 'Bills' },
    { id: 'entertainment', emoji: '🎬', name: 'Fun' },
    { id: 'health', emoji: '💊', name: 'Health' },
    { id: 'education', emoji: '📚', name: 'Edu' },
    { id: 'other', emoji: '📦', name: 'Other' }
  ],
  income: [
    { id: 'salary', emoji: '💼', name: 'Salary' },
    { id: 'freelance', emoji: '💻', name: 'Freelance' },
    { id: 'business', emoji: '🏢', name: 'Business' },
    { id: 'gift', emoji: '🎁', name: 'Gift' },
    { id: 'investment', emoji: '📈', name: 'Invest' },
    { id: 'other', emoji: '💰', name: 'Other' }
  ]
};

// ===== STATE =====
let state = {
  transactions: [],
  settings: { ...DEFAULT_SETTINGS },
  ui: { type: 'expense', category: 'food', filter: 'all', search: '', range: 'weekly', page: 'home' }
};

// ===== STORAGE =====
function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state.transactions = JSON.parse(raw);
    const s = localStorage.getItem(SET_KEY);
    if (s) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch (e) { console.warn('load fail', e); }
}
function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.transactions));
  localStorage.setItem(SET_KEY, JSON.stringify(state.settings));
}

// ===== HELPERS =====
const sym = () => state.settings.currencySymbol;
const fmt = (n) => `${sym()} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n) => {
  if (Math.abs(n) >= 1e6) return `${sym()} ${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${sym()} ${(n / 1e3).toFixed(1)}k`;
  return `${sym()} ${Math.round(n)}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];

function getMonthTx(year, month) {
  return state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}
function totals(txList) {
  return txList.reduce((a, t) => {
    if (t.type === 'income') a.income += t.amount;
    else a.expense += t.amount;
    return a;
  }, { income: 0, expense: 0 });
}

// ===== THEME =====
function applyTheme() {
  const pref = state.settings.theme;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref === 'dark' || (pref === 'auto' && sysDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === pref));
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme;
  state.settings.theme = cur === 'dark' ? 'light' : 'dark';
  saveData(); applyTheme();
}

// ===== NAVIGATION =====
function goPage(name) {
  state.ui.page = name;
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === name));
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.goto === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'home') renderHome();
  if (name === 'analytics') renderAnalytics();
  if (name === 'transactions') renderTransactions();
  if (name === 'profile') renderProfile();
}

// ===== RENDER HOME =====
function renderHome() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  $('#greetSub').textContent = `${greet}, ${state.settings.name.split(' ')[0]}`;

  const all = state.transactions;
  const tot = totals(all);
  const balance = tot.income - tot.expense;
  const savingsRate = tot.income > 0 ? Math.round(((tot.income - tot.expense) / tot.income) * 100) : 0;

  $('#balanceValue').textContent = fmt(balance);
  $('#balanceCount').textContent = `${all.length} transaction${all.length === 1 ? '' : 's'}`;
  $('#balanceMonth').textContent = `${monthName(now.getMonth())} ${now.getFullYear()}`;
  $('#savingsChip').textContent = `${savingsRate}% saved`;

  $('#statIncome').textContent = fmtShort(tot.income);
  $('#statExpense').textContent = fmtShort(tot.expense);
  $('#statSavings').textContent = `${savingsRate}%`;

  // Budget
  const mTx = getMonthTx(now.getFullYear(), now.getMonth());
  const mTot = totals(mTx);
  const budget = Number(state.settings.budget) || 0;
  const pct = budget > 0 ? Math.min((mTot.expense / budget) * 100, 100) : 0;
  const remain = budget - mTot.expense;
  $('#budgetSpent').textContent = fmtShort(mTot.expense);
  $('#budgetTotal').textContent = fmtShort(budget);
  $('#budgetTag').textContent = pct > 90 ? '⚠ Near limit' : pct > 70 ? 'Watch out' : 'On track';
  $('#budgetNote').textContent = remain >= 0 ? `${fmtShort(remain)} left` : `${fmtShort(Math.abs(remain))} over`;
  drawRing($('#budgetRing'), pct);

  drawBarChart($('#barChart'));
  renderRecent();
}

function drawRing(el, pct) {
  const size = 120, stroke = 10, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const color = pct > 90 ? '#f43f5e' : pct > 70 ? '#f59e0b' : '#7C5CFF';
  el.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--border)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        style="transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)"/>
    </svg>
    <div style="position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:1.2rem">${Math.round(pct)}%</div>
  `;
}

function drawBarChart(el) {
  const now = new Date();
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const tx = getMonthTx(d.getFullYear(), d.getMonth());
    const t = totals(tx);
    data.push({ label: monthName(d.getMonth()), value: t.expense });
  }
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 300, h = 160, pad = 20, bw = (w - pad * 2) / data.length;
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#4F8FFF" stop-opacity=".4"/>
        </linearGradient>
      </defs>
      ${data.map((d, i) => {
        const bh = (d.value / max) * (h - pad * 2 - 20);
        const x = pad + i * bw + bw * 0.15;
        const y = h - pad - bh;
        return `
          <rect x="${x}" y="${y}" width="${bw * 0.7}" height="${bh}" rx="6" fill="url(#barGrad)">
            <animate attributeName="height" from="0" to="${bh}" dur="0.8s" fill="freeze" begin="${i * 0.1}s"/>
            <animate attributeName="y" from="${h - pad}" to="${y}" dur="0.8s" fill="freeze" begin="${i * 0.1}s"/>
          </rect>
          <text x="${x + bw * 0.35}" y="${h - 4}" text-anchor="middle" font-size="9" fill="var(--text-soft)" font-family="Plus Jakarta Sans">${d.label}</text>
        `;
      }).join('')}
    </svg>
  `;
}

function renderRecent() {
  const list = $('#recentList');
  const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (!recent.length) {
    list.innerHTML = `<li style="text-align:center;padding:20px;color:var(--text-soft);font-size:.85rem">No transactions yet. Add your first one!</li>`;
    return;
  }
  list.innerHTML = recent.map(t => {
    const cat = findCat(t.type, t.category);
    return `
      <li class="tx-item">
        <div class="tx-ico ${t.type}">${cat.emoji}</div>
        <div class="tx-info">
          <p class="tx-title">${t.note || cat.name}</p>
          <p class="tx-meta">${t.date}</p>
        </div>
        <span class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</span>
      </li>
    `;
  }).join('');
}

// ===== RENDER ANALYTICS =====
function renderAnalytics() {
  // IV chart
  const now = new Date();
  const days = state.ui.range === 'weekly' ? 7 : 30;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const tx = state.transactions.filter(t => t.date === iso);
    buckets.push({ label: `${d.getDate()}`, ...totals(tx) });
  }
  drawIVChart($('#ivChart'), buckets);

  // Donut
  const mTx = getMonthTx(now.getFullYear(), now.getMonth());
  const exp = mTx.filter(t => t.type === 'expense');
  const catMap = {};
  exp.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  drawDonut($('#donutChart'), $('#donutLegend'), entries);

  // Trend
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const tx = state.transactions.filter(t => t.date === iso && t.type === 'expense');
    trend.push({ x: i, y: tx.reduce((s, t) => s + t.amount, 0) });
  }
  drawTrend($('#trendChart'), trend.reverse());

  // Budget usage
  const tot = totals(mTx);
  const budget = Number(state.settings.budget) || 0;
  const pct = budget > 0 ? Math.min((tot.expense / budget) * 100, 100) : 0;
  $('#budgetUsage').innerHTML = `
    <div style="margin-bottom:10px;display:flex;justify-content:space-between;font-size:.82rem">
      <span style="color:var(--text-soft)">Spent</span>
      <span style="font-weight:700">${fmtShort(tot.expense)} / ${fmtShort(budget)}</span>
    </div>
    <div style="height:10px;background:var(--border);border-radius:6px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:var(--grad);border-radius:6px;transition:width 1s var(--transition)"></div>
    </div>
    <p style="font-size:.75rem;color:var(--text-soft);margin-top:8px">${Math.round(pct)}% of monthly budget used</p>
  `;
}

function drawIVChart(el, buckets) {
  const w = 320, h = 160, pad = 24;
  const max = Math.max(...buckets.map(b => Math.max(b.income, b.expense)), 1);
  const bw = (w - pad * 2) / buckets.length;
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4F8FFF"/><stop offset="1" stop-color="#4F8FFF" stop-opacity=".3"/></linearGradient>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B67CFF"/><stop offset="1" stop-color="#B67CFF" stop-opacity=".3"/></linearGradient>
      </defs>
      ${buckets.map((b, i) => {
        const ih = (b.income / max) * (h - pad * 2);
        const eh = (b.expense / max) * (h - pad * 2);
        const x = pad + i * bw;
        return `
          <rect x="${x + 2}" y="${h - pad - ih}" width="${bw * 0.35}" height="${ih}" rx="3" fill="url(#incGrad)"/>
          <rect x="${x + bw * 0.45}" y="${h - pad - eh}" width="${bw * 0.35}" height="${eh}" rx="3" fill="url(#expGrad)"/>
        `;
      }).join('')}
    </svg>
  `;
}

function drawDonut(el, legend, entries) {
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const colors = ['#7C5CFF', '#4F8FFF', '#B67CFF', '#16b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];
  const size = 140, r = 55, cx = size / 2, cy = size / 2, stroke = 18;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const segs = entries.map(([cat, val], i) => {
    const frac = val / total;
    const dash = frac * c;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${stroke}" stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acc += dash;
    return seg;
  }).join('');
  el.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" style="width:100%;height:100%">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
      ${segs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="10" fill="var(--text-soft)" font-family="Plus Jakarta Sans">Total</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--text)" font-family="Plus Jakarta Sans">${fmtShort(total)}</text>
    </svg>
  `;
  legend.innerHTML = entries.length
    ? entries.map(([cat, val], i) => {
        const c2 = findCat('expense', cat);
        return `<li><span class="dl-dot" style="background:${colors[i % colors.length]}"></span><span class="dl-name">${c2.name}</span><span class="dl-val">${fmtShort(val)}</span></li>`;
      }).join('')
    : `<li style="color:var(--text-soft)">No expenses this month</li>`;
}

function drawTrend(el, points) {
  const w = 320, h = 120, pad = 12;
  const max = Math.max(...points.map(p => p.y), 1);
  const stepX = (w - pad * 2) / (points.length - 1);
  const path = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (p.y / max) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const area = `${path} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}">
      <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C5CFF" stop-opacity=".4"/><stop offset="1" stop-color="#7C5CFF" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#trendGrad)"/>
      <path d="${path}" fill="none" stroke="#7C5CFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// ===== RENDER TRANSACTIONS =====
function renderTransactions() {
  const q = state.ui.search.toLowerCase().trim();
  let tx = [...state.transactions];
  if (state.ui.filter !== 'all') tx = tx.filter(t => t.type === state.ui.filter);
  if (q) tx = tx.filter(t => (t.note || '').toLowerCase().includes(q) || findCat(t.type, t.category).name.toLowerCase().includes(q));

  tx.sort((a, b) => new Date(b.date) - new Date(a.date));
  const groups = {};
  tx.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });

  const el = $('#txGroups');
  if (!tx.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-soft)"><p style="font-size:2.5rem;margin-bottom:8px">📭</p><p style="font-size:.85rem">No transactions found</p></div>`;
    return;
  }
  el.innerHTML = Object.entries(groups).map(([date, items]) => {
    const dayTot = items.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
    return `
      <div>
        <div class="tx-group-title">${formatDate(date)} · ${fmtShort(dayTot)}</div>
        <ul class="tx-list">
          ${items.map(t => {
            const cat = findCat(t.type, t.category);
            return `
              <li class="tx-item">
                <div class="tx-ico ${t.type}">${cat.emoji}</div>
                <div class="tx-info">
                  <p class="tx-title">${t.note || cat.name}</p>
                  <p class="tx-meta">${cat.name}</p>
                </div>
                <span class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${d.getDate()} ${monthName(d.getMonth())} ${d.getFullYear()}`;
}

// ===== PROFILE =====
function renderProfile() {
  $('#pfName').textContent = state.settings.name;
  $('#pfSub').textContent = `${state.settings.currencyCode} · Personal Finance`;
  $('#pfAvatar').textContent = state.settings.name.charAt(0).toUpperCase();
  $('#avatarInitial').textContent = state.settings.name.charAt(0).toUpperCase();
  $('#set_name').value = state.settings.name;
  $('#set_budget').value = state.settings.budget;
  const cur = `${state.settings.currencyCode}|${state.settings.currencySymbol}`;
  const opt = [...$('#set_currency').options].find(o => o.value === cur);
  if (opt) $('#set_currency').value = opt.value;
}

// ===== CATEGORY HELPERS =====
function findCat(type, id) {
  return CATEGORIES[type].find(c => c.id === id) || { emoji: '📦', name: 'Other', id: 'other' };
}

// ===== SHEET =====
function openSheet(type = 'expense') {
  state.ui.type = type;
  state.ui.category = CATEGORIES[type][0].id;
  $('#sheetTitle').textContent = `Add ${type === 'expense' ? 'Expense' : 'Income'}`;
  $$('#typeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  $('#amountCur').textContent = sym();
  $('#txAmount').value = '';
  $('#txDate').value = todayISO();
  $('#txNote').value = '';
  renderCatGrid();
  $('#overlay').hidden = false;
  $('#sheet').hidden = false;
  setTimeout(() => $('#txAmount').focus(), 300);
}
function closeSheet() {
  $('#overlay').hidden = true;
  $('#sheet').hidden = true;
}
function renderCatGrid() {
  const cats = CATEGORIES[state.ui.type];
  $('#catGrid').innerHTML = cats.map(c => `
    <button class="cat-btn ${c.id === state.ui.category ? 'active' : ''}" data-cat="${c.id}">
      <span class="cat-emoji">${c.emoji}</span>${c.name}
    </button>
  `).join('');
}

// ===== SAVE TX =====
function saveTx() {
  const amount = parseFloat($('#txAmount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount'); return; }
  const date = $('#txDate').value || todayISO();
  const note = $('#txNote').value.trim();
  state.transactions.push({
    id: uid(),
    type: state.ui.type,
    amount,
    category: state.ui.category,
    date,
    note
  });
  saveData();
  closeSheet();
  showSuccess();
  fireConfetti();
  renderHome();
  renderTransactions();
  if (state.ui.page === 'analytics') renderAnalytics();
}

function showSuccess() {
  const p = $('#successPopup');
  p.hidden = false;
  setTimeout(() => { p.hidden = true; }, 1400);
}

// ===== CONFETTI =====
function fireConfetti() {
  const canvas = $('#confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#7C5CFF', '#4F8FFF', '#B67CFF', '#16b981', '#f59e0b', '#f43f5e'];
  const pieces = [];
  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1
    });
  }
  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99; p.rot += p.vr; p.life -= 0.012;
      if (p.life > 0) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });
    frame++;
    if (frame < 100) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

// ===== TOAST =====
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

// ===== SAMPLE DATA =====
function loadSample() {
  const now = new Date();
  const samples = [];
  const push = (type, cat, amount, daysAgo, note) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo);
    samples.push({ id: uid(), type, category: cat, amount, date: d.toISOString().slice(0, 10), note });
  };
  push('income', 'salary', 85000, 5, 'Monthly salary');
  push('income', 'freelance', 22000, 12, 'Design project');
  push('expense', 'food', 3200, 1, 'Groceries');
  push('expense', 'transport', 1500, 2, 'Fuel');
  push('expense', 'shopping', 8500, 3, 'New shoes');
  push('expense', 'bills', 4500, 4, 'Electricity');
  push('expense', 'entertainment', 2200, 6, 'Movie night');
  push('expense', 'food', 1800, 8, 'Lunch');
  push('expense', 'health', 3500, 10, 'Pharmacy');
  push('expense', 'food', 2600, 15, 'Dinner');
  push('expense', 'transport', 900, 18, 'Bus');
  push('expense', 'shopping', 4500, 20, 'Clothes');
  push('expense', 'food', 3100, 22, 'Groceries');
  push('expense', 'bills', 6800, 25, 'Internet + water');
  state.transactions = samples;
  saveData();
  renderHome();
  renderTransactions();
  toast('Sample data loaded');
}

// ===== EXPORT =====
function exportJSON() {
  const blob = new Blob([JSON.stringify({ transactions: state.transactions, settings: state.settings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spendly-backup-${todayISO()}.json`;
  a.click();
  toast('Data exported');
}

// ===== INIT =====
function init() {
  loadData();
  applyTheme();
  renderHome();
  renderProfile();

  // Nav
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => goPage(b.dataset.goto)));
  $('#openTx').addEventListener('click', () => openSheet('expense'));
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openSheet(b.dataset.open)));
  $('#themeToggle').addEventListener('click', toggleTheme);

  // Sheet
  $('#overlay').addEventListener('click', closeSheet);
  $('#cancelTx').addEventListener('click', closeSheet);
  $('#saveTx').addEventListener('click', saveTx);
  $$('#typeSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.ui.type = b.dataset.type;
    state.ui.category = CATEGORIES[b.dataset.type][0].id;
    $$('#typeSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderCatGrid();
  }));
  $('#catGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    state.ui.category = btn.dataset.cat;
    $$('.cat-btn').forEach(x => x.classList.toggle('active', x === btn));
  });

  // Search & filter
  $('#txSearch').addEventListener('input', (e) => { state.ui.search = e.target.value; renderTransactions(); });
  $$('#txFilter .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.ui.filter = b.dataset.f;
    $$('#txFilter .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderTransactions();
  }));

  // Analytics range
  $$('#anRange .seg-btn').forEach(b => b.addEventListener('click', () => {
    state.ui.range = b.dataset.range;
    $$('#anRange .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderAnalytics();
  }));

  // Profile settings
  $$('.theme-opt').forEach(b => b.addEventListener('click', () => {
    state.settings.theme = b.dataset.theme;
    saveData(); applyTheme();
  }));
  $('#saveSettings').addEventListener('click', () => {
    state.settings.name = $('#set_name').value.trim() || 'Spendly User';
    const [code, s] = $('#set_currency').value.split('|');
    state.settings.currencyCode = code;
    state.settings.currencySymbol = s;
    state.settings.budget = parseFloat($('#set_budget').value) || 0;
    saveData();
    renderHome(); renderProfile();
    toast('Settings saved');
  });
  $('#exportData').addEventListener('click', exportJSON);
  $('#sampleData').addEventListener('click', loadSample);
  $('#clearData').addEventListener('click', () => {
    if (!confirm('Clear all transactions?')) return;
    state.transactions = [];
    saveData(); renderHome(); renderTransactions();
    toast('All transactions cleared');
  });
  $('#avatarBtn').addEventListener('click', () => goPage('profile'));

  // Auto theme
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'auto') applyTheme();
  });
}

document.addEventListener('DOMContentLoaded', init);
