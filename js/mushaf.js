// المصحف الحقيقي — Madinah mushaf pages (KFGQPC QCF v4, 1441H) rendered exactly as printed.
// Layout data: quran-qcf4 (MIT). Fonts: © King Fahd Glorious Qur'an Printing Complex, loaded from
// the jsDelivr mirror of the quran-qcf4 package (not redistributed here), cached for offline use.

const PKG = 'https://cdn.jsdelivr.net/npm/quran-qcf4@1.1.0/fonts-woff2/';
export const FONT_URL = n => `${PKG}QCF4_Hafs_${String(n).padStart(2, '0')}_W.woff2`;
export const HEADER_FONT_URL = `${PKG}QCF4_QBSML.woff2`;
export const ALL_FONT_URLS = () => [...Array.from({ length: 47 }, (_, i) => FONT_URL(i + 1)), HEADER_FONT_URL];
export const MUSHAF_CACHE = 'adhkari-mushaf';

let DATA = null, MAP = null, WIDTH = null, loading = null;
export function ensureMushaf() {
  if (DATA) return Promise.resolve();
  if (!loading) loading = Promise.all([
    fetch('data/mushaf-qcf4.json').then(r => r.json()),
    fetch('data/mushaf-qcf4-map.json').then(r => r.json()),
    fetch('data/mushaf-qcf4-w.json').then(r => r.json()).catch(() => null)
  ]).then(([d, m, w]) => { DATA = d; MAP = m; WIDTH = w; }).catch(e => { loading = null; throw e; });
  return loading;
}
export const mushafReady = () => !!DATA;

/* ---------- fonts ---------- */
const fontP = {};
function loadFace(name, url) {
  if (!fontP[name]) {
    const ff = new FontFace(name, `url(${url}) format("woff2")`, { display: 'block' });
    fontP[name] = ff.load().then(f => { document.fonts.add(f); return true; })
      .catch(e => { delete fontP[name]; throw e; });
  }
  return fontP[name];
}
export function fontsFor(p) {
  const pg = DATA[p - 1], need = [loadFace(`qcf${pg.f}`, FONT_URL(pg.f))];
  if (pg.l.some(l => l.b)) need.push(loadFace('qcf1', FONT_URL(1)));
  if (pg.l.some(l => l.h)) need.push(loadFace('qcfH', HEADER_FONT_URL));
  return Promise.all(need);
}
export const fontsLoaded = p => {
  const pg = DATA[p - 1];
  return !!(fontP[`qcf${pg.f}`] && document.fonts.check(`20px qcf${pg.f}`));
};

/* ---------- page model ---------- */
/** Glyphs of a page with their verse and kind. kind: w word · e verse end · q rub el hizb */
export function pageGlyphs(p) {
  const out = [];
  DATA[p - 1].l.forEach((L, li) => {
    if (!L.w) return;
    let r = 0, left = L.v[0][1];
    for (let i = 0; i < L.w.length; i++) {
      if (left === 0) { r++; left = L.v[r][1]; }
      out.push({ ch: L.w[i], kind: L.t[i], g: L.v[r][0], line: li });
      left--;
    }
  });
  return out;
}

/** Map a verse's text tokens (non-empty) to the indexes of its QCF word glyphs. */
export function tokenGlyphs(g, nTokens) {
  if (MAP[g]) return MAP[g];
  return Array.from({ length: nTokens }, (_, i) => [i]);
}

/**
 * Render a page. Every glyph is a span.mw with data-g (global ayah index),
 * data-k (index among the page glyphs) and data-kind.
 */
export function pageHTML(p, { surahName = s => '', arNum = n => n } = {}) {
  const pg = DATA[p - 1];
  let k = 0;
  const lines = pg.l.map(L => {
    if (L.h) return `<div class="ml ml-h"><span class="mh" aria-label="سورة ${surahName(L.h)}">${String.fromCharCode(L.c)}</span></div>`;
    if (L.b) return `<div class="ml ml-b"><span class="mb" aria-label="بسم الله الرحمن الرحيم">${String.fromCharCode(L.b)}</span></div>`;
    let r = 0, left = L.v[0][1], html = '';
    for (let i = 0; i < L.w.length; i++) {
      if (left === 0) { r++; left = L.v[r][1]; }
      html += `<span class="mw" data-k="${k++}" data-g="${L.v[r][0]}" data-kind="${L.t[i]}">${L.w[i]}</span>`;
      left--;
    }
    return `<div class="ml">${html}</div>`;
  }).join('');
  return `<div class="mpage ${p <= 2 ? 'center' : ''}" data-p="${p}" style="--qf:qcf${pg.f}">${lines}</div>`;
}

/** Scale the page so the longest line fills the width exactly (call after fonts load).
 *  Uses widths pre-measured for every page (same font metrics on every browser), so it does
 *  not depend on when Safari finishes laying out the font; then checks nothing overflows. */
export function fitPage(el) {
  if (!el) return;
  const w = el.clientWidth, p = +el.dataset.p;
  if (!w) return;
  let fs;
  if (WIDTH && WIDTH[p - 1]) fs = 100 * w / WIDTH[p - 1];
  else {
    el.style.setProperty('--mfs', '100px');
    let max = 0;
    el.querySelectorAll('.ml:not(.ml-h):not(.ml-b)').forEach(line => {
      let sum = 0; line.querySelectorAll('.mw').forEach(s => { sum += s.getBoundingClientRect().width; });
      if (sum > max) max = sum;
    });
    if (!max) return;
    fs = 100 * w / max;
  }
  fs = Math.min(fs, 46) * 0.985;
  el.style.setProperty('--mfs', `${fs.toFixed(2)}px`);
  // safety net: if any line still overflows, shrink to fit
  let worst = 1;
  el.querySelectorAll('.ml').forEach(line => { if (line.scrollWidth > line.clientWidth + 1) worst = Math.min(worst, line.clientWidth / line.scrollWidth); });
  if (worst < 1) el.style.setProperty('--mfs', `${(fs * worst * 0.99).toFixed(2)}px`);
}

/* ---------- offline download of the whole mushaf (fonts) ---------- */
export async function cachedFontCount() {
  try { const c = await caches.open(MUSHAF_CACHE); return (await c.keys()).length; } catch (e) { return 0; }
}
export async function downloadAll(onProgress, signal) {
  const c = await caches.open(MUSHAF_CACHE);
  const urls = ALL_FONT_URLS();
  let done = 0;
  for (const u of urls) {
    if (signal && signal.aborted) throw new Error('aborted');
    if (!(await c.match(u))) {
      const res = await fetch(u, { mode: 'cors' });
      if (!res.ok) throw new Error('http ' + res.status);
      await c.put(u, res);
    }
    onProgress && onProgress(++done, urls.length);
  }
}
export async function removeAll() { try { await caches.delete(MUSHAF_CACHE); } catch (e) {} }
