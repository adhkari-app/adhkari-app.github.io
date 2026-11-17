// extras.js — garden of Jannah, breathing istighfar, badges, share cards, sounds, tilt
import * as store from './store.js';
import * as FX from './fx.js';

let ctx = null; // { I, esc, toast, vibrate, render, fmt, addIstighfar, addTasbeeh, hifzStats, skyNow }
export function initExtras(c) { ctx = c; }

const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => String(n).replace(/\d/g, d => AR[d]);
const S = () => store.get();

/* =====================================================
   Sound (generated with Web Audio — no files)
   ===================================================== */
let ac = null;
function audioCtx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
export const soundOn = () => !!S().settings.sound;

export function beadClick(strong = false) {
  if (!soundOn()) return;
  const a = audioCtx(); if (!a) return;
  const t = a.currentTime;
  const len = 0.045, buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 7);
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = strong ? 1100 : 2100; bp.Q.value = 5;
  const g = a.createGain(); g.gain.value = strong ? 0.9 : 0.6;
  src.connect(bp).connect(g).connect(a.destination); src.start(t);
  const o = a.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(strong ? 380 : 620, t); o.frequency.exponentialRampToValueAtTime(strong ? 190 : 340, t + 0.08);
  const og = a.createGain(); og.gain.setValueAtTime(strong ? 0.22 : 0.1, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.14);
}

export function chime() {
  if (!soundOn()) return;
  const a = audioCtx(); if (!a) return;
  const t = a.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = a.createGain(); const st = t + i * 0.09;
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.14, st + 0.02); g.gain.exponentialRampToValueAtTime(0.001, st + 1.6);
    o.connect(g).connect(a.destination); o.start(st); o.stop(st + 1.7);
  });
}

function softTone(freq, dur) {
  if (!soundOn()) return;
  const a = audioCtx(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}

/* =====================================================
   Tilt parallax (device orientation, mouse fallback)
   ===================================================== */
let tiltBound = false, tx = 0, ty = 0, gx = 0, gy = 0, tiltRaf = 0;
function tiltLoop() {
  tx += (gx - tx) * 0.12; ty += (gy - ty) * 0.12;
  const r = document.documentElement.style;
  r.setProperty('--tx', tx.toFixed(3)); r.setProperty('--ty', ty.toFixed(3));
  if (Math.abs(gx - tx) > 0.002 || Math.abs(gy - ty) > 0.002) tiltRaf = requestAnimationFrame(tiltLoop); else tiltRaf = 0;
}
const kick = () => { if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltLoop); };
function onOrient(e) {
  if (S().settings.tilt === false) return;
  if (e.gamma == null) return;
  gx = Math.max(-1, Math.min(1, e.gamma / 25));
  gy = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
  kick();
}
export function initTilt() {
  if (tiltBound || !FX.motionOK()) return;
  tiltBound = true;
  addEventListener('deviceorientation', onOrient, { passive: true });
  addEventListener('pointermove', e => {
    if (S().settings.tilt === false || e.pointerType === 'touch') return;
    gx = (e.clientX / innerWidth - 0.5) * 2; gy = (e.clientY / innerHeight - 0.5) * 2; kick();
  }, { passive: true });
}
export async function requestTilt() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      return r === 'granted';
    }
  } catch (e) { return false; }
  return true;
}

/* =====================================================
   Garden of Jannah
   «من قال: سبحان الله العظيم وبحمده، غُرست له نخلة في الجنة» — رواه الترمذي
   ===================================================== */
function garden() {
  const s = S();
  if (!s.garden) s.garden = { total: 0, log: {} };
  return s.garden;
}
export const palms = () => garden().total;

export function plantPalm() {
  const g = garden();
  g.total++;
  const k = store.dateKey();
  g.log[k] = (g.log[k] || 0) + 1;
  store.save();
  return g.total;
}

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const MAX_DRAWN = 360;
function palmSpot(i) {
  const r = rng(i * 7919 + 13);
  const depth = Math.pow(r(), 0.75);              // 0 far → 1 near
  const y = 205 + depth * 285;
  let x = r() * 390;
  const riverX = 195 + Math.sin(y / 60) * 40;    // keep palms off the river
  if (Math.abs(x - riverX) < 26 + depth * 30) x += (x < riverX ? -1 : 1) * (40 + depth * 30);
  const sc = 0.32 + depth * 0.95;
  return { x, y, sc, hue: r(), flip: r() < 0.5 };
}

const PALM_SYMBOL = `
<symbol id="palm" viewBox="0 0 60 100" overflow="visible">
  <path d="M29 100 C31 80 27 56 31 33" fill="none" stroke="#7A5524" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M29 100 C31 80 27 56 31 33" fill="none" stroke="#A67C3D" stroke-width="2" stroke-dasharray="2.5 3" stroke-linecap="round"/>
  <g fill="none" stroke-linecap="round">
    <path d="M31 33 C20 23 8 25 1 36" stroke="#1F6B4F" stroke-width="3.6"/>
    <path d="M31 33 C22 18 12 12 3 15" stroke="#2E8A62" stroke-width="3.6"/>
    <path d="M31 33 C28 17 24 7 17 2" stroke="#2E8A62" stroke-width="3.4"/>
    <path d="M31 33 C36 15 44 8 53 8" stroke="#3FA176" stroke-width="3.4"/>
    <path d="M31 33 C44 23 55 24 59 33" stroke="#2E8A62" stroke-width="3.6"/>
    <path d="M31 33 C41 31 51 39 55 48" stroke="#1F6B4F" stroke-width="3.2"/>
    <path d="M31 33 C23 31 13 39 9 48" stroke="#1F6B4F" stroke-width="3.2"/>
  </g>
  <g fill="#C27C2C"><circle cx="28.5" cy="37" r="2.2"/><circle cx="32.5" cy="38" r="2.2"/><circle cx="30.5" cy="40.5" r="2.2"/></g>
</symbol>`;

function gardenScene(total, sky, newest) {
  const n = Math.min(total, MAX_DRAWN);
  const spots = [];
  for (let i = 0; i < n; i++) spots.push({ i, ...palmSpot(i) });
  spots.sort((a, b) => a.y - b.y);
  const night = sky === 'night' || sky === 'maghrib';
  const skyTop = night ? '#0B2B33' : sky === 'fajr' ? '#3B4F7A' : '#9FD3C7';
  const skyBot = night ? '#1C4A45' : sky === 'fajr' ? '#E9B8A0' : '#F6EBD3';
  let stars = '';
  if (night) { const r = rng(42); for (let i = 0; i < 40; i++) stars += `<circle class="g-star" cx="${(r() * 390).toFixed(1)}" cy="${(r() * 150).toFixed(1)}" r="${(0.6 + r() * 1.3).toFixed(2)}" style="animation-delay:${(r() * 4).toFixed(2)}s"/>`; }
  const palmsSVG = spots.map(p => {
    const w = 60 * p.sc, h = 100 * p.sc;
    const cls = p.i === newest ? 'g-palm grow' : 'g-palm';
    return `<use href="#palm" class="${cls}" x="${(p.x - w / 2).toFixed(1)}" y="${(p.y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" ${p.flip ? `transform="translate(${(2 * p.x).toFixed(1)} 0) scale(-1 1)"` : ''} style="opacity:${(0.55 + p.sc * 0.45).toFixed(2)}"/>`;
  }).join('');
  return `
  <svg class="garden-svg" viewBox="0 0 390 500" preserveAspectRatio="xMidYMax slice" role="img" aria-label="حديقتك في الجنة: ${total} نخلة">
    <defs>
      <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>
      <linearGradient id="gground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#1F5A48' : '#8CC5A0'}"/><stop offset="1" stop-color="${night ? '#123F33' : '#4E9E74'}"/></linearGradient>
      <linearGradient id="griver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#5FA8B8' : '#BFE6EE'}"/><stop offset="1" stop-color="${night ? '#2E7F92' : '#6EC3D6'}"/></linearGradient>
      ${PALM_SYMBOL}
    </defs>
    <rect width="390" height="500" fill="url(#gsky)"/>
    <g class="g-far">${stars}
      ${night ? '<path d="M84 40a18 18 0 1 0 9 33a15 15 0 0 1-9-33z" fill="#F3E2B8" opacity=".95"/>' : '<circle cx="70" cy="70" r="34" fill="#FFE7A8" opacity=".75"/><circle cx="70" cy="70" r="60" fill="#FFE7A8" opacity=".18"/>'}
      <path d="M0 200 C60 170 120 180 190 192 C260 204 320 168 390 182 V230 H0 Z" fill="${night ? '#184A44' : '#A9D4B5'}" opacity=".9"/>
    </g>
    <g class="g-mid">
      <path d="M0 210 C80 196 160 214 240 204 C300 197 350 205 390 200 V500 H0 Z" fill="url(#gground)"/>
      <path class="g-river" d="M168 205 C230 245 140 290 200 335 C260 380 150 430 215 500 L260 500 C200 430 305 380 245 335 C185 290 275 245 215 205 Z" fill="url(#griver)" opacity=".9"/>
      <path class="g-shimmer" d="M190 215 C238 250 160 292 218 338 C272 382 175 432 236 500" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="6 18" opacity=".55"/>
    </g>
    <g class="g-near">${palmsSVG}</g>
  </svg>`;
}

export const Garden = {
  html() {
    const I = ctx.I, g = garden();
    const today = g.log[store.dateKey()] || 0;
    const sky = ctx.skyNow();
    return `
    <header class="title-bar"><a class="icon-btn" href="#/home" aria-label="رجوع">${I.back}</a>
      <div style="flex:1;display:flex;flex-direction:column"><h1 style="font-size:20px">حديقتك في الجنة</h1>
      <span class="muted" style="font-size:12px" data-el="gsub">اليوم: ${today} · المجموع: ${ctx.fmt(g.total)}</span></div>
      <button class="icon-btn" data-act="share" aria-label="شارك حديقتك">${I.share}</button></header>
    <main class="pad stack" style="margin-top:12px">
      <div class="garden-wrap" data-act="plant" role="button" tabindex="0" aria-label="اضغط لتقول: سبحان الله العظيم وبحمده، وتزرع نخلة">
        ${gardenScene(g.total, sky, -1)}
        <div class="garden-count"><b data-el="palms">${ctx.fmt(g.total)}</b><span>نخلة</span></div>
        ${g.total > MAX_DRAWN ? `<div class="garden-more">يظهر ${MAX_DRAWN} نخلة من ${ctx.fmt(g.total)}</div>` : ''}
        ${g.total === 0 ? '<div class="garden-empty">اضغط على الحديقة وقل: سبحان الله العظيم وبحمده</div>' : ''}
      </div>
      <div class="card hadith-card">
        <span class="hc-q">«من قال: سبحان الله العظيم وبحمده، غُرِست له نخلة في الجنة»</span>
        <span class="muted" style="font-size:12px">رواه الترمذي</span>
      </div>
      <div class="grid2">
        <a class="btn" href="#/tasbeeh?d=azeem">سبّح بالسبحة</a>
        <button class="btn outline" data-act="share2">شارك حديقتك</button>
      </div>
    </main>`;
  },
  mount(root) {
    const wrap = root.querySelector('.garden-wrap');
    const plant = (e) => {
      const n = plantPalm();
      ctx.addTasbeeh(1);
      ctx.vibrate(15);
      beadClick(false);
      const svgEl = wrap.querySelector('.garden-svg');
      const tmp = document.createElement('div');
      tmp.innerHTML = gardenScene(n, ctx.skyNow(), n - 1);
      svgEl.replaceWith(tmp.firstElementChild);
      root.querySelector('[data-el="palms"]').textContent = ctx.fmt(n);
      root.querySelector('[data-el="gsub"]').textContent = `اليوم: ${garden().log[store.dateKey()] || 0} · المجموع: ${ctx.fmt(n)}`;
      root.querySelector('.garden-empty')?.remove();
      const r = wrap.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX : r.left + r.width / 2, y = e && e.clientY ? e.clientY : r.top + r.height / 2;
      FX.floatText(x, y - 8, 'سبحان الله العظيم وبحمده');
      if (n <= MAX_DRAWN) {
        const p = palmSpot(n - 1);
        const k = r.width / 390;
        const sx = r.left + p.x * k, sy = r.top + (p.y - 50 * p.sc) * (r.height / 500);
        setTimeout(() => FX.burst(sx, sy, { n: 14, power: 3.5, size: 3.5, gravity: 0.05 }), 350);
      }
      if (n % 100 === 0) { chime(); FX.burstAt(wrap, { n: 50, power: 9 }); ctx.toast(`ما شاء الله — ${ctx.fmt(n)} نخلة في حديقتك`); }
      checkBadgesSoon();
    };
    wrap.addEventListener('click', plant);
    wrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plant(); } });
    const share = () => shareCard({ kind: 'garden', title: 'حديقتي في الجنة', big: `${arNum(garden().total)} نخلة`, text: '«من قال: سبحان الله العظيم وبحمده، غُرِست له نخلة في الجنة»', sub: 'رواه الترمذي' });
    root.querySelector('[data-act="share"]').addEventListener('click', share);
    root.querySelector('[data-act="share2"]').addEventListener('click', share);
  }
};

/* =====================================================
   Breathing istighfar
   ===================================================== */
const B = { running: false, timer: 0, phase: 'in', cycles: 0 };
const IN_MS = 4000, OUT_MS = 6000;

export const Breathe = {
  html() {
    const I = ctx.I;
    return `
    <div class="breathe">
      <header class="title-bar" style="color:#E9DDBF"><a class="icon-btn dark" href="#/tasbeeh" aria-label="رجوع">${I.back}</a>
        <h1 style="font-size:20px;color:#E9DDBF">تنفّس واستغفر</h1>
        <button class="icon-btn dark" data-act="snd" aria-label="${soundOn() ? 'إيقاف الصوت' : 'تشغيل الصوت'}">${soundOn() ? I.vol : I.mute}</button></header>
      <div class="br-stage">
        <div class="br-orb" data-el="orb"><div class="br-core"></div></div>
        <div class="br-text" data-el="txt" aria-live="polite">اضغط ابدأ</div>
        <div class="br-sub" data-el="sub">شهيق ٤ ثوانٍ · زفير ٦ ثوانٍ مع «أستغفر الله»</div>
      </div>
      <div class="br-bottom">
        <div class="br-count"><b data-el="cyc">0</b><span>استغفار بهدوء</span></div>
        <button class="btn big br-btn" data-act="toggle">ابدأ</button>
      </div>
    </div>`;
  },
  mount(root) {
    const orb = root.querySelector('[data-el="orb"]'), txt = root.querySelector('[data-el="txt"]'), sub = root.querySelector('[data-el="sub"]');
    const cyc = root.querySelector('[data-el="cyc"]'), btn = root.querySelector('[data-act="toggle"]');
    B.cycles = 0;
    const step = () => {
      if (!B.running) return;
      if (B.phase === 'in') {
        orb.style.transitionDuration = IN_MS + 'ms'; orb.classList.add('big');
        txt.textContent = 'شهيق…'; sub.textContent = 'املأ صدرك بهدوء';
        softTone(220, IN_MS / 1000);
        B.phase = 'out'; B.timer = setTimeout(step, IN_MS);
      } else {
        orb.style.transitionDuration = OUT_MS + 'ms'; orb.classList.remove('big');
        txt.textContent = 'أستغفر الله'; sub.textContent = 'وأتوب إليه';
        ctx.vibrate(20);
        B.timer = setTimeout(() => {
          if (!B.running) return;
          B.cycles++; cyc.textContent = B.cycles;
          ctx.addIstighfar(1);
          if (B.cycles % 10 === 0) { chime(); FX.burstAt(orb, { n: 24, power: 5 }); }
          checkBadgesSoon();
          B.phase = 'in'; step();
        }, OUT_MS);
      }
    };
    btn.addEventListener('click', () => {
      B.running = !B.running;
      btn.textContent = B.running ? 'إيقاف' : 'تابع';
      if (B.running) { audioCtx(); B.phase = 'in'; step(); }
      else { clearTimeout(B.timer); orb.classList.remove('big'); txt.textContent = 'متوقف'; sub.textContent = `${B.cycles} استغفار في هذه الجلسة`; }
    });
    root.querySelector('[data-act="snd"]').addEventListener('click', e => {
      S().settings.sound = !S().settings.sound; store.save();
      e.currentTarget.innerHTML = soundOn() ? ctx.I.vol : ctx.I.mute;
      e.currentTarget.setAttribute('aria-label', soundOn() ? 'إيقاف الصوت' : 'تشغيل الصوت');
    });
  },
  unmount() { B.running = false; clearTimeout(B.timer); }
};

/* =====================================================
   Badges
   ===================================================== */
export const BADGES = [
  { id: 'start', title: 'البداية المباركة', desc: 'أول ذكر في التطبيق', mark: '۞', need: x => [x.act > 0 ? 1 : 0, 1] },
  { id: 'streak3', title: 'ثبات', desc: '3 أيام متتالية', mark: '٣', need: x => [x.best, 3] },
  { id: 'streak7', title: 'أسبوع من النور', desc: '7 أيام متتالية', mark: '٧', need: x => [x.best, 7] },
  { id: 'streak30', title: 'شهر الثبات', desc: '30 يوماً متتالياً', mark: '٣٠', need: x => [x.best, 30] },
  { id: 'ist100', title: 'المستغفر', desc: '100 استغفار', mark: '١٠٠', need: x => [x.ist, 100] },
  { id: 'ist1000', title: 'كثير الاستغفار', desc: '1,000 استغفار', mark: '١K', need: x => [x.ist, 1000] },
  { id: 'ist10000', title: 'سبّاق الاستغفار', desc: '10,000 استغفار', mark: '١٠K', need: x => [x.ist, 10000] },
  { id: 'morning7', title: 'صباح مبارك', desc: 'أذكار الصباح في 7 أيام', mark: '☀', need: x => [x.md, 7] },
  { id: 'evening7', title: 'مساء مطمئن', desc: 'أذكار المساء في 7 أيام', mark: '☾', need: x => [x.ed, 7] },
  { id: 'palm33', title: 'أول البستان', desc: '33 نخلة في الجنة', mark: '٣٣', need: x => [x.palms, 33] },
  { id: 'palm1000', title: 'بستان عامر', desc: '1,000 نخلة في الجنة', mark: '١K', need: x => [x.palms, 1000] },
  { id: 'hifz1', title: 'أول آية', desc: 'حفظت أول آية', mark: '١', need: x => [x.mem, 1] },
  { id: 'surah1', title: 'أول سورة', desc: 'حفظت سورة كاملة', mark: '۝', need: x => [x.surah ? 1 : 0, 1] },
  { id: 'amma', title: 'ختمت جزء عمّ', desc: 'حفظت الجزء الثلاثين كاملاً', mark: '٣٠', need: x => [x.amma ? 1 : 0, 1] }
];

function badgeStats() {
  const s = S();
  let ist = 0, md = 0, ed = 0, act = 0;
  for (const k in s.days) { const d = s.days[k]; ist += d.i || 0; if (d.md) md++; if (d.ed) ed++; act += store.activity(k); }
  store.streak();
  const h = ctx.hifzStats ? ctx.hifzStats() : null;
  return { ist, md, ed, act, best: s.best || 0, palms: palms(), mem: h ? h.mem : Object.keys((s.hifz && s.hifz.items) || {}).length, surah: h ? h.anySurah : false, amma: h ? h.amma : false };
}

export function medal(mark, size = 64, locked = false) {
  return `<svg class="medal ${locked ? 'locked' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E7BE"/><stop offset=".5" stop-color="#D9B26A"/><stop offset="1" stop-color="#9C7130"/></linearGradient></defs>
    <g fill="url(#mg)"><rect x="19" y="19" width="62" height="62" rx="5"/><rect x="19" y="19" width="62" height="62" rx="5" transform="rotate(45 50 50)"/></g>
    <circle cx="50" cy="50" r="27" fill="#0F4C45" stroke="#F3E2B8" stroke-width="2"/>
    <circle cx="50" cy="50" r="22" fill="none" stroke="#D9B26A" stroke-width=".8" opacity=".7"/>
    <text x="50" y="${mark.length > 2 ? 56 : 58}" text-anchor="middle" font-family="Amiri, serif" font-weight="700" font-size="${mark.length > 2 ? 17 : 22}" fill="#F3E2B8">${mark}</text>
  </svg>`;
}

const queue = [];
let showing = false, checkT = 0;
export function checkBadgesSoon() { clearTimeout(checkT); checkT = setTimeout(checkBadges, 700); }
export function checkBadges() {
  const s = S();
  s.badges = s.badges || {};
  const x = badgeStats();
  let changed = false;
  for (const b of BADGES) {
    if (s.badges[b.id]) continue;
    const [v, t] = b.need(x);
    if (v >= t) { s.badges[b.id] = Date.now(); changed = true; queue.push(b); }
  }
  if (changed) { store.save(); showNext(); }
}

function showNext() {
  if (showing || !queue.length) return;
  showing = true;
  const b = queue.shift();
  const el = document.createElement('div');
  el.className = 'celebrate badge-pop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `وسام جديد: ${b.title}`);
  el.innerHTML = `<div class="cel-card">
    <span class="bp-kicker">وسام جديد</span>
    <div class="bp-medal">${medal(b.mark, 132)}<span class="shine"></span></div>
    <b>${b.title}</b><span>${b.desc}</span>
    <div class="grid2" style="width:100%"><button class="btn outline" data-act="share" type="button">مشاركة</button><button class="btn" data-act="ok" type="button">الحمد لله</button></div></div>`;
  document.body.appendChild(el);
  chime();
  setTimeout(() => FX.burst(innerWidth / 2, innerHeight * 0.4, { n: 60, power: 9, size: 6 }), 300);
  const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); showing = false; showNext(); }, 300); };
  el.querySelector('[data-act="ok"]').addEventListener('click', close);
  el.querySelector('[data-act="share"]').addEventListener('click', () => shareCard({ kind: 'badge', title: 'وسام جديد في أذكاري', big: b.title, text: b.desc, mark: b.mark }));
  el.addEventListener('click', e => { if (e.target === el) close(); });
  setTimeout(() => el.querySelector('[data-act="ok"]').focus(), 50);
}

export function badgesHTML() {
  const s = S(); s.badges = s.badges || {};
  const x = badgeStats();
  const got = BADGES.filter(b => s.badges[b.id]).length;
  const cells = BADGES.map(b => {
    const has = !!s.badges[b.id];
    const [v, t] = b.need(x);
    const pct = Math.min(100, Math.round(Math.min(v, t) / t * 100));
    return `<button class="badge-cell ${has ? 'has' : ''}" data-badge="${b.id}" aria-label="${b.title}: ${has ? 'مكتسب' : `${pct}%`}">
      ${medal(b.mark, 58, !has)}
      <b>${b.title}</b>
      ${has ? `<span>${b.desc}</span>` : `<span class="bc-prog"><i style="width:${pct}%"></i></span>`}
    </button>`;
  }).join('');
  return `<section class="card stack" style="gap:12px">
    <div class="row between"><h2 style="font-size:15px">أوسمتي</h2><span class="chip gold">${got} من ${BADGES.length}</span></div>
    <div class="badge-grid">${cells}</div></section>`;
}

export function bindBadges(root) {
  root.querySelectorAll('[data-badge]').forEach(btn => btn.addEventListener('click', () => {
    const b = BADGES.find(x => x.id === btn.dataset.badge);
    const has = S().badges && S().badges[b.id];
    if (has) shareCard({ kind: 'badge', title: 'وسام في أذكاري', big: b.title, text: b.desc, mark: b.mark });
    else ctx.toast(`${b.title}: ${b.desc}`);
  }));
}

/* =====================================================
   Share cards (canvas → image)
   ===================================================== */
function wrapLines(c, text, maxW) {
  const words = text.split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawStar(c, x, y, r) {
  c.beginPath();
  for (const rot of [0, Math.PI / 4]) {
    for (let k = 0; k < 4; k++) {
      const a = rot + Math.PI / 4 + k * Math.PI / 2;
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      k === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.closePath();
  }
}

async function renderCard(o) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  try { await Promise.all([document.fonts.load("64px 'Amiri Quran'"), document.fonts.load("700 60px Amiri"), document.fonts.load("600 40px 'IBM Plex Sans Arabic'")]); } catch (e) {}
  // background
  const g = c.createRadialGradient(W * 0.75, 0, 50, W * 0.5, H * 0.4, H);
  g.addColorStop(0, '#1C6A60'); g.addColorStop(0.6, '#0F4C45'); g.addColorStop(1, '#0A3631');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // pattern
  c.strokeStyle = 'rgba(217,178,106,0.14)'; c.lineWidth = 2;
  for (let y = 0; y < H + 112; y += 112) for (let x = 0; x < W + 112; x += 112) { drawStar(c, x, y, 34); c.stroke(); c.beginPath(); c.arc(x, y, 10, 0, 6.283); c.stroke(); }
  // frame
  c.strokeStyle = '#D9B26A'; c.lineWidth = 4; c.strokeRect(48, 48, W - 96, H - 96);
  c.lineWidth = 1.5; c.strokeRect(64, 64, W - 128, H - 128);
  for (const [x, y] of [[64, 64], [W - 64, 64], [64, H - 64], [W - 64, H - 64]]) { c.fillStyle = '#0F4C45'; c.beginPath(); c.arc(x, y, 30, 0, 6.283); c.fill(); c.strokeStyle = '#D9B26A'; c.lineWidth = 3; drawStar(c, x, y, 24); c.stroke(); }
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
  // title
  c.fillStyle = '#E9D7AE'; c.font = "600 40px 'IBM Plex Sans Arabic', sans-serif";
  c.fillText(o.title, W / 2, 170);
  c.strokeStyle = 'rgba(217,178,106,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 180, 215); c.lineTo(W / 2 + 180, 215); c.stroke();
  let y = 330;
  if (o.kind === 'badge') {
    // medallion
    const cx0 = W / 2, cy0 = 470, R = 150;
    const mg = c.createLinearGradient(cx0 - R, cy0 - R, cx0 + R, cy0 + R);
    mg.addColorStop(0, '#F6E7BE'); mg.addColorStop(0.5, '#D9B26A'); mg.addColorStop(1, '#9C7130');
    c.fillStyle = mg; drawStar(c, cx0, cy0, R * 1.18); c.fill();
    c.fillStyle = '#0F4C45'; c.beginPath(); c.arc(cx0, cy0, R * 0.62, 0, 6.283); c.fill();
    c.strokeStyle = '#F3E2B8'; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#F3E2B8'; c.font = `700 ${o.mark.length > 2 ? 64 : 92}px Amiri, serif`; c.fillText(o.mark, cx0, cy0 + 8);
    y = 720;
    c.fillStyle = '#F6F1E7'; c.font = "700 76px Amiri, serif"; c.fillText(o.big, W / 2, y); y += 100;
    c.fillStyle = '#CFE0DA'; c.font = "500 42px 'IBM Plex Sans Arabic', sans-serif"; c.fillText(o.text, W / 2, y);
  } else {
    if (o.big) { c.fillStyle = '#D9B26A'; c.font = "700 96px Amiri, serif"; c.fillText(o.big, W / 2, y + 40); y += 170; }
    // main text (auto-fit)
    let size = o.kind === 'ayah' ? 84 : 58, lines;
    const fam = o.kind === 'ayah' ? "'Amiri Quran', Amiri, serif" : "Amiri, serif";
    for (; size >= 36; size -= 4) {
      c.font = `${size}px ${fam}`;
      lines = wrapLines(c, o.text, W - 260);
      if (lines.length * size * 1.9 < (o.kind === 'ayah' ? 640 : 420)) break;
    }
    const lh = size * 1.9;
    const top = o.kind === 'ayah' ? Math.max(300, (H - lines.length * lh) / 2 - 60) : y;
    c.fillStyle = '#F6F1E7';
    lines.forEach((l, i) => c.fillText(l, W / 2, top + i * lh));
    y = top + lines.length * lh + 30;
    if (o.sub) { c.fillStyle = '#D9B26A'; c.font = "600 40px 'IBM Plex Sans Arabic', sans-serif"; c.fillText(o.sub, W / 2, y); }
  }
  // footer
  c.fillStyle = 'rgba(15,76,69,.9)'; c.fillRect(W / 2 - 230, H - 175, 460, 80);
  c.strokeStyle = '#D9B26A'; c.lineWidth = 2; c.strokeRect(W / 2 - 230, H - 175, 460, 80);
  c.fillStyle = '#F3E2B8'; c.font = "700 44px Amiri, serif"; c.fillText('أذكاري', W / 2 + 40, H - 136);
  c.strokeStyle = '#D9B26A'; c.lineWidth = 3; drawStar(c, W / 2 - 90, H - 136, 22); c.stroke();
  if (/github\.io$/.test(location.hostname)) {
    c.fillStyle = 'rgba(233,215,174,.85)'; c.font = "500 28px 'IBM Plex Sans Arabic', sans-serif"; c.direction = 'ltr';
    c.fillText((location.host + location.pathname).replace(/\/$/, ''), W / 2, H - 52 - 8);
  }
  return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
}

export async function shareCard(o) {
  const modal = document.createElement('div');
  modal.className = 'celebrate share-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'بطاقة مشاركة');
  modal.innerHTML = `<div class="cel-card" style="max-width:360px"><div class="spinner"></div><span>جارٍ تجهيز البطاقة…</span></div>`;
  document.body.appendChild(modal);
  const close = () => { modal.classList.add('out'); setTimeout(() => modal.remove(), 300); };
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  let blob;
  try { blob = await renderCard(o); } catch (e) { close(); ctx.toast('تعذّر تجهيز البطاقة'); return; }
  const url = URL.createObjectURL(blob);
  const file = new File([blob], 'adhkari.png', { type: 'image/png' });
  const canFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  modal.querySelector('.cel-card').innerHTML = `
    <img src="${url}" alt="${ctx.esc(o.big || o.title)}" class="share-img">
    <div class="grid2" style="width:100%">
      <a class="btn outline" href="${url}" download="adhkari.png">حفظ الصورة</a>
      <button class="btn" data-act="go" type="button">${canFiles ? 'مشاركة' : 'نسخ النص'}</button>
    </div>
    <button class="link-btn" data-act="close" type="button">إغلاق</button>`;
  modal.querySelector('[data-act="close"]').addEventListener('click', close);
  modal.querySelector('[data-act="go"]').addEventListener('click', async () => {
    const text = [o.big, o.text, o.sub].filter(Boolean).join('\n');
    try {
      if (canFiles) await navigator.share({ files: [file], text: 'من تطبيق أذكاري' });
      else { await navigator.clipboard.writeText(text); ctx.toast('تم نسخ النص — والصورة تقدر تحفظها'); }
    } catch (e) { if (e.name !== 'AbortError') ctx.toast('المشاركة غير متاحة هنا — احفظ الصورة'); }
  });
}
