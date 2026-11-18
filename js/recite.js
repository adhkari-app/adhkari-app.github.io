// التسميع الحي — live page recitation with mistake detection (max 3 mistakes per page)
import * as store from './store.js';
import * as FX from './fx.js';
import * as Q from './quran.js';
import * as E from './recite-engine.js';
import * as MU from './mushaf.js';

let ctx = null; // { I, esc, toast, vibrate, render, fmt, soundOn }
export function initRecite(c) { ctx = c; }

const MAX = 3;
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

/* ---------- pages data ---------- */
let PAGES = null, pagesLoading = null;
function ensurePages() {
  if (PAGES) return Promise.resolve();
  if (!pagesLoading) pagesLoading = fetch('data/quran-pages.json').then(r => r.json()).then(p => { PAGES = p; })
    .catch(e => { pagesLoading = null; throw e; });
  return pagesLoading;
}
const pageRange = p => [PAGES[p - 1], p < 604 ? PAGES[p] : 6236];
function pageOf(g) {
  let lo = 0, hi = 603;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (PAGES[m] <= g) lo = m; else hi = m - 1; }
  return lo + 1;
}
function withAll(html) {
  if (Q.ready() && PAGES && MU.mushafReady()) return html();
  Promise.all([Q.ensureData(), ensurePages(), MU.ensureMushaf()]).then(() => ctx.render()).catch(() => ctx.toast('تعذّر تحميل المصحف'));
  return Q.quranLoading();
}

const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => String(n).replace(/\d/g, d => AR[d]);
const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const mmss = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function records() { const h = Q.hifz(); h.pages = h.pages || {}; return h.pages; }
function suggestPage() {
  const recs = Object.entries(records()).map(([p, r]) => ({ p: +p, ...r })).sort((a, b) => b.t - a.t);
  if (recs.length) { const r = recs[0]; return r.pass ? Math.min(604, r.p + 1) : r.p; }
  const items = Object.entries(Q.hifz().items).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
  return items.length ? pageOf(+items[0][0]) : 1;
}
function pageTitle(st) {
  const W = st.words, segs = [];
  for (const w of W) {
    const last = segs[segs.length - 1];
    if (!last || last.s !== w.s) segs.push({ s: w.s, a1: w.a, a2: w.a }); else last.a2 = w.a;
  }
  return segs.map(x => `${Q.surahMeta(x.s).name} ${x.a1 === x.a2 ? x.a1 : `${x.a1}–${x.a2}`}`).join(' · ');
}

/* ---------- session state ---------- */
const R = { manual: false, key: 0, st: null, phase: 'ready', t0: 0, spent: 0, alert: null, lastTxt: '', pass: false, when: '' };
function reset(p) {
  const [a, b] = pageRange(p);
  R.key = p; R.st = E.newState(E.buildWords(Q.qdata().TEXT, a, b, Q.surahAyah));
  R.phase = 'ready'; R.t0 = 0; R.spent = 0; R.alert = null; R.lastTxt = ''; R.pass = false; R.when = ''; R.manual = false;
}

/* ---------- small sound for a mistake ---------- */
let AC = null;
function tone() {
  if (!ctx.soundOn()) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    [0, 0.16].forEach(d => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = 330;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.18, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.14);
      o.connect(g).connect(AC.destination); o.start(t + d); o.stop(t + d + 0.15);
    });
  } catch (e) {}
}

/* ---------- speech recognition ---------- */
const V = { rec: null, on: false, silT: 0, startedAt: 0, quick: 0, lock: null };
function stopRec() {
  V.on = false; clearTimeout(V.silT);
  try { V.rec && V.rec.abort(); } catch (e) {}
  V.rec = null;
  try { V.lock && V.lock.release(); } catch (e) {} V.lock = null;
}

/* ================= SCREEN ================= */
export const Recite = {
  html(params) {
    return withAll(() => {
      const I = ctx.I;
      let p = +params.get('p');
      const s = +params.get('s');
      if (!p && s >= 1 && s <= 114) p = pageOf(Q.surahMeta(s).start);
      if (!p || p < 1 || p > 604) return pickerHTML();
      if (R.key !== p || !R.st || params.get('fresh')) {
        reset(p);
        if (params.get('fresh')) try { history.replaceState(null, '', `#/recite?p=${p}`); } catch (e) {}
      }
      if (R.phase === 'result') return resultHTML(p);
      const st = R.st;
      return `
      <header class="title-bar">${`<a class="icon-btn" href="#/recite" aria-label="رجوع">${I.back}</a>`}
        <div style="flex:1;display:flex;flex-direction:column;min-width:0"><h1 style="font-size:19px">تسميع الصفحة ${p}</h1>
        <span class="muted" style="font-size:12px">${pageTitle(st)}</span></div>
        <button class="icon-btn" data-act="restart" aria-label="أعد من الأول">${I.reset}</button></header>
      <div class="pad rc-top">
        <div class="rc-mist" data-el="mist"></div>
        <div class="progress rc-prog"><span data-el="prog"></span></div>
      </div>
      <main class="pad" style="margin-top:10px">
        <div class="mushaf rc-page real" data-el="page"><div data-el="mp">${MU.pageHTML(p, { surahName: n => Q.surahMeta(n).name })}</div>
          <div class="mp-wait" data-el="wait"><div class="spinner"></div><span>جارٍ تحميل خط المصحف…</span></div></div>
      </main>
      <div class="rc-dock" data-el="dock">
        <div class="rc-alert" data-el="alert" hidden></div>
        <div class="rc-heard" data-el="heard" aria-live="polite"></div>
        ${SR && !R.manual ? `
        <div class="rc-ctrls">
          <button class="rc-sb" data-act="hint"><span>${I.help || '?'}</span>تلميح (+خطأ)</button>
          <button class="rc-mic" data-act="mic" aria-label="ابدأ التسميع">${I.mic.replace('<svg', '<svg width="30" height="30"')}</button>
          <button class="rc-sb" data-act="pause"><span><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg></span>إيقاف مؤقت</button>
        </div>` : `
        <p class="rc-nosr">${R.manual ? 'التعرّف على الصوت بحتاج نت هلأ' : 'التعرّف على الصوت مش متاح بهالمتصفح'} — سمّع بصوت عالي واكشف كلمة كلمة:${R.manual && SR ? ' <button class="link-btn" data-act="voice-again">جرّب الصوت</button>' : ''}</p>
        <div class="grid2 rc-manual">
          <button class="btn ghost big" data-act="hint" style="color:var(--gold-ink)">غلطت / نسيت</button>
          <button class="btn big" data-act="okword">صح ✓</button>
        </div>`}
      </div>`;
    });
  },

  mount(root, params) {
    if (!(Q.ready() && PAGES && MU.mushafReady())) return;
    const pick = root.querySelector('[data-el="picker"]');
    if (pick) return mountPicker(root);
    if (R.phase === 'result') return mountResult(root);
    const st = R.st, total = st.words.length;
    const $ = sel => root.querySelector(sel);
    const mistEl = $('[data-el="mist"]'), progEl = $('[data-el="prog"]'), heardEl = $('[data-el="heard"]');
    const alertEl = $('[data-el="alert"]'), mic = $('[data-act="mic"]');
    // word k of the engine → the span(s) that show it; verse ends → their marker spans
    let wordEls = [], amEls = [];
    const pageEl = $('[data-el="page"]'), mpEl = $('[data-el="mp"]');
    const bindMushaf = () => {
      const byG = {};
      mpEl.querySelectorAll('.mw').forEach(el => {
        const g = +el.dataset.g, b = byG[g] || (byG[g] = { w: [], e: [] });
        (el.dataset.kind === 'w' ? b.w : b.e).push(el);
      });
      wordEls = st.words.map(() => []); amEls = [];
      const byVerse = {};
      st.words.forEach((w, k) => { (byVerse[w.g] || (byVerse[w.g] = [])).push(k); });
      Object.entries(byVerse).forEach(([g, ks]) => {
        const b = byG[g] || { w: [], e: [] };
        const real = ks.filter(k => !st.words[k].skip);
        const groups = MU.tokenGlyphs(+g, real.length);
        real.forEach((k, t) => { wordEls[k] = (groups[t] || []).map(i => b.w[i]).filter(Boolean); });
        b.w.forEach(el => el.classList.add('rw'));
        b.e.forEach(el => { el.classList.add('rc-am'); amEls.push({ k: ks[ks.length - 1], el }); });
      });
    };
    const bindText = () => {
      mpEl.innerHTML = pageHTML(st);
      pageEl.classList.remove('real');
      const spans = [...mpEl.querySelectorAll('.rw')];
      wordEls = spans.map(el => [el]);
      amEls = [...mpEl.querySelectorAll('[data-am]')].map(el => ({ k: +el.dataset.am, el }));
    };
    bindMushaf();

    const paint = () => {
      const n = st.mistakes.length;
      mistEl.innerHTML = `<b>الأخطاء</b><span class="${n ? 'bad' : ''}">${Math.min(n, MAX + 1)} من ${MAX}</span>
        <span class="rc-dots">${Array.from({ length: MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
      mistEl.classList.toggle('alarm', R.phase === 'alert');
      progEl.style.width = `${(st.k / total) * 100}%`;
      wordEls.forEach((els, k) => {
        const w = st.words[k];
        const on = w.st === 1 ? 'ok' : w.st === 2 ? 'bad' : 'h', cur = k === st.k && R.phase !== 'alert';
        els.forEach(el => {
          el.classList.remove('ok', 'bad', 'h', 'cur'); el.classList.add('rw', on);
          if (cur) el.classList.add('cur');
        });
      });
      amEls.forEach(({ k, el }) => el.classList.toggle('on', st.words[k].st > 0));
      if (mic) {
        mic.classList.toggle('on', V.on);
        mic.setAttribute('aria-label', V.on ? 'إيقاف الاستماع' : 'ابدأ التسميع');
      }
      if (!V.on && R.phase !== 'alert') heardEl.innerHTML = st.k === 0 && !R.t0
        ? `اضغط المايك وابدأ القراءة من حفظك`
        : `<span class="muted">متوقف — اضغط المايك لتكمل</span>`;
    };
    const follow = () => {
      let el = null;
      for (let k = Math.min(st.k, total - 1); k >= 0 && !el; k--) el = wordEls[k] && wordEls[k][0];
      if (!el) return;
      const dock = $('[data-el="dock"]'), r = el.getBoundingClientRect();
      const limit = innerHeight - (dock ? dock.offsetHeight : 200) - 90;
      if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit + 60, behavior: 'smooth' });
    };

    const finish = pass => {
      stopRec();
      R.spent += R.t0 ? Date.now() - R.t0 : 0; R.t0 = 0;
      R.pass = pass; R.phase = 'result';
      saveResult(pass);
      ctx.render(); window.scrollTo(0, 0);
    };

    const showAlert = m => {
      R.phase = 'alert'; R.alert = m;
      const over = st.mistakes.length > MAX;
      const W = st.words, k0 = m.ks[0], k1 = m.ks[m.ks.length - 1];
      const from = Math.max(0, k0 - 1), to = Math.min(total - 1, k1 + 1);
      const right = W.slice(from, to + 1).map((w, i) => (from + i >= k0 && from + i <= k1) ? `<u>${w.t}</u>` : w.t).join(' ');
      const title = over ? `وصلت ${st.mistakes.length} أخطاء` : m.kind === 'skip' ? 'نسيت كلمة' : m.kind === 'hint' ? 'تلميح — انحسب غلطة' : 'انتبه، في غلطة';
      alertEl.innerHTML = `
        <div class="h">${ctx.I.info || '!'}<span>${title}</span></div>
        ${m.kind === 'wrong' && m.said ? `<div class="row2">قلت: <span class="said">${ctx.esc(m.said)}</span></div>` : ''}
        <div class="row2">الصحيح: <span class="right">${right}</span></div>
        <div class="acts">
          ${over ? `<button class="a1" data-act="result">شوف النتيجة</button>` : `<button class="a1" data-act="resume">كمّل من هون</button>`}
          <button class="a2" data-act="listen">اسمع الآية 🔊</button>
        </div>`;
      alertEl.hidden = false;
      alertEl.classList.remove('rc-shake'); void alertEl.offsetWidth; alertEl.classList.add('rc-shake');
      heardEl.textContent = '';
      alertEl.querySelector('[data-act="resume"]')?.addEventListener('click', () => { hideAlert(); start(); });
      alertEl.querySelector('[data-act="result"]')?.addEventListener('click', () => finish(false));
      alertEl.querySelector('[data-act="listen"]').addEventListener('click', ev => {
        const b = ev.currentTarget; b.textContent = 'جارٍ التشغيل…';
        Q.playAyahOnce(W[k0].g, () => { b.textContent = 'اسمع الآية 🔊'; });
      });
      ctx.vibrate([70, 50, 70]); tone();
      paint(); follow();
    };
    const hideAlert = () => { R.phase = 'ready'; R.alert = null; alertEl.hidden = true; Q.stopPlayer(); paint(); };

    const onMistake = m => {
      stopRec();
      E.catchUp(st, E.heardWords(R.lastTxt));
      if (E.done(st) && st.mistakes.length <= MAX) { paint(); ctx.vibrate([70, 50, 70]); tone(); return setTimeout(() => finish(true), 900); }
      showAlert(m);
    };
    const afterProgress = () => {
      paint(); follow();
      if (E.done(st)) setTimeout(() => finish(st.mistakes.length <= MAX), 350);
    };

    const handle = (final) => {
      const r = E.advance(st, E.heardWords(R.lastTxt), final);
      if (r.mistake) return onMistake(r.mistake);
      if (r.progressed) { ctx.vibrate(6); afterProgress(); }
    };

    const start = () => {
      if (!SR || V.on) return;
      if (E.done(st)) return;
      if (R.phase === 'alert') hideAlert();
      const rec = new SR();
      rec.lang = 'ar-SA'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onresult = ev => {
        if (V.rec !== rec) return;
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript + ' ';
        R.lastTxt = t;
        const words = t.trim().split(/\s+/).filter(Boolean);
        heardEl.innerHTML = `<span class="rc-lv" aria-hidden="true"><i></i><i></i><i></i><i></i></span>سمعتك: «${ctx.esc(words.slice(-6).join(' '))}»`;
        handle(false);
        clearTimeout(V.silT);
        V.silT = setTimeout(() => { if (V.on && V.rec === rec) handle(true); }, 1800);
      };
      rec.onerror = ev => {
        if (V.rec !== rec) return;
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          stopRec(); paint();
          heardEl.innerHTML = `<span class="bad">ما في إذن للمايك.</span> اسمح للتطبيق بالمايك والتعرّف على الكلام من الإعدادات، أو افتح الموقع من Safari.`;
        } else if (ev.error === 'network') { stopRec(); R.manual = true; ctx.toast('ما في نت — كمّل التسميع يدوي'); ctx.render(); }
        else if (ev.error === 'audio-capture') { stopRec(); paint(); ctx.toast('المايك مش متاح — سكّر أي تطبيق تاني بيستخدمه'); }
      };
      rec.onend = () => {
        if (V.rec !== rec) return;
        // the recognizer stops by itself after silence: start a fresh session and keep following
        if (V.on && !E.done(st)) {
          const quick = Date.now() - V.startedAt < 1200;
          V.quick = quick ? V.quick + 1 : 0;
          if (V.quick >= 4) { stopRec(); paint(); ctx.toast('الميكروفون وقف — اضغط المايك لتكمل'); return; }
          if (R.lastTxt) handle(true);
          if (!V.on) return;
          R.lastTxt = ''; st.used = 0;
          try { V.startedAt = Date.now(); rec.start(); } catch (e) { stopRec(); paint(); }
          return;
        }
      };
      V.rec = rec; V.on = true; V.startedAt = Date.now(); V.quick = 0;
      R.lastTxt = ''; st.used = 0;
      try { rec.start(); } catch (e) { V.on = false; V.rec = null; ctx.toast('تعذّر تشغيل الميكروفون'); return; }
      if (!R.t0) R.t0 = Date.now();
      try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => { V.lock = l; }).catch(() => {}); } catch (e) {}
      try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume && AC.resume(); } catch (e) {}
      heardEl.innerHTML = `<span class="rc-lv" aria-hidden="true"><i></i><i></i><i></i><i></i></span>عم بسمعك… ابدأ`;
      paint();
    };
    const pause = () => {
      if (!V.on) return;
      stopRec();
      if (R.t0) { R.spent += Date.now() - R.t0; R.t0 = 0; }
      paint();
    };

    mic?.addEventListener('click', () => { if (V.on) pause(); else start(); });
    root.querySelector('[data-act="pause"]')?.addEventListener('click', pause);
    root.querySelector('[data-act="hint"]')?.addEventListener('click', () => {
      if (R.phase === 'alert' || E.done(st)) return;
      const wasOn = V.on; stopRec();
      if (!R.t0) R.t0 = Date.now();
      const m = E.hint(st);
      if (!m) return;
      if (st.mistakes.length > MAX) return showAlert(m);
      paint(); follow();
      if (E.done(st)) return setTimeout(() => finish(st.mistakes.length <= MAX), 350);
      ctx.toast('انحسب التلميح غلطة'); ctx.vibrate(20);
      if (wasOn) start();
    });
    root.querySelector('[data-act="okword"]')?.addEventListener('click', () => {
      if (R.phase === 'alert' || E.done(st)) return;
      if (!R.t0) R.t0 = Date.now();
      while (st.k < total && st.words[st.k].skip) { st.words[st.k].st = 1; st.k++; }
      if (st.k < total) { st.words[st.k].st = 1; st.k++; }
      while (st.k < total && st.words[st.k].skip) { st.words[st.k].st = 1; st.k++; }
      afterProgress();
    });
    root.querySelector('[data-act="voice-again"]')?.addEventListener('click', () => { R.manual = false; ctx.render(); });
    root.querySelector('[data-act="restart"]').addEventListener('click', () => {
      stopRec(); Q.stopPlayer(); reset(R.key); ctx.render(); window.scrollTo(0, 0);
    });

    const wait = $('[data-el="wait"]');
    MU.fontsFor(R.key).then(() => {
      const pg = mpEl.querySelector('.mpage'); if (!pg) return;
      MU.fitPage(pg); pg.classList.add('ready'); wait && wait.remove(); paint();
    }).catch(() => { wait && wait.remove(); bindText(); paint(); });
    this._fit = () => { const pg = mpEl.querySelector('.mpage.ready'); if (pg) MU.fitPage(pg); };
    addEventListener('resize', this._fit);
    paint();
    if (R.phase === 'alert' && R.alert) showAlert(R.alert);
    this._vis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', this._vis);
  },

  unmount() {
    stopRec(); Q.stopPlayer();
    if (R.t0) { R.spent += Date.now() - R.t0; R.t0 = 0; }
    if (this._vis) document.removeEventListener('visibilitychange', this._vis);
    if (this._fit) removeEventListener('resize', this._fit);
  }
};

/* ---------- page text ---------- */
function pageHTML(st) {
  let out = '', open = false;
  const openP = () => { if (!open) { out += '<p class="rc-text">'; open = true; } };
  const closeP = () => { if (open) { out += '</p>'; open = false; } };
  st.words.forEach((w, k) => {
    if (w.first && w.a === 1) {
      closeP();
      out += `<div class="rc-sura">سورة ${Q.surahMeta(w.s).name}</div>`;
      if (w.s !== 1 && w.s !== 9) out += `<div class="rc-basmala">${BASMALA}</div>`;
    }
    openP();
    out += `<span class="rw h">${w.t}</span> `;
    if (w.last) out += `<span class="ayah-mark rc-am" data-am="${k}">۝${arNum(w.a)}</span> `;
  });
  closeP();
  return out;
}

/* ---------- saving ---------- */
function saveResult(pass) {
  const st = R.st, p = R.key;
  const bad = new Set(st.mistakes.flatMap(m => m.ks.map(k => st.words[k].g)));
  const ayat = [...new Set(st.words.map(w => w.g))];
  const h = Q.hifz();
  if (pass) {
    ayat.forEach(g => Q.rateAyah(g, bad.has(g) ? 1 : 2));
    const next = Math.min(...ayat.map(g => h.items[g]?.d || Infinity));
    const days = Math.round((next - new Date().setHours(0, 0, 0, 0)) / 86400000);
    R.when = days <= 1 ? 'بكرة' : days === 2 ? 'بعد يومين' : `بعد ${days} أيام`;
  } else {
    ayat.filter(g => bad.has(g) && h.items[g]).forEach(g => Q.rateAyah(g, 0));
  }
  const recs = records(), old = recs[p];
  const m = st.mistakes.length;
  recs[p] = { pass: pass || !!old?.pass, last: pass, m, best: Math.min(m, old?.best ?? 99), n: (old?.n || 0) + 1, t: Date.now() };
  store.save();
}

/* ---------- result ---------- */
function resultHTML(p) {
  const I = ctx.I, st = R.st, n = st.mistakes.length;
  const wordsN = st.words.filter(w => !w.skip).length;
  const acc = Math.max(0, Math.round((1 - n / wordsN) * 100));
  const list = st.mistakes.map(m => {
    const ws = m.ks.map(k => st.words[k]);
    const why = m.kind === 'skip' ? 'نسيت' : m.kind === 'hint' ? 'تلميح' : `<s>${ctx.esc(m.said || '')}</s>`;
    return `<div class="rc-mi"><span>الآية ${ws[0].a} · ${why}</span><q>${ws.map(w => w.t).join(' ')}</q></div>`;
  }).join('');
  const firstBad = st.mistakes[0] ? st.words[st.mistakes[0].ks[0]] : st.words[0];
  return `
  <header class="title-bar"><a class="icon-btn" href="#/recite" aria-label="رجوع">${I.back}</a><h1>نتيجة التسميع</h1></header>
  <main class="pad rc-res" data-el="result">
    <div class="rc-medal ${R.pass ? '' : 'fail'}">${R.pass ? I.check.replace('<svg', '<svg width="56" height="56"') : I.reset.replace('<svg', '<svg width="50" height="50"')}</div>
    <h2>${R.pass ? 'ما شاء الله، حفظت الصفحة!' : 'محتاجة شوية مراجعة'}</h2>
    <p class="muted">${R.pass
      ? `صفحة ${p} صارت ضمن محفوظاتك،<br>وأول مراجعة إلها ${R.when} إن شاء الله.`
      : `وصلت ${n} أخطاء والحد ${MAX}.<br>احفظ المواضع اللي تحت وجرّب كمان مرة.`}</p>
    <div class="rc-score">
      <div><b class="${n ? 'bad' : ''}">${n}</b><small>أخطاء من ${MAX}</small></div>
      <div><b>${acc}%</b><small>دقة</small></div>
      <div><b>${mmss(R.spent)}</b><small>دقيقة</small></div>
    </div>
    ${n ? `<div class="rc-mlist"><span class="t">راجع هالمواضع:</span>${list}</div>` : `<p class="rc-perfect">ولا غلطة! بارك الله فيك</p>`}
    <div class="rc-btns">
      <button class="btn ghost" data-act="again">أعد الصفحة</button>
      ${R.pass
        ? (p < 604 ? `<a class="btn" href="#/recite?p=${p + 1}">الصفحة ${p + 1} ←</a>` : `<a class="btn" href="#/quran">زاوية التحفيظ</a>`)
        : `<a class="btn" href="#/learn?s=${firstBad.s}&a=${firstBad.a}&next=seqlearn">احفظ الصفحة</a>`}
    </div>
  </main>`;
}
function mountResult(root) {
  root.querySelector('[data-act="again"]').addEventListener('click', () => { reset(R.key); ctx.render(); window.scrollTo(0, 0); });
  if (R.pass) {
    const medal = root.querySelector('.rc-medal');
    setTimeout(() => { try { FX.burstAt(medal, { n: 40, power: 8 }); } catch (e) {} }, 250);
    ctx.vibrate([30, 40, 30, 40, 60]);
  }
}

/* ---------- page picker ---------- */
function pickerHTML() {
  const I = ctx.I, sug = suggestPage();
  const recs = Object.entries(records()).map(([p, r]) => ({ p: +p, ...r })).sort((a, b) => b.t - a.t).slice(0, 8);
  const firstOf = p => Q.surahAyah(PAGES[p - 1]);
  const opts = Array.from({ length: 114 }, (_, i) => `<option value="${i + 1}">${i + 1}. ${Q.surahMeta(i + 1).name}</option>`).join('');
  const f = firstOf(sug);
  return `
  <header class="title-bar"><a class="icon-btn" href="#/quran" aria-label="رجوع">${I.back}</a><h1>التسميع الحي</h1></header>
  <main class="pad stack" style="margin-top:12px" data-el="picker">
    <section class="card raised stack rc-intro">
      <div class="row" style="gap:12px"><span class="now-icon">${I.mic}</span>
        <div style="flex:1"><b style="font-size:16px">سمّع صفحة من حفظك</b>
        <span class="muted" style="display:block;font-size:13px;line-height:1.7">بتقرأ والتطبيق بيكتب وراك. إذا غلطت بينبّهك وبيطلّعلك الصح، والصفحة بتنحسب محفوظة إذا خلّصتها بـ${MAX} أخطاء أو أقل.</span></div></div>
      <a class="btn big" href="#/recite?p=${sug}&fresh=1">ابدأ الصفحة ${sug} <small style="font-weight:400;opacity:.8">· ${Q.surahMeta(f.s).name} ${f.a}</small></a>
    </section>
    <section class="card stack">
      <b style="font-size:15px">اختر صفحة</b>
      <div class="grid2">
        <div class="field"><label for="rp">رقم الصفحة</label><input id="rp" type="number" inputmode="numeric" min="1" max="604" value="${sug}"></div>
        <div class="field"><label for="rs">أو سورة</label><select id="rs"><option value="">—</option>${opts}</select></div>
      </div>
      <button class="btn outline" data-act="go">سمّع هالصفحة</button>
    </section>
    ${recs.length ? `<section class="card stack" style="gap:6px"><b style="font-size:15px">آخر تسميعاتك</b>
      ${recs.map(r => { const x = firstOf(r.p); return `<a class="rc-rec" href="#/recite?p=${r.p}&fresh=1">
        <span class="w-ic ${r.last ? 'ok' : ''}">${r.last ? I.check : I.reset}</span>
        <span class="w-tx"><b>صفحة ${r.p}</b><span>${Q.surahMeta(x.s).name} · ${r.last ? 'محفوظة' : 'بدها مراجعة'} · أخطاء ${r.m}</span></span>
        ${I.left.replace('<svg', '<svg width="18" height="18"')}</a>`; }).join('')}
    </section>` : ''}
    <p class="muted" style="font-size:12px;text-align:center;margin:0;line-height:1.8">التعرّف على الصوت بيمسك الكلمات، مش أخطاء التشكيل والتجويد.<br>بحتاج إنترنت وإذن المايك.</p>
  </main>`;
}
function mountPicker(root) {
  const rp = root.querySelector('#rp'), rs = root.querySelector('#rs');
  rs.addEventListener('change', () => { if (rs.value) rp.value = pageOf(Q.surahMeta(+rs.value).start); });
  root.querySelector('[data-act="go"]').addEventListener('click', () => {
    const p = Math.round(+rp.value);
    if (!(p >= 1 && p <= 604)) return ctx.toast('اكتب رقم صفحة من 1 لـ 604');
    location.hash = `#/recite?p=${p}&fresh=1`;
  });
}
