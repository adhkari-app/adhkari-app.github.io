// صدقة جارية عن أرواح شهداء آل الحولي — card, dua counter, gifted dhikr, names page.
// Cloud data is two shared totals only (stats/sadaqa: duas, dhikr); nothing personal is stored.
import * as store from './store.js';
import { init as fbInit, isConfigured } from './challenge.js';
import { shareCard } from './extras.js';
import { MARTYRS } from './martyrs.js';

let ctx = null; // { I, esc, toast, vibrate, render }
export function initSadaqa(c) { ctx = c; }

const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => Number(n || 0).toLocaleString('en-US').replace(/\d/g, d => AR[d]).replace(/,/g, '٬');

const DUA = 'اللَّهُمَّ اغْفِرْ لَهُمْ وَارْحَمْهُمْ، وَعَافِهِمْ وَاعْفُ عَنْهُمْ، وَأَكْرِمْ نُزُلَهُمْ، وَوَسِّعْ مُدْخَلَهُمْ، وَاغْسِلْهُمْ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِمْ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ';
const DUA2 = 'اللَّهُمَّ تَقَبَّلْهُمْ فِي الشُّهَدَاءِ، وَارْفَعْ دَرَجَتَهُمْ فِي عِلِّيِّينَ، وَاجْمَعْنَا بِهِمْ فِي جَنَّاتِ النَّعِيمِ';

function S() {
  const s = store.get();
  s.sadaqa = s.sadaqa || { gift: false, pending: 0, lastDua: 0, myDuas: 0, myGift: 0, cache: null };
  return s.sadaqa;
}

/* ---------- cloud ---------- */
const ref = (fs, db) => fs.doc(db, 'stats', 'sadaqa');
export async function refresh() {
  if (!isConfigured() || !navigator.onLine) return S().cache;
  try {
    const { db, fs } = await fbInit();
    const snap = await fs.getDoc(ref(fs, db));
    const d = snap.exists() ? snap.data() : { duas: 0, dhikr: 0 };
    S().cache = { duas: d.duas || 0, dhikr: d.dhikr || 0, t: Date.now() };
    store.save();
  } catch (e) { /* rules not published yet, or offline: keep the cached numbers */ }
  return S().cache;
}
async function bump(fields) {
  if (!isConfigured()) return false;
  try {
    const { db, fs } = await fbInit();
    const data = {};
    for (const k in fields) data[k] = fs.increment(fields[k]);
    await fs.setDoc(ref(fs, db), data, { merge: true });
    return true;
  } catch (e) { return false; }
}

/** Count dhikr gifted to them (only when the user chose to dedicate it). */
export function add(n = 1) {
  const q = S();
  if (!q.gift) return;
  q.pending = (q.pending || 0) + n;
  q.myGift = (q.myGift || 0) + n;
  store.save();
}
let flushing = false;
export async function flush() {
  const q = S();
  if (flushing || !q.pending || !navigator.onLine) return;
  flushing = true;
  const n = Math.min(q.pending, 2000);
  if (await bump({ dhikr: n })) {
    q.pending -= n; store.save();
    if (q.cache) q.cache.dhikr += n;
  }
  flushing = false;
}
setInterval(flush, 8000);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

/* ---------- home card ---------- */
export function cardHTML() {
  const I = ctx.I, q = S(), c = q.cache;
  const friday = new Date().getDay() === 5;
  return `
  <section class="sq-card" data-el="sadaqa">
    <svg class="sq-bg" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#D9B26A" stroke-width="3"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/></g></svg>
    <span class="sq-k">صدقة جارية</span>
    <h3>عن أرواح شهداء آل الحولي</h3>
    <p>كل ذكر بتقوله بهالتطبيق، وكل آية بتحفظها، أجرها إلهم إن شاء الله. لا تنساهم من دعائك 🤍</p>
    ${friday ? `<a class="sq-fri" href="#/read?s=18">${I.book}<span>اليوم جمعة: اقرأ سورة الكهف وأهدِ ثوابها لهم</span></a>` : ''}
    <div class="sq-stats" data-el="sq-stats">${statsHTML(c)}</div>
    <label class="sq-gift"><input type="checkbox" data-el="sq-gift" ${q.gift ? 'checked' : ''}><span>نويت أهدي أجر ذكري وتسبيحي لهم</span></label>
    <div class="sq-acts">
      <button class="sq-b" data-act="sq-dua">ادعُ لهم</button>
      <a class="sq-g" href="#/shuhada">الأسماء</a>
      <button class="sq-g sq-ic" data-act="sq-share" aria-label="شارك">${I.share}</button>
    </div>
  </section>`;
}
function statsHTML(c) {
  if (!c) return `<span>🤲 ادعُ لهم وكن أول الداعين</span>`;
  return `<span><b>${arNum(c.duas)}</b> دعوة لهم</span><span><b>${arNum(c.dhikr)}</b> ذكر أُهدي لهم</span>`;
}
export function bindCard(root) {
  const el = root.querySelector('[data-el="sadaqa"]'); if (!el) return;
  const stats = el.querySelector('[data-el="sq-stats"]');
  refresh().then(c => { if (c && document.body.contains(stats)) stats.innerHTML = statsHTML(c); });
  el.querySelector('[data-el="sq-gift"]').addEventListener('change', e => {
    S().gift = e.target.checked; store.save();
    ctx.toast(e.target.checked ? 'تقبّل الله منك 🤍 ذكرك من هلأ مُهدى لهم' : 'تمام، وقّفنا الإهداء');
  });
  el.querySelector('[data-act="sq-dua"]').addEventListener('click', () => openDua(stats));
  el.querySelector('[data-act="sq-share"]').addEventListener('click', share);
}

/* ---------- dua sheet ---------- */
function openDua(statsEl) {
  const I = ctx.I;
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-label="ادعُ لشهداء آل الحولي"><span class="sheet-handle"></span>
    <div class="row between"><b style="font-size:16px">ادعُ لشهداء آل الحولي</b><button class="icon-btn" data-act="x" aria-label="إغلاق">${I.close}</button></div>
    <p class="sq-dua">${DUA}</p>
    <p class="sq-src">رواه مسلم — بصيغة الجمع</p>
    <p class="sq-dua small">${DUA2}</p>
    <button class="btn big" data-act="done">دعوتُ لهم 🤍</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 300); };
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-act="x"]').addEventListener('click', close);
  wrap.querySelector('[data-act="done"]').addEventListener('click', async () => {
    const q = S();
    q.myDuas = (q.myDuas || 0) + 1;
    const fresh = Date.now() - (q.lastDua || 0) > 30 * 60000;   // one count per half hour per device
    if (fresh) q.lastDua = Date.now();
    store.save();
    ctx.vibrate([20, 40, 20]);
    ctx.toast('تقبّل الله دعاءك 🤍');
    close();
    if (fresh && await bump({ duas: 1 })) {
      if (q.cache) q.cache.duas += 1; else q.cache = { duas: 1, dhikr: 0, t: Date.now() };
      store.save();
      if (statsEl && document.body.contains(statsEl)) statsEl.innerHTML = statsHTML(q.cache);
    }
  });
}

function share() {
  shareCard({ kind: 'sadaqa', title: 'صدقة جارية', big: 'شهداء آل الحولي', text: 'اللهم اغفر لهم وارحمهم، وتقبّلهم في الشهداء، وارفع درجتهم في عليين', sub: 'ادعُ لهم · تطبيق أذكاري adhkari-app.github.io' });
}

/* ---------- names page ---------- */
export const Shuhada = {
  html() {
    const I = ctx.I;
    const list = MARTYRS.length
      ? MARTYRS.map((m, i) => `<div class="sq-name"><span class="sq-n">${arNum(i + 1)}</span><span style="flex:1"><b>${ctx.esc(m.name)}</b>${m.date ? `<small>${ctx.esc(m.date)}</small>` : ''}</span><span class="sq-r">${m.f ? 'رحمها الله' : 'رحمه الله'}</span></div>`).join('')
      : `<p class="muted" style="text-align:center;padding:20px 0">الأسماء رح تنضاف قريباً إن شاء الله</p>`;
    return `
    <header class="title-bar"><a class="icon-btn" href="#/home" aria-label="رجوع">${I.back}</a><h1>شهداء آل الحولي</h1></header>
    <main class="pad stack" style="margin-top:12px">
      <section class="sq-card">
        <svg class="sq-bg" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#D9B26A" stroke-width="3"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/></g></svg>
        <p class="sq-verse">﴿وَلَا تَحْسَبَنَّ الَّذِينَ قُتِلُوا فِي سَبِيلِ اللَّهِ أَمْوَاتًا ۚ بَلْ أَحْيَاءٌ عِندَ رَبِّهِمْ يُرْزَقُونَ﴾</p>
        <span class="sq-src" style="color:#D9B26A">آل عمران — ١٦٩</span>
      </section>
      <section class="card stack" style="gap:0">${list}</section>
      <button class="btn big" data-act="sq-dua">ادعُ لهم</button>
      <p class="muted" style="font-size:12px;text-align:center;margin:0">نحسبهم شهداء ولا نزكّي على الله أحداً</p>
    </main>`;
  },
  mount(root) {
    root.querySelector('[data-act="sq-dua"]').addEventListener('click', () => openDua(null));
  }
};
