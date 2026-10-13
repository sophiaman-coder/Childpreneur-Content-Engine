// 小老闆大街 —— 主程式
const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
canvas.width = VW; canvas.height = VH;
g.imageSmoothingEnabled = false;

const $ = sel => document.querySelector(sel);
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];

let world = null, skyCanvas = null;
let S = null;
let mode = 'title';           // title | play | business | end
let panel = null;             // 目前打開嘅面板 id
let dialog = null;
let biz = null;
let camX = 215, time = 0;
let npcs = [], floaters = [], rain = [];
let cart = {};
let speed = 1;
const keys = {};

const player = { x: 455, y: 196, dir: 'down', frame: 0, moving: false, pal: PLAYER_PAL, target: null, animT: 0, stepT: 0, autoEnter: null };
const MENTOR_PAL = { key: 'mentor', hair: '#d8d8d8', jacket: '#3d8f8a', pants: '#4a3a2a', skin: '#e8b088', cap: null };

// ---------- 存檔 ----------
function newState(name, shopName) {
  return {
    name, shopName, day: 1, cash: START_CASH, savings: 0, loan: 0, rep: 50,
    stock: { lemontea: 0, eggwaffle: 0, pineapplebun: 0 },
    avgCost: { lemontea: 0, eggwaffle: 0, pineapplebun: 0 },
    prices: { lemontea: 12, eggwaffle: 18, pineapplebun: 24 },
    unlocked: { lemontea: true }, upgrades: {},
    boardDays: 0, todayAds: [], weather: 'sunny', event: null, costs: {},
    quizDone: false, learned: [], history: [], totalSold: 0, opened: false, tutorialDone: false,
    lastEvent: null, adSpend: 0,
  };
}
function save() { if (S) localStorage.setItem('lb_save', JSON.stringify(S)); }
function load() { try { return JSON.parse(localStorage.getItem('lb_save')); } catch { return null; } }
const netWorth = () => S.cash + S.savings - S.loan;

// ---------- 每日開始 ----------
function rollDay() {
  const r = Math.random();
  const wlist = ['hot', 'sunny', 'sunny', 'cloudy', 'cloudy', 'rain', 'cold'];
  S.weather = wlist[Math.floor(r * wlist.length)];
  S.event = null;
  if (S.day > 1 && Math.random() < 0.45) {
    let ev; do { ev = pick(EVENTS); } while (ev.id === S.lastEvent);
    S.event = ev.id; S.lastEvent = ev.id;
    if (ev.id === 'typhoon') S.weather = 'rain';
  }
  const ev = currentEvent();
  for (const p of Object.values(PRODUCTS)) {
    const m = (ev && ev.cost && ev.cost[p.id]) || 1;
    S.costs[p.id] = Math.max(1, Math.round(p.baseCost * (0.85 + Math.random() * 0.3) * m));
  }
  if (ev && ev.rep) S.rep = clamp(S.rep + ev.rep, 0, 100);
  S.todayAds = []; S.quizDone = false; S.opened = false; S.adSpend = 0;
  if (S.boardDays > 0) S.todayAds.push('board');
  save();
}
const currentEvent = () => EVENTS.find(e => e.id === S.event) || null;
const refPrice = id => PRODUCTS[id].refPrice * ((currentEvent()?.ref?.[id]) || 1);
const buyProb = (price, ref) => 0.92 / (1 + Math.exp(4 * (price / ref - 1.1)));

function trafficFor(id) {
  const p = PRODUCTS[id], w = WEATHERS[S.weather], ev = currentEvent();
  let t = p.traffic * w.traffic * p.weather[S.weather];
  t *= 0.6 + S.rep / 100 * 0.8;
  if (ev && ev.traffic) t *= ev.traffic;
  if (S.upgrades.decor) t *= 1.15;
  let boost = 0;
  for (const a of S.todayAds) boost += ADS[a].boost;
  return t * (1 + boost);
}

function morningNews() {
  const w = WEATHERS[S.weather], ev = currentEvent();
  const lines = [{ who: '新聞', text: `第 ${S.day} 日早晨！今日天氣：${w.name}。${w.desc}` }];
  if (ev) lines.push({ who: '新聞', text: `【${ev.title}】${ev.text}` });
  if (S.boardDays > 0) lines.push({ who: '新聞', text: `你嘅街頭廣告牌仲有 ${S.boardDays} 日。` });
  if (S.day === GAME_DAYS) lines.push({ who: '老師傅', text: '今日係最後一日喇！好好把握！' });
  Sound.play('dayStart');
  startDialog(lines);
}

// ---------- 對話 ----------
function startDialog(lines, onDone) {
  dialog = { lines, i: 0, shown: 0, onDone };
  $('#dialog').classList.remove('hidden');
  renderDialogPortrait();
}
function renderDialogPortrait() {
  const line = dialog.lines[dialog.i];
  $('#dialog-name').textContent = line.who;
  const pc = $('#dialog-portrait'), pg = pc.getContext('2d');
  pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, pc.width, pc.height);
  pg.fillStyle = line.who === '新聞' ? '#2e3f6e' : '#f3e2b8'; pg.fillRect(0, 0, pc.width, pc.height);
  if (line.who === '新聞') {
    pg.fillStyle = '#f2c14e'; pg.fillRect(8, 14, 32, 22); pg.fillStyle = '#2a1e1e'; pg.fillRect(12, 18, 24, 3); pg.fillRect(12, 24, 18, 2); pg.fillRect(12, 29, 22, 2);
  } else {
    const pal = line.who === '老師傅' ? MENTOR_PAL : PLAYER_PAL;
    pg.drawImage(charSprite(pal, 'down', 0), 0, 0, 12, 12, 6, 6, 36, 36);
  }
}
function advanceDialog() {
  if (!dialog) return;
  const line = dialog.lines[dialog.i];
  if (dialog.shown < line.text.length) { dialog.shown = line.text.length; return; }
  Sound.play('blip');
  dialog.i++; dialog.shown = 0;
  if (dialog.i >= dialog.lines.length) {
    const cb = dialog.onDone; dialog = null;
    $('#dialog').classList.add('hidden');
    if (cb) cb();
    return;
  }
  renderDialogPortrait();
}
function updateDialog(dt) {
  if (!dialog) return;
  const line = dialog.lines[dialog.i];
  if (dialog.shown < line.text.length) {
    const before = Math.floor(dialog.shown);
    dialog.shown = Math.min(line.text.length, dialog.shown + dt * 40);
    if (Math.floor(dialog.shown) !== before && before % 2 === 0) Sound.play('talk');
  }
  $('#dialog-text').textContent = line.text.slice(0, Math.floor(dialog.shown));
  $('#dialog-more').style.visibility = dialog.shown >= line.text.length ? 'visible' : 'hidden';
}

// ---------- HUD ----------
function updateHUD() {
  if (!S) return;
  $('#hud-day').textContent = `第 ${Math.min(S.day, GAME_DAYS)}/${GAME_DAYS} 日`;
  $('#hud-weather').textContent = WEATHERS[S.weather].name;
  $('#hud-weather').dataset.w = S.weather;
  $('#hud-cash').textContent = money(S.cash);
  $('#hud-savings').textContent = money(S.savings);
  $('#hud-loan').textContent = money(S.loan);
  $('#hud-rep-bar').style.width = S.rep + '%';
  const nw = netWorth();
  $('#hud-goal').textContent = `${money(nw)} / ${money(GOAL)}`;
  $('#hud-goal-bar').style.width = clamp(nw / GOAL * 100, 0, 100) + '%';
  $('#btn-music').textContent = Sound.musicOn ? '音樂：開' : '音樂：關';
  $('#btn-sfx').textContent = Sound.sfxOn ? '音效：開' : '音效：關';
}

// ---------- 面板 ----------
const panelEl = $('#panel'), panelBody = $('#panel-body'), panelTitle = $('#panel-title');
function openPanel(id) {
  panel = id; cart = {};
  panelEl.className = 'panel theme-' + id;
  renderPanel();
  Sound.play('door');
}
function closePanel() {
  if (!panel) return;
  panel = null; panelEl.className = 'panel hidden';
  Sound.play('back'); updateHUD(); save();
}
function renderPanel() {
  const fn = PANELS[panel];
  if (!fn) return;
  const { title, html } = fn();
  panelTitle.textContent = title;
  panelBody.innerHTML = html;
  updateHUD();
}
function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
  if (bad) Sound.play('error');
}

const unlockedIds = () => Object.keys(PRODUCTS).filter(id => S.unlocked[id]);

const PANELS = {
  market() {
    let total = 0;
    const rows = Object.values(PRODUCTS).map(p => {
      if (!S.unlocked[p.id]) return `<div class="card locked"><b>${p.name}</b><span>要喺「我的小店 → 升級」買「${Object.values(UPGRADES).find(u => u.unlock === p.id).name}」先可以賣</span></div>`;
      const q = cart[p.id] || 0, cost = S.costs[p.id];
      const sub = Math.round(q * cost * (q >= 30 ? 0.9 : 1));
      total += sub;
      const diff = cost - p.baseCost;
      const trend = diff > 0 ? `<span class="up">比平時貴</span>` : diff < 0 ? `<span class="down">比平時平</span>` : `<span>正常價</span>`;
      return `<div class="card">
        <div class="row"><b class="pname" style="--c:${p.color}">${p.name}</b><span>今日入貨價 <b>${money(cost)}</b>/${p.unit} ${trend}</span></div>
        <div class="row small"><span>現有存貨：${S.stock[p.id]} ${p.unit}</span><span>估計今日人流：約 ${Math.round(trafficFor(p.id))} 人</span></div>
        <div class="row qty">
          <button data-act="qty" data-id="${p.id}" data-n="-10">-10</button>
          <button data-act="qty" data-id="${p.id}" data-n="-1">-1</button>
          <span class="qnum">${q}</span>
          <button data-act="qty" data-id="${p.id}" data-n="1">+1</button>
          <button data-act="qty" data-id="${p.id}" data-n="10">+10</button>
          <button data-act="qty" data-id="${p.id}" data-n="30">+30</button>
          <span class="sub">${money(sub)}${q >= 30 ? ' <em>九折！</em>' : ''}</span>
        </div></div>`;
    }).join('');
    return {
      title: '街市批發',
      html: `<p class="lead">喺度入貨。<b>成本</b>越低，你每件賺得越多。一次買 30 件或以上有<b>九折</b>（規模經濟）！</p>
        ${rows}
        <div class="footer"><span>合共：<b>${money(total)}</b>　你有：${money(S.cash)}</span>
        <button class="primary" data-act="buy" ${total === 0 ? 'disabled' : ''}>確認入貨</button></div>`,
    };
  },

  shop() {
    const tab = PANELS._shopTab || 'price';
    const tabs = [['price', '定價'], ['upgrade', '升級'], ['open', '開舖營業']]
      .map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('');
    let body = '';
    if (tab === 'price') {
      body = `<p class="lead">定價好重要！太貴冇人買，太平就賺唔到錢。睇住「購買意欲」同「每件利潤」嚟搵最好嘅價錢。</p>` +
        unlockedIds().map(id => {
          const p = PRODUCTS[id], price = S.prices[id];
          const cost = S.stock[id] > 0 ? S.avgCost[id] : S.costs[id];
          return `<div class="card">
            <div class="row"><b class="pname" style="--c:${p.color}">${p.name}</b><span>售價 <b id="pv-${id}">${money(price)}</b></span></div>
            <input type="range" min="1" max="${Math.round(p.refPrice * 2.5)}" value="${price}" data-price="${id}">
            <div class="row small"><span>每件成本：約 ${money(cost)}</span><span id="pm-${id}">${marginText(price, cost)}</span></div>
            <div class="meter"><div id="pb-${id}" style="width:${Math.round(buyProb(price, refPrice(id)) * 100)}%"></div><label>購買意欲</label></div>
          </div>`;
        }).join('');
    } else if (tab === 'upgrade') {
      body = `<p class="lead">賺到錢可以<b>再投資</b>落盤生意度，令將來賺得更多！</p>` +
        Object.values(UPGRADES).map(u => {
          const owned = S.upgrades[u.id];
          return `<div class="card"><div class="row"><b>${u.name}</b><span>${money(u.price)}</span></div>
            <div class="row small"><span>${u.desc}</span>
            ${owned ? '<span class="owned">已擁有</span>' : `<button data-act="upgrade" data-id="${u.id}">購買</button>`}</div></div>`;
        }).join('');
    } else {
      const list = unlockedIds().map(id => `<li>${PRODUCTS[id].name}：存貨 <b>${S.stock[id]}</b>，售價 <b>${money(S.prices[id])}</b></li>`).join('');
      const totalStock = unlockedIds().reduce((a, id) => a + S.stock[id], 0);
      const ads = S.todayAds.length ? S.todayAds.map(a => ADS[a].name).join('、') : '冇';
      body = `<p class="lead">準備好就開舖！營業時間 9:00 – 21:00。收舖時要交租 <b>${money(DAILY_RENT)}</b>（固定成本）。</p>
        <div class="card"><ul class="checklist">${list}</ul>
        <div class="row small"><span>今日天氣：${WEATHERS[S.weather].name}</span><span>今日廣告：${ads}</span></div></div>
        ${totalStock === 0 ? '<p class="warn">你仲未有存貨！先去「街市批發」入貨啦。</p>' : ''}
        <div class="footer"><span></span><button class="primary big" data-act="open" ${S.opened ? 'disabled' : ''}>開舖！</button></div>`;
    }
    return { title: `${S.shopName}`, html: `<div class="tabs">${tabs}</div>${body}` };
  },

  bank() {
    const interest = Math.round(S.loan * BANK.loanRate);
    return {
      title: '金銀島銀行',
      html: `<p class="lead">存款每日有 <b>${BANK.savingRate * 100}%</b> 利息；借錢每日要付 <b>${BANK.loanRate * 100}%</b> 利息（最多借 ${money(BANK.maxLoan)}）。</p>
        <div class="card"><div class="row"><b>存款</b><span>${money(S.savings)}</span></div>
          <div class="row small"><span>明日利息：+${money(S.savings * BANK.savingRate)}</span></div>
          <div class="row qty">
            <button data-act="deposit" data-n="50">存 $50</button><button data-act="deposit" data-n="100">存 $100</button><button data-act="deposit" data-n="all">全部存入</button>
            <button data-act="withdraw" data-n="50">提 $50</button><button data-act="withdraw" data-n="all">全部提取</button>
          </div></div>
        <div class="card"><div class="row"><b>貸款</b><span>${money(S.loan)}</span></div>
          <div class="row small"><span>每日利息：-${money(interest)}</span></div>
          <div class="row qty">
            <button data-act="borrow" data-n="50">借 $50</button><button data-act="borrow" data-n="100">借 $100</button>
            <button data-act="repay" data-n="50">還 $50</button><button data-act="repay" data-n="all">全部還清</button>
          </div></div>
        <p class="tip">小知識：淨資產 = 現金 + 存款 − 貸款 = <b>${money(netWorth())}</b></p>`,
    };
  },

  ads() {
    const rows = Object.values(ADS).map(a => {
      const active = S.todayAds.includes(a.id);
      const label = a.id === 'board' && S.boardDays > 0 ? `生效中（仲有 ${S.boardDays} 日）` : active ? '今日已購買' : '';
      return `<div class="card"><div class="row"><b>${a.name}</b><span>${money(a.price)}</span></div>
        <div class="row small"><span>${a.desc}</span>${label ? `<span class="owned">${label}</span>` : `<button data-act="ad" data-id="${a.id}">購買</button>`}</div></div>`;
    }).join('');
    return {
      title: '廣告公司',
      html: `<p class="lead">廣告可以吸引更多客人，但要計數：<b>多咗嘅利潤</b>有冇多過<b>廣告費</b>？呢個叫「投資回報」。</p>${rows}`,
    };
  },

  school() {
    const L = LESSONS[(S.day - 1) % LESSONS.length];
    const quiz = S.quizDone
      ? `<p class="tip">今日已經答咗喇！聽日再嚟學新嘢。</p>`
      : `<div class="quiz"><p><b>問題：</b>${L.q}</p>${L.options.map((o, i) => `<button data-act="answer" data-i="${i}">${'ABCD'[i]}. ${o}</button>`).join('')}</div>
         <p class="small">答啱有 $20 獎金同聲譽 +2！</p>`;
    const book = S.learned.length ? S.learned.map(t => `<span class="chip">${t}</span>`).join('') : '<span class="small">仲未學到嘢</span>';
    return {
      title: '創業學堂',
      html: `<div class="card lesson"><div class="row"><b>今日一課：${L.topic}</b></div><p>${L.text}</p></div>
        ${quiz}
        <div class="card"><div class="row"><b>知識簿（${S.learned.length}/${LESSONS.length}）</b></div><div class="chips">${book}</div></div>
        <div class="footer"><span></span><button data-act="help">遊戲說明</button></div>`,
    };
  },

  report() {
    const r = biz.report;
    const prodRows = Object.keys(r.sold).map(id => `<tr><td>${PRODUCTS[id].name}</td><td>${r.sold[id]}</td><td>${money(S.prices[id])}</td><td>${money(r.revenue[id])}</td></tr>`).join('');
    const line = (k, v, cls = '') => `<tr class="${cls}"><td>${k}</td><td>${v}</td></tr>`;
    return {
      title: `第 ${S.day} 日 營業報告`,
      html: `<table class="tbl"><tr><th>產品</th><th>賣出</th><th>售價</th><th>收入</th></tr>${prodRows}</table>
        <table class="tbl money">
          ${line('總收入', money(r.totalRevenue), 'pos')}
          ${line('貨品成本（賣出咗嗰啲）', '-' + money(r.cogs))}
          ${line('舖租（固定成本）', '-' + money(DAILY_RENT))}
          ${r.ads ? line('廣告費', '-' + money(r.ads)) : ''}
          ${r.spoil ? line(`存貨損耗（${r.spoilUnits} 件變壞）`, '-' + money(r.spoil)) : ''}
          ${r.interest ? line('貸款利息', '-' + money(r.interest)) : ''}
          ${r.saveInt ? line('存款利息', '+' + money(r.saveInt), 'pos') : ''}
          ${line('今日利潤', money(r.profit), r.profit >= 0 ? 'total pos' : 'total neg')}
        </table>
        <div class="row small"><span>客人買唔到（賣晒）：${r.missed} 人</span><span>嫌貴唔買：${r.tooExp} 人</span><span>聲譽 ${r.repDelta >= 0 ? '+' : ''}${r.repDelta}</span></div>
        <div class="tip">${r.tips.map(t => `<p>${t}</p>`).join('')}</div>
        ${r.emergency ? `<p class="warn">現金唔夠交租，銀行自動借咗 ${money(r.emergency)} 畀你。</p>` : ''}
        <div class="footer"><span>淨資產：<b>${money(netWorth())}</b></span><button class="primary" data-act="nextday">${S.day >= GAME_DAYS ? '睇最終結果' : '下一日'}</button></div>`,
    };
  },

  help() {
    return {
      title: '遊戲說明',
      html: `<div class="card"><p><b>目標：</b>喺 ${GAME_DAYS} 日內，由 ${money(START_CASH)} 開始，將<b>淨資產</b>做到 ${money(GOAL)} 或以上！</p></div>
        <div class="card"><p><b>每日流程：</b></p><ol>
        <li>睇新聞同天氣，估下今日會有幾多客。</li>
        <li>去<b>街市批發</b>入貨。</li>
        <li>去<b>我的小店</b>定價，再「開舖營業」。</li>
        <li>可以去<b>廣告公司</b>賣廣告、<b>銀行</b>存錢或借錢。</li>
        <li>每日去<b>創業學堂</b>學一課，答啱有獎金！</li></ol></div>
        <div class="card"><p><b>操作：</b>方向鍵 / WASD 行路，E / 空格 / Enter 入店。手機同滑鼠可以直接㩒想去嘅地方或者間舖。</p></div>
        <div class="card"><p><b>提示：</b></p><ul>${TIPS_GENERAL.map(t => `<li>${t}</li>`).join('')}</ul></div>`,
    };
  },

  end() {
    const nw = netWorth();
    const stars = STAR_LEVELS.filter(v => nw >= v).length;
    const maxP = Math.max(10, ...S.history.map(h => Math.abs(h.profit)));
    const bars = S.history.map(h => `<div class="bar ${h.profit < 0 ? 'neg' : ''}" style="height:${Math.round(Math.abs(h.profit) / maxP * 100)}%" title="第${h.day}日 ${money(h.profit)}"></div>`).join('');
    const msg = stars === 3 ? '你係天生嘅創業家！' : stars === 2 ? '好犀利！你達成咗目標！' : stars === 1 ? '唔錯！再試下可以做得更好！' : '做生意唔容易，分析下原因再挑戰啦！';
    return {
      title: '最終成績',
      html: `<div class="stars">${[0, 1, 2].map(i => `<span class="star ${i < stars ? 'on' : ''}"></span>`).join('')}</div>
        <p class="lead center">${msg}</p>
        <table class="tbl money">
          <tr><td>最終淨資產</td><td><b>${money(nw)}</b></td></tr>
          <tr><td>目標</td><td>${money(GOAL)}</td></tr>
          <tr><td>總共賣出</td><td>${S.totalSold} 件</td></tr>
          <tr><td>學到嘅知識</td><td>${S.learned.length}/${LESSONS.length}</td></tr>
          <tr><td>最終聲譽</td><td>${Math.round(S.rep)}</td></tr>
        </table>
        <p class="small">每日利潤：</p><div class="chart">${bars}</div>
        <div class="footer"><span></span><button class="primary" data-act="restart">再玩一次</button></div>`,
    };
  },
};
PANELS._shopTab = 'price';

function marginText(price, cost) {
  const m = price - cost;
  return m > 0 ? `每件利潤：<b class="pos">+${money(m)}</b>` : `<b class="neg">每件蝕 ${money(-m)}！</b>`;
}

const ACTIONS = {
  qty(d) {
    const id = d.id, n = +d.n;
    cart[id] = clamp((cart[id] || 0) + n, 0, 300);
    Sound.play('blip'); renderPanel();
  },
  buy() {
    let total = 0;
    for (const [id, q] of Object.entries(cart)) total += Math.round(q * S.costs[id] * (q >= 30 ? 0.9 : 1));
    if (total > S.cash) return toast('現金唔夠！可以少買啲，或者去銀行借錢。', true);
    for (const [id, q] of Object.entries(cart)) {
      if (!q) continue;
      const sub = Math.round(q * S.costs[id] * (q >= 30 ? 0.9 : 1));
      S.avgCost[id] = (S.stock[id] * S.avgCost[id] + sub) / (S.stock[id] + q);
      S.stock[id] += q;
    }
    S.cash -= total; cart = {};
    Sound.play('buy'); toast(`入貨成功！用咗 ${money(total)}`);
    player.carry = C.gold;
    renderPanel(); save();
  },
  tab(d) { PANELS._shopTab = d.tab; Sound.play('blip'); renderPanel(); },
  upgrade(d) {
    const u = UPGRADES[d.id];
    if (S.cash < u.price) return toast('現金唔夠！', true);
    S.cash -= u.price; S.upgrades[u.id] = true;
    if (u.unlock) S.unlocked[u.unlock] = true;
    Sound.play('levelup'); toast(`購買咗「${u.name}」！`);
    renderPanel(); save();
  },
  open() {
    if (S.opened) return;
    const totalStock = unlockedIds().reduce((a, id) => a + S.stock[id], 0);
    if (totalStock === 0) return toast('冇貨點開舖呀？先去街市批發入貨！', true);
    panel = null; panelEl.className = 'panel hidden';
    startBusiness();
  },
  deposit(d) {
    const n = d.n === 'all' ? S.cash : Math.min(+d.n, S.cash);
    if (n <= 0) return toast('冇現金可以存。', true);
    S.cash -= n; S.savings += n; Sound.play('coin'); renderPanel();
  },
  withdraw(d) {
    const n = d.n === 'all' ? S.savings : Math.min(+d.n, S.savings);
    if (n <= 0) return toast('冇存款可以提。', true);
    S.savings -= n; S.cash += n; Sound.play('coin'); renderPanel();
  },
  borrow(d) {
    const n = Math.min(+d.n, BANK.maxLoan - S.loan);
    if (n <= 0) return toast(`最多只可以借 ${money(BANK.maxLoan)}。`, true);
    S.loan += n; S.cash += n; Sound.play('coin'); toast(`借咗 ${money(n)}，記住每日要付利息！`); renderPanel();
  },
  repay(d) {
    const n = Math.min(d.n === 'all' ? S.loan : +d.n, S.loan, S.cash);
    if (n <= 0) return toast(S.loan <= 0 ? '你冇欠錢！' : '現金唔夠還。', true);
    S.loan -= n; S.cash -= n; Sound.play('coin'); renderPanel();
  },
  ad(d) {
    const a = ADS[d.id];
    if (S.todayAds.includes(a.id)) return;
    if (S.cash < a.price) return toast('現金唔夠！', true);
    S.cash -= a.price; S.adSpend += a.price; S.todayAds.push(a.id);
    if (a.rep) S.rep = clamp(S.rep + a.rep, 0, 100);
    if (a.id === 'board') S.boardDays = a.days;
    Sound.play('buy'); toast(`買咗「${a.name}」！`);
    renderPanel(); save();
  },
  answer(d) {
    const L = LESSONS[(S.day - 1) % LESSONS.length];
    S.quizDone = true;
    const ok = +d.i === L.answer;
    if (ok) {
      S.cash += 20; S.rep = clamp(S.rep + 2, 0, 100);
      if (!S.learned.includes(L.topic)) S.learned.push(L.topic);
      Sound.play('right');
    } else Sound.play('wrong');
    renderPanel();
    panelBody.insertAdjacentHTML('afterbegin', `<div class="result ${ok ? 'ok' : 'no'}"><b>${ok ? '答啱！+$20' : '答錯喇！'}</b> 正確答案：${L.options[L.answer]}<br>${L.explain}</div>`);
    save();
  },
  help() { panel = 'help'; renderPanel(); Sound.play('select'); },
  nextday() {
    panel = null; panelEl.className = 'panel hidden';
    biz = null; mode = 'play';
    Sound.setTrack('town');
    if (S.day >= GAME_DAYS) { S.day++; save(); endGame(); return; }
    S.day++;
    rollDay(); updateHUD();
    player.x = 455; player.y = 196; player.dir = 'down';
    morningNews();
  },
  restart() { localStorage.removeItem('lb_save'); location.reload(); },
};

panelBody.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  ACTIONS[b.dataset.act]?.(b.dataset);
});
panelBody.addEventListener('input', e => {
  const id = e.target.dataset.price;
  if (!id) return;
  const price = +e.target.value;
  S.prices[id] = price;
  const cost = S.stock[id] > 0 ? S.avgCost[id] : S.costs[id];
  $('#pv-' + id).textContent = money(price);
  $('#pm-' + id).innerHTML = marginText(price, cost);
  $('#pb-' + id).style.width = Math.round(buyProb(price, refPrice(id)) * 100) + '%';
  if (Math.random() < 0.5) Sound.play('blip');
});
$('#panel-close').addEventListener('click', () => { if (panel !== 'report' && panel !== 'end') closePanel(); });

// ---------- 營業模擬 ----------
function startBusiness() {
  S.opened = true;
  mode = 'business';
  Sound.setTrack('shop'); Sound.play('bell');
  player.x = 478; player.y = 184; player.dir = 'down'; player.moving = false; player.target = null; player.carry = null;
  npcs = [];
  const customers = [];
  const stats = { sold: {}, revenue: {}, missed: 0, tooExp: 0, fair: 0, gouge: 0 };
  for (const id of unlockedIds()) {
    stats.sold[id] = 0; stats.revenue[id] = 0;
    const n = Math.round(trafficFor(id) * (0.85 + Math.random() * 0.3));
    const prob = buyProb(S.prices[id], refPrice(id));
    for (let i = 0; i < n; i++) {
      const buys = Math.random() < prob;
      const tooExp = !buys && prob < 0.4 && S.prices[id] > refPrice(id);
      if (!buys && !tooExp && Math.random() < 0.6) continue;
      customers.push({ product: id, buys, tooExp, spawn: Math.random() * (buys ? 0.85 : 0.95) });
    }
  }
  customers.sort((a, b) => a.spawn - b.spawn);
  biz = { t: 0, duration: 34, queue: customers, active: [], stats, done: false };
  $('#biz-bar').classList.remove('hidden');
  updateBizBar();
}

function spawnCustomer(c) {
  const fromLeft = Math.random() < 0.5;
  const ch = {
    x: fromLeft ? camX - 12 : camX + VW + 12, y: 198 + Math.random() * 34,
    dir: fromLeft ? 'right' : 'left', frame: 0, animT: 0, moving: true,
    pal: randomPalette(), speed: 28 + Math.random() * 18, fromLeft,
    product: c.product, buys: c.buys, tooExp: c.tooExp,
    state: (c.buys || c.tooExp) ? 'approach' : 'pass',
    tx: 455 + (Math.random() - 0.5) * 36, wait: 0, bubble: null,
  };
  ch.laneY = ch.y;
  ch.exitX = fromLeft ? camX + VW + 20 : camX - 20;
  if (ch.state === 'pass') ch.tx = ch.exitX;
  biz.active.push(ch);
}

function moveToward(ch, tx, ty, dt) {
  const dx = tx - ch.x, dy = ty - ch.y, d = Math.hypot(dx, dy);
  const s = ch.speed * dt;
  if (d <= s) { ch.x = tx; ch.y = ty; return true; }
  ch.x += dx / d * s; ch.y += dy / d * s;
  if (Math.abs(dx) > Math.abs(dy)) ch.dir = dx > 0 ? 'right' : 'left'; else ch.dir = dy > 0 ? 'down' : 'up';
  return false;
}

function animate(ch, dt) {
  if (!ch.moving) { ch.frame = 0; return; }
  ch.animT += dt;
  if (ch.animT > 0.14) { ch.animT = 0; ch.frame = ch.frame === 1 ? 2 : 1; }
}

function updateBusiness(dt) {
  dt *= speed;
  const b = biz;
  b.t = Math.min(1.25, b.t + dt / b.duration);
  while (b.queue.length && b.queue[0].spawn <= b.t) spawnCustomer(b.queue.shift());
  for (const ch of b.active) {
    ch.moving = true;
    if (ch.bubble) { ch.bubble.t -= dt; if (ch.bubble.t <= 0) ch.bubble = null; }
    switch (ch.state) {
      case 'approach':
        if (moveToward(ch, ch.tx, ch.laneY, dt)) {
          if (ch.buys) ch.state = 'up';
          else { ch.state = 'think'; ch.wait = 0.9; ch.bubble = { text: pick(['太貴喇！', '咁貴？', '唔抵！']), t: 1.2 }; ch.dir = 'up'; b.stats.tooExp++; }
        }
        break;
      case 'think':
        ch.moving = false; ch.wait -= dt;
        if (ch.wait <= 0) { ch.state = 'pass'; ch.tx = ch.exitX; }
        break;
      case 'up':
        if (moveToward(ch, ch.tx, 186, dt)) { ch.state = 'wait'; ch.wait = 0.5; ch.dir = 'up'; }
        break;
      case 'wait':
        ch.moving = false; ch.wait -= dt;
        if (ch.wait <= 0) { transact(ch); ch.state = 'down'; }
        break;
      case 'down':
        if (moveToward(ch, ch.tx, ch.laneY, dt)) { ch.state = 'pass'; ch.tx = ch.exitX; }
        break;
      case 'pass':
        if (moveToward(ch, ch.exitX, ch.laneY, dt)) ch.gone = true;
        break;
    }
    animate(ch, dt);
  }
  b.active = b.active.filter(c => !c.gone);
  if (b.t >= 1 && !b.queue.length && !b.active.some(c => c.state === 'up' || c.state === 'wait' || c.state === 'approach')) {
    if (!b.done) { b.done = true; setTimeout(endBusiness, 800); }
  }
  updateBizBar();
}

function transact(ch) {
  const id = ch.product, st = biz.stats;
  if (S.stock[id] > 0) {
    S.stock[id]--;
    const price = S.prices[id];
    st.sold[id]++; st.revenue[id] += price;
    S.cash += price;
    if (st.sold[id] % 3 === 0) updateHUD();
    if (price <= refPrice(id) * 1.05) st.fair++;
    else if (price > refPrice(id) * 1.3) st.gouge++;
    ch.carry = PRODUCTS[id].color;
    ch.bubble = { text: pick(['好味！', '多謝！', '正！', '再嚟！']), t: 1 };
    floaters.push({ x: ch.x, y: ch.y - 26, text: '+' + money(price), color: C.goldL, t: 1.1 });
    Sound.play('sale');
  } else {
    st.missed++;
    ch.bubble = { text: `冇${PRODUCTS[id].name}？`, t: 1.3 };
    Sound.play('sad');
  }
}

function updateBizBar() {
  const hour = 9 + Math.min(1, biz.t) * 12;
  const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60 / 10) * 10;
  $('#biz-clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const sold = Object.values(biz.stats.sold).reduce((a, b) => a + b, 0);
  const rev = Object.values(biz.stats.revenue).reduce((a, b) => a + b, 0);
  $('#biz-sold').textContent = `賣出 ${sold}`;
  $('#biz-rev').textContent = `收入 ${money(rev)}`;
  $('#biz-stock').textContent = unlockedIds().map(id => `${PRODUCTS[id].name} ${S.stock[id]}`).join('　');
  $('#biz-speed').textContent = `快進 ×${speed}`;
}

function endBusiness() {
  $('#biz-bar').classList.add('hidden');
  Sound.play('dayEnd');
  const st = biz.stats;
  const totalRevenue = Object.values(st.revenue).reduce((a, b) => a + b, 0);
  let cogs = 0;
  for (const id of unlockedIds()) cogs += st.sold[id] * S.avgCost[id];
  const sold = Object.values(st.sold).reduce((a, b) => a + b, 0);
  // 損耗
  const rate = S.upgrades.fridge ? 0.1 : 0.5;
  let spoil = 0, spoilUnits = 0;
  for (const id of unlockedIds()) {
    const lost = Math.floor(S.stock[id] * rate);
    spoilUnits += lost; spoil += lost * S.avgCost[id];
    S.stock[id] -= lost;
    if (S.stock[id] === 0) S.avgCost[id] = 0;
  }
  const interest = Math.round(S.loan * BANK.loanRate);
  const saveInt = Math.round(S.savings * BANK.savingRate);
  S.cash -= DAILY_RENT + interest;
  S.savings += saveInt;
  let emergency = 0;
  if (S.cash < 0) { emergency = -S.cash; S.loan += emergency; S.cash = 0; }
  // 聲譽
  let repDelta = st.fair * 0.12 - st.gouge * 0.05 - st.missed * 0.4 - st.tooExp * 0.03;
  if (S.upgrades.decor) repDelta += 1;
  repDelta = Math.round(clamp(repDelta, -10, 8));
  S.rep = clamp(S.rep + repDelta, 0, 100);
  if (S.boardDays > 0) S.boardDays--;
  const profit = Math.round(totalRevenue - cogs - DAILY_RENT - S.adSpend - spoil - interest + saveInt);
  S.totalSold += sold;
  S.history.push({ day: S.day, profit, revenue: totalRevenue });
  // 分析提示
  const tips = [];
  for (const id of unlockedIds()) if (S.prices[id] < S.avgCost[id] && st.sold[id] > 0) tips.push(`${PRODUCTS[id].name}嘅售價低過成本！賣得越多蝕得越多。`);
  if (st.missed >= 4) tips.push(`有 ${st.missed} 個客人想買但你已經賣晒，可以考慮多入啲貨。`);
  if (st.tooExp >= 5) tips.push(`有 ${st.tooExp} 個客人嫌貴，試下調低少少價錢？`);
  if (spoilUnits >= 5) tips.push(`有 ${spoilUnits} 件貨賣唔晒變壞咗。估準啲需求，或者買「大雪櫃」減少損耗。`);
  if (S.adSpend > 0) tips.push(`今日用咗 ${money(S.adSpend)} 賣廣告，想想帶嚟嘅利潤值唔值？`);
  if (S.loan > 0) tips.push(`你仲欠銀行 ${money(S.loan)}，每日利息 ${money(S.loan * BANK.loanRate)}。有錢記得還！`);
  if (profit > 0 && tips.length === 0) tips.push('做得好！今日有利潤，繼續保持！');
  if (!tips.length) tips.push(pick(TIPS_GENERAL));
  biz.report = { sold: st.sold, revenue: st.revenue, totalRevenue, cogs: Math.round(cogs), ads: S.adSpend, spoil: Math.round(spoil), spoilUnits, interest, saveInt, profit, missed: st.missed, tooExp: st.tooExp, repDelta, tips, emergency };
  speed = 1;
  save(); updateHUD();
  if (profit > 0) Sound.play('coin');
  panel = 'report'; panelEl.className = 'panel theme-shop'; renderPanel();
}

function endGame() {
  mode = 'end';
  Sound.play('win');
  panel = 'end'; panelEl.className = 'panel theme-school'; renderPanel();
}

// ---------- 主角移動 ----------
function nearBuilding() {
  if (mode !== 'play') return null;
  return BUILDINGS.find(b => Math.abs(player.x - b.door) < 16 && player.y < 192) || null;
}

function interact() {
  if (dialog) return advanceDialog();
  if (panel || mode !== 'play') return;
  const b = nearBuilding();
  if (b) { player.dir = 'up'; openPanel(b.id); }
}

function updatePlayer(dt) {
  let vx = 0, vy = 0;
  if (keys.ArrowLeft || keys.KeyA) vx -= 1;
  if (keys.ArrowRight || keys.KeyD) vx += 1;
  if (keys.ArrowUp || keys.KeyW) vy -= 1;
  if (keys.ArrowDown || keys.KeyS) vy += 1;
  const sp = 78;
  if (vx || vy) {
    player.target = null; player.autoEnter = null;
    const d = Math.hypot(vx, vy);
    player.x += vx / d * sp * dt; player.y += vy / d * sp * dt;
    player.dir = Math.abs(vx) >= Math.abs(vy) && vx ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
    player.moving = true;
  } else if (player.target) {
    const p = { ...player, speed: sp };
    const arrived = moveToward(p, player.target.x, player.target.y, dt);
    player.x = p.x; player.y = p.y; player.dir = p.dir; player.moving = !arrived;
    if (arrived) {
      player.target = null;
      if (player.autoEnter) { const id = player.autoEnter; player.autoEnter = null; player.dir = 'up'; openPanel(id); }
    }
  } else player.moving = false;
  player.x = clamp(player.x, 8, WW - 8);
  player.y = clamp(player.y, WALK_MIN_Y, WALK_MAX_Y);
  animate(player, dt);
  if (player.moving) { player.stepT -= dt; if (player.stepT <= 0) { player.stepT = 0.28; Sound.play('step'); } }
}

function updateAmbient(dt) {
  if (npcs.length < 5 && Math.random() < dt * 0.5) {
    const fromLeft = Math.random() < 0.5;
    npcs.push({ x: fromLeft ? -10 : WW + 10, y: 198 + Math.random() * 34, dir: fromLeft ? 'right' : 'left', frame: 0, animT: 0, moving: true, pal: randomPalette(), speed: 20 + Math.random() * 20, tx: fromLeft ? WW + 20 : -20 });
  }
  for (const n of npcs) { if (moveToward(n, n.tx, n.y, dt)) n.gone = true; animate(n, dt); }
  npcs = npcs.filter(n => !n.gone);
}

// ---------- 輸入 ----------
window.addEventListener('keydown', e => {
  Sound.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && e.target.tagName !== 'INPUT') e.preventDefault();
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') interact();
  if (e.code === 'Escape' && panel && panel !== 'report' && panel !== 'end') closePanel();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

canvas.addEventListener('pointerdown', e => {
  Sound.init();
  if (dialog) return advanceDialog();
  if (mode !== 'play' || panel) return;
  const rect = canvas.getBoundingClientRect();
  const wx = (e.clientX - rect.left) / rect.width * VW + camX;
  const wy = (e.clientY - rect.top) / rect.height * VH;
  if (wy < BASE_Y + 8) {
    const b = BUILDINGS.reduce((best, b) => Math.abs(b.door - wx) < Math.abs(best.door - wx) ? b : best);
    if (Math.abs(b.door - wx) < 80) { player.target = { x: b.door, y: WALK_MIN_Y }; player.autoEnter = b.id; return; }
  }
  player.target = { x: clamp(wx, 8, WW - 8), y: clamp(wy - 4, WALK_MIN_Y, WALK_MAX_Y) };
  player.autoEnter = null;
});
$('#dialog').addEventListener('pointerdown', () => advanceDialog());
$('#btn-action').addEventListener('click', () => interact());
$('#btn-music').addEventListener('click', () => { Sound.init(); Sound.toggleMusic(); updateHUD(); });
$('#btn-sfx').addEventListener('click', () => { Sound.init(); Sound.toggleSfx(); updateHUD(); Sound.play('select'); });
$('#btn-help').addEventListener('click', () => { if (mode === 'play' && !dialog) { panel = 'help'; panelEl.className = 'panel theme-school'; renderPanel(); Sound.play('select'); } });
$('#biz-speed').addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; Sound.play('blip'); updateBizBar(); });

// ---------- 開始畫面 ----------
function setupTitle() {
  const saved = load();
  if (saved && saved.day <= GAME_DAYS) {
    $('#btn-continue').classList.remove('hidden');
    $('#btn-continue').textContent = `繼續（第 ${saved.day} 日）`;
  }
  $('#btn-start').addEventListener('click', () => {
    Sound.init(); Sound.play('select');
    const name = $('#in-name').value.trim() || '阿明';
    const shop = ([...$('#in-shop').value.trim()].slice(0, 4).join('')) || '小老闆';
    S = newState(name, shop);
    startGame(true);
  });
  $('#btn-continue').addEventListener('click', () => {
    Sound.init(); Sound.play('select');
    S = Object.assign(newState('', ''), saved);
    startGame(false);
  });
}

function startGame(fresh) {
  world = buildWorld(S.shopName);
  $('#title').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  $('#controls').classList.remove('hidden');
  mode = 'play';
  player.x = 455; player.y = 200;
  if (fresh) rollDay();
  updateHUD();
  if (fresh) {
    startDialog([
      { who: '老師傅', text: `${S.name}，歡迎嚟到小老闆大街！我係創業學堂嘅老師傅。` },
      { who: '老師傅', text: `你有 ${GAME_DAYS} 日時間，由 ${money(START_CASH)} 開始經營你嘅小店「${S.shopName}」。目標係淨資產去到 ${money(GOAL)}！` },
      { who: '老師傅', text: '每日先去左邊嘅「街市批發」入貨，再返「我的小店」定價同開舖。' },
      { who: '老師傅', text: '仲可以去右邊嘅「銀行」存錢借錢、「廣告公司」宣傳，同埋每日嚟我度學一課！' },
      { who: '老師傅', text: '用方向鍵或者㩒畫面行路，行到門口按 E 或者㩒「入去」就得。加油！' },
    ], morningNews);
  } else if (S.opened) {
    // 舊存檔喺開舖後中斷：直接去下一日
    ACTIONS.nextday();
  } else morningNews();
}

// ---------- 繪畫 ----------
function buildSky() {
  const [c, sg] = newCanvas(VW, 130);
  const a = hexToRgb(C.sky1), b = hexToRgb(C.sky2);
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    sg.fillStyle = `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
    sg.fillRect(0, i * 12, VW, 12);
  }
  return c;
}

function darkness() {
  if (mode !== 'business' || !biz) return 0;
  const hour = 9 + Math.min(1, biz.t) * 12;
  return clamp((hour - 17.5) / 3.5, 0, 1);
}

function render() {
  if (!world) return;
  const cx = Math.round(camX);
  g.drawImage(skyCanvas, 0, 0);
  drawClouds(g, cx, time);
  g.drawImage(world.bg, cx, 0, VW, VH, 0, 0, VW, VH);

  const glow = 0.5 + 0.5 * Math.sin(time * 4);
  const neonOn = Math.sin(time * 3) > -0.6;
  neonArrow(g, 392 - cx, 82, 1, '#ff8a3c', neonOn ? glow + 0.4 : 0, time);
  neonArrow(g, 518 - cx, 82, -1, '#4cc9f0', neonOn ? glow + 0.4 : 0, time + 1);
  // 霓虹「廣告公司」
  const flick = Math.random() < 0.03 ? 0.2 : 1;
  pixelText(g, '廣告公司', 856 - cx, 96, 14, flick > 0.5 ? '#ff6ac0' : '#7a3a5a', { align: 'center', bold: true, outline: flick > 0.5 ? '#ff6ac066' : null });
  // 電視
  for (const l of world.lights) if (l.tv) {
    const k = Math.floor(time * 2 + l.x) % 4;
    R(g, l.x - cx, l.y, l.w, l.h, ['#4cc9f0', '#f2c14e', '#e86a9a', '#7ac050'][k]);
    R(g, l.x - cx + 2, l.y + 2, 4, 3, '#ffffffaa');
  }
  // 店舖狀態牌
  const open = mode === 'business';
  R(g, 455 - cx, 148, 1, 3, C.outline);
  R(g, 455 - cx - 13, 151, 27, 11, C.outline);
  R(g, 455 - cx - 12, 152, 25, 9, open ? '#3fae5a' : '#a8423a');
  pixelText(g, open ? 'OPEN' : 'CLOSE', 455 - cx + 1, 151, 8, '#fff', { align: 'center' });

  // 角色
  const chars = [...npcs];
  if (biz) chars.push(...biz.active);
  if (mode !== 'title') chars.push(player);
  chars.sort((a, b) => a.y - b.y);
  for (const ch of chars) if (ch.x > cx - 20 && ch.x < cx + VW + 20) drawCharacter(g, ch, cx);

  g.drawImage(world.fg, cx, 0, VW, VH, 0, 0, VW, VH);
  drawBillboard(g, cx, S && S.boardDays > 0, S ? S.shopName : '', time);

  // 天氣
  if (S && mode !== 'title') {
    if (S.weather === 'rain') {
      g.fillStyle = '#30405a33'; g.fillRect(0, 0, VW, VH);
      while (rain.length < 120) rain.push({ x: Math.random() * VW, y: Math.random() * VH, s: 160 + Math.random() * 80 });
      g.fillStyle = '#d8e8f8aa';
      for (const d of rain) { g.fillRect(Math.round(d.x), Math.round(d.y), 1, 4); d.y += d.s / 60; d.x -= d.s / 400; if (d.y > VH) { d.y = -4; d.x = Math.random() * VW; } }
    } else if (S.weather === 'hot') { g.fillStyle = '#ffb04014'; g.fillRect(0, 0, VW, VH); }
    else if (S.weather === 'cold') { g.fillStyle = '#80a0ff18'; g.fillRect(0, 0, VW, VH); }
  }

  // 黃昏同夜晚
  const dk = darkness();
  if (mode === 'business' && biz) {
    const hour = 9 + Math.min(1, biz.t) * 12;
    const dusk = clamp(1 - Math.abs(hour - 18) / 2.5, 0, 1);
    if (dusk > 0) { g.fillStyle = `rgba(255,120,60,${dusk * 0.18})`; g.fillRect(0, 0, VW, VH); }
  }
  if (dk > 0) {
    g.fillStyle = `rgba(20,24,70,${dk * 0.55})`; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'lighter';
    for (const l of world.lights) {
      if (l.x + l.w < cx || l.x > cx + VW) continue;
      g.fillStyle = l.cool ? `rgba(120,200,255,${dk * 0.5})` : `rgba(255,200,110,${dk * 0.55})`;
      g.fillRect(l.x - cx, l.y, l.w, l.h);
    }
    for (const lx of [212, 470, 620, 890]) {
      for (const [r, a] of [[16, 0.05], [10, 0.06], [5, 0.08]]) disc(g, lx - cx, 214, r, `rgba(255,220,140,${dk * a})`);
      g.fillStyle = `rgba(255,240,180,${dk * 0.7})`; g.fillRect(lx - cx - 3, 213, 7, 4);
    }
    g.globalCompositeOperation = 'source-over';
  }

  // 對話泡泡同浮動文字
  for (const ch of chars) if (ch.bubble) bubble(g, ch.x - cx, ch.y - 22, ch.bubble.text);
  for (const f of floaters) pixelText(g, f.text, f.x - cx, f.y, 10, f.color, { align: 'center', bold: true, outline: C.outline });

  // 入店提示
  const nb = !panel && !dialog ? nearBuilding() : null;
  if (nb) {
    const bob = Math.round(Math.sin(time * 6) * 1.5);
    bubble(g, nb.door - cx, 160 + bob, `E 入去 ${nb.name}`, { bg: '#fff3c0' });
  }
  $('#btn-action').classList.toggle('hidden', !nb);
  if (nb) $('#btn-action').textContent = `入去${nb.name}`;
  if (player.target && mode === 'play') {
    const tx = player.target.x - cx, ty = player.target.y;
    if (!player.autoEnter) { R(g, tx - 2, ty, 5, 1, '#fff8'); R(g, tx, ty - 2, 1, 5, '#fff8'); }
  }
}

// ---------- 主循環 ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  if (mode === 'title') {
    camX = 240 + Math.sin(time * 0.12) * 230;
    updateAmbient(dt);
  } else {
    if (mode === 'play' && !panel && !dialog) updatePlayer(dt);
    if (mode === 'play') updateAmbient(dt);
    if (mode === 'business' && biz) updateBusiness(dt);
    const target = mode === 'business' ? 455 - VW / 2 : player.x - VW / 2;
    camX += (clamp(target, 0, WW - VW) - camX) * Math.min(1, dt * 6);
  }
  for (const f of floaters) { f.t -= dt; f.y -= dt * 18; }
  floaters = floaters.filter(f => f.t > 0);
  updateDialog(dt);
  render();
  requestAnimationFrame(loop);
}

function fit() {
  const s = Math.min(window.innerWidth / VW, (window.innerHeight - 4) / VH);
  const wrap = $('#wrap');
  wrap.style.width = Math.floor(VW * s) + 'px';
  wrap.style.height = Math.floor(VH * s) + 'px';
  wrap.style.setProperty('--ui', clamp(s / 2.6, 0.62, 1.25));
}
window.addEventListener('resize', fit);

function boot() {
  fit();
  skyCanvas = buildSky();
  world = buildWorld('小老闆');
  setupTitle();
  requestAnimationFrame(loop);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
