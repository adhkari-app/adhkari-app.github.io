// prayer.js — prayer times & qibla compass
import * as store from './store.js';
import * as FX from './fx.js';
import { sunTimes, fmtTime, METHODS, qiblaBearing, distanceToKaaba } from './sun.js';

let ctx = null; // { I, esc, toast, vibrate, render, fmt, geolocate, chime }
export function initPrayer(c) { ctx = c; }

const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const nameOf = (k, d) => (k === 'dhuhr' && d.getDay() === 5) ? 'الجمعة' : NAMES[k];

export function todayTimes(date = new Date()) {
  const L = store.loc();
  return sunTimes(date, L.lat, L.lng, store.prayOpts());
}

export function nextPrayer(now = new Date()) {
  const t = todayTimes(now);
  for (const k of ORDER) if (k !== 'sunrise' && t[k] > now) return { key: k, name: nameOf(k, t[k]), time: t[k] };
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  const t2 = todayTimes(tm);
  return { key: 'fajr', name: 'الفجر', time: t2.fajr, tomorrow: true };
}

export function lastPrayer(now = new Date()) {
  const t = todayTimes(now);
  let last = null;
  for (const k of ORDER) if (k !== 'sunrise' && t[k] <= now) last = { key: k, time: t[k] };
  return last;
}

function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

const ICONS = {
  fajr: '<path d="M3 18h18M6 14a6 6 0 0 1 12 0"/><path d="M12 4v3M5 8l1.5 1.5M19 8l-1.5 1.5"/>',
  sunrise: '<path d="M3 18h18M7 14a5 5 0 0 1 10 0"/><path d="M12 6V3M9 5l3-3 3 3"/>',
  dhuhr: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  asr: '<circle cx="9" cy="10" r="4"/><path d="M3 20h18M15 20l4-8"/>',
  maghrib: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0"/><path d="M12 13V9M9 11l3 3 3-3"/>',
  isha: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
};
const ic = k => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">${ICONS[k]}</svg>`;

/* ================= PRAYER ================= */
export const Prayer = {
  html() {
    const I = ctx.I, now = new Date(), t = todayTimes(now), np = nextPrayer(now), L = store.loc();
    const st = store.get().settings;
    const rows = ORDER.map(k => {
      const isNext = !np.tomorrow && np.key === k;
      const past = t[k] <= now && !isNext;
      return `<li class="pr-row ${isNext ? 'next' : ''} ${past ? 'past' : ''}">
        <span class="pr-ic">${ic(k)}</span><b>${nameOf(k, t[k])}</b>
        ${isNext ? '<span class="chip gold">القادمة</span>' : ''}
        <span class="pr-time">${fmtTime(t[k])}</span></li>`;
    }).join('');
    return `
    <header class="hero pattern pr-hero">
      <div class="row between" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="hello">الصلاة القادمة${np.tomorrow ? ' (غداً)' : ''}</span>
          <h1 style="font-size:34px">${np.name}</h1>
          <span class="date">${fmtTime(np.time)} · ${ctx.esc(L.label)}</span>
        </div>
        <a class="icon-btn" href="#/qibla" aria-label="اتجاه القبلة">${I.compass}</a>
      </div>
      <div class="pr-count" aria-live="off"><span>بعد</span><b data-el="cd">${countdown(np.time - now)}</b></div>
    </header>
    <main class="pad overlap stack stagger">
      <ul class="card raised pr-list">${rows}</ul>
      ${st.loc ? '' : `<button class="loc-hint" data-act="loc">${I.pin}<span>الأوقات محسوبة لغزة. اضغط لتحديد موقعك بدقة.</span></button>`}
      <a class="card stat-card" href="#/qibla" style="flex-direction:row;align-items:center;gap:14px">
        <span class="now-icon">${I.compass}</span>
        <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">اتجاه القبلة</b>
        <span class="muted" style="font-size:13px">${Math.round(qiblaBearing(L.lat, L.lng))}° من الشمال · ${ctx.fmt(Math.round(distanceToKaaba(L.lat, L.lng)))} كم عن مكة</span></span>
        ${I.left.replace('<svg', '<svg width="20" height="20"')}</a>
      <section class="card stack" style="gap:10px">
        <h2 style="font-size:15px">طريقة الحساب</h2>
        <div class="field"><label for="pm">الجهة</label><select id="pm">
          ${Object.entries(METHODS).map(([k, v]) => `<option value="${k}" ${(st.method || 'mwl') === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div>
        <div class="field"><label for="pa">صلاة العصر</label><select id="pa">
          <option value="std" ${(st.asrMethod || 'std') === 'std' ? 'selected' : ''}>الجمهور (ظل الشيء مثله)</option>
          <option value="hanafi" ${st.asrMethod === 'hanafi' ? 'selected' : ''}>الحنفي (ظل الشيء مثليه)</option></select></div>
        <p class="muted" style="font-size:12px;line-height:1.7;margin:0">قارن الأوقات بتقويم مسجدك أو وزارة الأوقاف في بلدك، واختر الطريقة الأقرب لها.</p>
      </section>
    </main>`;
  },
  mount(root) {
    root.querySelector('[data-act="loc"]')?.addEventListener('click', ctx.geolocate);
    const st = store.get().settings;
    root.querySelector('#pm').addEventListener('change', e => { st.method = e.target.value; store.save(); ctx.sync(); ctx.render(); });
    root.querySelector('#pa').addEventListener('change', e => { st.asrMethod = e.target.value; store.save(); ctx.sync(); ctx.render(); });
    const cd = root.querySelector('[data-el="cd"]');
    let np = nextPrayer();
    this.timer = setInterval(() => {
      const now = new Date();
      if (now >= np.time) {
        ctx.toast(`حان الآن وقت صلاة ${np.name}`);
        ctx.chime(); ctx.vibrate([80, 60, 80]);
        ctx.render(); return;
      }
      cd.textContent = countdown(np.time - now);
    }, 1000);
  },
  unmount() { clearInterval(this.timer); }
};

/* ================= QIBLA ================= */
let heading = null, smooth = null, aligned = false;
function onOri(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
  if (h == null) return;
  const so = (screen.orientation && screen.orientation.angle) || 0;
  h = (h + so + 360) % 360;
  if (smooth == null) smooth = h;
  let d = ((h - smooth + 540) % 360) - 180;
  smooth = (smooth + d * 0.2 + 360) % 360;
  heading = smooth;
  Qibla.paint && Qibla.paint();
}

export const Qibla = {
  html() {
    const I = ctx.I, L = store.loc(), b = qiblaBearing(L.lat, L.lng);
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = i * 5, long = i % 6 === 0;
      return `<line x1="150" y1="${long ? 18 : 24}" x2="150" y2="32" transform="rotate(${a} 150 150)" class="${long ? 'tk-l' : 'tk'}"/>`;
    }).join('');
    return `
    <header class="title-bar"><a class="icon-btn" href="#/prayer" aria-label="رجوع">${I.back}</a><h1>اتجاه القبلة</h1></header>
    <main class="pad stack" style="margin-top:8px;align-items:center;text-align:center">
      <div class="qibla-wrap" data-el="wrap">
        <svg viewBox="0 0 300 300" class="compass" aria-hidden="true">
          <circle cx="150" cy="150" r="146" class="c-ring"/>
          <g data-el="dial" class="dial" style="transform:rotate(0deg)">
            ${ticks}
            <text x="150" y="52" class="cd-n">ش</text><text x="250" y="156" class="cd-l">ق</text><text x="150" y="258" class="cd-l">ج</text><text x="50" y="156" class="cd-l">غ</text>
            <g transform="rotate(${b.toFixed(1)} 150 150)">
              <line x1="150" y1="150" x2="150" y2="44" class="q-line"/>
              <g transform="translate(150 40)"><rect x="-13" y="-13" width="26" height="26" rx="2" class="kaaba"/><rect x="-13" y="-6" width="26" height="4" class="kaaba-band"/></g>
            </g>
          </g>
          <path d="M150 70 L162 150 L150 140 L138 150 Z" class="needle"/>
          <circle cx="150" cy="150" r="8" class="hub"/>
        </svg>
      </div>
      <b class="q-status" data-el="status">${Math.round(b)}° من الشمال باتجاه عقارب الساعة</b>
      <span class="muted" style="font-size:13px" data-el="hint">اضغط تشغيل البوصلة وأمسك الجوال بشكل مستوٍ</span>
      <button class="btn big" data-act="start" style="width:100%">تشغيل البوصلة</button>
      ${store.get().settings.loc ? '' : `<button class="loc-hint" data-act="loc">${I.pin}<span>حدّد موقعك ليكون اتجاه القبلة دقيقاً</span></button>`}
      <p class="muted" style="font-size:12px;line-height:1.7;margin:0">للدقة: ابعد عن المعادن والمغناطيس، وحرّك الجوال على شكل رقم 8 لمعايرة البوصلة. المسافة إلى مكة: ${ctx.fmt(Math.round(distanceToKaaba(L.lat, L.lng)))} كم.</p>
    </main>`;
  },
  mount(root) {
    const L = store.loc(), b = qiblaBearing(L.lat, L.lng);
    const dial = root.querySelector('[data-el="dial"]'), status = root.querySelector('[data-el="status"]'), hint = root.querySelector('[data-el="hint"]');
    const wrap = root.querySelector('[data-el="wrap"]');
    aligned = false; heading = null; smooth = null;
    this.paint = () => {
      if (heading == null) return;
      dial.style.transform = `rotate(${-heading}deg)`;
      const diff = Math.abs(((b - heading + 540) % 360) - 180);
      const now = diff < 4;
      wrap.classList.toggle('aligned', now);
      status.textContent = now ? 'أنت باتجاه القبلة ✓' : `لفّ ${Math.round(diff)}° ${(((b - heading + 360) % 360) < 180) ? 'لليمين' : 'لليسار'}`;
      if (now && !aligned) { ctx.vibrate([40, 40, 40]); FX.burstAt(wrap, { n: 24, power: 5 }); }
      aligned = now;
    };
    root.querySelector('[data-act="loc"]')?.addEventListener('click', ctx.geolocate);
    root.querySelector('[data-act="start"]').addEventListener('click', async e => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          const r = await DeviceOrientationEvent.requestPermission();
          if (r !== 'granted') { ctx.toast('لازم تسمح بقراءة الحساسات'); return; }
        }
      } catch (err) {}
      window.addEventListener('deviceorientationabsolute', onOri);
      window.addEventListener('deviceorientation', onOri);
      e.target.textContent = 'البوصلة شغّالة';
      e.target.disabled = true;
      hint.textContent = 'خلّي الجوال مستوي ولفّ ببطء لحد ما يصير السهم على الكعبة';
      setTimeout(() => { if (heading == null) hint.textContent = 'جهازك ما فيه بوصلة — استخدم الزاوية المكتوبة فوق مع الشمال'; }, 3000);
    });
  },
  unmount() {
    window.removeEventListener('deviceorientationabsolute', onOri);
    window.removeEventListener('deviceorientation', onOri);
    this.paint = null;
  }
};
