import * as store from './store.js';
import { adhkarFor, TASBEEH, VERSES } from './data.js';
import { currentPeriod, fmtTime } from './sun.js';
import * as circle from './challenge.js';
import * as Q from './quran.js';

const s = store.load();
const app = document.getElementById('app');
const TARGETS = [33, 100, 1000];
const FS_STEPS = [0.85, 1, 1.15, 1.3, 1.5];
const AV_COLORS = ['#0F4C45', '#8A6420', '#3E8A76', '#5E6B67', '#6B4F8A', '#9A4A3A'];

/* ---------------- Icons ---------------- */
const svg = (p, extra = '') => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const I = {
  home: svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  beads: svg('<circle cx="12" cy="10" r="6"/><path d="M12 16v4"/><circle cx="12" cy="21" r="1"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'),
  users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  flame: svg('<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>'),
  star: svg('<path d="M12 2l2.5 5.5L20 10l-5.5 2.5L12 18l-2.5-5.5L4 10l5.5-2.5z"/>'),
  left: svg('<path d="M15 6l-6 6 6 6"/>', 'stroke-width="2"'),
  back: svg('<path d="M9 6l6 6-6 6"/>', 'stroke-width="2"'),
  check: svg('<path d="M5 12l5 5 9-10"/>', 'stroke-width="2.6"'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  quran: svg('<path d="M2 5.5C5 4.5 9 4.5 12 6.5c3-2 7-2 10-1V19c-3-1-7-1-10 1-3-2-7-2-10-1z"/><path d="M12 6.5V20"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2"'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  play: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
  prevR: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6v12l8.5-6z"/><rect x="16.8" y="6" width="2.2" height="12" rx="1"/></svg>',
  nextL: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6v12l-8.5-6z"/><rect x="5" y="6" width="2.2" height="12" rx="1"/></svg>',
  octa: `<svg aria-hidden="true" viewBox="0 0 56 56" width="56" height="56"><g fill="none" stroke="#D9B26A" stroke-width="1.5"><rect x="12" y="12" width="32" height="32"/><rect x="12" y="12" width="32" height="32" transform="rotate(45 28 28)"/></g></svg>`
};

/* ---------------- Helpers ---------------- */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString('en-US');
const today = () => store.dateKey();
const streakUnit = n => n === 1 ? 'يوم' : n === 2 ? 'يومان' : (n >= 3 && n <= 10) ? 'أيام متتالية' : 'يوماً متتالياً';
const dayWord = n => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : (n >= 3 && n <= 10) ? `${n} أيام` : `${n} يوماً`;
const timesLabel = n => n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتان' : n <= 10 ? `${n} مرات` : `${n} مرة`;

function vibrate(p) {
  if (!s.settings.vibrate) return;
  try { navigator.vibrate && navigator.vibrate(p); } catch (e) {}
}

let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function applyTheme() {
  document.body.classList.toggle('khushu', !!s.settings.khushu);
  document.documentElement.style.setProperty('--fs', s.settings.fs || 1);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = s.settings.khushu ? '#08201D' : '#0F4C45';
}

function hijri(d) {
  try {
    return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch (e) { return ''; }
}

function confirmTwice(btn, label, action) {
  if (btn.dataset.armed) { delete btn.dataset.armed; action(); return; }
  const old = btn.innerHTML;
  btn.dataset.armed = '1';
  btn.classList.add('warn');
  btn.innerHTML = label;
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.classList.remove('warn'); btn.innerHTML = old; } }, 2500);
}

function geolocate() {
  if (!navigator.geolocation) { toast('المتصفح لا يدعم تحديد الموقع'); return; }
  toast('جارٍ تحديد موقعك…');
  navigator.geolocation.getCurrentPosition(pos => {
    s.settings.loc = { lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3), label: 'موقعك الحالي', auto: true };
    store.save();
    toast('تم ضبط أوقات الأذكار حسب موقعك ✓');
    render();
  }, () => toast('تعذّر تحديد الموقع — تأكد من السماح بالوصول'), { timeout: 15000, maximumAge: 86400000 });
}

/* ---------------- Nav ---------------- */
const NAV = [
  ['home', 'الرئيسية', I.home, []], ['adhkar', 'الأذكار', I.moon, []], ['tasbeeh', 'السبحة', I.beads, []],
  ['quran', 'القرآن', I.quran, ['surahs', 'surah', 'learn', 'test', 'review']], ['stats', 'إنجازي', I.chart, []]
];
const navHTML = cur => `<nav class="nav" aria-label="التنقل الرئيسي">${NAV.map(([k, l, ic, subs]) =>
  `<a href="#/${k}" ${k === cur || subs.includes(cur) ? 'aria-current="page"' : ''}><span class="bar"></span>${ic}<span>${l}</span></a>`).join('')}</nav>`;

/* ================= HOME ================= */
const Home = {
  html() {
    const now = new Date();
    const L = store.loc();
    const per = currentPeriod(now, L.lat, L.lng);
    const t = per.times;
    const list = adhkarFor(per.period);
    const d = store.day();
    const prog = per.period === 'morning' ? d.m : d.e;
    const doneN = list.filter(a => (prog[a.id] || 0) >= a.count).length;
    const isDone = per.period === 'morning' ? d.md : d.ed;
    const pName = per.period === 'morning' ? 'الصباح' : 'المساء';
    const verse = VERSES[Math.floor(now / 86400000) % VERSES.length];
    const greet = now.getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
    const hello = s.settings.name ? `السلام عليكم يا ${esc(s.settings.name)}` : 'السلام عليكم';
    const sub = per.period === 'morning'
      ? `من الفجر ${fmtTime(t.fajr)} حتى الظهر ${fmtTime(t.dhuhr)}`
      : `من العصر ${fmtTime(t.asr)} · غروب الشمس ${fmtTime(t.maghrib)}`;

    let nowCard;
    if (!per.active) {
      nowCard = `
        <div class="row" style="gap:12px">
          <div class="now-icon">${I.sun}</div>
          <div style="flex:1"><h2 style="font-size:17px">أذكار المساء تبدأ مع العصر</h2>
          <span class="muted" style="font-size:13px">العصر ${fmtTime(t.asr)} · المغرب ${fmtTime(t.maghrib)}</span></div>
        </div>
        <a class="btn outline" href="#/adhkar?p=morning">استعرض أذكار الصباح</a>`;
    } else if (isDone) {
      nowCard = `
        <div class="row" style="gap:12px">
          <div class="now-icon" style="background:var(--ok-soft);color:var(--primary)">${I.check}</div>
          <div style="flex:1"><h2 style="font-size:17px">أتممت أذكار ${pName}</h2>
          <span class="muted" style="font-size:13px">تقبّل الله منك</span></div>
        </div>
        <a class="btn ghost" href="#/adhkar?p=${per.period}">راجع الأذكار</a>`;
    } else {
      nowCard = `
        <div class="row" style="gap:12px">
          <div class="now-icon">${per.period === 'morning' ? I.sun : I.moon}</div>
          <div style="flex:1"><h2 style="font-size:17px">حان وقت أذكار ${pName}</h2>
          <span class="muted" style="font-size:13px">${sub}</span></div>
        </div>
        <div class="row"><div class="progress" style="flex:1"><span style="width:${Math.round(doneN / list.length * 100)}%"></span></div>
          <span class="muted" style="font-size:13px;font-weight:600">${doneN} من ${list.length}</span></div>
        <a class="btn" href="#/adhkar?p=${per.period}">${doneN ? 'أكمل الأذكار' : 'ابدأ الأذكار'} ${I.left.replace('<svg', '<svg width="18" height="18"')}</a>`;
    }

    const c = s.circle;
    let circleCard;
    if (c && c.cache) {
      const pct = Math.min(100, Math.round(c.cache.total / c.cache.goal * 100));
      circleCard = `
        <a class="card stat-card" href="#/circle" style="gap:10px">
          <span class="row between"><b style="font-size:15px">${esc(c.cache.name)}</b><span class="chip gold">${esc(daysLeftLabel(c.cache.endsAt))}</span></span>
          <span><span class="big-num" style="font-size:22px">${fmt(c.cache.total)}</span><span class="unit">من ${fmt(c.cache.goal)} استغفار</span></span>
          <span class="progress gold"><span style="width:${pct}%"></span></span>
        </a>`;
    } else if (c) {
      circleCard = `<a class="card stat-card" href="#/circle"><b style="font-size:15px">حلقتك</b><span class="muted">رمز الحلقة <span class="code">${esc(c.code)}</span></span></a>`;
    } else {
      circleCard = `
        <a class="card stat-card" href="#/circle" style="flex-direction:row;align-items:center;gap:14px">
          <span class="now-icon">${I.users}</span>
          <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">حلقة استغفار جماعية</b>
          <span class="muted" style="font-size:13px">اجتمعوا على هدف واحد مع العائلة والأصحاب</span></span>
          ${I.left.replace('<svg', '<svg width="20" height="20"')}
        </a>`;
    }

    return `
    <header class="hero pattern">
      <div class="row between" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="hello">${hello}</span>
          <h1>${greet}</h1>
          <span class="date">${esc(hijri(now))}</span>
        </div>
        <a class="icon-btn" href="#/stats?s=settings" aria-label="الإعدادات">${I.gear}</a>
      </div>
      <p class="verse">﴿${verse.text}﴾<small>${verse.ref}</small></p>
    </header>
    <main class="pad overlap stack">
      <section class="card raised stack" aria-live="polite">${nowCard}</section>
      ${s.settings.loc ? '' : `<button class="loc-hint" data-act="loc">${I.pin}<span>الأوقات محسوبة لغزة. اضغط لتحديد موقعك وضبط أوقات الأذكار بدقة.</span></button>`}
      <div class="grid2">
        <a class="card stat-card" href="#/stats"><span class="lbl">${I.flame}سلسلة الأيام</span>
          ${(() => { const n = store.streak(); return `<span><span class="big-num">${n}</span><span class="unit">${streakUnit(n)}</span></span>`; })()}</a>
        <a class="card stat-card" href="#/stats"><span class="lbl">${I.star}استغفار اليوم</span>
          <span><span class="big-num">${fmt(d.i)}</span><span class="unit">مرة</span></span></a>
      </div>
      <a class="tasbeeh-link" href="#/tasbeeh">
        <span class="mini-star">${I.octa}<span style="position:relative">${TARGETS[s.tasbeeh.ti]}</span></span>
        <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">السبحة الذكية</b>
        <span style="font-size:13px;color:var(--hero-muted)">انقر في أي مكان · اهتزاز عند كل ${TARGETS[s.tasbeeh.ti]}</span></span>
        <span style="color:var(--gold);display:flex">${I.left.replace('<svg', '<svg width="20" height="20"')}</span>
      </a>
      ${quranCard()}
      ${circleCard}
    </main>`;
  },
  mount(root) {
    root.querySelector('[data-act="loc"]')?.addEventListener('click', geolocate);
    if (!Q.ready()) Q.ensureData().then(() => { if (parse().name === 'home') render(); }).catch(() => {});
    this.timer = setInterval(() => render(), 60000);
  },
  unmount() { clearInterval(this.timer); }
};

function quranCard() {
  const q = Q.summary();
  const arrow = I.left.replace('<svg', '<svg width="20" height="20"');
  if (!q || !q.plan) {
    return `<a class="card stat-card quran-card" href="#/quran" style="flex-direction:row;align-items:center;gap:14px">
      <span class="now-icon">${I.quran}</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">زاوية تحفيظ القرآن</b>
      <span class="muted" style="font-size:13px">تكرار مع القارئ، تسميع، ومراجعة ذكية</span></span>${arrow}</a>`;
  }
  const left = Math.max(0, q.goal - q.newToday);
  const sub = [left && q.next ? `حفظ ${left} ${left <= 10 && left > 2 ? 'آيات' : 'آية'} من ${q.next.name}` : 'أتممت حفظ اليوم ✓', q.due ? `مراجعة ${q.due}` : 'لا مراجعة مستحقة'].join(' · ');
  return `<a class="card stat-card quran-card" href="#/quran" style="flex-direction:row;align-items:center;gap:14px">
    <span class="now-icon">${I.quran}</span>
    <span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">وردك من القرآن</b>
    <span class="muted" style="font-size:13px">${sub}</span></span>${arrow}</a>`;
}

function daysLeftLabel(endsAtMs) {
  const left = Math.ceil((endsAtMs - Date.now()) / 86400000);
  if (left <= 0) return 'انتهت';
  if (left === 1) return 'آخر يوم';
  if (left === 2) return 'باقي يومان';
  return left <= 10 ? `باقي ${left} أيام` : `باقي ${left} يوماً`;
}

/* ================= TASBEEH ================= */
const C = 854.51; // 2πr, r=136
const Tasbeeh = {
  opt() { return TASBEEH.find(o => o.id === s.tasbeeh.sel) || TASBEEH[3]; },
  vals() {
    const t = TARGETS[s.tasbeeh.ti], c = s.tasbeeh.count;
    const shown = c === 0 ? 0 : ((c - 1) % t) + 1;
    const round = c === 0 ? 1 : Math.floor((c - 1) / t) + 1;
    return { t, c, shown, round, offset: (C * (1 - shown / t)).toFixed(1) };
  },
  html() {
    const o = this.opt(), v = this.vals();
    return `
    <header class="title-bar">
      <h1>السبحة الذكية</h1>
      <button class="btn ghost sm" data-act="khushu" style="border-radius:22px">${I.moon.replace('<svg', '<svg width="18" height="18"')}<span>${s.settings.khushu ? 'الوضع العادي' : 'وضع الخشوع'}</span></button>
    </header>
    <div class="pills" role="group" aria-label="اختر الذكر">
      ${TASBEEH.map(x => `<button class="pill" data-sel="${x.id}" aria-pressed="${x.id === o.id}">${x.label}</button>`).join('')}
    </div>
    <button class="tapzone" data-act="tap" aria-label="سبّح — اضغط للعدّ">
      <span class="dhikr-text" data-el="text">${o.text}</span>
      <span class="ring-wrap">
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <g class="ornament"><rect x="72" y="72" width="156" height="156"/><rect x="72" y="72" width="156" height="156" transform="rotate(45 150 150)"/><circle cx="150" cy="150" r="96"/></g>
          <circle class="track" cx="150" cy="150" r="136"/>
          <circle class="prog" data-el="prog" cx="150" cy="150" r="136" stroke-dasharray="${C}" stroke-dashoffset="${v.offset}" transform="rotate(-90 150 150)"/>
        </svg>
        <span class="ring-center">
          <span class="count" data-el="count">${v.shown}</span>
          <span class="of">من <span data-el="target">${v.t}</span></span>
          <span class="round">الدورة <span data-el="round">${v.round}</span></span>
        </span>
      </span>
    </button>
    <div class="hint pad">
      <b>انقر على الدائرة أو في أي مكان حولها للعدّ</b>
      <span>${'vibrate' in navigator ? 'اهتزاز خفيف مع كل تسبيحة، ومزدوج عند إتمام الدورة' : 'يعمل أيضاً مع لوحة المفاتيح: المسافة أو Enter'}</span>
    </div>
    <div class="controls">
      <button class="ctl" data-act="reset">${I.reset}<span>تصفير</span></button>
      <button class="ctl" data-act="target"><b data-el="target2">${v.t}</b><span>الهدف · غيّر</span></button>
      <div class="ctl"><b data-el="total">${fmt(store.day().t)}</b><span>مجموع اليوم</span></div>
    </div>`;
  },
  update(root) {
    const v = this.vals();
    root.querySelector('[data-el="count"]').textContent = v.shown;
    root.querySelector('[data-el="round"]').textContent = v.round;
    root.querySelector('[data-el="target"]').textContent = v.t;
    root.querySelector('[data-el="target2"]').textContent = v.t;
    root.querySelector('[data-el="prog"]').setAttribute('stroke-dashoffset', v.offset);
    root.querySelector('[data-el="total"]').textContent = fmt(store.day().t);
  },
  tap(root) {
    const o = this.opt();
    const d = store.day();
    s.tasbeeh.count++;
    d.t++;
    if (o.istighfar) { d.i++; circle.add(1); }
    store.save();
    const t = TARGETS[s.tasbeeh.ti];
    const zone = root.querySelector('.tapzone');
    if (s.tasbeeh.count % t === 0) {
      vibrate([60, 40, 60]);
      zone.classList.remove('pulse'); void zone.offsetWidth; zone.classList.add('pulse');
      toast(`أتممت ${t} ✓ — بارك الله فيك`);
    } else {
      vibrate(12);
      zone.classList.remove('bump'); void zone.offsetWidth; zone.classList.add('bump');
    }
    this.update(root);
  },
  mount(root, params) {
    if (params.get('d')) {
      const want = params.get('d');
      try { history.replaceState(null, '', '#/tasbeeh'); } catch (e) {}
      if (TASBEEH.some(x => x.id === want) && s.tasbeeh.sel !== want) {
        s.tasbeeh.sel = want; s.tasbeeh.count = 0; store.save(); render(); return;
      }
    }
    root.querySelector('[data-act="tap"]').addEventListener('click', () => this.tap(root));
    root.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => {
      if (s.tasbeeh.sel === b.dataset.sel) return;
      s.tasbeeh.sel = b.dataset.sel; s.tasbeeh.count = 0; store.save(); render();
    }));
    root.querySelector('[data-act="khushu"]').addEventListener('click', () => {
      s.settings.khushu = !s.settings.khushu; store.save(); applyTheme(); render();
    });
    root.querySelector('[data-act="target"]').addEventListener('click', () => {
      s.tasbeeh.ti = (s.tasbeeh.ti + 1) % TARGETS.length; s.tasbeeh.count = 0; store.save(); this.update(root);
    });
    const rb = root.querySelector('[data-act="reset"]');
    rb.addEventListener('click', () => confirmTwice(rb, `${I.reset}<span>اضغط للتأكيد</span>`, () => {
      s.tasbeeh.count = 0; store.save(); render();
    }));
    this.key = e => {
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'MediaTrackNext', 'MediaPlayPause', 'AudioVolumeUp', 'AudioVolumeDown'];
      const onBody = e.target === document.body || e.target === root;
      if (keys.includes(e.key) || (onBody && (e.key === ' ' || e.key === 'Enter'))) { e.preventDefault(); this.tap(root); }
    };
    document.addEventListener('keydown', this.key);
  },
  unmount() { document.removeEventListener('keydown', this.key); }
};

/* ================= ADHKAR ================= */
const Adhkar = {
  period(params) {
    const p = params.get('p');
    if (p === 'morning' || p === 'evening') return p;
    const L = store.loc();
    return currentPeriod(new Date(), L.lat, L.lng).period;
  },
  html(params) {
    const p = this.period(params);
    const list = adhkarFor(p);
    const d = store.day();
    const prog = p === 'morning' ? d.m : d.e;
    const doneN = list.filter(a => (prog[a.id] || 0) >= a.count).length;
    const cur = list.findIndex(a => (prog[a.id] || 0) < a.count);
    const title = p === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';

    const cards = list.map((a, i) => {
      const n = Math.min(prog[a.id] || 0, a.count);
      const done = n >= a.count;
      const chip = done ? `<span class="chip ok">${I.check.replace('<svg', '<svg width="14" height="14"')}تمّ · ${timesLabel(a.count)}</span>`
        : i === cur ? `<span class="chip gold">الآن · ${timesLabel(a.count)}</span>`
          : `<span class="chip mute">${timesLabel(a.count)}</span>`;
      return `
      <article class="dhikr ${done ? 'done' : ''} ${i === cur ? 'current' : ''}" id="dh-${a.id}">
        <div class="row between">${chip}${a.title ? `<span class="ttl">${a.title}</span>` : ''}</div>
        <p class="txt">${a.text}</p>
        ${done ? '' : `
          <span class="muted" style="font-size:12px">${a.source}</span>
          ${a.fadl ? `<details><summary>فضل هذا الذكر</summary>${a.fadl}</details>` : ''}
          <button class="counter-btn" data-id="${a.id}" data-count="${a.count}" aria-label="عدّ ${esc(a.title || 'الذكر')}">
            <span>${a.count === 1 ? 'قرأته ✓' : 'اضغط للعدّ'}</span><span class="n">${n} / ${a.count}</span>
          </button>
          ${a.count > 1 ? `<div class="progress"><span style="width:${n / a.count * 100}%"></span></div>` : ''}`}
      </article>`;
    }).join('');

    return `
    <header class="ad-hero pattern">
      <div class="row">
        <a class="icon-btn" href="#/home" aria-label="رجوع">${I.back}</a>
        <h1>${title}</h1>
        <div class="font-ctl" role="group" aria-label="حجم الخط">
          <button data-fs="-1" aria-label="تصغير الخط">أ-</button>
          <button data-fs="1" aria-label="تكبير الخط">أ+</button>
        </div>
      </div>
      <div class="seg" role="group" aria-label="الفترة">
        <button data-p="morning" aria-pressed="${p === 'morning'}">أذكار الصباح</button>
        <button data-p="evening" aria-pressed="${p === 'evening'}">أذكار المساء</button>
      </div>
      <div class="ad-progress">
        <div class="progress"><span style="width:${doneN / list.length * 100}%"></span></div>
        <span>${doneN} من ${list.length}</span>
      </div>
    </header>
    <main class="ad-list">
      ${doneN === list.length ? `<div class="card done-banner">${I.check.replace('<svg', '<svg width="28" height="28" style="color:var(--gold-ink)"')}<b>أتممت ${title}</b><span class="muted" style="font-size:14px">تقبّل الله منك</span></div>` : ''}
      ${cards}
      <button class="btn ghost sm" data-act="reset-period" style="margin-top:8px">${I.reset.replace('<svg', '<svg width="18" height="18"')}<span>إعادة ${title} من البداية</span></button>
    </main>`;
  },
  mount(root, params) {
    const p = this.period(params);
    const list = adhkarFor(p);
    root.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { location.hash = `#/adhkar?p=${b.dataset.p}`; }));
    root.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', () => {
      let i = FS_STEPS.indexOf(s.settings.fs); if (i < 0) i = 1;
      i = Math.max(0, Math.min(FS_STEPS.length - 1, i + Number(b.dataset.fs)));
      s.settings.fs = FS_STEPS[i]; store.save(); applyTheme();
    }));
    root.querySelectorAll('.counter-btn').forEach(btn => btn.addEventListener('click', () => {
      const d = store.day();
      const prog = p === 'morning' ? d.m : d.e;
      const id = btn.dataset.id, count = +btn.dataset.count;
      const item = list.find(a => a.id === id);
      prog[id] = Math.min(count, (prog[id] || 0) + 1);
      if (item.istighfar) { d.i++; circle.add(1); }
      const n = prog[id];
      if (n >= count) {
        const all = list.every(a => (prog[a.id] || 0) >= a.count);
        if (all) { if (p === 'morning') d.md = true; else d.ed = true; }
        store.save();
        vibrate([40, 30, 40]);
        if (all) toast('تقبّل الله ✓');
        const nextIdx = list.findIndex(a => (prog[a.id] || 0) < a.count);
        render();
        if (nextIdx >= 0) {
          const el = document.getElementById(`dh-${list[nextIdx].id}`);
          el && el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        store.save();
        vibrate(12);
        btn.querySelector('.n').textContent = `${n} / ${count}`;
        const bar = btn.parentElement.querySelector('.progress > span');
        if (bar) bar.style.width = `${n / count * 100}%`;
      }
    }));
    const rb = root.querySelector('[data-act="reset-period"]');
    rb.addEventListener('click', () => confirmTwice(rb, '<span>اضغط مرة ثانية للتأكيد</span>', () => {
      const d = store.day();
      if (p === 'morning') { d.m = {}; d.md = false; } else { d.e = {}; d.ed = false; }
      store.save(); render(); window.scrollTo(0, 0);
    }));
  }
};

/* ================= CIRCLE ================= */
const Circle = {
  html(params) {
    if (!circle.isConfigured()) {
      return `
      <header class="title-bar"><h1>الحلقات</h1></header>
      <main class="pad stack" style="margin-top:12px">
        <div class="card stack">
          <div class="row" style="gap:12px"><span class="now-icon">${I.users}</span><b style="font-size:16px">حلقات الاستغفار الجماعية</b></div>
          <p class="muted" style="margin:0;line-height:1.8;font-size:14px">اعمل حلقة مع عائلتك أو أصحابك بهدف مشترك، مثلاً 100 ألف استغفار خلال شهر، وكل واحد يساهم من جواله.</p>
          <p style="margin:0;line-height:1.8;font-size:13px;color:var(--gold-ink)">هذه الميزة تحتاج ربط التطبيق بـ Firebase أولاً (خطوة إعداد لمرة واحدة من المطوّر — التفاصيل في ملف README).</p>
        </div>
      </main>`;
    }
    if (!s.circle) {
      const code = (params.get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      return `
      <header class="title-bar"><h1>الحلقات</h1></header>
      <main class="pad stack" style="margin-top:12px">
        <p class="muted" style="margin:0;line-height:1.8;font-size:14px">اجتمعوا على هدف استغفار واحد. يظهر المجموع فقط، والأعداد الفردية مخفية.</p>
        <div class="field"><label for="dn">اسمك كما يظهر للأعضاء</label><input id="dn" maxlength="30" value="${esc(s.settings.name)}" placeholder="مثال: أبو أحمد" autocomplete="nickname"></div>
        <section class="card stack">
          <b style="font-size:16px">انضم لحلقة</b>
          <div class="field"><label for="jc">رمز الحلقة</label><input id="jc" class="code" maxlength="6" value="${esc(code)}" placeholder="ABC123" autocapitalize="characters" autocomplete="off"></div>
          <button class="btn" data-act="join">انضمام</button>
        </section>
        <section class="card stack">
          <b style="font-size:16px">أنشئ حلقة جديدة</b>
          <div class="field"><label for="cn">اسم الحلقة</label><input id="cn" maxlength="40" placeholder="حلقة العائلة"></div>
          <div class="grid2">
            <div class="field"><label for="cg">الهدف</label><select id="cg">
              <option value="10000">10,000</option><option value="50000">50,000</option><option value="100000" selected>100,000</option><option value="1000000">1,000,000</option></select></div>
            <div class="field"><label for="cd">المدة</label><select id="cd">
              <option value="7">أسبوع</option><option value="14">أسبوعان</option><option value="30" selected>شهر</option><option value="90">3 أشهر</option></select></div>
          </div>
          <button class="btn outline" data-act="create">إنشاء الحلقة</button>
        </section>
      </main>`;
    }
    return `
    <header class="title-bar">
      <h1 data-el="cname">${esc(s.circle.cache?.name || 'حلقتي')}</h1>
      <button class="icon-btn" data-act="share" aria-label="مشاركة رابط الحلقة">${I.share}</button>
    </header>
    <main class="pad stack" style="margin-top:12px" data-el="body">
      <div class="card muted" style="text-align:center">جارٍ تحميل الحلقة…</div>
    </main>`;
  },
  body(data) {
    const { circle: c, members, uid } = data;
    if (!c) return `<div class="card stack"><b>هذه الحلقة لم تعد موجودة</b><button class="btn ghost" data-act="leave">الخروج منها</button></div>`;
    const t = today();
    const pct = Math.min(100, Math.round(c.total / c.goal * 100));
    const off = (314.16 * (1 - pct / 100)).toFixed(1);
    const active = members.filter(m => m.lastActive === t || (m.id === uid && (s.circle.mine?.[t] || 0) > 0)).length;
    const sorted = [...members].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : (a.name || '').localeCompare(b.name || '', 'ar')));
    const endsAt = c.endsAt?.toMillis ? c.endsAt.toMillis() : Date.now();
    return `
      <section class="circle-hero pattern">
        <div class="row" style="gap:18px">
          <div class="circle-ring">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#D9B26A" stroke-width="10" stroke-linecap="round" stroke-dasharray="314.16" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/></svg>
            <span>${pct}%</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:30px;font-weight:700;line-height:1.1">${fmt(c.total)}</span>
            <span style="font-size:14px;color:var(--hero-muted)">من ${fmt(c.goal)} استغفار</span>
            <span class="chip on-hero" style="align-self:flex-start;margin-top:6px">${daysLeftLabel(endsAt)}</span>
          </div>
        </div>
        <div class="row between" style="border-top:1px solid rgba(217,178,106,.3);padding-top:14px">
          <span style="font-size:14px;color:var(--hero-muted)">مساهمتك اليوم</span>
          <b style="font-size:18px">${fmt(s.circle.mine?.[t] || 0)}</b>
        </div>
      </section>
      <div class="card note">${I.eyeOff}<span>الأعداد الفردية مخفية — يظهر المجموع فقط، فالعمل خالصٌ لله والهدف للجميع.</span></div>
      <div class="row between"><b style="font-size:15px">الأعضاء (${members.length})</b><span class="muted" style="font-size:13px">${active} من ${members.length} شاركوا اليوم</span></div>
      <ul class="members">
        ${sorted.map((m, i) => {
          const me = m.id === uid;
          const on = m.lastActive === t || (me && (s.circle.mine?.[t] || 0) > 0);
          const name = me ? 'أنت' : (m.name || 'عضو');
          return `<li class="${me ? 'me' : ''}"><span class="av" style="background:${AV_COLORS[i % AV_COLORS.length]}">${esc(name.trim().charAt(0))}</span>
            <span style="flex:1;font-size:14px;font-weight:600">${esc(name)}</span>
            ${on ? `<span class="chip ok">${I.check.replace('<svg', '<svg width="14" height="14"')}شارك اليوم</span>` : `<span class="muted" style="font-size:12px">لم يشارك بعد</span>`}</li>`;
        }).join('')}
      </ul>
      <div class="grid2">
        <a class="btn" href="#/tasbeeh?d=istighfar">استغفر الآن</a>
        <button class="btn outline" data-act="share">ادعُ للحلقة</button>
      </div>
      <p class="muted" style="text-align:center;font-size:13px;margin:4px 0 0">رمز الحلقة: <span class="code">${esc(s.circle.code)}</span></p>
      <button class="btn ghost sm" data-act="leave">مغادرة الحلقة</button>`;
  },
  async share() {
    const url = `${location.href.split('#')[0]}#/circle?join=${s.circle.code}`;
    const text = `انضم لحلقة الاستغفار "${s.circle.cache?.name || ''}" — رمز الحلقة: ${s.circle.code}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'حلقة استغفار', text, url }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('تم نسخ رابط الدعوة'); }
    catch (e) { toast(`رمز الحلقة: ${s.circle.code}`); }
  },
  mount(root) {
    if (!circle.isConfigured()) return;
    const nameOf = () => {
      const v = (root.querySelector('#dn')?.value || '').trim();
      if (v) { s.settings.name = v.slice(0, 30); store.save(); }
      return v;
    };
    if (!s.circle) {
      root.querySelector('[data-act="join"]').addEventListener('click', async e => {
        const name = nameOf(), code = root.querySelector('#jc').value.trim();
        if (!name) { toast('اكتب اسمك أولاً'); root.querySelector('#dn').focus(); return; }
        if (code.length < 6) { toast('رمز الحلقة 6 خانات'); return; }
        e.target.disabled = true;
        try { await circle.joinCircle(code, name); toast('أهلاً بك في الحلقة ✓'); location.hash = '#/circle'; render(); }
        catch (err) { toast(err.message === 'not-found' ? 'لم نجد حلقة بهذا الرمز' : 'تعذّر الاتصال — تأكد من الإنترنت'); e.target.disabled = false; }
      });
      root.querySelector('[data-act="create"]').addEventListener('click', async e => {
        const name = nameOf();
        const cname = root.querySelector('#cn').value.trim() || 'حلقة العائلة';
        if (!name) { toast('اكتب اسمك أولاً'); root.querySelector('#dn').focus(); return; }
        e.target.disabled = true;
        try {
          await circle.createCircle({ name: cname.slice(0, 40), goal: +root.querySelector('#cg').value, days: +root.querySelector('#cd').value, displayName: name });
          toast('تم إنشاء الحلقة ✓ — شارك الرمز مع أهلك');
          render();
        } catch (err) { console.warn(err); toast('تعذّر الإنشاء — تأكد من الإنترنت'); e.target.disabled = false; }
      });
      return;
    }
    root.querySelector('.title-bar [data-act="share"]').addEventListener('click', () => this.share());
    const body = root.querySelector('[data-el="body"]');
    const bindBody = () => {
      body.querySelectorAll('[data-act="share"]').forEach(b => b.addEventListener('click', () => this.share()));
      const lb = body.querySelector('[data-act="leave"]');
      lb && lb.addEventListener('click', () => confirmTwice(lb, 'اضغط مرة ثانية لتأكيد المغادرة', async () => {
        await circle.leaveCircle(); toast('غادرت الحلقة'); render();
      }));
    };
    circle.watch(data => {
      if (data.circle) {
        s.circle.cache = { name: data.circle.name, total: data.circle.total, goal: data.circle.goal, endsAt: data.circle.endsAt?.toMillis?.() || Date.now() };
        store.save();
        root.querySelector('[data-el="cname"]').textContent = data.circle.name;
      }
      body.innerHTML = this.body(data);
      bindBody();
    }, () => {
      body.innerHTML = `<div class="card stack"><b>تعذّر تحميل الحلقة</b><span class="muted" style="font-size:13px">تأكد من الاتصال بالإنترنت ثم أعد المحاولة.</span><button class="btn ghost" data-act="leave">مغادرة الحلقة</button></div>`;
      bindBody();
    }).catch(() => {
      body.innerHTML = `<div class="card muted" style="text-align:center">لا يوجد اتصال بالإنترنت حالياً — مساهماتك محفوظة وسترسل تلقائياً.</div>`;
    });
  },
  unmount() { circle.stopWatching(); }
};

/* ================= STATS ================= */
const DAY_NAMES = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const Stats = {
  html() {
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(t0); weekStart.setDate(t0.getDate() - ((t0.getDay() + 1) % 7));
    const st = store.streak();

    const week = DAY_NAMES.map((n, i) => {
      const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + i);
      const k = store.dateKey(dt);
      const isToday = k === today();
      const on = store.isActive(k);
      return `<div class="${isToday ? 'today' : ''}"><i class="${on ? 'on' : ''}">${on ? I.check : ''}</i>${isToday ? 'اليوم' : n}</div>`;
    }).join('');

    const heatStart = new Date(weekStart); heatStart.setDate(weekStart.getDate() - 77);
    let heat = '';
    for (let i = 0; i < 84; i++) {
      const dt = new Date(heatStart); dt.setDate(heatStart.getDate() + i);
      if (dt > t0) { heat += '<span class="future"></span>'; continue; }
      const a = store.activity(store.dateKey(dt));
      const lv = a === 0 ? 0 : a < 33 ? 1 : a < 100 ? 2 : a < 300 ? 3 : 4;
      heat += `<span class="l${lv}" title="${store.dateKey(dt)}: ${a}"></span>`;
    }

    let monthIst = 0, mDays = 0, eDays = 0;
    for (let dd = 1; dd <= now.getDate(); dd++) {
      const k = store.dateKey(new Date(now.getFullYear(), now.getMonth(), dd));
      const d = s.days[k];
      if (d) { monthIst += d.i; if (d.md) mDays++; if (d.ed) eDays++; }
    }
    const L = store.loc();
    const fsIdx = Math.max(0, FS_STEPS.indexOf(s.settings.fs));

    return `
    <header class="title-bar" style="flex-direction:column;align-items:flex-start;gap:2px">
      <h1>إنجازي</h1>
      <span class="muted" style="font-size:13px">«أحبُّ الأعمال إلى الله أدومُها وإن قلّ» — متفق عليه</span>
    </header>
    <main class="pad stack" style="margin-top:12px">
      <section class="circle-hero pattern">
        <div class="row" style="gap:14px">
          <span class="now-icon" style="width:56px;height:56px;background:rgba(217,178,106,.16);color:var(--gold)">${I.flame}</span>
          <div style="display:flex;flex-direction:column">
            <span><span style="font-size:44px;font-weight:700;line-height:1.1">${st}</span> <span style="font-size:16px;font-weight:600">${streakUnit(st)}</span></span>
            <span style="font-size:13px;color:var(--hero-muted)">أطول سلسلة لك: ${s.best ? dayWord(s.best) : 'ابدأ اليوم'}</span>
          </div>
        </div>
        <div class="week">${week}</div>
      </section>

      <section class="card stack" style="gap:12px">
        <div class="row between"><h2 style="font-size:15px">خريطة الاستمرارية</h2><span class="muted" style="font-size:12px">آخر 12 أسبوعاً</span></div>
        <div class="heat" role="img" aria-label="خريطة نشاطك اليومي لآخر 12 أسبوعاً">${heat}</div>
        <div class="legend"><span style="width:auto;height:auto">أقل</span><span class="l0"></span><span class="l1"></span><span class="l2"></span><span class="l3"></span><span class="l4"></span><span style="width:auto;height:auto">أكثر</span></div>
      </section>

      <div class="grid2" style="gap:10px">
        <div class="card tile"><b>${fmt(monthIst)}</b><span>استغفار هذا الشهر</span></div>
        <div class="card tile"><b>${fmt(store.day().t)}</b><span>تسبيحات اليوم</span></div>
        <div class="card tile"><b dir="ltr" style="text-align:right">${mDays} / ${now.getDate()}</b><span>أيام أذكار الصباح</span></div>
        <div class="card tile"><b dir="ltr" style="text-align:right">${eDays} / ${now.getDate()}</b><span>أيام أذكار المساء</span></div>
        <div class="card tile"><b>${fmt(Object.keys((s.hifz && s.hifz.items) || {}).length)}</b><span>آيات محفوظة</span></div>
        <div class="card tile"><b>${fmt(store.day().q || 0)}</b><span>آيات سمّعتها اليوم</span></div>
      </div>

      <section class="card" id="settings" style="padding:4px 16px">
        <h2 style="font-size:15px;padding:14px 0 6px">الإعدادات</h2>
        <div class="setting"><label class="lbl" for="nm">اسمك<small>يظهر في التحية وفي الحلقات</small></label>
          <input id="nm" maxlength="30" value="${esc(s.settings.name)}" placeholder="اختياري" style="width:140px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--bg);padding:0 12px;font-size:14px"></div>
        <div class="setting"><span class="lbl" id="l-vib">الاهتزاز<small>مع كل تسبيحة (أندرويد)</small></span>
          <button class="switch" role="switch" aria-labelledby="l-vib" aria-checked="${s.settings.vibrate}" data-sw="vibrate"></button></div>
        <div class="setting"><span class="lbl" id="l-kh">وضع الخشوع<small>ألوان داكنة هادئة</small></span>
          <button class="switch" role="switch" aria-labelledby="l-kh" aria-checked="${s.settings.khushu}" data-sw="khushu"></button></div>
        <div class="setting"><span class="lbl">حجم خط الأذكار<small>${Math.round(FS_STEPS[fsIdx] * 100)}%</small></span>
          <span class="row" style="gap:6px"><button class="icon-btn" data-fs="-1" aria-label="تصغير الخط">أ-</button><button class="icon-btn" data-fs="1" aria-label="تكبير الخط">أ+</button></span></div>
        <div class="setting"><span class="lbl">الموقع<small>${esc(L.label)}</small></span>
          <button class="btn ghost sm" data-act="loc">${I.pin.replace('<svg', '<svg width="18" height="18"')}تحديد</button></div>
        <div class="setting"><span class="lbl">مسح كل البيانات<small>العدّادات والسلاسل والإعدادات</small></span>
          <button class="btn ghost sm" data-act="wipe">مسح</button></div>
      </section>
      <p class="muted" style="text-align:center;font-size:12px;margin:0">أذكاري · الإصدار 1.1 · يعمل بدون إنترنت<br>نص المصحف: الرسم العثماني برواية حفص (QuranEnc) · الصوت: EveryAyah عبر Islamic Network</p>
    </main>`;
  },
  mount(root, params) {
    if (params.get('s') === 'settings') setTimeout(() => root.querySelector('#settings')?.scrollIntoView({ behavior: 'smooth' }), 50);
    root.querySelector('#nm').addEventListener('change', e => { s.settings.name = e.target.value.trim().slice(0, 30); store.save(); toast('تم الحفظ'); });
    root.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.sw; s.settings[k] = !s.settings[k]; store.save();
      b.setAttribute('aria-checked', s.settings[k]); if (k === 'khushu') applyTheme();
      if (k === 'vibrate' && s.settings.vibrate) vibrate(30);
    }));
    root.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', () => {
      let i = FS_STEPS.indexOf(s.settings.fs); if (i < 0) i = 1;
      i = Math.max(0, Math.min(FS_STEPS.length - 1, i + Number(b.dataset.fs)));
      s.settings.fs = FS_STEPS[i]; store.save(); applyTheme();
      b.closest('.setting').querySelector('small').textContent = `${Math.round(FS_STEPS[i] * 100)}%`;
    }));
    root.querySelector('[data-act="loc"]').addEventListener('click', geolocate);
    const wb = root.querySelector('[data-act="wipe"]');
    wb.addEventListener('click', () => confirmTwice(wb, 'تأكيد؟', () => {
      const keep = s.circle;
      store.resetAll();
      s.circle = keep; store.save();
      applyTheme(); toast('تم مسح البيانات'); render();
    }));
  }
};

/* ================= Router ================= */
const ROUTES = { home: Home, tasbeeh: Tasbeeh, adhkar: Adhkar, circle: Circle, stats: Stats,
  quran: Q.QuranHome, surahs: Q.Surahs, surah: Q.Surah, learn: Q.Learn, test: Q.Test, review: Q.Review };
let current = null;
let lastRendered = '';

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, q] = h.split('?');
  return { name: ROUTES[name] ? name : 'home', params: new URLSearchParams(q || '') };
}

function render() {
  const { name, params } = parse();
  if (current && current.unmount) current.unmount();
  current = ROUTES[name];
  app.innerHTML = `<div class="screen${name !== lastRendered ? ' enter' : ''}">${current.html(params)}</div>${navHTML(name)}`;
  lastRendered = name;
  current.mount && current.mount(app, params);
}

let lastRoute = '';
window.addEventListener('hashchange', () => {
  const r = parse().name;
  render();
  if (r !== lastRoute) window.scrollTo(0, 0);
  lastRoute = r;
});

Q.initQuran({ I, esc, toast, vibrate, render, fmt });
applyTheme();
lastRoute = parse().name;
render();

if (s.circle && circle.isConfigured()) circle.init().then(() => circle.flush()).catch(() => {});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
