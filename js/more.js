// more.js — dua categories, Asma al-Husna, Hijri calendar, Khatma reader, Tafsir
import * as store from './store.js';
import * as FX from './fx.js';
import { DUA_CATS, NAMES } from './data2.js';
import * as Q from './quran.js';
import * as MU from './mushaf.js';

let ctx = null; // { I, esc, toast, vibrate, render, fmt, beadClick, chime, addIstighfar }
export function initMore(c) { ctx = c; }

const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => String(n).replace(/\d/g, d => AR[d]);
const S = () => store.get();
const timesLabel = n => n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتان' : n <= 10 ? `${n} مرات` : `${n} مرة`;
const back = href => `<a class="icon-btn" href="${href}" aria-label="رجوع">${ctx.I.back}</a>`;

const CAT_ICONS = {
  mosque: '<path d="M4 21V11l8-6 8 6v10"/><path d="M9 21v-5a3 3 0 0 1 6 0v5"/><path d="M12 2v3"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  food: '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-2 0-4 3-4 7s2 4 4 4"/>',
  car: '<path d="M5 16l1.5-5a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><circle cx="7" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  star: '<path d="M12 2l2.5 5.5L20 10l-5.5 2.5L12 18l-2.5-5.5L4 10l5.5-2.5z"/>'
};
const cIcon = k => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">${CAT_ICONS[k] || CAT_ICONS.star}</svg>`;

/* =====================================================
   Dua categories
   ===================================================== */
function catProg() { const d = store.day(); d.c = d.c || {}; return d.c; }

export const Duas = {
  html() {
    const prog = catProg();
    const tiles = DUA_CATS.map(c => {
      const done = c.items.filter(it => (prog[it.id] || 0) >= it.count).length;
      return `<a class="dua-tile" href="#/dua?c=${c.id}">
        <span class="dt-ic">${cIcon(c.icon)}</span><b>${c.name}</b>
        <span class="muted">${c.items.length} ${c.items.length <= 10 && c.items.length > 2 ? 'أذكار' : 'ذكراً'}${done ? ` · ${done} تمّت اليوم` : ''}</span></a>`;
    }).join('');
    return `
    <header class="title-bar">${back('#/adhkar')}<h1>أذكار اليوم والليلة</h1></header>
    <main class="pad stack stagger" style="margin-top:12px">
      <div class="dua-grid">
        <a class="dua-tile hero-tile" href="#/adhkar?p=morning"><span class="dt-ic">${cIcon('sun')}</span><b>أذكار الصباح</b><span>من الفجر للظهر</span></a>
        <a class="dua-tile hero-tile" href="#/adhkar?p=evening"><span class="dt-ic">${cIcon('moon')}</span><b>أذكار المساء</b><span>من العصر للمغرب</span></a>
        ${tiles}
      </div>
      <p class="muted" style="font-size:12px;text-align:center;margin:0">من كتاب «حصن المسلم» مع مصادرها من كتب السنة</p>
    </main>`;
  }
};

export const DuaCat = {
  html(params) {
    const c = DUA_CATS.find(x => x.id === params.get('c')) || DUA_CATS[0];
    const prog = catProg();
    if (c.id === 'prayer' && ctx.lastPrayerKey) {
      const k = ctx.lastPrayerKey(), d = store.day();
      if (k && d.cpk !== k) { c.items.forEach(a => delete prog[a.id]); d.cpk = k; store.save(); }
    }
    const cur = c.items.findIndex(it => (prog[it.id] || 0) < it.count);
    const cards = c.items.map((a, i) => {
      const n = Math.min(prog[a.id] || 0, a.count), done = n >= a.count;
      const chip = done ? `<span class="chip ok">${ctx.I.check.replace('<svg', '<svg width="14" height="14"')}تمّ · ${timesLabel(a.count)}</span>`
        : i === cur ? `<span class="chip gold">الآن · ${timesLabel(a.count)}</span>` : `<span class="chip mute">${timesLabel(a.count)}</span>`;
      return `<article class="dhikr ${done ? 'done' : ''} ${i === cur ? 'current' : ''}" id="dh-${a.id}">
        <div class="row between">${chip}${a.title ? `<span class="ttl">${a.title}</span>` : ''}</div>
        <p class="txt ${a.quran ? 'qtxt' : ''}">${a.text}</p>
        ${done ? '' : `
          <span class="muted" style="font-size:12px">${a.ref ? a.ref + ' · ' : ''}${a.source}</span>
          ${a.fadl ? `<details><summary>فضل هذا الذكر</summary>${a.fadl}</details>` : ''}
          <button class="counter-btn" data-id="${a.id}" data-count="${a.count}"><span>${a.count === 1 ? 'قرأته ✓' : 'اضغط للعدّ'}</span><span class="n">${n} / ${a.count}</span></button>
          ${a.count > 1 ? `<div class="progress"><span style="width:${n / a.count * 100}%"></span></div>` : ''}`}
      </article>`;
    }).join('');
    const doneN = c.items.filter(a => (prog[a.id] || 0) >= a.count).length;
    return `
    <header class="ad-hero pattern">
      <div class="row"><a class="icon-btn" href="#/duas" aria-label="رجوع">${ctx.I.back}</a><h1>${c.name}</h1></div>
      <div class="ad-progress"><div class="progress"><span style="width:${doneN / c.items.length * 100}%"></span></div><span>${doneN} من ${c.items.length}</span></div>
    </header>
    <main class="ad-list stagger">
      ${doneN === c.items.length ? `<div class="card done-banner">${ctx.I.check.replace('<svg', '<svg width="28" height="28" style="color:var(--gold-ink)"')}<b>أتممت ${c.name}</b><span class="muted" style="font-size:14px">تقبّل الله منك</span></div>` : ''}
      ${cards}
      <button class="btn ghost sm" data-act="reset">${ctx.I.reset.replace('<svg', '<svg width="18" height="18"')}<span>إعادة من البداية</span></button>
    </main>`;
  },
  mount(root, params) {
    const c = DUA_CATS.find(x => x.id === params.get('c')) || DUA_CATS[0];
    root.querySelectorAll('.counter-btn').forEach(btn => btn.addEventListener('click', () => {
      const prog = catProg(), id = btn.dataset.id, count = +btn.dataset.count;
      prog[id] = Math.min(count, (prog[id] || 0) + 1);
      store.day().t++;
      store.save();
      const n = prog[id];
      if (n >= count) {
        ctx.vibrate([40, 30, 40]);
        FX.burstAt(btn, { n: 20, power: 6 });
        const all = c.items.every(a => (prog[a.id] || 0) >= a.count);
        const next = c.items.find(a => (prog[a.id] || 0) < a.count);
        ctx.render();
        if (all) setTimeout(() => FX.celebrate(`أتممت ${c.name}`, 'تقبّل الله منك'), 300);
        else if (next) document.getElementById(`dh-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        ctx.vibrate(12); ctx.beadClick(false);
        const r = btn.getBoundingClientRect(); FX.floatText(r.left + 40, r.top, '+1');
        btn.querySelector('.n').textContent = `${n} / ${count}`;
        const bar = btn.parentElement.querySelector('.progress > span'); if (bar) bar.style.width = `${n / count * 100}%`;
      }
    }));
    root.querySelector('[data-act="reset"]').addEventListener('click', () => {
      const prog = catProg(); c.items.forEach(a => delete prog[a.id]); store.save(); ctx.render();
    });
  }
};

/* =====================================================
   Asma al-Husna
   ===================================================== */
let quiz = null;
function newQuestion() {
  const i = Math.floor(Math.random() * 99);
  const opts = new Set([i]);
  while (opts.size < 4) opts.add(Math.floor(Math.random() * 99));
  return { i, opts: [...opts].sort(() => Math.random() - 0.5), answered: -1 };
}

export const Names = {
  html(params) {
    const isQuiz = params.get('quiz') === '1';
    const s = S(); s.names = s.names || { best: 0 };
    if (isQuiz) {
      if (!quiz) quiz = { q: newQuestion(), score: 0, total: 0, streak: 0 };
      const q = quiz.q, N = NAMES[q.i];
      return `
      <header class="title-bar">${back('#/names')}<h1>اختبر حفظك</h1><span class="chip gold">${quiz.score} / ${quiz.total}</span></header>
      <main class="pad stack" style="margin-top:12px">
        <div class="mushaf" style="text-align:center;display:flex;flex-direction:column;gap:8px">
          <span class="muted" style="font-size:13px">أي اسم من أسماء الله الحسنى معناه:</span>
          <p style="font-family:var(--quran);font-size:24px;line-height:1.8;margin:0;color:var(--primary)">${N.m}</p>
        </div>
        <div class="quiz-opts">
          ${q.opts.map(o => {
            let cls = '';
            if (q.answered >= 0) { if (o === q.i) cls = 'right'; else if (o === q.answered) cls = 'wrong'; }
            return `<button class="q-opt ${cls}" data-o="${o}" ${q.answered >= 0 ? 'disabled' : ''}>${NAMES[o].n}</button>`;
          }).join('')}
        </div>
        ${q.answered >= 0 ? `<button class="btn big" data-act="next">السؤال التالي</button>` : ''}
        <p class="muted" style="text-align:center;font-size:13px;margin:0">سلسلة الإجابات الصحيحة: ${quiz.streak} · أفضل سلسلة: ${s.names.best}</p>
      </main>`;
    }
    quiz = null;
    const cards = NAMES.map((x, i) => `<button class="name-card" data-i="${i}" aria-label="${x.n}: ${x.m}">
      <span class="nc-in"><span class="nc-front"><i>${arNum(i + 1)}</i><b>${x.n}</b></span><span class="nc-back">${x.m}</span></span></button>`).join('');
    return `
    <header class="hero pattern" style="padding-bottom:28px">
      <div class="row between" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:4px"><span class="hello">٩٩ اسماً</span><h1>أسماء الله الحسنى</h1>
        <span class="date" style="line-height:1.7">«إن لله تسعة وتسعين اسماً، مائةً إلا واحداً، من أحصاها دخل الجنة» — متفق عليه</span></div>
      </div>
      <a class="btn" href="#/names?quiz=1" style="margin-top:14px;background:var(--gold);color:#0A3631">اختبر حفظك للأسماء</a>
    </header>
    <main class="pad stack" style="margin-top:16px">
      <p class="muted" style="font-size:12px;text-align:center;margin:0">اضغط على أي اسم لترى معناه · الترتيب حسب رواية الترمذي المشهورة</p>
      <div class="names-grid">${cards}</div>
    </main>`;
  },
  mount(root, params) {
    if (params.get('quiz') === '1') {
      const s = S();
      root.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => {
        const o = +b.dataset.o; quiz.q.answered = o; quiz.total++;
        if (o === quiz.q.i) {
          quiz.score++; quiz.streak++;
          if (quiz.streak > (s.names.best || 0)) { s.names.best = quiz.streak; store.save(); }
          ctx.vibrate(20); FX.burstAt(b, { n: 18, power: 5 });
        } else { quiz.streak = 0; ctx.vibrate([30, 40, 30]); }
        ctx.render();
      }));
      root.querySelector('[data-act="next"]')?.addEventListener('click', () => { quiz.q = newQuestion(); ctx.render(); });
      return;
    }
    root.querySelectorAll('.name-card').forEach(b => b.addEventListener('click', () => { b.classList.toggle('flip'); ctx.vibrate(8); }));
  }
};

/* =====================================================
   Hijri calendar & occasions
   ===================================================== */
const HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const WD = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
let fmtH = null;
export function hijriOf(d) {
  try {
    fmtH = fmtH || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const p = {}; fmtH.formatToParts(d).forEach(x => { if (x.type !== 'literal') p[x.type] = parseInt(x.value, 10); });
    return { d: p.day, m: p.month, y: p.year };
  } catch (e) { return null; }
}
const OCC = [
  { m: 1, d: 1, t: 'رأس السنة الهجرية' }, { m: 1, d: 9, t: 'تاسوعاء — يُسنّ صيامه', fast: true }, { m: 1, d: 10, t: 'عاشوراء — يُسنّ صيامه', fast: true },
  { m: 9, d: 1, t: 'أول أيام رمضان' }, { m: 9, d: 21, t: 'بداية العشر الأواخر' }, { m: 10, d: 1, t: 'عيد الفطر' },
  { m: 12, d: 1, t: 'بداية العشر من ذي الحجة' }, { m: 12, d: 9, t: 'يوم عرفة — يُسنّ صيامه', fast: true }, { m: 12, d: 10, t: 'عيد الأضحى' },
  { m: 12, d: 11, t: 'أيام التشريق' }
];
function dayInfo(date) {
  const h = hijriOf(date); if (!h) return { tags: [] };
  const tags = [];
  const occ = OCC.filter(o => o.m === h.m && o.d === h.d);
  occ.forEach(o => tags.push({ t: o.t, kind: o.fast ? 'fast' : 'occ' }));
  const tashreeq = h.m === 12 && h.d >= 11 && h.d <= 13;
  const eid = (h.m === 10 && h.d === 1) || (h.m === 12 && h.d === 10);
  if (!tashreeq && !eid && h.m !== 9) {
    if (h.d >= 13 && h.d <= 15) tags.push({ t: 'من الأيام البيض — يُسنّ صيامه', kind: 'fast' });
    const wd = date.getDay();
    if (wd === 1 || wd === 4) tags.push({ t: `${wd === 1 ? 'الاثنين' : 'الخميس'} — يُسنّ صيامه`, kind: 'fast', weekly: true });
  }
  if (h.m === 9) tags.push({ t: 'رمضان', kind: 'ramadan' });
  return { h, tags };
}

export function fastingHint(now = new Date()) {
  const tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const inf = dayInfo(tm);
  const special = inf.tags.find(t => t.kind === 'fast' && !t.weekly) || inf.tags.find(t => t.kind === 'occ');
  if (special) return `غداً: ${special.t}`;
  const wk = inf.tags.find(t => t.weekly);
  return wk ? `غداً ${wk.t}` : null;
}

function daysUntil(pred, from = new Date(), limit = 400) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i <= limit; i++) { const h = hijriOf(d); if (h && pred(h)) return { days: i, date: new Date(d) }; d.setDate(d.getDate() + 1); }
  return null;
}

let calOffset = 0;
export const Calendar = {
  html(params) {
    if (params.get('m') == null) calOffset = 0; else calOffset = +params.get('m') || 0;
    const today = new Date(); const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const ht = hijriOf(t0);
    if (!ht) return `<header class="title-bar">${back('#/home')}<h1>التقويم الهجري</h1></header><main class="pad"><p class="muted">المتصفح لا يدعم التقويم الهجري.</p></main>`;
    let anchor = new Date(t0); anchor.setDate(anchor.getDate() - (ht.d - 1) + Math.round(calOffset * 29.53));
    let h = hijriOf(anchor); let guard = 0;
    while (h.d !== 1 && guard++ < 40) { anchor.setDate(anchor.getDate() + (h.d > 15 ? 1 : -1)); h = hijriOf(anchor); }
    const start = new Date(anchor), mY = h.y, mM = h.m;
    const days = [];
    const d = new Date(start);
    while (true) { const hh = hijriOf(d); if (hh.m !== mM) break; days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    const lead = (start.getDay() + 1) % 7; // week starts Saturday
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="cal-cell empty"></span>');
    days.forEach((dt, i) => {
      const inf = dayInfo(dt);
      const isToday = +dt === +t0;
      const fast = inf.tags.some(x => x.kind === 'fast'), occ = inf.tags.some(x => x.kind === 'occ');
      cells.push(`<span class="cal-cell ${isToday ? 'today' : ''} ${fast ? 'fast' : ''} ${occ ? 'occ' : ''}" title="${inf.tags.map(x => x.t).join(' · ')}"><b>${arNum(i + 1)}</b><i>${dt.getDate()}</i></span>`);
    });
    const ram = daysUntil(x => x.m === 9 && x.d === 1);
    const upcoming = [];
    for (let i = 0; i < 60 && upcoming.length < 6; i++) {
      const dt = new Date(t0); dt.setDate(dt.getDate() + i);
      const inf = dayInfo(dt);
      inf.tags.filter(x => !x.weekly && x.kind !== 'ramadan').forEach(x => {
        const t = x.t.startsWith('من الأيام البيض') ? 'الأيام البيض — يُسنّ صيامها' : x.t;
        const prev = upcoming[upcoming.length - 1];
        if (prev && prev.t === t && prev.i + prev.n === i) prev.n++;
        else upcoming.push({ dt, i, t, kind: x.kind, n: 1 });
      });
    }
    const gFmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' });
    return `
    <header class="title-bar">${back('#/home')}<h1>التقويم الهجري</h1></header>
    <main class="pad stack stagger" style="margin-top:12px">
      ${ram && ram.days > 0 ? `<section class="circle-hero pattern ram-card"><span style="font-size:13px;color:var(--hero-muted)">باقي على رمضان</span>
        <span><b style="font-size:44px;color:var(--gold)" data-countup="${ram.days}">${ram.days}</b> <span style="font-size:16px">${ram.days <= 10 && ram.days > 2 ? 'أيام' : 'يوماً'}</span></span>
        <span style="font-size:13px;color:var(--hero-muted)">بإذن الله · ${gFmt.format(ram.date)} تقريباً</span></section>`
        : ram && ram.days === 0 ? `<section class="circle-hero pattern ram-card"><b style="font-size:24px;color:var(--gold)">رمضان كريم</b></section>` : ''}
      <section class="card stack" style="gap:10px">
        <div class="row between">
          <a class="icon-btn" href="#/calendar?m=${calOffset - 1}" aria-label="الشهر السابق">${ctx.I.back}</a>
          <b style="font-size:17px">${HM[mM - 1]} ${arNum(mY)} هـ</b>
          <a class="icon-btn" href="#/calendar?m=${calOffset + 1}" aria-label="الشهر التالي">${ctx.I.left}</a>
        </div>
        <div class="cal-grid">${['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map(w => `<span class="cal-wd">${w}</span>`).join('')}${cells.join('')}</div>
        <div class="lg-row" style="justify-content:center">
          <span class="lg"><i style="background:var(--ok-soft);border:1px solid var(--primary)"></i>صيام سنة</span>
          <span class="lg"><i style="background:var(--gold-soft);border:1px solid var(--gold)"></i>مناسبة</span>
          <span class="lg"><i style="border:2px solid var(--gold)"></i>اليوم</span>
        </div>
      </section>
      <section class="card stack" style="gap:6px">
        <h2 style="font-size:15px">القادم</h2>
        ${upcoming.length ? upcoming.map(u => `<div class="occ-row"><span class="occ-dot ${u.kind}"></span><span style="flex:1"><b style="font-size:14px">${u.t}</b><br><span class="muted" style="font-size:12px">${WD[u.dt.getDay()]} ${gFmt.format(u.dt)}${u.n > 1 ? ` · ${u.n} أيام` : ''}</span></span><span class="chip ${u.i === 0 ? 'gold' : 'mute'}">${u.i === 0 ? 'اليوم' : u.i === 1 ? 'غداً' : `بعد ${u.i} ${u.i <= 10 ? 'أيام' : 'يوماً'}`}</span></div>`).join('') : '<span class="muted">لا مناسبات قريبة</span>'}
      </section>
      <p class="muted" style="font-size:12px;text-align:center;margin:0;line-height:1.7">التقويم حسب أم القرى، وقد يختلف يوماً عن رؤية الهلال في بلدك.</p>
    </main>`;
  }
};

/* =====================================================
   Tafsir (التفسير الميسر)
   ===================================================== */
let TAFSIR = null, tafLoading = null;
function loadTafsir() {
  if (TAFSIR) return Promise.resolve(TAFSIR);
  if (!tafLoading) tafLoading = fetch('data/tafsir-muyassar.json').then(r => r.json()).then(t => (TAFSIR = t)).catch(e => { tafLoading = null; throw e; });
  return tafLoading;
}
export async function showTafsir(g, title) {
  const { TEXT } = Q.qdata();
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="التفسير الميسر">
    <span class="sheet-handle"></span>
    <div class="row between"><b style="font-size:16px">${title || 'التفسير'}</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${ctx.I.close}</button></div>
    <p class="sheet-ayah">${TEXT ? TEXT[g] : ''}</p>
    <div class="sheet-body" data-el="body"><div class="spinner"></div></div>
    <span class="muted" style="font-size:11px">التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف</span></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('[data-act="x"]').addEventListener('click', close);
  try { const t = await loadTafsir(); el.querySelector('[data-el="body"]').textContent = t[g]; }
  catch (e) { el.querySelector('[data-el="body"]').textContent = 'تعذّر تحميل التفسير — تأكد من الاتصال أول مرة'; }
}

/* =====================================================
   Khatma reader
   ===================================================== */
let PAGES = null, pagesLoading = null;
function ensurePages() {
  if (PAGES) return Promise.resolve();
  if (!pagesLoading) pagesLoading = fetch('data/quran-pages.json').then(r => r.json()).then(p => { PAGES = p; }).catch(e => { pagesLoading = null; throw e; });
  return pagesLoading;
}
function K() { const s = S(); return s.khatma || null; }
const DAY = 86400000;
const sod = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function plan() {
  const k = K(); if (!k) return null;
  const perDay = Math.ceil(604 / k.days);
  const dayIdx = Math.max(0, Math.round((sod() - sod(k.start)) / DAY));
  const target = Math.min(604, (dayIdx + 1) * perDay);
  const fromP = Math.min(604, dayIdx * perDay + 1);
  return { perDay, dayIdx, target, fromP, page: k.page || 1, behind: Math.max(0, fromP - (k.page || 1)) };
}
export function khatmaSummary() { const p = plan(); return p ? { ...p, days: K().days, done: K().done } : null; }

function withAll(fn) {
  if (Q.ready() && PAGES && MU.mushafReady()) return fn();
  Promise.all([Q.ensureData(), ensurePages(), MU.ensureMushaf()]).then(() => ctx.render()).catch(() => ctx.toast('تعذّر تحميل المصحف'));
  return `<div class="pad" style="padding-top:35vh;text-align:center"><div class="spinner"></div><p class="muted">جارٍ تحميل المصحف…</p></div>`;
}

export const Khatma = {
  html() {
    const k = K(), p = plan();
    if (!k || k.done) {
      return `
      <header class="title-bar">${back('#/quran')}<h1>ختمة القراءة</h1></header>
      <main class="pad stack stagger" style="margin-top:12px">
        ${k && k.done ? `<div class="card done-banner">${ctx.I.check.replace('<svg', '<svg width="30" height="30" style="color:var(--gold-ink)"')}<b>ختمت القرآن الكريم — ما شاء الله</b><span class="muted">اللهم اجعل القرآن ربيع قلوبنا</span></div>` : ''}
        <section class="card stack">
          <b style="font-size:16px">ابدأ ختمة جديدة</b>
          <span class="muted" style="font-size:13px">اختر خلال كم يوم بدك تختم، والتطبيق بيقسّم الصفحات عليك</span>
          <div class="kh-opts">${[7, 10, 15, 20, 30, 60].map(d => `<button class="plan-opt" data-days="${d}"><b>${d} يوماً</b><span>${Math.ceil(604 / d)} صفحة يومياً</span></button>`).join('')}</div>
        </section>
        <a class="btn ghost" href="#/read?p=1">تصفّح المصحف بدون خطة</a>
      </main>`;
    }
    const pct = Math.round(((k.page || 1) - 1) / 604 * 100);
    return `
    <header class="title-bar">${back('#/quran')}<h1>ختمة القراءة</h1><span class="chip gold">${k.days} يوماً</span></header>
    <main class="pad stack stagger" style="margin-top:12px">
      <section class="circle-hero pattern" style="gap:10px">
        <span style="font-size:13px;color:var(--hero-muted)">ورد اليوم ${arNum(p.dayIdx + 1)}</span>
        <b style="font-size:24px">من صفحة ${p.fromP} إلى ${p.target}</b>
        <div class="progress hero-prog"><span style="width:${pct}%"></span></div>
        <span style="font-size:13px;color:var(--hero-muted)">وصلت صفحة ${k.page || 1} من 604 · ${pct}% من الختمة${p.behind > 0 ? ` · متأخر ${p.behind} صفحة` : ''}</span>
      </section>
      <a class="btn big" href="#/read?p=${Math.max(k.page || 1, 1)}">${(k.page || 1) > 1 ? 'أكمل القراءة' : 'ابدأ القراءة'}</a>
      <button class="btn ghost sm" data-act="end">إنهاء الخطة</button>
    </main>`;
  },
  mount(root) {
    root.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => {
      S().khatma = { days: +b.dataset.days, start: Date.now(), page: 1, done: false };
      store.save(); ctx.toast('بسم الله — بدأت ختمتك'); ctx.render();
    }));
    const e = root.querySelector('[data-act="end"]');
    e && e.addEventListener('click', () => { if (e.dataset.armed) { S().khatma = null; store.save(); ctx.render(); } else { e.dataset.armed = 1; e.textContent = 'اضغط مرة ثانية للتأكيد'; } });
  }
};

let lastReadPage = null;
function textPageHTML(p) {
      const { META, TEXT } = Q.qdata();
      const g1 = PAGES[p - 1], g2 = p < 604 ? PAGES[p] - 1 : 6235;
      let html = '', curS = -1;
      for (let g = g1; g <= g2; g++) {
        let s = 0; while (s < 113 && META.surahs[s + 1].start <= g) s++;
        const m = META.surahs[s], a = g - m.start + 1;
        if (s !== curS) {
          if (curS !== -1) html += '</p>';
          if (a === 1) {
            html += `<div class="surah-banner sm"><svg viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true"><path d="M24 4 H296 L316 32 L296 60 H24 L4 32 Z" fill="var(--banner)" stroke="#D9B26A" stroke-width="1.5"/></svg><h2>سورة ${m.name}</h2></div>`;
            if (m.n !== 1 && m.n !== 9) html += `<p class="basmala">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>`;
          }
          html += '<p class="mushaf-text">';
          curS = s;
        }
        html += `<span class="ayah" role="button" tabindex="0" data-g="${g}" data-t="سورة ${m.name} · الآية ${a}">${TEXT[g]} <span class="ayah-mark">۝${arNum(a)}</span></span> `;
      }
      html += '</p>';
      return html;
}

function openSheet(inner, label) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="${label || ''}"><span class="sheet-handle"></span>${inner}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('[data-act="x"]')?.addEventListener('click', close);
  return { el, close };
}
const surahOf = g => { const { META } = Q.qdata(); let s = 0; while (s < 113 && META.surahs[s + 1].start <= g) s++; return { s: s + 1, a: g - META.surahs[s].start + 1, m: META.surahs[s] }; };
const juzOf = g => { const { META } = Q.qdata(); let j = 0; while (j < 29 && META.juzStarts[j + 1] - 1 <= g) j++; return j + 1; };
export const pageOfGid = g => { let lo = 0, hi = 603; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (PAGES[m] <= g) lo = m; else hi = m - 1; } return lo + 1; };

export const Reader = {
  html(params) {
    return withAll(() => {
      const { META } = Q.qdata();
      let p = +params.get('p');
      const sq = +params.get('s');
      if (!p && sq >= 1 && sq <= 114) p = pageOfGid(META.surahs[sq - 1].start);
      p = Math.min(604, Math.max(1, p || 1));
      const g1 = PAGES[p - 1], f = surahOf(g1), juz = juzOf(g1);
      const k = K();
      const I = ctx.I;
      return `
      <div class="mreader" data-el="reader" data-p="${p}">
        <header class="mr-top">
          <a class="mr-ic" href="${k ? '#/khatma' : '#/quran'}" aria-label="رجوع">${I.back}</a>
          <button class="mr-pill" data-act="index">${f.s}-${f.m.name} <span>(الجزء ${juz})</span></button>
          <button class="mr-ic" data-act="tools" aria-label="الأدوات"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
        </header>
        <div class="mr-stage" data-el="stage">
          <div class="mr-page ${p % 2 ? 'odd' : 'even'}" data-el="page">
            <div class="mr-text" data-el="mp">${MU.pageHTML(p, { surahName: n => META.surahs[n - 1].name })}</div>
            <div class="mp-wait" data-el="wait"><div class="spinner"></div><span>جارٍ تحميل خط المصحف…</span></div>
          </div>
        </div>
        <footer class="mr-bot">
          <span>الجزء ${arNum(juz)}</span>
          <button class="mr-num" data-act="goto">${arNum(p)}</button>
          <span>مصحف المدينة · حفص</span>
        </footer>
      </div>`;
    });
  },
  mount(root, params) {
    if (!(Q.ready() && PAGES && MU.mushafReady())) return;
    const reader = root.querySelector('[data-el="reader"]');
    const p = +reader.dataset.p;
    document.body.classList.add('reading');
    const openIndex = params && params.get('idx');
    history.replaceState(null, '', `#/read?p=${p}`);
    const pageEl = root.querySelector('[data-el="page"]'), stage = root.querySelector('[data-el="stage"]');
    if (lastReadPage && Math.abs(lastReadPage - p) === 1 && FX.motionOK()) pageEl.classList.add(p > lastReadPage ? 'turn-next' : 'turn-prev');
    lastReadPage = p;
    store.get().lastPage = p; store.save();
    const k = K();
    if (k && !k.done) {
      const before = k.page || 1;
      if (p > before) {
        k.page = p; store.save();
        const pl = plan();
        if (before < pl.target && p >= pl.target) setTimeout(() => FX.celebrate('أتممت ورد القراءة اليوم', 'زادك الله نوراً وهدى'), 400);
      }
      if (p === 604) { k.done = true; store.save(); setTimeout(() => FX.celebrate('ختمت القرآن الكريم', 'اللهم ارحمني بالقرآن واجعله لي إماماً ونوراً وهدى ورحمة'), 500); }
    }
    const { META, TEXT } = Q.qdata();
    const mp = root.querySelector('[data-el="mp"]'), wait = root.querySelector('[data-el="wait"]');
    const go = np => { np = Math.min(604, Math.max(1, np)); if (np !== p) location.hash = `#/read?p=${np}`; };

    // fill the screen: width decides the font size, height spreads the 15 lines like a printed page
    const fit = () => {
      const pg = mp.querySelector('.mpage.ready'); if (!pg) return;
      MU.fitPage(pg);
      const fs = parseFloat(pg.style.getPropertyValue('--mfs')) || 20;
      const lines = pg.querySelectorAll('.ml').length || 15;
      const avail = pageEl.clientHeight - 16;
      let lh = avail / Math.max(lines, p <= 2 ? 11 : 15);
      if (lh < fs * 1.55) { // short screen: shrink the font so all lines fit
        const nfs = avail / (Math.max(lines, 15) * 1.6);
        pg.style.setProperty('--mfs', `${Math.min(fs, nfs).toFixed(2)}px`);
        lh = avail / Math.max(lines, 15);
      }
      pg.style.setProperty('--mlh', `${Math.min(lh, fs * 2.4).toFixed(2)}px`);
    };
    const show = () => {
      const pg = mp.querySelector('.mpage'); pg.classList.add('ready'); fit(); wait.remove();
      requestAnimationFrame(fit); setTimeout(fit, 350);
    };
    MU.fontsFor(p).then(show).catch(() => {
      mp.innerHTML = `<div class="mushaf-fallback">${textPageHTML(p)}</div>`; wait.remove(); pageEl.classList.add('plain');
      ctx.toast('خط المصحف بحتاج إنترنت أول مرة — عرضنا النص العادي');
    });
    this._fit = fit; addEventListener('resize', fit);

    // tap anywhere on the page to turn it (left half → next, right half → previous, like a book read right-to-left);
    // long-press a verse for its actions (tafsir, listen, memorize, recite)
    const verseSheet = g => {
      mp.querySelectorAll('.mw.sel').forEach(x => x.classList.remove('sel'));
      mp.querySelectorAll(`.mw[data-g="${g}"]`).forEach(x => x.classList.add('sel'));
      const v = surahOf(g);
      const sh = openSheet(`
        <div class="row between"><b style="font-size:16px">سورة ${v.m.name} · الآية ${v.a}</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${ctx.I.close}</button></div>
        <p class="sheet-ayah">${TEXT[g]}</p>
        <div class="mr-acts">
          <button data-a="tafsir">${ctx.I.book}<span>التفسير</span></button>
          <button data-a="listen">${ctx.I.vol}<span>استمع</span></button>
          <a href="#/learn?s=${v.s}&a=${v.a}&next=seqlearn">${ctx.I.quran || ctx.I.book}<span>احفظ من هون</span></a>
          <a href="#/recite?p=${p}&fresh=1">${ctx.I.mic}<span>سمّع الصفحة</span></a>
        </div>`, 'الآية');
      sh.el.querySelector('[data-a="tafsir"]').addEventListener('click', () => { sh.close(); showTafsir(g, `سورة ${v.m.name} · الآية ${v.a}`); });
      sh.el.querySelector('[data-a="listen"]').addEventListener('click', ev => {
        const b = ev.currentTarget; b.querySelector('span').textContent = 'جارٍ التشغيل…';
        Q.playAyahOnce(g, () => { b.querySelector('span').textContent = 'استمع'; });
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(sh.el)) { Q.stopPlayer(); mp.querySelectorAll('.mw.sel').forEach(x => x.classList.remove('sel')); obs.disconnect(); } });
      obs.observe(document.body, { childList: true });
    };
    let lpT = 0, longPressed = false, swiped = false;
    const verseAt = t => { const w = t && t.closest && t.closest('.mw, .ayah'); const g = w ? +w.dataset.g : NaN; return Number.isNaN(g) ? null : g; };
    stage.addEventListener('touchstart', e => {
      longPressed = false; swiped = false; clearTimeout(lpT);
      const g = verseAt(e.target);
      if (g != null) lpT = setTimeout(() => { longPressed = true; ctx.vibrate(15); verseSheet(g); }, 480);
    }, { passive: true });
    stage.addEventListener('touchmove', () => clearTimeout(lpT), { passive: true });
    stage.addEventListener('touchend', () => clearTimeout(lpT));
    stage.addEventListener('contextmenu', e => { const g = verseAt(e.target); if (g != null) { e.preventDefault(); verseSheet(g); } });
    stage.addEventListener('click', e => {
      if (longPressed || swiped) { longPressed = false; swiped = false; return; }
      const r = stage.getBoundingClientRect();
      go(e.clientX < r.left + r.width / 2 ? p + 1 : p - 1);
    });

    // surah index
    root.querySelector('[data-act="index"]').addEventListener('click', () => {
      const cur = surahOf(PAGES[p - 1]).s;
      const sh = openSheet(`
        <div class="row between"><b style="font-size:16px">فهرس السور</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${ctx.I.close}</button></div>
        <input class="mr-search" type="search" placeholder="ابحث عن سورة" data-el="q">
        <div class="mr-index" data-el="list">${META.surahs.map((m, i) => `<button data-p="${pageOfGid(m.start)}" data-name="${m.name}" class="${i + 1 === cur ? 'cur' : ''}"><b>${i + 1}</b><span>${m.name}</span><small>${arNum(pageOfGid(m.start))}</small></button>`).join('')}</div>`, 'فهرس السور');
      const list = sh.el.querySelector('[data-el="list"]');
      list.querySelector('.cur')?.scrollIntoView({ block: 'center' });
      sh.el.querySelector('[data-el="q"]').addEventListener('input', e => {
        const q = e.target.value.trim();
        list.querySelectorAll('button').forEach(b => { b.hidden = q && !b.dataset.name.includes(q) && b.querySelector('b').textContent !== q; });
      });
      list.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; sh.close(); go(+b.dataset.p); });
    });
    // go to page
    root.querySelector('[data-act="goto"]').addEventListener('click', () => {
      const sh = openSheet(`
        <div class="row between"><b style="font-size:16px">اذهب لصفحة</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${ctx.I.close}</button></div>
        <div class="grid2"><input class="mr-search" type="number" inputmode="numeric" min="1" max="604" value="${p}" data-el="n"><button class="btn" data-act="ok">اذهب</button></div>
        <div class="mr-juz">${Array.from({ length: 30 }, (_, j) => `<button data-p="${pageOfGid(META.juzStarts[j] - 1)}">الجزء ${arNum(j + 1)}</button>`).join('')}</div>`, 'اذهب لصفحة');
      const n = sh.el.querySelector('[data-el="n"]');
      sh.el.querySelector('[data-act="ok"]').addEventListener('click', () => { const v = Math.round(+n.value); if (v >= 1 && v <= 604) { sh.close(); go(v); } else ctx.toast('من 1 لـ 604'); });
      sh.el.querySelector('.mr-juz').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { sh.close(); go(+b.dataset.p); } });
    });
    // tools
    root.querySelector('[data-act="tools"]').addEventListener('click', () => {
      const v = surahOf(PAGES[p - 1]);
      openSheet(`
        <div class="row between"><b style="font-size:16px">الأدوات</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${ctx.I.close}</button></div>
        <div class="mr-tools">
          <a href="#/recite?p=${p}&fresh=1">${ctx.I.mic}<span>تسميع حي لهالصفحة</span></a>
          <a href="#/surah?s=${v.s}">${ctx.I.book}<span>حفظ سورة ${v.m.name} وتنزيل تلاوتها</span></a>
          <a href="#/khatma">${ctx.I.check}<span>ختمتي وورد القراءة</span></a>
          <a href="#/quran">${ctx.I.quran || ctx.I.book}<span>زاوية التحفيظ</span></a>
        </div>`, 'الأدوات');
    });

    // swipe to turn pages (RTL: swipe right → next page), with the page following the finger
    let x0 = null, y0 = null, dx = 0, moving = false;
    stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; moving = false; }, { passive: true });
    stage.addEventListener('touchmove', e => {
      if (x0 == null) return;
      dx = e.touches[0].clientX - x0; const dy = e.touches[0].clientY - y0;
      if (!moving && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) moving = true;
      if (moving) pageEl.style.transform = `translateX(${dx * 0.6}px)`;
    }, { passive: true });
    stage.addEventListener('touchend', () => {
      if (x0 == null) return;
      pageEl.style.transform = '';
      if (moving) swiped = true;
      if (moving && Math.abs(dx) > 60) go(dx > 0 ? p + 1 : p - 1);
      x0 = null;
    });
    if (openIndex) setTimeout(() => root.querySelector('[data-act="index"]')?.click(), 250);
    this._key = e => { if (e.key === 'ArrowLeft') go(p + 1); if (e.key === 'ArrowRight') go(p - 1); };
    addEventListener('keydown', this._key);
  },
  unmount() {
    if (this._fit) removeEventListener('resize', this._fit);
    if (this._key) removeEventListener('keydown', this._key);
    document.body.classList.remove('reading');
  }
};
