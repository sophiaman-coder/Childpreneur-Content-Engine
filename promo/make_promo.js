// 用真實遊戲畫面錄製 10 秒宣傳片
// 用法：node make_promo.js [wide|tall]   （需要先喺 game/ 開 http server，見 README）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LAYOUT = process.argv[2] || 'wide';
const URL = process.env.GAME_URL || 'http://localhost:8123/index.html';
const CHROME = process.env.CHROME || '/usr/local/bin/google-chrome';
const FPS = 30, DURATION = 10, FRAMES = FPS * DURATION;
const OUT = path.join(__dirname, 'output');
const TMP = path.join(OUT, 'frames-' + LAYOUT);

const VIEW = LAYOUT === 'tall'
  ? { width: 1080, height: 1920, clip: { x: 0, y: 0, width: 1080, height: 1920 } }
  : { width: 1920, height: 1084, clip: { x: 0, y: 2, width: 1920, height: 1080 } };

// 虛擬時鐘：令每一格畫面都準確對齊時間
const VIRTUAL_TIME = `
  (() => {
    let vt = 0, seed = 20261013, timers = [], tid = 1;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    performance.now = () => vt;
    window.requestAnimationFrame = cb => { window.__raf = cb; return 1; };
    window.setTimeout = (fn, ms = 0) => { timers.push({ at: vt + ms, fn, id: tid }); return tid++; };
    window.clearTimeout = id => { timers = timers.filter(t => t.id !== id); };
    window.__vt = () => vt;
    window.__step = ms => {
      vt += ms;
      const due = timers.filter(t => t.at <= vt); timers = timers.filter(t => t.at > vt);
      due.forEach(t => t.fn());
      const cb = window.__raf; window.__raf = null; if (cb) cb(vt);
    };
  })();
`;

const OVERLAY_CSS = `
  body { background: radial-gradient(circle at 50% 40%, #3a4a80, #1a1420 75%) !important; }
  #promo { position: fixed; inset: 0; pointer-events: none; z-index: 50; font-family: "WenQuanYi Micro Hei","Noto Sans TC",sans-serif; }
  #promo .card { position: absolute; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  #promo-title { top: 50%; background: #fff3d6f2; border: 10px solid #2a1e1e; box-shadow: inset 0 0 0 8px #f2c14e, 14px 14px 0 #0009; padding: 34px 70px; }
  #promo-title .sub { display: inline-block; background: #2e3f6e; color: #fff; font-size: 40px; padding: 4px 22px; font-weight: bold; }
  #promo-title h1 { white-space: nowrap; margin: 10px 0 0; font-size: 150px; color: #d8442f; letter-spacing: 12px; text-shadow: 8px 8px 0 #2a1e1e, -3px -3px 0 #ffe58a; line-height: 1.15; }
  #promo-title .en { color: #3d8f8a; font-weight: bold; letter-spacing: 14px; font-size: 34px; }
  #promo-cap { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap;
    background: #d8442f; color: #fff; font-weight: bold; font-size: 64px; padding: 14px 44px; border: 8px solid #2a1e1e;
    box-shadow: inset 0 -8px 0 #9a2a22, 10px 10px 0 #0008; text-shadow: 5px 5px 0 #2a1e1e; }
  #promo-cap b { color: #ffe58a; }
  #promo-end { inset: 0; position: absolute; background: #1a1420d9; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; }
  #promo-end h1 { margin: 0; font-size: 170px; color: #f2c14e; letter-spacing: 14px; text-shadow: 10px 10px 0 #9a2a22, 18px 18px 0 #2a1e1e; }
  #promo-end .slogan { font-size: 76px; color: #fff; font-weight: bold; text-shadow: 6px 6px 0 #2a1e1e; }
  #promo-end .pill { background: #3fae5a; color: #fff; font-size: 52px; font-weight: bold; padding: 12px 46px; border: 8px solid #2a1e1e; box-shadow: inset 0 -8px 0 #2a7a3a, 10px 10px 0 #0008; }
  #promo-end .brand { color: #e8c88a; font-size: 36px; letter-spacing: 6px; margin-top: 10px; }
  .tall #hud { display: none !important; }
  .tall #promo-title { top: 50%; padding: 30px 40px; }
  .tall #promo-title h1 { font-size: 132px; }
  .tall #promo-end h1 { font-size: 150px; }
  .tall #promo-end .slogan { font-size: 72px; }
  .tall #promo-top { position: absolute; top: 110px; left: 0; right: 0; text-align: center; }
  .tall #promo-top .t1 { font-size: 110px; font-weight: bold; color: #f2c14e; letter-spacing: 10px; text-shadow: 8px 8px 0 #9a2a22, 14px 14px 0 #000; }
  .tall #promo-top .t2 { font-size: 50px; color: #fff; font-weight: bold; margin-top: 16px; text-shadow: 4px 4px 0 #000; }
  .tall #promo-bottom { position: absolute; bottom: 110px; left: 0; right: 0; text-align: center; color: #fff; font-size: 46px; font-weight: bold; text-shadow: 4px 4px 0 #000; line-height: 1.6; }
`;

const OVERLAY_HTML = `
  <div id="promo">
    <div id="promo-top"><div class="t1">小老闆大街</div><div class="t2">兒童創業遊戲 · 9–18 歲</div></div>
    <div id="promo-bottom">入貨 · 定價 · 宣傳 · 理財<br>20 日將小店做大做強！</div>
    <div id="promo-title" class="card"><span class="sub">兒童創業模擬遊戲</span><h1>小老闆大街</h1><div class="en">LITTLE BOSS STREET</div></div>
    <div id="promo-cap"></div>
    <div id="promo-end">
      <h1>小老闆大街</h1>
      <div class="slogan">邊玩邊學創業！</div>
      <div class="pill">9–18 歲 · 免費網頁遊戲</div>
      <div class="brand">CHILDPRENEUR ACADEMY</div>
    </div>
  </div>
`;

// 每格畫面執行嘅劇本（喺瀏覽器入面行）
function sceneScript(t, layout) {
  const P = window.__promo;
  const $ = s => document.querySelector(s);
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
  const once = (k, fn) => { if (!P.done[k]) { P.done[k] = true; fn(); } };
  P.t = t;

  once('setup', () => {
    $('#title').classList.add('hidden');
    S = newState('阿明', '錢屋');
    Object.assign(S, { weather: 'sunny', event: null, cash: 200, rep: 85, boardDays: 3, todayAds: ['board'], tutorialDone: true });
    S.costs = { lemontea: 4, eggwaffle: 6, pineapplebun: 8 };
    S.unlocked.eggwaffle = true;
    world = buildWorld(S.shopName);
    for (let i = 0; i < 6; i++) {
      const fromLeft = i % 2 === 0;
      npcs.push({ x: 60 + i * 140, y: 200 + (i * 13) % 30, dir: fromLeft ? 'right' : 'left', frame: 0, animT: 0, moving: true, pal: randomPalette(), speed: 24 + i * 3, tx: fromLeft ? WW + 20 : -20 });
    }
    Sound.play('dayStart');
  });

  // 0–2 秒：標題 + 鏡頭橫移
  const title = $('#promo-title');
  const tp = ease(t / 0.35);
  title.style.display = t < 2 ? 'block' : 'none';
  title.style.transform = `translate(-50%, -50%) scale(${0.6 + 0.4 * tp}) rotate(${(1 - tp) * -4}deg)`;
  title.style.opacity = t > 1.8 ? (2 - t) / 0.2 : tp;
  if (t < 2) window.__cam = 20 + ease(t / 2) * 195;

  // 2 秒：主角行去街市入貨
  once('walk', () => {
    if (t < 2) return (P.done.walk = false);
    window.__cam = null;
    mode = 'play';
    $('#hud').classList.remove('hidden');
    player.x = 318; player.y = 200; player.target = { x: 247, y: WALK_MIN_Y }; player.autoEnter = 'market';
    updateHUD();
    Sound.play('select');
  });
  if (t >= 3.25 && panel === 'market') once('cart', () => { cart = { lemontea: 30, eggwaffle: 10 }; renderPanel(); Sound.play('blip'); });
  if (P.done.cart && t >= 3.6) once('buy', () => ACTIONS.buy());
  if (t >= 4.0) once('close', () => closePanel());

  // 4.1 秒：開舖
  if (t >= 4.1) once('open', () => {
    S.prices = { lemontea: 12, eggwaffle: 18, pineapplebun: 24 };
    startBusiness();
    biz.duration = 8.4; biz.done = true; speed = 2.5;
    const spawn = spawnCustomer;
    spawnCustomer = c => {
      spawn(c);
      const ch = biz.active[biz.active.length - 1];
      if (ch.buys) ch.x = ch.fromLeft ? 455 - 40 - Math.random() * 150 : 455 + 40 + Math.random() * 150;
    };
    biz.queue.forEach(c => { if (c.buys) c.spawn *= 0.55; });
    biz.queue.sort((a, b) => a.spawn - b.spawn);
  });

  // 7.4 秒：營業報告
  if (t >= 7.4) once('report', () => { for (const ch of biz.active) ch.gone = true; endBusiness(); });

  // 8.7 秒：結尾
  const end = $('#promo-end');
  end.style.display = t >= 8.7 ? 'flex' : 'none';
  if (t >= 8.7) {
    once('win', () => Sound.play('win'));
    const e = ease((t - 8.7) / 0.4);
    end.style.opacity = e;
    end.querySelector('h1').style.transform = `scale(${0.7 + 0.3 * e})`;
  }

  // 字幕
  const caps = [
    [2.0, 4.05, '① 去<b>街市</b>入貨'],
    [4.1, 7.35, '② 定好價錢　<b>開舖賺錢！</b>'],
    [7.4, 8.7, '③ 睇報告　學識<b>成本同利潤</b>'],
  ];
  const cap = $('#promo-cap');
  const c = caps.find(([a, b]) => t >= a && t < b);
  cap.style.display = c ? 'block' : 'none';
  if (c) {
    if (cap.dataset.k !== c[2]) { cap.innerHTML = c[2]; cap.dataset.k = c[2]; }
    const k = ease((t - c[0]) / 0.25);
    cap.style.opacity = k;
    if (layout === 'tall') { cap.style.top = '1500px'; cap.style.bottom = ''; }
    else { cap.style.bottom = (60 + (1 - k) * -40) + 'px'; cap.style.top = ''; }
    cap.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * k})`;
  }
  const top = $('#promo-top'), bottom = $('#promo-bottom');
  top.style.display = bottom.style.display = layout === 'tall' && t >= 2 && t < 8.7 ? 'block' : 'none';
}

function wavFromChannels(chs, sr) {
  const n = chs[0].length, nc = chs.length, buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chs[c][i] * 32767))), o); o += 2; }
  return buf;
}

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: VIEW.width, height: VIEW.height });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.evaluateOnNewDocument(VIRTUAL_TIME);
  await page.evaluateOnNewDocument(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__raf);
  await page.addStyleTag({ content: OVERLAY_CSS });
  await page.evaluate((html, layout) => {
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.classList.add(layout);
    if (layout === 'tall') {
      const wrap = document.querySelector('#wrap');
      wrap.style.width = '1778px'; wrap.style.height = '1000px'; wrap.style.flex = 'none';
      wrap.style.setProperty('--ui', 1.25);
    }
    window.__promo = { done: {}, cues: [], t: 0 };
    Sound.play = name => window.__promo.cues.push({ at: window.__promo.t, name });
    const origRender = render;
    render = function () { if (window.__cam != null) camX = window.__cam; origRender(); };
  }, OVERLAY_HTML, LAYOUT);

  const scene = `(${sceneScript.toString()})`;
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FPS;
    await page.evaluate((src, t, layout) => { eval(src)(t, layout); window.__step(1000 / 30); }, scene, t, LAYOUT);
    await page.screenshot({ path: path.join(TMP, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92, clip: VIEW.clip, captureBeyondViewport: false });
    if (f % 30 === 0) process.stdout.write(`frame ${f}/${FRAMES}\n`);
  }

  // 音效：同一時間太多「叮」聲會好嘈，限制密度
  const audio = await page.evaluate(async (dur) => {
    const last = {};
    const cues = window.__promo.cues.filter(c => {
      if (c.name === 'sale' || c.name === 'step') { if (c.at - (last[c.name] ?? -1) < 0.09) return false; last[c.name] = c.at; }
      return !['talk', 'error'].includes(c.name);
    });
    const buf = await Sound.renderOffline(dur, cues, [{ at: 0, track: 'town' }, { at: 4.1, track: 'shop' }, { at: 8.7, track: null }]);
    return { sr: buf.sampleRate, ch: [Array.from(buf.getChannelData(0)), Array.from(buf.getChannelData(1))], n: cues.length };
  }, DURATION);
  console.log('audio cues:', audio.n);
  const wav = path.join(TMP, 'audio.wav');
  fs.writeFileSync(wav, wavFromChannels(audio.ch, audio.sr));
  await browser.close();

  const out = path.join(OUT, `little-boss-street-promo-${LAYOUT}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(TMP, 'f%04d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('done:', out);
})();
