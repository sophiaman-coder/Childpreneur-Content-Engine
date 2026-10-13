// 8-bit 風格音效同背景音樂，全部用 Web Audio 即時合成
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  let musicOn = localStorage.getItem('lb_music') !== '0';
  let sfxOn = localStorage.getItem('lb_sfx') !== '0';
  let musicTimer = null, step = 0, nextTime = 0, tempo = 112, track = 'town';
  let tOffset = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.5 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.16 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function tone(freq, dur, { type = 'square', vol = 0.3, delay = 0, slide = null, bus = sfxBus, attack = 0.005 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + tOffset + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, { vol = 0.2, delay = 0, freq = 2000, type = 'bandpass', bus = sfxBus, when = null } = {}) {
    if (!ctx) return;
    const t = when !== null ? when : ctx.currentTime + tOffset + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const sfx = {
    blip()   { tone(880, 0.05, { vol: 0.15 }); },
    select() { tone(660, 0.06, { vol: 0.2 }); tone(990, 0.09, { vol: 0.2, delay: 0.06 }); },
    back()   { tone(660, 0.06, { vol: 0.18 }); tone(440, 0.09, { vol: 0.18, delay: 0.06 }); },
    step()   { noise(0.035, { vol: 0.06, freq: 900 }); },
    coin()   { tone(988, 0.07, { vol: 0.2 }); tone(1319, 0.28, { vol: 0.2, delay: 0.07 }); },
    door()   { tone(196, 0.18, { type: 'triangle', vol: 0.35, slide: 392 }); noise(0.12, { vol: 0.12, freq: 600, delay: 0.05 }); tone(784, 0.12, { vol: 0.12, delay: 0.18 }); },
    error()  { tone(180, 0.12, { type: 'sawtooth', vol: 0.2 }); tone(140, 0.2, { type: 'sawtooth', vol: 0.2, delay: 0.13 }); },
    buy() {
      noise(0.06, { vol: 0.2, freq: 3000 });
      tone(1568, 0.08, { vol: 0.15, delay: 0.04 }); tone(2093, 0.25, { vol: 0.15, delay: 0.11 });
    },
    sale()   { tone(1319, 0.05, { vol: 0.12 }); tone(1760, 0.16, { vol: 0.12, delay: 0.05 }); },
    sad()    { tone(392, 0.12, { type: 'triangle', vol: 0.25 }); tone(330, 0.25, { type: 'triangle', vol: 0.25, delay: 0.12, slide: 294 }); },
    right()  { [72, 76, 79, 84].forEach((n, i) => tone(midi(n), 0.14, { vol: 0.2, delay: i * 0.08 })); },
    wrong()  { tone(220, 0.15, { type: 'square', vol: 0.18 }); tone(207, 0.3, { type: 'square', vol: 0.18, delay: 0.15 }); },
    levelup() {
      [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => tone(midi(n), 0.12, { vol: 0.18, delay: i * 0.07 }));
    },
    dayStart() {
      [67, 72, 76, 74, 79].forEach((n, i) => tone(midi(n), i === 4 ? 0.4 : 0.12, { vol: 0.18, delay: i * 0.1, type: i % 2 ? 'square' : 'triangle' }));
    },
    dayEnd() {
      [79, 76, 72, 74, 72].forEach((n, i) => tone(midi(n), i === 4 ? 0.5 : 0.14, { vol: 0.18, delay: i * 0.13, type: 'triangle' }));
    },
    talk()   { tone(500 + Math.random() * 300, 0.03, { vol: 0.06 }); },
    bell()   { tone(1760, 0.5, { type: 'sine', vol: 0.2 }); tone(2637, 0.4, { type: 'sine', vol: 0.1, delay: 0.01 }); },
    win() {
      const seq = [72, 72, 72, 76, 79, 79, 76, 79, 84];
      seq.forEach((n, i) => tone(midi(n), 0.16, { vol: 0.2, delay: i * 0.12 }));
      seq.forEach((n, i) => tone(midi(n - 12), 0.16, { type: 'triangle', vol: 0.2, delay: i * 0.12 }));
    },
  };

  // 五聲音階旋律，帶少少東方街頭味道
  const _ = null;
  const TRACKS = {
    town: {
      tempo: 112,
      lead: [76, 79, 81, 79, 76, 74, 72, 74,  76, _, 79, _, 81, 84, 81, 79,  81, 79, 76, 74, 72, 74, 76, _,  74, _, 72, _, 69, _, 72, _,
             79, 81, 84, _, 81, 79, 76, _,  74, 76, 79, _, 76, 74, 72, _,  69, 72, 74, 76, 79, 76, 74, 72,  74, _, _, _, 72, _, _, _],
      bass: [48, 55, 48, 55, 45, 52, 45, 52, 41, 48, 41, 48, 43, 50, 43, 50],
    },
    shop: {
      tempo: 140,
      lead: [72, 76, 79, 76, 81, 79, 76, 74,  72, 74, 76, 79, 76, _, 74, _,  77, 81, 84, 81, 79, 76, 74, 76,  79, _, 76, _, 74, _, 72, _,
             84, _, 81, 79, 81, _, 79, 76,  74, 76, 79, 81, 79, _, 76, _,  77, 76, 74, 72, 74, 76, 79, 81,  84, _, 79, _, 72, _, _, _],
      bass: [48, 48, 55, 55, 45, 45, 52, 52, 41, 41, 48, 48, 43, 43, 50, 50],
    },
  };

  function scheduleNote(t) {
    const tr = TRACKS[track];
    const n = tr.lead[step % tr.lead.length];
    const eighth = 60 / tempo / 2;
    if (n !== null) tone(midi(n), eighth * 0.9, { type: 'square', vol: 0.22, delay: t - ctx.currentTime, bus: musicBus });
    if (step % 2 === 0) {
      const b = tr.bass[(step / 2) % tr.bass.length];
      tone(midi(b), eighth * 1.8, { type: 'triangle', vol: 0.45, delay: t - ctx.currentTime, bus: musicBus });
    }
    if (step % 2 === 1) noise(0.03, { vol: 0.08, freq: 8000, type: 'highpass', bus: musicBus, when: t });
    if (step % 8 === 0) noise(0.08, { vol: 0.15, freq: 150, type: 'lowpass', bus: musicBus, when: t });
    step++;
    return eighth;
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
      while (nextTime < ctx.currentTime + 0.15) nextTime += scheduleNote(nextTime);
    }, 30);
  }

  function setTrack(name) {
    if (track === name) return;
    track = name; tempo = TRACKS[name].tempo; step = 0;
  }

  function toggleMusic() {
    musicOn = !musicOn; localStorage.setItem('lb_music', musicOn ? '1' : '0');
    if (musicBus) musicBus.gain.value = musicOn ? 0.16 : 0;
    return musicOn;
  }
  function toggleSfx() {
    sfxOn = !sfxOn; localStorage.setItem('lb_sfx', sfxOn ? '1' : '0');
    if (sfxBus) sfxBus.gain.value = sfxOn ? 0.5 : 0;
    return sfxOn;
  }

  // 離線錄製（宣傳片用）：cues = [{ at, name }]，musicCues = [{ at, track }]
  async function renderOffline(duration, cues, musicCues, sampleRate = 44100) {
    const saved = { ctx, master, sfxBus, musicBus, noiseBuf, track, tempo, step };
    const oc = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    ctx = oc;
    master = oc.createGain(); master.connect(oc.destination);
    master.gain.setValueAtTime(0.7, 0);
    master.gain.setValueAtTime(0.7, duration - 0.6);
    master.gain.linearRampToValueAtTime(0, duration);
    sfxBus = oc.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
    musicBus = oc.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    noiseBuf = oc.createBuffer(1, sampleRate, sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const mc = [...musicCues].sort((a, b) => a.at - b.at);
    let t = mc.length ? mc[0].at : 0, ci = 0;
    track = null;
    while (t < duration) {
      while (ci < mc.length && mc[ci].at <= t) { if (mc[ci].track) { track = mc[ci].track; tempo = TRACKS[track].tempo; step = 0; } else track = null; ci++; }
      if (!track) { t = ci < mc.length ? mc[ci].at : duration; continue; }
      t += scheduleNote(t);
    }
    for (const c of cues) { tOffset = c.at; sfx[c.name] && sfx[c.name](); }
    tOffset = 0;
    const buf = await oc.startRendering();
    ({ ctx, master, sfxBus, musicBus, noiseBuf, track, tempo, step } = saved);
    return buf;
  }

  return {
    init, renderOffline, play: name => sfx[name] && sfx[name](), setTrack, toggleMusic, toggleSfx,
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; },
  };
})();
