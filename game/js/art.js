// 像素美術：全部用程式逐點繪畫，風格參考日系/港式懷舊街景
const VW = 480, VH = 270, WW = 960;
const BASE_Y = 172;          // 建築物底部
const WALK_MIN_Y = 180, WALK_MAX_Y = 242;
const FONT = '"WenQuanYi Micro Hei","Noto Sans TC","PingFang HK","Microsoft JhengHei","Heiti TC",sans-serif';

const C = {
  outline: '#2a1e1e',
  sky1: '#4fb0e0', sky2: '#c9eef3',
  cloud: '#ffffff', cloudS: '#d6eef6',
  grass: '#6fae4a', grassD: '#4c8a3a', grassL: '#9ccf5a',
  leaf: '#4f9a3c', leafD: '#2f6a32', leafL: '#8cc850', leafLL: '#c3e070',
  brick: '#c8673c', brickD: '#94432a', brickL: '#e08a52',
  wood: '#6a432c', woodD: '#4a2c1e', woodL: '#8e5e3a',
  navy: '#2e3f6e', navyD: '#1f2b4e', navyL: '#4a64a0',
  teal: '#3d8f8a', tealD: '#2a6664', tealL: '#68b8a8',
  red: '#d8442f', redD: '#9a2a22', redL: '#f07050',
  gold: '#f2c14e', goldD: '#c08a2a', goldL: '#ffe58a',
  cream: '#f3e2b8', creamD: '#d6bf8c',
  stone: '#d8d0bf', stoneD: '#aea48e', stoneL: '#eee8d8',
  glass: '#5aa0c8', glassD: '#386e98', glassL: '#a8dcf0',
  road: '#b3a58c', roadD: '#9c8e76', roadL: '#c8bba0',
  walk: '#dccaa4', walkD: '#c5b088', walkL: '#ecdcba',
  curb: '#e8e2d2', curbD: '#a89c86',
  pink: '#e86a9a', pinkD: '#a8426a', purple: '#6a4a8e', purpleD: '#4a3268', purpleL: '#9a78c0',
};

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const P = (g, x, y, c) => R(g, x, y, 1, 1, c);

function makeRand(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function disc(g, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
    R(g, cx - w, cy + y, w * 2 + 1, 1, c);
  }
}

function newCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  return [c, g];
}

// ---------- 像素文字（去鋸齒變硬邊，好似點陣字） ----------
const textCache = new Map();
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function textCanvas(text, size, color, bold) {
  // 細字用粗體會糊埋一嚿，所以細過 14px 一律用正常字重
  bold = bold && size >= 14;
  const key = text + '|' + size + '|' + color + '|' + bold;
  if (textCache.has(key)) return textCache.get(key);
  const font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  const [c, g] = newCanvas(4, 4);
  g.font = font;
  const w = Math.max(2, Math.ceil(g.measureText(text).width) + 2), h = size + 4;
  c.width = w; c.height = h;
  g.font = font; g.textBaseline = 'top'; g.fillStyle = '#fff';
  g.fillText(text, 1, 1);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  const [r, gg, b] = hexToRgb(color);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] > 100 ? 255 : 0;
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
  }
  g.putImageData(id, 0, 0);
  if (textCache.size > 600) textCache.clear();
  textCache.set(key, c);
  return c;
}
function pixelText(g, text, x, y, size, color, opt = {}) {
  text = String(text);
  if (opt.vertical) {
    const chars = [...text];
    chars.forEach((ch, i) => pixelText(g, ch, x, y + i * (size + (opt.gap ?? 1)), size, color, { ...opt, vertical: false, align: 'center' }));
    return;
  }
  const c = textCanvas(text, size, color, opt.bold);
  let dx = x;
  if (opt.align === 'center') dx = x - c.width / 2;
  else if (opt.align === 'right') dx = x - c.width;
  dx = Math.round(dx); const dy = Math.round(y);
  if (opt.outline) {
    const o = textCanvas(text, size, opt.outline, opt.bold);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) g.drawImage(o, dx + ox, dy + oy);
  }
  if (opt.shadow) g.drawImage(textCanvas(text, size, opt.shadow, opt.bold), dx + 1, dy + 1);
  g.drawImage(c, dx, dy);
  return c.width;
}

// ---------- 建築零件 ----------
function bricks(g, x, y, w, h, base, dark, light, rand) {
  R(g, x, y, w, h, base);
  for (let row = 0; row * 4 < h; row++) {
    const yy = y + row * 4;
    R(g, x, yy + 3, w, 1, dark);
    const off = row % 2 ? 4 : 0;
    for (let xx = x - off; xx < x + w; xx += 8) {
      if (xx >= x) R(g, xx, yy, 1, 3, dark);
      if (rand() < 0.12) R(g, Math.max(x, xx + 2), yy, 4, 1, light);
      if (rand() < 0.05) R(g, Math.max(x, xx + 1), yy + 1, 6, 2, dark);
    }
  }
}

function tileRoof(g, x, y, w, h, c1, c2, trim, rand) {
  for (let i = 0; i < h; i++) {
    const spread = Math.round((i / h) * 8);
    const xx = x - spread, ww = w + spread * 2;
    R(g, xx, y + i, ww, 1, (Math.floor(i / 2) % 2) ? c1 : c2);
    for (let t = xx + (i % 4 < 2 ? 0 : 2); t < xx + ww; t += 5) P(g, t, y + i, C.outline + '55');
  }
  const by = y + h;
  R(g, x - 9, by, w + 18, 2, trim);
  for (let t = x - 8; t < x + w + 8; t += 5) { R(g, t, by + 2, 3, 2, trim); P(g, t + 1, by + 3, C.outline); }
  R(g, x - 2, y - 2, w + 4, 2, C.outline);
  R(g, x - 2, y - 2, w + 4, 1, c2);
  R(g, x - 5, y - 5, 3, 3, C.outline); R(g, x + w + 2, y - 5, 3, 3, C.outline);
  P(g, x - 6, y - 6, C.outline); P(g, x + w + 5, y - 6, C.outline);
}

function windowPane(g, x, y, w, h, opt = {}, lights) {
  const frame = opt.frame || C.woodD;
  R(g, x - 1, y - 1, w + 2, h + 2, C.outline);
  R(g, x, y, w, h, frame);
  R(g, x + 1, y + 1, w - 2, h - 2, opt.glass || C.glass);
  for (let i = 0; i < Math.min(w, h) - 2; i += 1) {
    if (i < 5) P(g, x + 2 + i, y + h - 3 - i, C.glassL);
  }
  R(g, x + 1, y + 1, w - 2, 2, C.glassD);
  if (opt.cross !== false) {
    R(g, x + Math.floor(w / 2), y + 1, 1, h - 2, frame);
    if (h > 12) R(g, x + 1, y + Math.floor(h / 2), w - 2, 1, frame);
  }
  if (opt.curtain) {
    R(g, x + 1, y + 1, 3, h - 2, opt.curtain); R(g, x + w - 4, y + 1, 3, h - 2, opt.curtain);
  }
  if (opt.sill) { R(g, x - 2, y + h + 1, w + 4, 2, opt.sill); R(g, x - 2, y + h + 3, w + 4, 1, C.outline + '88'); }
  if (opt.plant) {
    for (let i = 0; i < w; i += 3) { disc(g, x + i + 1, y + h - 1, 2, C.leaf); P(g, x + i, y + h - 2, C.leafL); }
  }
  if (lights) lights.push({ x: x + 1, y: y + 1, w: w - 2, h: h - 2 });
}

function shoji(g, x, y, w, h, lights) {
  R(g, x - 1, y - 1, w + 2, h + 2, C.outline);
  R(g, x, y, w, h, C.woodD);
  R(g, x + 1, y + 1, w - 2, h - 2, '#f6ecd0');
  for (let i = x + 4; i < x + w - 1; i += 4) R(g, i, y + 1, 1, h - 2, C.woodL);
  for (let j = y + 5; j < y + h - 1; j += 5) R(g, x + 1, j, w - 2, 1, C.woodL);
  if (lights) lights.push({ x: x + 1, y: y + 1, w: w - 2, h: h - 2, warm: true });
}

function awning(g, x, y, w, h, c1, c2) {
  for (let i = 0; i < w; i += 6) R(g, x + i, y, Math.min(6, w - i), h, (i / 6) % 2 ? c2 : c1);
  R(g, x, y, w, 1, C.outline);
  for (let i = 0; i < w; i += 6) {
    const c = (i / 6) % 2 ? c2 : c1;
    R(g, x + i + 1, y + h, 4, 1, c); R(g, x + i + 2, y + h + 1, 2, 1, c);
    P(g, x + i, y + h, C.outline);
  }
  R(g, x, y + h - 1, w, 1, '#00000022');
}

function signBoard(g, x, y, w, h, bg, border, text, fg, size, opt = {}) {
  R(g, x - 1, y - 1, w + 2, h + 2, C.outline);
  R(g, x, y, w, h, border);
  R(g, x + 1, y + 1, w - 2, h - 2, bg);
  R(g, x + 1, y + h - 2, w - 2, 1, '#00000033');
  if (text) pixelText(g, text, x + w / 2, y + (h - size) / 2 - 1, size, fg, { align: 'center', bold: opt.bold !== false, shadow: opt.shadow });
}

function vSign(g, x, y, w, h, bg, border, text, fg, size) {
  R(g, x - 1, y - 1, w + 2, h + 2, C.outline);
  R(g, x, y, w, h, border);
  R(g, x + 1, y + 1, w - 2, h - 2, bg);
  const n = [...text].length, gap = 2;
  const total = n * size + (n - 1) * gap;
  pixelText(g, text, x + w / 2, y + (h - total) / 2 - 1, size, fg, { vertical: true, gap, bold: true });
}

function door(g, x, y, w, h, color, opt = {}) {
  R(g, x - 2, y - 2, w + 4, h + 2, C.outline);
  R(g, x - 1, y - 1, w + 2, h + 1, opt.frame || C.woodD);
  R(g, x, y, w, h, color);
  R(g, x + Math.floor(w / 2), y, 1, h, C.outline);
  const pw = Math.floor(w / 2) - 3;
  if (opt.glass) {
    R(g, x + 2, y + 3, pw, Math.floor(h / 2), C.glassD); R(g, x + w - 2 - pw, y + 3, pw, Math.floor(h / 2), C.glassD);
    P(g, x + 3, y + 4, C.glassL); P(g, x + w - pw - 1, y + 4, C.glassL);
  } else if (opt.round) {
    disc(g, x + Math.floor(w / 4) + 1, y + 8, 3, C.glassD); disc(g, x + w - Math.floor(w / 4) - 1, y + 8, 3, C.glassD);
    P(g, x + Math.floor(w / 4), y + 7, C.glassL); P(g, x + w - Math.floor(w / 4) - 2, y + 7, C.glassL);
  }
  R(g, x + 2, y + h - 12, pw, 8, '#00000022'); R(g, x + w - 2 - pw, y + h - 12, pw, 8, '#00000022');
  R(g, x + Math.floor(w / 2) - 2, y + Math.floor(h / 2) + 2, 1, 3, C.gold);
  R(g, x + Math.floor(w / 2) + 2, y + Math.floor(h / 2) + 2, 1, 3, C.gold);
  R(g, x - 4, y + h, w + 8, 2, C.stoneD); R(g, x - 6, y + h + 2, w + 12, 2, C.stone);
  R(g, x - 6, y + h + 3, w + 12, 1, C.stoneD);
}

function star(g, x, y, c) {
  const pat = ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'x.....x'];
  pat.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') P(g, x + i, y + j, c); }));
  P(g, x + 3, y + 2, C.goldL);
}

function pottedPlant(g, x, y, rand, big) {
  R(g, x - 4, y - 6, 9, 6, C.outline); R(g, x - 3, y - 6, 7, 5, C.brick); R(g, x - 3, y - 6, 7, 1, C.brickL);
  const n = big ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const px = x + Math.round((rand() - 0.5) * (big ? 12 : 8)), py = y - 8 - Math.round(rand() * (big ? 12 : 6));
    disc(g, px, py, big ? 3 : 2, C.leafD); disc(g, px, py - 1, big ? 2 : 1, C.leaf); P(g, px - 1, py - 2, C.leafL);
  }
}

function foliage(g, cx, cy, w, h, rand, pal = [C.leafD, C.leaf, C.leafL, C.leafLL]) {
  const n = Math.floor((w * h) / 18);
  const blobs = [];
  for (let i = 0; i < n; i++) blobs.push([cx + (rand() - 0.5) * w, cy + (rand() - 0.5) * h, 2 + Math.floor(rand() * 4)]);
  blobs.forEach(([x, y, r]) => disc(g, Math.round(x), Math.round(y) + 1, r + 1, C.outline + '66'));
  blobs.forEach(([x, y, r]) => disc(g, Math.round(x), Math.round(y), r, pal[0]));
  blobs.forEach(([x, y, r]) => disc(g, Math.round(x) - 1, Math.round(y) - 1, Math.max(1, r - 1), pal[1]));
  blobs.forEach(([x, y, r]) => { if (rand() < 0.6) disc(g, Math.round(x) - 2, Math.round(y) - 2, Math.max(0, r - 3), pal[2]); });
  blobs.forEach(([x, y]) => { if (rand() < 0.3) P(g, Math.round(x) - 2, Math.round(y) - 3, pal[3]); });
}

function pineTree(g, x, baseY, rand) {
  R(g, x - 2, baseY - 30, 4, 30, C.woodD); R(g, x - 1, baseY - 30, 1, 30, C.woodL);
  R(g, x, baseY - 22, 10, 2, C.woodD); R(g, x - 10, baseY - 34, 9, 2, C.woodD);
  const pads = [[x + 12, baseY - 26, 10, 5], [x - 12, baseY - 38, 12, 6], [x + 4, baseY - 44, 14, 7], [x - 2, baseY - 54, 10, 6]];
  pads.forEach(([px, py, w, h]) => foliage(g, px, py, w * 1.6, h * 1.4, rand, [C.leafD, '#3e8a4a', '#6cb058', '#a8d870']));
}

function palmTree(g, x, baseY, rand) {
  for (let i = 0; i < 46; i++) {
    const xx = x + Math.round(Math.sin(i / 14) * 4);
    R(g, xx - 2, baseY - i, 5, 1, i % 4 < 2 ? '#8a6a44' : '#a8845a');
    P(g, xx - 2, baseY - i, C.outline);
  }
  const tx = x + Math.round(Math.sin(46 / 14) * 4), ty = baseY - 46;
  const fronds = [[-1, -0.3], [1, -0.3], [-0.8, 0.5], [0.8, 0.5], [0, -1], [-0.4, 0.9], [0.4, 0.9]];
  fronds.forEach(([dx, dy]) => {
    for (let t = 0; t < 20; t++) {
      const fx = tx + dx * t, fy = ty + dy * t * 0.6 + (t * t) / 40;
      R(g, fx - 1, fy - 1, 3, 2, t % 3 ? C.leaf : C.leafD);
      if (t % 2) P(g, fx, fy - 1, C.leafL);
    }
  });
  disc(g, tx, ty + 2, 2, '#8a5a2a');
}

function hedge(g, x, y, w, h, rand, flowers) {
  R(g, x, y + h - 2, w, 3, C.outline + '55');
  foliage(g, x + w / 2, y + h / 2, w, h, rand, ['#3a7a3a', '#55a048', '#86c656', '#bfe27a']);
  if (flowers) for (let i = 0; i < w / 4; i++) {
    const fx = x + rand() * w, fy = y + rand() * h * 0.7;
    disc(g, Math.round(fx), Math.round(fy), 1, flowers); P(g, Math.round(fx), Math.round(fy), '#fff4');
  }
}

function lampPost(g, x, baseY) {
  R(g, x - 3, baseY - 4, 7, 4, C.navyD);
  R(g, x - 1, baseY - 44, 3, 40, '#3a4a5a'); R(g, x, baseY - 44, 1, 40, '#6a7a8a');
  R(g, x - 5, baseY - 52, 11, 2, C.outline); R(g, x - 4, baseY - 50, 9, 6, '#3a4a5a');
  R(g, x - 3, baseY - 49, 7, 4, '#fff6c8');
  R(g, x - 4, baseY - 54, 9, 2, '#3a4a5a'); P(g, x, baseY - 55, '#3a4a5a');
}

function beetleCar(g, x, baseY) {
  const y = baseY - 26;
  R(g, x + 2, baseY - 2, 52, 3, '#0004');
  R(g, x + 4, y + 10, 48, 13, C.outline);
  R(g, x + 5, y + 11, 46, 11, '#eceee8');
  R(g, x + 12, y + 1, 30, 11, C.outline); R(g, x + 13, y + 2, 28, 10, '#eceee8');
  R(g, x + 15, y + 3, 11, 7, C.glassD); R(g, x + 28, y + 3, 11, 7, C.glassD);
  R(g, x + 16, y + 4, 3, 2, C.glassL); R(g, x + 29, y + 4, 3, 2, C.glassL);
  R(g, x + 5, y + 16, 46, 1, '#c8ccc4');
  R(g, x + 3, y + 19, 4, 3, '#b0b4ac'); R(g, x + 49, y + 19, 4, 3, '#b0b4ac');
  disc(g, x + 6, y + 14, 2, '#fff6c0');
  for (const wx of [x + 14, x + 42]) { disc(g, wx, baseY - 4, 4, C.outline); disc(g, wx, baseY - 4, 2, '#8a8a8a'); }
}

function bench(g, x, baseY) {
  R(g, x, baseY - 12, 28, 3, C.woodL); R(g, x, baseY - 9, 28, 1, C.woodD);
  R(g, x, baseY - 7, 28, 3, C.wood); R(g, x + 2, baseY - 4, 2, 4, C.outline); R(g, x + 24, baseY - 4, 2, 4, C.outline);
}

function bike(g, x, baseY) {
  for (const wx of [x + 4, x + 18]) {
    for (let a = 0; a < 16; a++) P(g, Math.round(wx + Math.cos(a / 16 * Math.PI * 2) * 5), Math.round(baseY - 5 + Math.sin(a / 16 * Math.PI * 2) * 5), C.outline);
  }
  R(g, x + 4, baseY - 6, 8, 1, C.red); R(g, x + 11, baseY - 11, 1, 6, C.red); R(g, x + 11, baseY - 11, 7, 1, C.red);
  R(g, x + 17, baseY - 13, 1, 8, C.red); R(g, x + 9, baseY - 12, 4, 1, C.outline); R(g, x + 15, baseY - 14, 4, 1, C.outline);
}

function vendingMachine(g, x, baseY, lights) {
  R(g, x - 1, baseY - 31, 18, 31, C.outline);
  R(g, x, baseY - 30, 16, 30, C.red); R(g, x, baseY - 30, 16, 2, C.redL);
  R(g, x + 2, baseY - 27, 12, 12, '#d8f0f8');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) R(g, x + 3 + i * 3, baseY - 26 + j * 6, 2, 4, [C.gold, C.teal, C.pink, C.leaf][(i + j) % 4]);
  R(g, x + 2, baseY - 10, 12, 4, C.outline);
  R(g, x + 12, baseY - 14, 2, 2, C.gold);
  if (lights) lights.push({ x: x + 2, y: baseY - 27, w: 12, h: 12, cool: true });
}

function acUnit(g, x, y) {
  R(g, x - 1, y - 1, 14, 10, C.outline); R(g, x, y, 12, 8, '#d8dcd8');
  for (let i = 1; i < 7; i += 2) R(g, x + 1, y + i, 7, 1, '#9aa09a');
  disc(g, x + 10, y + 4, 1, '#9aa09a');
}

function pipe(g, x, y, h) { R(g, x, y, 3, h, '#8a8a90'); R(g, x, y, 1, h, '#b8b8c0'); for (let j = y; j < y + h; j += 14) R(g, x - 1, j, 5, 2, '#5a5a60'); }

function vines(g, x, y, w, len, rand) {
  for (let i = 0; i < w; i += 2) {
    const l = Math.floor(rand() * len);
    for (let j = 0; j < l; j++) P(g, x + i + (j % 3 === 0 ? 1 : 0), y + j, j % 2 ? C.leaf : C.leafD);
    if (l > 2) P(g, x + i, y + l, C.leafL);
  }
  foliage(g, x + w / 2, y, w, 6, rand);
}

function lantern(g, x, y) {
  R(g, x, y - 3, 1, 3, C.outline);
  R(g, x - 3, y, 7, 9, C.outline); R(g, x - 2, y + 1, 5, 7, C.red); R(g, x - 2, y + 2, 5, 1, C.redL);
  R(g, x - 1, y, 3, 1, C.gold); R(g, x - 1, y + 8, 3, 1, C.gold); R(g, x, y + 9, 1, 3, C.gold);
}

function crate(g, x, y, fruit, rand) {
  R(g, x - 1, y - 1, 18, 10, C.outline); R(g, x, y, 16, 8, C.woodL); R(g, x, y + 3, 16, 1, C.wood);
  for (let i = 0; i < 6; i++) disc(g, x + 2 + i * 2.4 + Math.round(rand()), y - 1 - Math.round(rand() * 2), 1, fruit);
  for (let i = 0; i < 4; i++) P(g, x + 3 + i * 3, y - 3, '#ffffffaa');
}

function railing(g, x, y, w, c = '#e8e8e0') {
  R(g, x, y, w, 2, c); R(g, x, y + 2, w, 1, C.outline + '88');
  for (let i = x; i < x + w; i += 4) R(g, i, y + 2, 1, 7, c);
  R(g, x, y + 9, w, 1, c);
}

function waterTank(g, x, y) {
  R(g, x - 1, y - 1, 20, 16, C.outline); R(g, x, y, 18, 14, '#7aa0b8'); R(g, x, y, 18, 2, '#a8c8d8');
  R(g, x + 2, y + 14, 2, 6, C.outline); R(g, x + 14, y + 14, 2, 6, C.outline);
}

// ---------- 建築物 ----------
function drawSchool(g, rand, lights) {
  const x = 16, w = 136, top = 100;
  R(g, x - 1, top - 1, w + 2, BASE_Y - top + 1, C.outline);
  R(g, x, top, w, BASE_Y - top, C.cream);
  for (let i = 0; i < w; i += 2) if (rand() < 0.3) P(g, x + i, top + Math.floor(rand() * 70), C.creamD);
  for (let bx = x; bx <= x + w; bx += 34) R(g, bx, top, 4, BASE_Y - top, C.wood);
  R(g, x, top + 22, w, 3, C.wood); R(g, x, BASE_Y - 6, w, 6, C.stoneD);
  tileRoof(g, x, 76, w, 24, '#356a6e', '#467e80', '#2a4e52', rand);
  signBoard(g, x + w / 2 - 38, top + 2, 76, 18, C.woodD, C.gold, '創業學堂', C.cream, 14, { bold: false });
  shoji(g, x + 18, top + 27, 26, 20, lights);
  shoji(g, x + w - 44, top + 27, 26, 20, lights);
  door(g, x + w / 2 - 14, BASE_Y - 36, 28, 36, C.woodL, { frame: C.woodD });
  [x + 8, x + w - 8].forEach(lx => lantern(g, lx, 104));
  vSign(g, x + 2, top + 26, 12, 44, C.red, C.gold, '老師傅', '#fff', 10);
  // 黑板
  const bx = x + w - 44;
  R(g, bx + 1, BASE_Y - 6, 2, 6, C.wood); R(g, bx + 23, BASE_Y - 6, 2, 6, C.wood);
  R(g, bx, BASE_Y - 25, 26, 20, C.outline); R(g, bx + 1, BASE_Y - 24, 24, 18, '#2f5a46');
  pixelText(g, '今日', bx + 13, BASE_Y - 26, 10, '#f0f0e0', { align: 'center' });
  pixelText(g, '一課', bx + 13, BASE_Y - 17, 10, '#f6e08a', { align: 'center' });
  pottedPlant(g, x + 26, BASE_Y + 2, rand, true);
}

function drawMarket(g, rand, lights) {
  const x = 172, w = 150, top = 92;
  R(g, x - 1, top - 1, w + 2, BASE_Y - top + 1, C.outline);
  bricks(g, x, top, w, BASE_Y - top, C.brick, C.brickD, C.brickL, rand);
  railing(g, x, top - 10, w);
  waterTank(g, x + 110, top - 26);
  foliage(g, x + 20, top - 6, 30, 10, rand);
  signBoard(g, x + 30, top + 4, 90, 18, C.gold, C.redD, '街市批發', C.redD, 13);
  windowPane(g, x + 8, top + 6, 16, 14, { sill: C.stone, plant: true }, lights);
  windowPane(g, x + w - 24, top + 6, 16, 14, { sill: C.stone }, lights);
  // 店內
  R(g, x + 6, top + 40, w - 12, BASE_Y - top - 40, '#3a2a24');
  for (let s = 0; s < 3; s++) {
    const sy = top + 48 + s * 10;
    R(g, x + 8, sy, 50, 2, C.woodL); R(g, x + w - 58, sy, 50, 2, C.woodL);
    for (let i = 0; i < 12; i++) {
      const cols = [C.gold, '#f5f0e0', '#e0a050', '#7ac050', C.red];
      disc(g, x + 11 + i * 4, sy - 2, 1, cols[(i + s) % cols.length]);
      disc(g, x + w - 55 + i * 4, sy - 2, 1, cols[(i + s * 2) % cols.length]);
    }
  }
  awning(g, x + 2, top + 28, w - 4, 12, '#3f9a5a', '#f4f0e0');
  R(g, x + w / 2 - 15, BASE_Y - 30, 30, 30, '#2a1e1a');
  R(g, x + w / 2 - 16, BASE_Y - 31, 32, 2, C.outline);
  pixelText(g, '歡迎', x + w / 2, BASE_Y - 26, 8, C.gold, { align: 'center' });
  R(g, x + w / 2 - 20, BASE_Y, 40, 3, C.stoneD);
  crate(g, x + 10, BASE_Y - 4, C.gold, rand);
  crate(g, x + 28, BASE_Y - 4, '#e07a3a', rand);
  crate(g, x + w - 44, BASE_Y - 4, '#7ac050', rand);
  crate(g, x + w - 26, BASE_Y - 4, C.red, rand);
  // 麵粉袋
  R(g, x + 52, BASE_Y - 12, 10, 12, C.outline); R(g, x + 53, BASE_Y - 11, 8, 11, '#f0e8d0');
  pixelText(g, '粉', x + 57, BASE_Y - 10, 8, C.redD, { align: 'center' });
}

function drawShop(g, rand, lights, shopName) {
  const x = 350, w = 210, cx = 455;
  // 天台
  railing(g, x + 18, 48, w - 36, '#f0ead8');
  foliage(g, x + 36, 50, 34, 12, rand);
  foliage(g, x + w - 36, 50, 34, 12, rand);
  // 中間塔
  R(g, cx - 31, 13, 62, 46, C.outline);
  R(g, cx - 30, 14, 60, 45, C.navy);
  R(g, cx - 30, 14, 60, 2, C.navyL);
  tileRoof(g, cx - 28, 4, 56, 8, '#d0603a', '#e07a48', C.redD, rand);
  signBoard(g, cx - 24, 18, 48, 14, C.gold, C.redD, '好味道', C.redD, 10);
  windowPane(g, cx - 22, 36, 12, 16, { frame: C.cream, curtain: C.redL }, lights);
  windowPane(g, cx + 10, 36, 12, 16, { frame: C.cream, curtain: C.redL }, lights);
  foliage(g, cx, 56, 50, 8, rand);
  // 上層
  R(g, x + 14, 57, w - 28, 44, C.outline);
  R(g, x + 15, 58, w - 30, 42, C.navy);
  R(g, x + 15, 58, w - 30, 3, C.cream);
  R(g, x + 15, 61, w - 30, 1, C.navyD);
  for (let i = 0; i < 6; i++) {
    const wx = x + 26 + i * 28; if (Math.abs(wx + 7 - cx) < 20) continue;
    windowPane(g, wx, 68, 14, 20, { frame: C.cream, sill: C.cream, plant: i % 2 === 0 }, lights);
    R(g, wx, 66, 14, 2, C.cream); R(g, wx + 2, 64, 10, 2, C.cream);
  }
  // 時鐘
  disc(g, cx, 76, 9, C.outline); disc(g, cx, 76, 8, C.gold); disc(g, cx, 76, 6, '#fffbe8');
  R(g, cx, 71, 1, 6, C.outline); R(g, cx, 76, 4, 1, C.outline);
  [[0, -5], [5, 0], [0, 5], [-5, 0]].forEach(([dx, dy]) => P(g, cx + dx, 76 + dy, C.outline));
  // 屋簷
  tileRoof(g, x + 8, 96, w - 16, 6, '#d0603a', '#e07a48', C.redD, rand);
  [x + 30, x + 62, x + w - 68, x + w - 36].forEach(sx => star(g, sx, 89, C.gold));
  // 下層
  R(g, x + 9, 104, w - 18, BASE_Y - 104, C.outline);
  bricks(g, x + 10, 104, w - 20, BASE_Y - 104, '#d47a40', '#a0502c', '#ec9a5a', rand);
  [x + 10, x + w - 22, cx - 30, cx + 18].forEach(px => {
    R(g, px, 104, 12, BASE_Y - 104, C.navy); R(g, px + 1, 104, 2, BASE_Y - 104, C.navyL); R(g, px + 10, 104, 2, BASE_Y - 104, C.navyD);
    R(g, px - 1, BASE_Y - 8, 14, 8, C.navyD); R(g, px - 1, 104, 14, 3, C.cream);
  });
  // 大招牌
  R(g, cx - 58, 107, 116, 26, C.outline);
  R(g, cx - 57, 108, 114, 24, C.gold);
  R(g, cx - 55, 110, 110, 20, C.red);
  for (let i = cx - 54; i < cx + 54; i += 3) { P(g, i, 111, C.redL); P(g, i + 1, 128, C.redD); }
  const nm = shopName || '小老闆';
  const size = [...nm].length <= 3 ? 16 : 14;
  pixelText(g, nm.split('').join(' '), cx, 112, size, '#fff3d0', { align: 'center', bold: true, shadow: C.redD });
  foliage(g, cx, 136, 40, 6, rand);
  // 窗
  windowPane(g, x + 30, 140, 22, 22, { frame: C.navyD, curtain: C.cream, sill: C.navyD }, lights);
  windowPane(g, x + w - 52, 140, 22, 22, { frame: C.navyD, curtain: C.cream, sill: C.navyD }, lights);
  // 門
  door(g, cx - 13, BASE_Y - 30, 26, 30, '#8a4a3a', { frame: C.navyD, round: true });
  R(g, cx - 13, BASE_Y - 34, 26, 3, C.gold);
  // 側招牌
  vSign(g, x - 4, 108, 14, 50, C.navyL, C.cream, '凍檸茶', '#fff', 11);
  vSign(g, x + w - 10, 108, 14, 50, C.teal, C.cream, '雞蛋仔', '#fff', 11);
  pottedPlant(g, cx - 22, BASE_Y + 3, rand, true);
  pottedPlant(g, cx + 22, BASE_Y + 3, rand, true);
}

function drawBank(g, rand, lights) {
  const x = 590, w = 150, top = 80, cx = x + w / 2;
  R(g, x - 1, top - 1, w + 2, BASE_Y - top + 1, C.outline);
  R(g, x, top, w, BASE_Y - top, C.stone);
  for (let j = top + 6; j < BASE_Y; j += 8) R(g, x, j, w, 1, C.stoneD);
  // 山牆
  for (let i = 0; i < 20; i++) R(g, cx - 4 - i * 4, top - 20 + i, 8 + i * 8, 1, i < 2 ? C.outline : (i % 6 === 0 ? C.stoneD : C.stoneL));
  R(g, x - 4, top - 1, w + 8, 3, C.stoneD); R(g, x - 4, top - 2, w + 8, 1, C.outline);
  disc(g, cx, top - 7, 6, C.outline); disc(g, cx, top - 7, 5, C.gold);
  pixelText(g, '$', cx, top - 13, 9, C.redD, { align: 'center', bold: true });
  // 柱
  for (let i = 0; i < 4; i++) {
    const px = x + 12 + i * 38;
    R(g, px - 1, top + 4, 10, BASE_Y - top - 4, C.outline);
    R(g, px, top + 4, 8, BASE_Y - top - 4, C.stoneL);
    R(g, px + 1, top + 4, 1, BASE_Y - top - 4, '#fff');
    R(g, px + 6, top + 4, 2, BASE_Y - top - 4, C.stoneD);
    R(g, px - 2, top + 4, 12, 3, C.stoneD); R(g, px - 2, BASE_Y - 4, 12, 4, C.stoneD);
  }
  signBoard(g, cx - 34, top + 8, 68, 16, C.tealD, C.gold, '銀行 BANK', C.goldL, 10);
  windowPane(g, x + 24, top + 32, 22, 26, { frame: C.stoneD }, lights);
  windowPane(g, x + w - 46, top + 32, 22, 26, { frame: C.stoneD }, lights);
  for (const wx of [x + 24, x + w - 46]) for (let i = 2; i < 22; i += 4) R(g, wx + i, top + 32, 1, 26, '#4a4a50');
  door(g, cx - 13, BASE_Y - 32, 26, 32, '#4a6a7a', { frame: C.stoneD, glass: true });
  vSign(g, x + w - 4, top + 6, 14, 52, C.teal, C.cream, '金銀島', '#fff', 10);
}

function drawAdAgency(g, rand, lights) {
  const x = 770, w = 172, top = 84;
  R(g, x - 1, top - 1, w + 2, BASE_Y - top + 1, C.outline);
  R(g, x, top, w, BASE_Y - top, '#c88ab0');
  for (let i = 0; i < 160; i++) P(g, x + rand() * w, top + rand() * (BASE_Y - top), '#b87aa0');
  R(g, x, top, w, 4, C.purple); R(g, x, BASE_Y - 8, w, 8, C.purpleD);
  // 天台衛星碟
  R(g, x + 20, top - 12, 2, 12, '#7a7a80'); disc(g, x + 20, top - 16, 6, C.outline); disc(g, x + 20, top - 16, 5, '#e0e0e8'); P(g, x + 20, top - 16, C.red);
  railing(g, x + 40, top - 10, 120);
  foliage(g, x + 140, top - 6, 30, 10, rand);
  // 霓虹招牌底
  R(g, x + 36, top + 8, 100, 22, C.outline); R(g, x + 37, top + 9, 98, 20, '#2a2238');
  // 電視
  for (let i = 0; i < 3; i++) {
    const tx = x + 14 + i * 22;
    R(g, tx - 1, top + 40, 18, 15, C.outline); R(g, tx, top + 41, 16, 13, '#3a3a44');
    lights.push({ x: tx + 2, y: top + 43, w: 12, h: 9, tv: true });
  }
  // 海報
  const posters = [[C.gold, C.red], [C.teal, '#fff'], [C.pink, C.navy], ['#7ac050', C.gold]];
  posters.forEach(([a, b], i) => {
    const px = x + w - 76 + i * 18, py = top + 38 + (i % 2) * 4;
    R(g, px - 1, py - 1, 15, 21, C.outline); R(g, px, py, 13, 19, a); disc(g, px + 6, py + 7, 3, b); R(g, px + 2, py + 13, 9, 2, b); R(g, px + 2, py + 16, 6, 1, b);
  });
  windowPane(g, x + 16, top + 64, 34, 22, { frame: C.purpleD }, lights);
  windowPane(g, x + w - 50, top + 64, 34, 22, { frame: C.purpleD }, lights);
  door(g, x + w / 2 - 13, BASE_Y - 32, 26, 32, C.purpleL, { frame: C.purpleD, glass: true });
  acUnit(g, x + 60, top + 60); acUnit(g, x + 100, top + 62);
  pottedPlant(g, x + 66, BASE_Y + 3, rand, false);
  pottedPlant(g, x + 106, BASE_Y + 3, rand, false);
}

function drawBackground(g, rand) {
  // 遠景樓（天空同雲喺主循環動態畫）
  let bx = -10;
  while (bx < WW) {
    const bw = 30 + Math.floor(rand() * 50), bh = 40 + Math.floor(rand() * 70);
    const col = rand() < 0.5 ? '#a6bccb' : '#b9c8d2';
    R(g, bx, BASE_Y - bh - 30, bw, bh + 30, col);
    R(g, bx, BASE_Y - bh - 30, bw, 2, '#d0dce4');
    for (let wy = BASE_Y - bh - 24; wy < BASE_Y - 20; wy += 8)
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 7) if (rand() < 0.7) R(g, wx, wy, 3, 4, '#8aa2b4');
    if (rand() < 0.4) waterTank(g, bx + 6, BASE_Y - bh - 46);
    if (rand() < 0.5) { R(g, bx + bw - 8, BASE_Y - bh - 44, 1, 14, '#6a7a8a'); R(g, bx + bw - 12, BASE_Y - bh - 40, 9, 1, '#6a7a8a'); }
    bx += bw + Math.floor(rand() * 6);
  }
  // 中景樹
  for (let tx = 0; tx < WW; tx += 40 + rand() * 40) foliage(g, tx, 92 + rand() * 20, 50, 26, rand, ['#4a8a4a', '#5e9e52', '#82bc62', '#a8d47a']);
  // 後牆
  R(g, 0, 120, WW, BASE_Y - 120, '#c9b896');
  for (let i = 0; i < WW; i += 12) R(g, i, 120, 1, BASE_Y - 120, '#b4a27e');
  R(g, 0, 118, WW, 3, '#a89676');
  railing(g, 0, 108, WW, '#d8d4c8');
}

function drawAlleys(g, rand, lights) {
  pineTree(g, 162, BASE_Y, rand);
  pipe(g, 168, 104, 68);
  vines(g, 322, 96, 28, 30, rand);
  vendingMachine(g, 328, BASE_Y, lights);
  foliage(g, 575, 100, 34, 40, rand);
  R(g, 573, 120, 3, 52, C.woodD);
  R(g, 566, BASE_Y - 22, 12, 16, C.outline); R(g, 567, BASE_Y - 21, 10, 14, C.red); R(g, 568, BASE_Y - 18, 8, 2, C.outline); R(g, 571, BASE_Y - 6, 2, 6, C.outline);
  acUnit(g, 744, 110); acUnit(g, 744, 130);
  R(g, 746, BASE_Y - 16, 18, 16, C.outline); R(g, 747, BASE_Y - 15, 16, 14, '#c8a06a'); R(g, 747, BASE_Y - 9, 16, 1, '#a07a4a');
  R(g, 750, BASE_Y - 26, 12, 10, C.outline); R(g, 751, BASE_Y - 25, 10, 9, '#d8b07a');
  pottedPlant(g, 944, BASE_Y + 2, rand, true);
  foliage(g, 950, 110, 24, 50, rand);
}

function utilityPole(g, x, baseY) {
  R(g, x - 2, baseY - 120, 5, 120, '#7a6048'); R(g, x - 2, baseY - 120, 1, 120, '#9a7a5a'); R(g, x + 2, baseY - 120, 1, 120, C.outline);
  R(g, x - 14, baseY - 112, 29, 3, '#6a5040'); R(g, x - 10, baseY - 100, 21, 2, '#6a5040');
  for (const ix of [x - 12, x - 4, x + 4, x + 12]) R(g, ix, baseY - 115, 2, 3, '#e8e8e0');
  R(g, x + 3, baseY - 90, 8, 12, '#8a8a90'); R(g, x + 4, baseY - 89, 6, 2, '#b0b0b8');
  vSign(g, x - 10, baseY - 72, 8, 30, '#f4f0e0', C.navy, '慢駛', C.red, 7);
}

function wires(g, x1, x2, y) {
  for (let k = 0; k < 3; k++) {
    for (let x = x1; x <= x2; x++) {
      const t = (x - x1) / (x2 - x1);
      const yy = y + k * 4 + Math.sin(t * Math.PI) * 10;
      P(g, x, Math.round(yy), '#3a3030');
    }
  }
}

function drawGround(g, rand) {
  // 上行人路
  R(g, 0, BASE_Y, WW, 20, C.walk);
  for (let x = 0; x < WW; x += 16) R(g, x, BASE_Y, 1, 20, C.walkD);
  R(g, 0, BASE_Y + 10, WW, 1, C.walkD);
  for (let i = 0; i < 300; i++) P(g, rand() * WW, BASE_Y + rand() * 20, rand() < 0.5 ? C.walkL : C.walkD);
  R(g, 0, BASE_Y, WW, 2, '#0002');
  // 路邊
  R(g, 0, 190, WW, 3, C.curb); R(g, 0, 193, WW, 1, C.curbD);
  // 馬路
  R(g, 0, 194, WW, 40, C.road);
  for (let i = 0; i < 1400; i++) P(g, rand() * WW, 194 + rand() * 40, rand() < 0.5 ? C.roadD : C.roadL);
  for (let x = 10; x < WW; x += 36) R(g, x, 213, 18, 2, '#e8e2cc');
  // 裂紋
  for (let k = 0; k < 14; k++) {
    let x = rand() * WW, y = 196 + rand() * 36;
    for (let j = 0; j < 12; j++) { P(g, x, y, C.roadD); x += rand() < 0.5 ? 1 : 0; y += rand() < 0.5 ? 1 : -1; if (y < 195 || y > 233) break; x++; }
  }
  // 沙井蓋
  for (const mx of [120, 520, 820]) { disc(g, mx, 224, 5, '#7a6e5c'); disc(g, mx, 224, 4, '#8e8270'); R(g, mx - 3, 224, 7, 1, '#6a5e4c'); R(g, mx, 221, 1, 7, '#6a5e4c'); }
  pixelText(g, '慢', 300, 218, 14, '#ece6d0', { align: 'center', bold: true });
  pixelText(g, '慢', 700, 218, 14, '#ece6d0', { align: 'center', bold: true });
  // 下路邊 + 行人路
  R(g, 0, 234, WW, 3, C.curb); R(g, 0, 237, WW, 1, C.curbD);
  R(g, 0, 238, WW, 32, C.walk);
  for (let x = 0; x < WW; x += 16) for (let y = 238; y < 270; y += 10) {
    R(g, x + ((y / 10) % 2 ? 8 : 0), y, 1, 10, C.walkD); R(g, x, y, 16, 1, C.walkD);
  }
  R(g, 0, 238, WW, 1, '#0001');
}

function drawForeground(g, rand) {
  const segs = [[0, 30], [100, 110], [240, 330], [360, 430], [480, 600], [770, 870], [900, 960]];
  const fl = ['#e84a5a', '#f08ac0', '#ffd24a', '#ffffff', '#c86ad8'];
  segs.forEach(([a, b], i) => hedge(g, a, 252, b - a, 16, rand, fl[i % fl.length]));
  R(g, 0, 266, WW, 4, C.grassD);
  bike(g, 6, 266);
  beetleCar(g, 36, 268);
  palmTree(g, 342, 266, rand);
  palmTree(g, 935, 266, rand);
  [212, 470, 620, 890].forEach(x => lampPost(g, x, 262));
  bench(g, 440, 262); bench(g, 500, 262);
  // 消防栓
  R(g, 156, 252, 7, 12, C.outline); R(g, 157, 253, 5, 10, C.red); R(g, 155, 256, 9, 2, C.redD);
}

// ---------- 動態部分 ----------
function drawClouds(g, camX, t) {
  const clouds = [[40, 18, 1], [180, 30, 0.8], [320, 12, 1.2], [520, 26, 0.9], [700, 14, 1.1], [860, 32, 0.8]];
  clouds.forEach(([x, y, s], i) => {
    const cx = ((x + t * 3 * (0.5 + i * 0.1) - camX * 0.3) % (WW + 80)) - 40;
    const r = Math.round(6 * s);
    disc(g, cx, y + 3, r, C.cloudS); disc(g, cx + r, y, r + 2, C.cloudS); disc(g, cx + r * 2.2, y + 3, r, C.cloudS);
    disc(g, cx, y + 1, r - 1, C.cloud); disc(g, cx + r, y - 2, r + 1, C.cloud); disc(g, cx + r * 2.2, y + 1, r - 1, C.cloud);
    R(g, cx - r + 1, y + 4, r * 4.2, 3, C.cloud);
  });
}

function neonArrow(g, cx, cy, dir, color, glow, t) {
  const pts = [];
  for (let a = 0; a <= 12; a++) {
    const ang = Math.PI * (0.95 - a / 12 * 0.6);
    pts.push([cx + dir * Math.cos(ang) * 18 * -1, cy - Math.sin(ang) * 14]);
  }
  const on = glow > 0.3;
  pts.forEach(([x, y], i) => {
    if (on) disc(g, Math.round(x), Math.round(y), 3, color + '44');
  });
  pts.forEach(([x, y]) => R(g, x - 2, y - 2, 4, 4, C.outline));
  pts.forEach(([x, y]) => R(g, x - 1, y - 1, 3, 3, on ? color : '#5a4a4a'));
  const [ex, ey] = pts[pts.length - 1];
  for (let i = 0; i < 5; i++) R(g, ex + dir * (i - 1) - 1, ey - 2 + i, 3 + (4 - i), 1, on ? color : '#5a4a4a');
  pts.forEach(([x, y], i) => { if (on && i % 3 === Math.floor(t * 8) % 3) P(g, x, y, '#fff'); });
}

// ---------- 角色 ----------
const SPRITE_DOWN = [
  '...oooooo...', '..ohhhhhhho.', '.ohhhhhhhhho', '.ohhsssshhho', '.ohssssssho.', '.osesssseso.', '.ossssmssso.', '..osssssso..',
  '...oowwoo...', '..ojjjwjjjo.', '.ojjjjwjjjjo', '.ojjjjwjjjjo', '.osjjjwjjjso', '.osjjjjjjjso', '..oppppppo..',
];
const SPRITE_UP = [
  '...oooooo...', '..ohhhhhhho.', '.ohhhhhhhhho', '.ohhhhhhhhho', '.ohhhhhhhho.', '.ohhhhhhhho.', '.ohhhhhhhho.', '..ohhhhhho..',
  '...oossoo...', '..ojjjjjjjo.', '.ojjjjjjjjjo', '.ojjjjjjjjjo', '.osjjjjjjjso', '.osjjjjjjjso', '..oppppppo..',
];
const SPRITE_SIDE = [
  '...oooooo...', '..ohhhhhhho.', '.ohhhhhhhhho', '.ohhhhsssso.', '.ohhhssssso.', '.ohhssssseo.', '.ohhsssssso.', '..ohssssmo..',
  '...oowwo....', '...ojjjjo...', '..ojjjjjjo..', '..ojjjjjjo..', '..ojjjsjjo..', '..ojjjjjjo..', '...opppppo..',
];
const LEGS_FRONT = [
  ['..opppoppo..', '..opo..opo..', '..opo..opo..', '..obbo.obbo.', '..oooo.oooo.'],
  ['..opppoppo..', '..opo..opo..', '..obbo.opo..', '..oooo.obbo.', '.......oooo.'],
  ['..opppoppo..', '..opo..opo..', '..opo..obbo.', '..obbo.oooo.', '..oooo......'],
];
const LEGS_SIDE = [
  ['...oppppo...', '....oppo....', '....oppo....', '....obbbo...', '....ooooo...'],
  ['...oppppo...', '...op..po...', '..op....po..', '.obb....obb.', '.ooo....ooo.'],
  ['...oppppo...', '....oppo....', '....opo.....', '....obbo....', '....oooo....'],
];

const spriteCache = new Map();
function charSprite(pal, dir, frame) {
  const key = pal.key + dir + frame;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const body = dir === 'down' ? SPRITE_DOWN : dir === 'up' ? SPRITE_UP : SPRITE_SIDE;
  const legs = (dir === 'down' || dir === 'up') ? LEGS_FRONT[frame] : LEGS_SIDE[frame];
  const rows = body.concat(legs);
  const colors = { o: C.outline, h: pal.hair, s: pal.skin, e: C.outline, m: '#c0605a', w: '#f4f0e8', j: pal.jacket, p: pal.pants, b: '#2a2a30' };
  const [c, g] = newCanvas(12, 20);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    let col = colors[ch];
    if (ch === 'j' && x <= 2) col = shade(pal.jacket, -30);
    if (ch === 'h' && y < 3 && x > 3 && x < 7) col = shade(pal.hair, 40);
    P(g, dir === 'left' ? 11 - x : x, y, col);
  }));
  if (pal.cap) { R(g, 2, 0, 8, 2, pal.cap); R(g, dir === 'left' ? 0 : dir === 'right' ? 8 : 3, 2, dir === 'down' ? 6 : 4, 1, pal.cap); }
  spriteCache.set(key, c);
  return c;
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = v => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}

const HAIRS = ['#3b2a20', '#1e1e2a', '#7a4a2a', '#c9a04a', '#a0a0a8', '#5a2a1a'];
const JACKETS = ['#4a8fd9', '#d94a6a', '#5aa05a', '#9a6ad9', '#e0c040', '#40b0b0', '#f08080', '#6a7a9a', '#f0f0e8'];
const PANTS = ['#3a4660', '#5a4030', '#2a2a2a', '#6a6a80', '#2a4a6a'];
const SKINS = ['#f2c29b', '#e8b088', '#d09a70', '#f6d0b0'];
let palCounter = 0;
function randomPalette(rand = Math.random) {
  const pick = a => a[Math.floor(rand() * a.length)];
  return { key: 'n' + (palCounter++ % 40), hair: pick(HAIRS), jacket: pick(JACKETS), pants: pick(PANTS), skin: pick(SKINS), cap: rand() < 0.2 ? pick(JACKETS) : null };
}
const PLAYER_PAL = { key: 'player', hair: '#3b2a20', jacket: '#e8742c', pants: '#3a4660', skin: '#f2c29b', cap: null };

function drawCharacter(g, ch, camX) {
  const x = Math.round(ch.x - camX - 6), y = Math.round(ch.y - 20);
  R(g, x + 2, y + 19, 8, 2, '#0003');
  const bob = ch.moving && ch.frame !== 0 ? 0 : 0;
  g.drawImage(charSprite(ch.pal, ch.dir, ch.moving ? ch.frame : 0), x, y + bob);
  if (ch.carry) { R(g, x + (ch.dir === 'left' ? -1 : 9), y + 11, 4, 5, C.outline); R(g, x + (ch.dir === 'left' ? 0 : 10), y + 12, 2, 3, ch.carry); }
}

function bubble(g, x, y, text, opt = {}) {
  const c = textCanvas(text, 10, opt.color || C.outline, true);
  const w = c.width + 6, h = 14;
  const bx = Math.round(x - w / 2), by = Math.round(y - h - 4);
  R(g, bx - 1, by, w + 2, h, C.outline); R(g, bx, by - 1, w, h + 2, C.outline);
  R(g, bx, by, w, h, opt.bg || '#fffdf2');
  R(g, Math.round(x) - 1, by + h, 3, 1, C.outline); R(g, Math.round(x) - 1, by + h, 2, 1, opt.bg || '#fffdf2');
  P(g, Math.round(x), by + h + 1, C.outline);
  g.drawImage(c, bx + 3, by + 1);
}

// ---------- 組合整條街 ----------
function buildWorld(shopName) {
  const rand = makeRand(20260613);
  const lights = [];
  const [bg, g] = newCanvas(WW, VH);
  drawBackground(g, rand);
  wires(g, 0, 160, 58); wires(g, 160, 570, 56); wires(g, 570, WW, 58);
  drawSchool(g, rand, lights);
  drawMarket(g, rand, lights);
  drawShop(g, rand, lights, shopName);
  drawBank(g, rand, lights);
  drawAdAgency(g, rand, lights);
  drawAlleys(g, rand, lights);
  drawGround(g, rand);
  utilityPole(g, 160, BASE_Y + 6);
  utilityPole(g, 570, BASE_Y + 6);
  const [fg, f] = newCanvas(WW, VH);
  drawForeground(f, rand);
  return { bg, fg, lights };
}

const BUILDINGS = [
  { id: 'school', name: '創業學堂', door: 84 },
  { id: 'market', name: '街市批發', door: 247 },
  { id: 'shop', name: '我的小店', door: 455 },
  { id: 'bank', name: '金銀島銀行', door: 665 },
  { id: 'ads', name: '廣告公司', door: 856 },
];

function drawBillboard(g, camX, ad, shopName, t) {
  const x = 650 - camX, base = 262, y = base - 58;
  R(g, x + 20, base - 20, 4, 20, '#5a5a60'); R(g, x + 76, base - 20, 4, 20, '#5a5a60');
  R(g, x - 1, y - 1, 102, 42, C.outline); R(g, x, y, 100, 40, '#e8e0d0');
  R(g, x + 2, y + 2, 96, 36, ad ? '#f6e6c8' : '#c8d8e0');
  if (ad) {
    R(g, x + 2, y + 2, 96, 36, C.red);
    for (let i = 0; i < 96; i += 8) R(g, x + 2 + i, y + 2, 4, 36, '#e05a40');
    disc(g, x + 18, y + 20, 11, C.gold); disc(g, x + 18, y + 20, 9, '#fff3d0');
    R(g, x + 14, y + 16, 8, 10, C.lemonCup || '#f2c14e'); R(g, x + 14, y + 15, 8, 1, C.outline); R(g, x + 19, y + 11, 1, 5, C.outline);
    pixelText(g, shopName, x + 62, y + 5, 12, '#fff3d0', { align: 'center', bold: true, outline: C.redD });
    pixelText(g, '好味又抵食！', x + 62, y + 22, 10, C.goldL, { align: 'center', bold: true, outline: C.redD });
    if (Math.floor(t * 3) % 2) { star(g, x + 90, y + 4, C.goldL); }
  } else {
    pixelText(g, '廣告位招租', x + 50, y + 8, 12, C.navy, { align: 'center', bold: true });
    pixelText(g, '請洽廣告公司', x + 50, y + 23, 9, C.navyL, { align: 'center' });
  }
}
