// زاوية التحفيظ — Quran memorization corner
// Text: Uthmani (Hafs) from quran-json (QuranEnc). Audio: cdn.islamic.network (EveryAyah recordings).
import * as store from './store.js';

let ctx = null; // { I, esc, toast, vibrate, render, fmt }
export function initQuran(c) { ctx = c; }

/* ---------------- Data ---------------- */
let META = null, TEXT = null, loading = null;
export function ensureData() {
  if (META && TEXT) return Promise.resolve();
  if (!loading) {
    loading = Promise.all([
      fetch('data/quran-meta.json').then(r => r.json()),
      fetch('data/quran-text.json').then(r => r.json())
    ]).then(([m, t]) => { META = m; TEXT = t; })
      .catch(e => { loading = null; throw e; });
  }
  return loading;
}
export const ready = () => !!(META && TEXT);

const S = n => META.surahs[n - 1];
const gid = (s, a) => S(s).start + a - 1;               // 0-based global ayah index
function sa(g) {
  let lo = 0, hi = 113;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (META.surahs[mid].start <= g) lo = mid; else hi = mid - 1; }
  return { s: lo + 1, a: g - META.surahs[lo].start + 1 };
}
function juzOf(g) {
  let j = 0;
  while (j < 29 && META.juzStarts[j + 1] - 1 <= g) j++;
  return j + 1;
}
const juzRange = j => [META.juzStarts[j - 1] - 1, j < 30 ? META.juzStarts[j] - 2 : 6235];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => String(n).replace(/\d/g, d => AR_DIGITS[d]);
const marker = a => `<span class="ayah-mark" aria-label="آية ${a}">۝${arNum(a)}</span>`;
const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

/* ---------------- Reciters & audio ---------------- */
export const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.husary', name: 'محمود خليل الحصري' },
  { id: 'ar.minshawi', name: 'محمد صديق المنشاوي' },
  { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد' },
  { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
  { id: 'ar.saoodshuraym', name: 'سعود الشريم' }
];
const BITRATES = [128, 64, 192, 48, 40, 32];
const REPS = [1, 3, 5, 7, 10, 20];
const LINKS = [0, 1, 3, 5];
const SPEEDS = [0.75, 1, 1.25];

/* ---------------- Memorization state ---------------- */
function H() {
  const s = store.get();
  if (!s.hifz) s.hifz = {};
  const h = s.hifz;
  h.items = h.items || {};      // gid -> { b: box, d: dueMs, n: times, t: lastMs }
  h.goal = h.goal || 5;
  h.reciter = h.reciter || 'ar.alafasy';
  h.reps = h.reps ?? 5;
  h.link = h.link ?? 1;
  h.speed = h.speed || 1;
  h.mode = h.mode ?? 1;
  h.newLog = h.newLog || {};
  h.br = h.br || {};
  return h;
}

const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

function schedule(item, rating) {
  let b = item ? item.b : -1;
  if (rating === 0) return { b: 0, d: Date.now() + 10 * 60000 };
  if (rating === 1) b = Math.max(1, b);
  else b = b < 0 ? 2 : Math.min(7, Math.max(1, b) + 1);
  return { b, d: startOfDay() + INTERVALS[b] * DAY };
}

function whenLabel(item, rating) {
  if (rating === 0) return 'بعد 10 دقائق';
  const days = Math.round((schedule(item, rating).d - startOfDay()) / DAY);
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  if (days < 30) return `بعد ${days} يوماً`;
  if (days < 60) return 'بعد شهر';
  if (days < 90) return 'بعد شهرين';
  return `بعد ${Math.round(days / 30)} أشهر`;
}

function rate(g, rating) {
  const h = H();
  const old = h.items[g];
  const r = schedule(old, rating);
  h.items[g] = { b: r.b, d: r.d, n: (old ? old.n : 0) + 1, t: Date.now() };
  const k = store.dateKey();
  if (!old) h.newLog[k] = (h.newLog[k] || 0) + 1;
  store.day().q = (store.day().q || 0) + 1;
  store.save();
}

function dueList() {
  const now = Date.now();
  return Object.entries(H().items)
    .filter(([, it]) => it.d <= now)
    .map(([g, it]) => ({ g: +g, ...it }))
    .sort((x, y) => (x.b === 0 ? 0 : 1) - (y.b === 0 ? 0 : 1) || x.g - y.g);
}

function segments(list) {
  const sorted = [...list].sort((x, y) => x.g - y.g);
  const out = [];
  for (const it of sorted) {
    const p = sa(it.g);
    const last = out[out.length - 1];
    if (last && last.s === p.s && last.g2 === it.g - 1) { last.a2 = p.a; last.g2 = it.g; last.minB = Math.min(last.minB, it.b); last.minD = Math.min(last.minD, it.d); last.n++; }
    else out.push({ s: p.s, a1: p.a, a2: p.a, g1: it.g, g2: it.g, minB: it.b, minD: it.d, n: 1 });
  }
  return out;
}

function surahOrder(dir) {
  const o = Array.from({ length: 114 }, (_, i) => i + 1);
  return dir === 'back' ? o.reverse() : o;
}

function nextNew() {
  const h = H();
  if (!h.plan) return null;
  const order = surahOrder(h.plan.dir);
  let i = order.indexOf(h.plan.s);
  if (i < 0) i = 0;
  for (; i < order.length; i++) {
    const s = order[i], m = S(s);
    for (let a = 1; a <= m.count; a++) if (!h.items[m.start + a - 1]) return { s, a };
  }
  return null;
}

function newToday() { return H().newLog[store.dateKey()] || 0; }

function surahProgress(s) {
  const m = S(s), items = H().items;
  let n = 0, weak = 0;
  for (let a = 0; a < m.count; a++) { const it = items[m.start + a]; if (it) { n++; if (it.b === 0) weak++; } }
  return { n, weak, pct: Math.round(n / m.count * 100) };
}

function juzStats() {
  const items = H().items, now = Date.now();
  const st = Array.from({ length: 30 }, () => ({ mem: 0, box: 0, due: 0 }));
  for (const k in items) {
    const j = juzOf(+k) - 1, it = items[k];
    st[j].mem++; st[j].box += it.b; if (it.d <= now) st[j].due++;
  }
  return st.map((x, i) => {
    const [a, b] = juzRange(i + 1), total = b - a + 1;
    let lv = 0;
    if (x.mem > 0) lv = x.mem / total < 0.9 ? 1 : (x.box / x.mem < 3 || x.due > 0) ? 2 : 3;
    return { j: i + 1, lv, mem: x.mem, total };
  });
}

/* ---------------- Player ---------------- */
const player = { audio: null, queue: [], i: 0, playing: false, key: '', onChange: null, brTry: 0 };

function reciterName(id) { return (RECITERS.find(r => r.id === id) || RECITERS[0]).name; }

function buildQueue(s, a) {
  const h = H(), cur = gid(s, a), q = [];
  for (let r = 0; r < h.reps; r++) q.push({ g: cur, ph: 'rep', k: r });
  if (h.link > 0 && a > 1) for (let l = 0; l < h.link; l++) { q.push({ g: cur - 1, ph: 'link', k: l }); q.push({ g: cur, ph: 'link', k: l }); }
  return q;
}

function playCurrent() {
  const it = player.queue[player.i];
  if (!it) { player.playing = false; player.i = player.queue.length; player.onChange && player.onChange('end'); return; }
  const h = H();
  const ed = h.reciter;
  const list = h.br[ed] ? [h.br[ed], ...BITRATES.filter(b => b !== h.br[ed])] : BITRATES;
  const br = list[player.brTry];
  if (!player.audio) {
    player.audio = new Audio();
    player.audio.preload = 'auto';
    player.audio.addEventListener('ended', () => { player.i++; player.brTry = 0; playCurrent(); });
    player.audio.addEventListener('error', () => {
      if (!player.playing) return;
      player.brTry++;
      const hh = H(), l2 = hh.br[hh.reciter] ? [hh.br[hh.reciter], ...BITRATES.filter(b => b !== hh.br[hh.reciter])] : BITRATES;
      if (player.brTry < l2.length) playCurrent();
      else { player.playing = false; player.brTry = 0; ctx.toast('تعذّر تشغيل الصوت — تأكد من اتصالك بالإنترنت'); player.onChange && player.onChange('error'); }
    });
    player.audio.addEventListener('playing', () => { const hh = H(); const l2 = hh.br[hh.reciter] ? [hh.br[hh.reciter], ...BITRATES.filter(b => b !== hh.br[hh.reciter])] : BITRATES; hh.br[hh.reciter] = l2[player.brTry]; });
  }
  player.audio.src = `https://cdn.islamic.network/quran/audio/${br}/${ed}/${it.g + 1}.mp3`;
  player.audio.playbackRate = h.speed;
  try { player.audio.preservesPitch = true; } catch (e) {}
  player.playing = true;
  const p = player.audio.play();
  if (p && p.catch) p.catch(err => { if (err.name === 'NotAllowedError') { player.playing = false; player.onChange && player.onChange('blocked'); } });
  try {
    if ('mediaSession' in navigator) {
      const pos = sa(it.g);
      navigator.mediaSession.metadata = new MediaMetadata({ title: `سورة ${S(pos.s).name} — الآية ${pos.a}`, artist: reciterName(ed), album: 'أذكاري · زاوية التحفيظ', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    }
  } catch (e) {}
  player.onChange && player.onChange('item');
}

function startPlayer(s, a) {
  player.key = `${s}:${a}`;
  player.queue = buildQueue(s, a);
  player.i = 0; player.brTry = 0;
  playCurrent();
}

function togglePlay() {
  if (!player.audio || player.i >= player.queue.length || !player.queue.length) {
    const [s, a] = player.key.split(':').map(Number);
    if (s) startPlayer(s, a);
    return;
  }
  if (player.playing) { player.audio.pause(); player.playing = false; }
  else { player.playing = true; player.audio.play().catch(() => {}); }
  player.onChange && player.onChange('toggle');
}

export function stopPlayer() {
  if (player.audio) { try { player.audio.pause(); } catch (e) {} }
  player.playing = false; player.queue = []; player.i = 0; player.onChange = null;
}

/* ---------------- Shared bits ---------------- */
const loadingHTML = () => `<div class="pad" style="padding-top:35vh;text-align:center"><div class="spinner" aria-hidden="true"></div><p class="muted">جارٍ تحميل المصحف…</p></div>`;

function withData(html) {
  if (ready()) return html();
  ensureData().then(() => ctx.render()).catch(() => { ctx.toast('تعذّر تحميل المصحف'); });
  return loadingHTML();
}

function octa(n, size = 40) {
  return `<span class="octa" style="width:${size}px;height:${size}px"><svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3"><rect x="9" y="9" width="22" height="22"/><rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)"/></g></svg><b>${n}</b></span>`;
}

function surahBanner(s) {
  const m = S(s);
  return `<div class="surah-banner">
    <svg viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
      <path d="M24 4 H296 L316 32 L296 60 H24 L4 32 Z" fill="var(--banner)" stroke="#D9B26A" stroke-width="1.5"/>
      <path d="M30 10 H290 L306 32 L290 54 H30 L14 32 Z" fill="none" stroke="#D9B26A" stroke-width=".8" opacity=".7"/>
    </svg>
    <span class="sb-side">${m.type === 'م' ? 'مكية' : 'مدنية'}</span>
    <h2>سورة ${m.name}</h2>
    <span class="sb-side">${arNum(m.count)} آية</span>
  </div>`;
}

const back = (href) => `<a class="icon-btn" href="${href}" aria-label="رجوع">${ctx.I.back}</a>`;

/* ================= QURAN HOME ================= */
export const QuranHome = {
  html(params) {
    return withData(() => {
      const I = ctx.I, h = H();
      const memCount = Object.keys(h.items).length;
      const js = juzStats();
      const fullJuz = js.filter(x => x.mem / x.total >= 0.9).length;
      const pct = (memCount / 6236 * 100);
      const due = dueList();
      const segs = segments(due);
      const nn = nextNew();
      const doneNew = newToday();
      const remaining = Math.max(0, h.goal - doneNew);

      let wird;
      if (!h.plan) {
        wird = `
        <section class="card raised stack">
          <div class="row" style="gap:12px"><span class="now-icon">${I.quran}</span>
            <div style="flex:1"><h2 style="font-size:17px">ابدأ رحلة الحفظ</h2><span class="muted" style="font-size:13px">اختر من وين تبدأ، وكم آية باليوم</span></div></div>
          <div class="plan-opts">
            <button class="plan-opt" data-plan="back"><b>من جزء عمّ</b><span>من سورة الناس صعوداً — الأسهل للبداية</span></button>
            <button class="plan-opt" data-plan="fwd"><b>من أول المصحف</b><span>الفاتحة ثم البقرة بالترتيب</span></button>
          </div>
          <a class="btn ghost sm" href="#/surahs">أو اختر سورة معيّنة من الفهرس</a>
          <div class="row between"><span style="font-size:14px;font-weight:600">الهدف اليومي</span>
            <div class="row" style="gap:6px">${[3, 5, 10, 15].map(n => `<button class="chip-btn" data-goal="${n}" aria-pressed="${h.goal === n}">${n}</button>`).join('')}</div></div>
        </section>`;
      } else {
        const newRow = nn
          ? (remaining > 0
            ? (() => { const end = Math.min(S(nn.s).count, nn.a + remaining - 1); return `
              <div class="wird-row"><span class="w-ic">${I.plus}</span>
                <span class="w-tx"><b>حفظ جديد</b><span>سورة ${S(nn.s).name} · ${nn.a === end ? `الآية ${nn.a}` : `الآيات ${nn.a}–${end}`}</span></span>
                <a class="btn sm" href="#/learn?s=${nn.s}&a=${nn.a}&next=new">${doneNew ? 'أكمل' : 'ابدأ'}</a></div>`; })()
            : `<div class="wird-row"><span class="w-ic ok">${I.check}</span><span class="w-tx"><b>أتممت حفظ اليوم</b><span>${doneNew} ${doneNew <= 10 && doneNew > 2 ? 'آيات' : 'آية'} جديدة · تقبّل الله</span></span>
                <a class="btn ghost sm" href="#/learn?s=${nn.s}&a=${nn.a}&next=new">زيادة</a></div>`)
          : `<div class="wird-row"><span class="w-ic ok">${I.check}</span><span class="w-tx"><b>ختمت خطة الحفظ!</b><span>اختر سورة جديدة من الفهرس</span></span></div>`;
        const reviewRow = due.length
          ? `<div class="wird-row"><span class="w-ic">${I.reset}</span>
              <span class="w-tx"><b>مراجعة مستحقة</b><span>${due.length} ${due.length <= 10 && due.length > 2 ? 'آيات' : 'آية'} · ${[...new Set(segs.map(x => S(x.s).name))].slice(0, 3).join('، ')}</span></span>
              <a class="btn outline sm" href="#/review">راجع</a></div>`
          : `<div class="wird-row"><span class="w-ic ok">${I.check}</span><span class="w-tx"><b>لا مراجعة مستحقة</b><span>حفظك بأمان اليوم</span></span></div>`;
        const tasks = (remaining === 0 || !nn ? 1 : 0) + (due.length === 0 ? 1 : 0);
        wird = `
        <section class="card raised" style="padding:14px 18px">
          <div class="row between" style="padding-bottom:6px"><h2 style="font-size:16px">ورد اليوم</h2>
            <span class="chip gold">${tasks} من 2 مهام</span></div>
          ${newRow}${reviewRow}
          <div class="wird-row" style="min-height:48px"><span class="w-tx"><span>الهدف اليومي: <b style="display:inline">${h.goal}</b> آيات · الخطة: ${h.plan.dir === 'back' ? 'من آخر المصحف' : 'من أوله'}</span></span>
            <button class="btn ghost sm" data-act="goal" style="height:40px">تعديل</button></div>
        </section>`;
      }

      const cells = js.map(x => `<a class="juz l${x.lv}" href="#/surahs?j=${x.j}" aria-label="الجزء ${x.j}: ${x.mem} من ${x.total} آية محفوظة">${x.j}</a>`).join('');
      return `
      <header class="hero pattern lux" style="padding-bottom:70px">
        <div class="row between" style="align-items:flex-start;gap:12px">
          <div style="display:flex;flex-direction:column;gap:2px">
            <span class="hello">زاوية التحفيظ</span>
            <h1>حفظي</h1>
            <span class="date">«خيركم من تعلّم القرآن وعلّمه» — البخاري</span>
          </div>
          <div class="badge-box"><b>${ctx.fmt(memCount)}</b><span>آية محفوظة</span></div>
        </div>
        <div class="row" style="margin-top:16px"><div class="progress hero-prog" style="flex:1"><span style="width:${Math.max(pct, memCount ? 1 : 0)}%"></span></div>
          <span style="font-size:12px;color:var(--hero-muted)">${pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}% من المصحف${fullJuz ? ` · ${fullJuz} ${fullJuz === 1 ? 'جزء' : fullJuz === 2 ? 'جزءان' : fullJuz <= 10 ? 'أجزاء' : 'جزءاً'}` : ''}</span></div>
      </header>
      <main class="pad overlap stack" style="margin-top:-48px">
        ${wird}
        <section class="card stack" style="gap:12px">
          <div class="row between"><h2 style="font-size:15px">خريطة الحفظ</h2><a href="#/surahs" style="font-size:13px;font-weight:600;text-decoration:none">فهرس السور</a></div>
          <div class="juz-grid">${cells}</div>
          <div class="lg-row">
            <span class="lg"><i class="l3"></i>متين</span><span class="lg"><i class="l2"></i>يحتاج مراجعة</span><span class="lg"><i class="l1"></i>قيد الحفظ</span><span class="lg"><i class="l0"></i>لم يبدأ</span>
          </div>
        </section>
        <p class="muted" style="font-size:12px;text-align:center;margin:0">النص برواية حفص عن عاصم بالرسم العثماني · الصوت يحتاج اتصالاً بالإنترنت</p>
      </main>`;
    });
  },
  mount(root, params) {
    if (!ready()) return;
    if (params.get('done') === 'new') ctx.toast('أتممت حفظ اليوم — بارك الله فيك ✓');
    if (params.get('done') === 'review') ctx.toast('أتممت المراجعة — تقبّل الله ✓');
    if (params.get('done')) try { history.replaceState(null, '', '#/quran'); } catch (e) {}
    const h = H();
    root.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => {
      h.plan = { dir: b.dataset.plan, s: b.dataset.plan === 'back' ? 114 : 1 };
      store.save(); ctx.toast('تم ضبط خطة الحفظ ✓'); ctx.render();
    }));
    root.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => { h.goal = +b.dataset.goal; store.save(); ctx.render(); }));
    root.querySelector('[data-act="goal"]')?.addEventListener('click', () => {
      const opts = [3, 5, 10, 15, 20]; h.goal = opts[(opts.indexOf(h.goal) + 1) % opts.length]; store.save(); ctx.render();
    });
  }
};

/* ================= SURAH INDEX ================= */
export const Surahs = {
  html(params) {
    return withData(() => {
      const j = +params.get('j') || 0;
      let list = META.surahs;
      if (j) {
        const [a, b] = juzRange(j);
        list = list.filter(m => m.start <= b && m.start + m.count - 1 >= a);
      }
      const rows = list.map(m => {
        const p = surahProgress(m.n);
        return `<li><a class="s-row" href="#/surah?s=${m.n}" data-name="${m.name}" data-n="${m.n}">
          ${octa(m.n)}
          <span class="s-info"><b>${m.name}</b><span>${m.type === 'م' ? 'مكية' : 'مدنية'} · ${m.count} آية · الجزء ${m.juz}</span>
          ${p.n ? `<span class="mini-prog"><span style="width:${p.pct}%"></span></span>` : ''}</span>
          ${p.n ? `<span class="s-pct">${p.pct}%</span>` : ''}
        </a></li>`;
      }).join('');
      return `
      <header class="title-bar">${back('#/quran')}<h1>${j ? `الجزء ${j}` : 'فهرس السور'}</h1>
        ${j ? '<a class="btn ghost sm" href="#/surahs">كل السور</a>' : ''}</header>
      <div class="pad" style="margin-top:12px"><div class="search">${ctx.I.search}<input id="q" type="search" placeholder="ابحث باسم السورة أو رقمها" aria-label="بحث في السور" autocomplete="off"></div></div>
      <ul class="s-list pad" id="slist">${rows}</ul>`;
    });
  },
  mount(root) {
    const q = root.querySelector('#q');
    if (!q) return;
    const norm = t => t.replace(/[ً-ٰٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    q.addEventListener('input', () => {
      const v = norm(q.value.trim());
      root.querySelectorAll('#slist li').forEach(li => {
        const a = li.firstElementChild;
        li.hidden = !!v && !(norm(a.dataset.name).includes(v) || a.dataset.n === v);
      });
    });
  }
};

/* ================= SURAH (mushaf view) ================= */
export const Surah = {
  html(params) {
    return withData(() => {
      const s = Math.min(114, Math.max(1, +params.get('s') || 1));
      const m = S(s), items = H().items, now = Date.now();
      const p = surahProgress(s);
      let body = '';
      for (let a = 1; a <= m.count; a++) {
        const it = items[m.start + a - 1];
        const cls = !it ? '' : it.b === 0 ? 'weak' : it.d <= now ? 'due' : 'mem';
        body += `<span class="ayah ${cls}" role="link" tabindex="0" data-a="${a}">${TEXT[m.start + a - 1]} ${marker(a)}</span> `;
      }
      const h = H();
      const isPlan = h.plan && h.plan.s === s;
      return `
      <header class="title-bar">${back('#/surahs')}<h1>سورة ${m.name}</h1>
        <span class="chip ${p.n ? 'ok' : 'mute'}">${p.n ? `محفوظ ${p.pct}%` : 'لم تبدأ'}</span></header>
      <main class="pad stack" style="margin-top:12px">
        <div class="grid2">
          <button class="btn" data-act="plan">${isPlan ? 'أكمل حفظها' : 'احفظ هذه السورة'}</button>
          <a class="btn outline" href="#/test?s=${s}&a=1&next=seqtest">سمّع السورة</a>
        </div>
        <div class="mushaf">
          ${surahBanner(s)}
          ${s !== 1 && s !== 9 ? `<p class="basmala">${BASMALA}</p>` : ''}
          <p class="mushaf-text">${body}</p>
        </div>
        <div class="lg-row" style="justify-content:center">
          <span class="lg"><i style="background:var(--ok-soft);border:1px solid var(--primary)"></i>محفوظة</span>
          <span class="lg"><i style="background:var(--gold-soft);border:1px solid var(--gold)"></i>مستحقة للمراجعة</span>
          <span class="lg"><i style="background:#F8E6DC;border:1px solid #B4541E"></i>ضعيفة</span>
        </div>
        <p class="muted" style="font-size:12px;text-align:center;margin:0">اضغط على أي آية لتحفظها مع القارئ</p>
      </main>`;
    });
  },
  mount(root, params) {
    if (!ready()) return;
    const s = Math.min(114, Math.max(1, +params.get('s') || 1));
    const go = a => { location.hash = `#/learn?s=${s}&a=${a}&next=seqlearn`; };
    root.querySelectorAll('.ayah').forEach(el => {
      el.addEventListener('click', () => go(+el.dataset.a));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+el.dataset.a); } });
    });
    root.querySelector('[data-act="plan"]').addEventListener('click', () => {
      const h = H();
      const dir = h.plan ? h.plan.dir : (s >= 78 ? 'back' : 'fwd');
      h.plan = { dir, s };
      store.save();
      const m = S(s);
      let a = 1; while (a <= m.count && h.items[m.start + a - 1]) a++;
      if (a > m.count) { ctx.toast('حفظت هذه السورة كاملة — ما شاء الله'); return; }
      location.hash = `#/learn?s=${s}&a=${a}&next=new`;
    });
  }
};

/* ================= LEARN (listen & repeat) ================= */
function clampSA(params) {
  const s = Math.min(114, Math.max(1, +params.get('s') || 1));
  const a = Math.min(S(s).count, Math.max(1, +params.get('a') || 1));
  return { s, a, next: params.get('next') || 'seqlearn' };
}

export const Learn = {
  html(params) {
    return withData(() => {
      const I = ctx.I, h = H();
      const { s, a, next } = clampSA(params);
      const m = S(s), g = gid(s, a);
      const reciterOpts = RECITERS.map(r => `<option value="${r.id}" ${r.id === h.reciter ? 'selected' : ''}>${r.name}</option>`).join('');
      return `
      <header class="title-bar">${back(next === 'new' ? '#/quran' : `#/surah?s=${s}`)}
        <div style="flex:1;display:flex;flex-direction:column"><h1 style="font-size:20px">سورة ${m.name}</h1>
        <span class="muted" style="font-size:12px">الآية ${a} من ${m.count} · الجزء ${juzOf(g)}</span></div></header>
      <div class="seg2 pad"><a aria-current="page" href="#/learn?s=${s}&a=${a}&next=${next}">استماع وتكرار</a><a href="#/test?s=${s}&a=${a}&next=${next}">تسميع</a></div>
      <main class="pad stack" style="margin-top:14px">
        <div class="mushaf learn">
          ${a > 1 ? `<p class="prev-ayah" data-g="${g - 1}">${TEXT[g - 1]} ${marker(a - 1)}</p>` : (s !== 1 && s !== 9 ? `<p class="basmala sm">${BASMALA}</p>` : '')}
          <p class="cur-ayah" data-g="${g}">${TEXT[g]} ${marker(a)}</p>
          <div class="rep-dots" data-el="dots"></div>
          <span class="rep-label" data-el="replabel"></span>
        </div>
        <div class="reciter">
          <span class="rc-av">${I.mic}</span>
          <label class="rc-lbl" for="rec"><span>القارئ</span>
            <select id="rec">${reciterOpts}</select></label>
        </div>
        <div class="player">
          <a class="pl-btn" href="${a > 1 ? `#/learn?s=${s}&a=${a - 1}&next=${next}` : '#'}" aria-label="الآية السابقة" ${a > 1 ? '' : 'aria-disabled="true" tabindex="-1" style="opacity:.35;pointer-events:none"'}>${I.prevR}</a>
          <button class="pl-main" data-act="play" aria-label="تشغيل">${I.play}</button>
          <a class="pl-btn" href="${a < m.count ? `#/learn?s=${s}&a=${a + 1}&next=${next}` : '#'}" aria-label="الآية التالية" ${a < m.count ? '' : 'aria-disabled="true" tabindex="-1" style="opacity:.35;pointer-events:none"'}>${I.nextL}</a>
        </div>
        <div class="controls" style="padding:0">
          <button class="ctl" data-cyc="reps"><b>${h.reps}×</b><span>تكرار الآية</span></button>
          <button class="ctl" data-cyc="link"><b>${h.link ? h.link + '×' : 'بدون'}</b><span>ربط بالسابقة</span></button>
          <button class="ctl" data-cyc="speed"><b>${h.speed}×</b><span>السرعة</span></button>
        </div>
        <a class="btn" href="#/test?s=${s}&a=${a}&next=${next}">جاهز؟ سمّع من حفظك ${I.left.replace('<svg', '<svg width="18" height="18"')}</a>
      </main>`;
    });
  },
  mount(root, params) {
    if (!ready()) return;
    const { s, a } = clampSA(params);
    const h = H();
    const key = `${s}:${a}`;
    if (player.key !== key) { stopPlayer(); player.key = key; player.queue = buildQueue(s, a); player.i = 0; }
    const playBtn = root.querySelector('[data-act="play"]');
    const update = (ev) => {
      const q = player.queue, it = q[player.i];
      const repsDone = Math.min(h.reps, q.slice(0, player.i).filter(x => x.ph === 'rep').length);
      const dots = root.querySelector('[data-el="dots"]');
      if (dots) dots.innerHTML = Array.from({ length: h.reps }, (_, i) => `<i class="${i < repsDone ? 'on' : ''} ${it && it.ph === 'rep' && it.k === i && player.playing ? 'now' : ''}"></i>`).join('');
      const lbl = root.querySelector('[data-el="replabel"]');
      if (lbl) {
        if (player.i >= q.length && q.length && ev === 'end') lbl.textContent = 'انتهى التكرار — جرّب تسمّعها من حفظك';
        else if (it && it.ph === 'link') lbl.textContent = `ربط مع الآية السابقة ${it.k + 1} من ${h.link}`;
        else lbl.textContent = `التكرار ${Math.min(repsDone + (player.playing ? 1 : 0), h.reps)} من ${h.reps}${h.link && a > 1 ? ` · ثم ربط ${h.link}×` : ''}`;
      }
      root.querySelectorAll('[data-g]').forEach(el => el.classList.toggle('playing', !!(it && player.playing && +el.dataset.g === it.g)));
      playBtn.innerHTML = player.playing ? ctx.I.pause : ctx.I.play;
      playBtn.setAttribute('aria-label', player.playing ? 'إيقاف مؤقت' : 'تشغيل');
      playBtn.classList.toggle('on', player.playing);
      if (ev === 'end') { ctx.vibrate([40, 30, 40]); }
    };
    player.onChange = update;
    update();
    playBtn.addEventListener('click', () => {
      if (!player.audio || player.i >= player.queue.length) { player.queue = buildQueue(s, a); player.i = 0; player.brTry = 0; playCurrent(); }
      else togglePlay();
      update();
    });
    root.querySelector('#rec').addEventListener('change', e => {
      h.reciter = e.target.value; store.save();
      const was = player.playing; stopPlayer(); player.key = key; player.queue = buildQueue(s, a); player.i = 0; player.onChange = update;
      if (was) playCurrent();
      update();
    });
    root.querySelectorAll('[data-cyc]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.cyc;
      if (k === 'reps') h.reps = REPS[(REPS.indexOf(h.reps) + 1) % REPS.length];
      if (k === 'link') h.link = LINKS[(LINKS.indexOf(h.link) + 1) % LINKS.length];
      if (k === 'speed') { h.speed = SPEEDS[(SPEEDS.indexOf(h.speed) + 1) % SPEEDS.length]; if (player.audio) player.audio.playbackRate = h.speed; }
      store.save();
      b.querySelector('b').textContent = k === 'reps' ? `${h.reps}×` : k === 'link' ? (h.link ? `${h.link}×` : 'بدون') : `${h.speed}×`;
      if (k !== 'speed') {
        const cur = player.queue[player.i];
        player.queue = buildQueue(s, a);
        if (!player.playing) player.i = 0;
        else player.i = Math.min(player.i, player.queue.length - 1);
        if (cur && player.playing && player.queue[player.i] && player.queue[player.i].g !== cur.g) { player.i = 0; playCurrent(); }
      }
      update();
    }));
  },
  unmount() { stopPlayer(); }
};

/* ================= TEST (tasmee) ================= */
const T = { key: '', revealed: 0, mistakes: 0, missed: new Set(), rated: -1 };
const MODES = ['إخفاء تدريجي', 'أول حرف', 'كلمة كلمة'];

function firstLetter(w) {
  for (const ch of w) { if (/\p{L}/u.test(ch)) return ch; }
  return w.charAt(0);
}

function nextTarget(s, a, next) {
  if (next === 'review') {
    const d = dueList()[0];
    if (!d) return '#/quran?done=review';
    const p = sa(d.g);
    return `#/test?s=${p.s}&a=${p.a}&next=review`;
  }
  if (next === 'new') {
    const n = nextNew();
    if (!n || newToday() >= H().goal) return '#/quran?done=new';
    return `#/learn?s=${n.s}&a=${n.a}&next=new`;
  }
  if (a < S(s).count) return next === 'seqtest' ? `#/test?s=${s}&a=${a + 1}&next=seqtest` : `#/learn?s=${s}&a=${a + 1}&next=seqlearn`;
  return `#/surah?s=${s}`;
}

export const Test = {
  html(params) {
    return withData(() => {
      const I = ctx.I, h = H();
      const { s, a, next } = clampSA(params);
      const m = S(s), g = gid(s, a);
      const key = `${s}:${a}:${next}`;
      if (T.key !== key) { T.key = key; T.revealed = 0; T.mistakes = 0; T.missed = new Set(); T.rated = -1; }
      const words = TEXT[g].split(' ').filter(Boolean);
      const total = words.length;
      const done = T.revealed >= total;
      const wHTML = words.map((w, i) => {
        if (i < T.revealed) return `<span class="w ${T.missed.has(i) ? 'miss' : ''}">${w}</span>`;
        if (h.mode === 0) return `<span class="w ghost" aria-hidden="true">${w}</span>`;
        if (h.mode === 1) return `<span class="w fl" aria-hidden="true">${firstLetter(w)}ـ</span>`;
        return `<span class="w blank" style="min-width:${22 + w.length * 6}px" aria-hidden="true"></span>`;
      }).join(' ');
      const item = h.items[g];
      const suggest = T.mistakes === 0 ? 2 : T.mistakes <= 2 ? 1 : 0;
      const isReview = next === 'review';
      const dueLeft = isReview ? dueList().length : 0;
      const ctxLine = a > 1 ? TEXT[g - 1].split(' ').slice(-3).join(' ') : '';
      return `
      <header class="title-bar">${back(isReview ? '#/review' : next === 'new' ? '#/quran' : `#/surah?s=${s}`)}
        <div style="flex:1;display:flex;flex-direction:column"><h1 style="font-size:20px">سورة ${m.name}</h1>
        <span class="muted" style="font-size:12px">${isReview ? `مراجعة · بقي ${dueLeft} ${dueLeft <= 10 && dueLeft > 2 ? 'آيات' : 'آية'}` : `تسميع الآية ${a} من ${m.count}`}</span></div>
        <button class="icon-btn" data-act="restart" aria-label="أعد التسميع">${I.reset}</button></header>
      ${isReview ? '' : `<div class="seg2 pad"><a href="#/learn?s=${s}&a=${a}&next=${next}">استماع وتكرار</a><a aria-current="page" href="#/test?s=${s}&a=${a}&next=${next}">تسميع</a></div>`}
      <div class="pad" style="margin-top:12px"><div class="mode-chips" role="group" aria-label="طريقة الإخفاء">
        ${MODES.map((l, i) => `<button data-mode="${i}" aria-pressed="${h.mode === i}">${l}</button>`).join('')}
      </div></div>
      <main class="pad stack" style="margin-top:12px">
        <div class="mushaf test">
          ${ctxLine ? `<span class="ctx-line">قبلها: …${ctxLine}</span>` : (s !== 1 && s !== 9 && a === 1 ? `<span class="ctx-line">${BASMALA}</span>` : '')}
          <p class="test-words" aria-live="polite">${wHTML} ${done ? marker(a) : ''}</p>
        </div>
        ${!done ? `
          <p class="muted" style="text-align:center;font-size:13px;margin:0">قول الكلمة التالية من حفظك، وبعدين اكشفها</p>
          <div class="grid2">
            <button class="btn ghost big" data-act="miss" style="color:var(--gold-ink)">ما تذكّرتها</button>
            <button class="btn big" data-act="reveal">تذكّرتها ✓</button>
          </div>
          <div class="row between" style="font-size:13px"><span class="muted">الكلمات: ${T.revealed} من ${total} · أخطاء: ${T.mistakes}</span>
            <button class="link-btn" data-act="all">اكشف الآية</button></div>`
        : T.rated < 0 ? `
          <p style="text-align:center;font-size:15px;font-weight:700;margin:0">كيف كان حفظك؟ <span class="muted" style="font-weight:400;font-size:13px">(أخطاء: ${T.mistakes})</span></p>
          <div class="rate-grid">
            ${['صعب', 'متوسط', 'ممتاز'].map((l, i) => `<button class="rate ${i === suggest ? 'sug' : ''}" data-rate="${i}"><b>${l}</b><span>${whenLabel(item, i)}</span></button>`).join('')}
          </div>
          <p class="muted" style="text-align:center;font-size:12px;margin:0">التقييم بيحدد متى ترجعلك الآية للمراجعة</p>` : ''}
      </main>`;
    });
  },
  mount(root, params) {
    if (!ready()) return;
    const h = H();
    const { s, a, next } = clampSA(params);
    const g = gid(s, a);
    const total = TEXT[g].split(' ').filter(Boolean).length;
    const rer = () => ctx.render();
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { h.mode = +b.dataset.mode; store.save(); rer(); }));
    const reveal = (miss) => {
      if (T.revealed >= total) return;
      if (miss) { T.missed.add(T.revealed); T.mistakes++; ctx.vibrate([20, 30, 20]); } else ctx.vibrate(10);
      T.revealed++;
      rer();
    };
    root.querySelector('[data-act="reveal"]')?.addEventListener('click', () => reveal(false));
    root.querySelector('[data-act="miss"]')?.addEventListener('click', () => reveal(true));
    root.querySelector('[data-act="all"]')?.addEventListener('click', () => {
      for (let i = T.revealed; i < total; i++) T.missed.add(i);
      T.mistakes += total - T.revealed; T.revealed = total; rer();
    });
    root.querySelector('[data-act="restart"]').addEventListener('click', () => { T.revealed = 0; T.mistakes = 0; T.missed = new Set(); T.rated = -1; rer(); });
    root.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      const r = +b.dataset.rate;
      const when = whenLabel(h.items[g], r);
      rate(g, r);
      T.rated = r;
      ctx.toast(`تمّت الجدولة ✓ — المراجعة ${when}`);
      ctx.vibrate([30, 30, 30]);
      T.key = '';
      const target = nextTarget(s, a, next);
      if (location.hash === target) ctx.render(); else location.hash = target;
    }));
    this.key = e => {
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      if (T.revealed >= total) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowLeft') { if (e.target === document.body || e.key === 'ArrowLeft') { e.preventDefault(); reveal(false); } }
    };
    document.addEventListener('keydown', this.key);
  },
  unmount() { document.removeEventListener('keydown', this.key); }
};

/* ================= REVIEW ================= */
export const Review = {
  html() {
    return withData(() => {
      const I = ctx.I, h = H(), now = Date.now();
      const due = dueList();
      const all = Object.values(h.items);
      const weak = all.filter(x => x.b === 0).length;
      const strong = all.filter(x => x.b >= 3).length;
      const segs = segments(due);
      const mins = Math.max(1, Math.round(due.length * 0.7));
      const strength = b => b === 0 ? ['ضعيف', 'weak'] : b <= 2 ? ['متوسط', 'mid'] : ['متين', 'strong'];
      const dueLbl = d => { const days = Math.floor((startOfDay() - startOfDay(d)) / DAY); return days <= 0 ? 'اليوم' : days === 1 ? 'متأخرة يوم' : days === 2 ? 'متأخرة يومين' : `متأخرة ${days} ${days <= 10 ? 'أيام' : 'يوماً'}`; };
      let list;
      if (segs.length) {
        list = `<ul class="rev-list">${segs.map(x => {
          const [lbl, cls] = strength(x.minB);
          return `<li><span class="rv-main"><span class="row" style="gap:8px"><b>${S(x.s).name} ${x.a1 === x.a2 ? x.a1 : `${x.a1}–${x.a2}`}</b><span class="st ${cls}">${lbl}</span></span>
            <span class="mini-prog ${cls}"><span style="width:${[25, 45, 60, 75, 85, 92, 96, 100][x.minB]}%"></span></span></span>
            <span class="muted" style="font-size:12px">${dueLbl(x.minD)}</span>
            <a class="round-btn" href="#/test?s=${x.s}&a=${x.a1}&next=review" aria-label="راجع ${S(x.s).name} ${x.a1}">${I.play}</a></li>`;
        }).join('')}</ul>`;
      } else {
        const upcoming = Object.entries(h.items).map(([g, it]) => ({ g: +g, ...it })).sort((x, y) => x.d - y.d).slice(0, 4);
        list = `<div class="card done-banner">${I.check.replace('<svg', '<svg width="28" height="28" style="color:var(--gold-ink)"')}<b>ما في مراجعة مستحقة اليوم</b>
          <span class="muted" style="font-size:14px">${all.length ? 'حفظك بأمان — بارك الله فيك' : 'ابدأ الحفظ وبتظهر مراجعاتك هون تلقائياً'}</span></div>
          ${upcoming.length ? `<h2 style="font-size:15px;margin:6px 0 0">القادم</h2><ul class="rev-list">${upcoming.map(u => { const p = sa(u.g); const days = Math.max(0, Math.round((startOfDay(u.d) - startOfDay()) / DAY)); return `<li><span class="rv-main"><b>${S(p.s).name} ${p.a}</b></span><span class="muted" style="font-size:12px">${days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `بعد ${days} ${days <= 10 ? 'أيام' : 'يوماً'}`}</span></li>`; }).join('')}</ul>` : ''}`;
      }
      return `
      <header class="title-bar">${back('#/quran')}<div style="flex:1;display:flex;flex-direction:column"><h1 style="font-size:20px">مراجعة اليوم</h1>
        <span class="muted" style="font-size:12px">${due.length ? `${due.length} ${due.length <= 10 && due.length > 2 ? 'آيات مستحقة' : 'آية مستحقة'} · حوالي ${mins} ${mins <= 10 && mins > 2 ? 'دقائق' : 'دقيقة'}` : 'كل شي تمام'}</span></div></header>
      <main class="pad stack" style="margin-top:14px">
        <div class="rev-tiles">
          <div class="rt hero-tile"><b>${due.length}</b><span>مستحقة اليوم</span></div>
          <div class="rt"><b style="color:#B4541E">${weak}</b><span>آيات ضعيفة</span></div>
          <div class="rt"><b>${ctx.fmt(strong)}</b><span>آية متينة</span></div>
        </div>
        ${list}
        <div class="card note-card">
          <b>كيف بتشتغل المراجعة؟</b>
          <span>كل ما قيّمت حفظك "ممتاز"، المدة للمراجعة الجاية بتطول. وإذا قيّمته "صعب"، الآية بترجعلك بعد 10 دقائق.</span>
          <div class="ladder"><i>يوم</i>←<i>3 أيام</i>←<i>أسبوع</i>←<i>أسبوعين</i>←<i>شهر</i>←<i>شهرين</i></div>
        </div>
        ${due.length ? `<a class="btn big" href="#/test?s=${sa(due[0].g).s}&a=${sa(due[0].g).a}&next=review">ابدأ المراجعة (${due.length})</a>` : ''}
      </main>`;
    });
  }
};

/* ---------- For home/stats ---------- */
export function summary() {
  if (!ready()) return null;
  const h = H();
  const nn = nextNew();
  return {
    mem: Object.keys(h.items).length,
    due: dueList().length,
    newToday: newToday(),
    goal: h.goal,
    plan: !!h.plan,
    next: nn ? { s: nn.s, a: nn.a, name: S(nn.s).name } : null
  };
}
