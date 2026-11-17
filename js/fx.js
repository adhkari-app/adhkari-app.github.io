// fx.js — motion, ambience and micro-interactions
const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
export const motionOK = () => !reduce;

/* ---------------- Particle bursts (gold stars) ---------------- */
let cv = null, cx = null, parts = [], raf = 0;
function ensureCanvas() {
  if (cv) return;
  cv = document.createElement('canvas');
  cv.className = 'fx-canvas';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  cx = cv.getContext('2d');
  const size = () => {
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * d; cv.height = innerHeight * d;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    cx.setTransform(d, 0, 0, d, 0, 0);
  };
  size();
  addEventListener('resize', size);
}

function star(x, y, r, rot) {
  cx.save(); cx.translate(x, y); cx.rotate(rot);
  cx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, rr = i % 2 === 0 ? r : r * 0.45;
    cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  cx.closePath(); cx.fill(); cx.restore();
}

function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  const now = performance.now();
  parts = parts.filter(p => now - p.t0 < p.life);
  for (const p of parts) {
    const k = (now - p.t0) / p.life;
    p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    cx.globalAlpha = Math.max(0, 1 - k * k);
    cx.fillStyle = p.c;
    if (p.kind === 'star') star(p.x, p.y, p.r * (1 - k * 0.4), p.rot);
    else { cx.beginPath(); cx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 6.283); cx.fill(); }
  }
  cx.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; cx.clearRect(0, 0, cv.width, cv.height); }
}

const GOLDS = ['#D9B26A', '#E8C987', '#C49B52', '#F3E2B8', '#FFFFFF'];
export function burst(x, y, { n = 26, power = 6, spread = Math.PI * 2, dir = -Math.PI / 2, gravity = 0.12, size = 5 } = {}) {
  if (reduce) return;
  ensureCanvas();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = power * (0.45 + Math.random() * 0.75);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity, r: size * (0.5 + Math.random()), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: GOLDS[i % GOLDS.length], life: 900 + Math.random() * 700, t0, kind: Math.random() < 0.6 ? 'star' : 'dot' });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}
export function burstAt(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

/* ---------------- Floating "+1" ---------------- */
export function floatText(x, y, text = '+1') {
  if (reduce) return;
  const s = document.createElement('span');
  s.className = 'fx-float';
  s.textContent = text;
  s.style.left = x + 'px'; s.style.top = y + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 900);
}

/* ---------------- Ripple on press ---------------- */
const RIPPLE = '.btn,.ctl,.pill,.counter-btn,.rate,.plan-opt,.chip-btn,.s-row,.mode-chips button,.seg button,.seg2 a,.pl-btn,.icon-btn,.round-btn,.stat-card,.tasbeeh-link,.juz,.plan-opt,.switch';
export function initRipples() {
  document.addEventListener('pointerdown', e => {
    if (reduce) return;
    const el = e.target.closest(RIPPLE);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, { passive: true });
}

/* ---------------- Count-up numbers ---------------- */
export function countUp(root) {
  root.querySelectorAll('[data-countup]').forEach(el => {
    const to = Number(el.dataset.countup) || 0;
    if (reduce || to === 0) { el.textContent = to.toLocaleString('en-US'); return; }
    const dur = Math.min(1200, 400 + to * 4), t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------------- Sky / ambience for hero headers ---------------- */
export function skyFor(now, t) {
  if (!t) return 'day';
  if (now < t.fajr) return 'night';
  if (now < t.sunrise) return 'fajr';
  if (now < t.asr) return 'day';
  if (now < t.maghrib) return 'asr';
  if (now < new Date(t.maghrib.getTime() + 75 * 60000)) return 'maghrib';
  return 'night';
}

export function ambience(hero, sky) {
  if (!hero) return;
  hero.dataset.sky = sky;
  const layer = document.createElement('div');
  layer.className = 'sky-layer';
  layer.setAttribute('aria-hidden', 'true');
  let html = '';
  if (sky === 'night' || sky === 'maghrib' || sky === 'fajr') {
    const n = sky === 'night' ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 100, y = Math.random() * 70, s = 1 + Math.random() * 2.2, d = Math.random() * 4;
      html += `<i class="tw" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${d}s;animation-duration:${2.5 + Math.random() * 3}s"></i>`;
    }
    html += `<svg class="crescent" viewBox="0 0 40 40"><path d="M27 6a15 15 0 1 0 7 25A13 13 0 0 1 27 6z" fill="#F3E2B8"/></svg>`;
  } else {
    html += `<span class="sun-disc"></span>`;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 100, y = 30 + Math.random() * 60, d = Math.random() * 8;
      html += `<i class="mote" style="left:${x}%;top:${y}%;animation-delay:-${d}s;animation-duration:${8 + Math.random() * 6}s"></i>`;
    }
  }
  layer.innerHTML = html;
  hero.prepend(layer);
}

/* ---------------- Scroll parallax on hero ---------------- */
let scrollBound = false;
export function initParallax() {
  if (scrollBound || reduce) return;
  scrollBound = true;
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--sy', Math.min(300, scrollY) + 'px');
      ticking = false;
    });
  }, { passive: true });
}

/* ---------------- Splash intro ---------------- */
export function splash() {
  let seen = false;
  try { seen = sessionStorage.getItem('adhkari-splash') === '1'; sessionStorage.setItem('adhkari-splash', '1'); } catch (e) {}
  if (seen || reduce) return;
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg viewBox="0 0 120 120" class="splash-star">
      <rect x="30" y="30" width="60" height="60"/>
      <rect x="30" y="30" width="60" height="60" transform="rotate(45 60 60)"/>
      <circle cx="60" cy="60" r="16"/>
    </svg>
    <b>أذكاري</b>
    <span>﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => el.remove(), 2100);
}

/* ---------------- Celebration overlay ---------------- */
export function celebrate(title, sub) {
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="cel-card">
    <svg viewBox="0 0 120 120" class="cel-star" aria-hidden="true"><rect x="30" y="30" width="60" height="60"/><rect x="30" y="30" width="60" height="60" transform="rotate(45 60 60)"/><path d="M44 61l11 11 22-24"/></svg>
    <b>${title}</b><span>${sub}</span>
    <button class="btn" type="button">الحمد لله</button></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.querySelector('button').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  setTimeout(() => el.querySelector('button').focus(), 50);
  setTimeout(() => { burst(innerWidth / 2, innerHeight * 0.42, { n: 60, power: 9, size: 6 }); }, 250);
}

/* ---------------- Route depth for directional transitions ---------------- */
const DEPTH = { home: 0, adhkar: 0, tasbeeh: 0, quran: 0, stats: 0, circle: 0, surahs: 1, review: 1, surah: 2, learn: 3, test: 3 };
export function transitionClass(from, to) {
  if (reduce || !from || from === to) return from === to ? '' : 'enter';
  const a = DEPTH[from] ?? 0, b = DEPTH[to] ?? 0;
  return b > a ? 'enter-fwd' : b < a ? 'enter-back' : 'enter';
}
