// بدون إنترنت — download recitations (per surah) and the mushaf fonts for offline use.
import * as store from './store.js';

export const AUDIO_CACHE = 'adhkari-audio';
const BR = [64, 128, 48];
export const audioUrl = (ed, g, br = 64) => `https://cdn.islamic.network/quran/audio/${br}/${ed}/${g + 1}.mp3`;

function O() {
  const s = store.get();
  s.offline = s.offline || {};
  s.offline.audio = s.offline.audio || {};   // { edition: { surah: bytes } }
  return s.offline;
}
export const savedSurahs = ed => Object.keys(O().audio[ed] || {}).map(Number);
export const isSaved = (ed, s) => !!(O().audio[ed] && O().audio[ed][s]);
export function savedSummary() {
  const a = O().audio; let n = 0, bytes = 0;
  for (const ed of Object.keys(a)) for (const s of Object.keys(a[ed])) { n++; bytes += a[ed][s] || 0; }
  return { surahs: n, bytes };
}
export const mb = b => b < 1048576 ? 'أقل من 1 ميغا' : `${(b / 1048576).toFixed(b < 10485760 ? 1 : 0)} ميغا`;

export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
}
export async function usage() {
  try { const e = await navigator.storage.estimate(); return { used: e.usage || 0, quota: e.quota || 0 }; } catch (e) { return null; }
}

/** Download every ayah of a surah. gids = [first, last] global ayah indexes. */
export async function downloadSurah(ed, s, gFrom, gTo, onProgress, signal) {
  await persist();
  const c = await caches.open(AUDIO_CACHE);
  const list = []; for (let g = gFrom; g <= gTo; g++) list.push(g);
  let done = 0, bytes = 0, failed = 0;
  const one = async g => {
    for (const br of BR) {
      if (signal && signal.aborted) return;
      const u = audioUrl(ed, g, br);
      const hit = await c.match(u);
      if (hit) { bytes += +(hit.headers.get('content-length') || 0); return; }
      try {
        const res = await fetch(u, { mode: 'cors' });
        if (!res.ok) continue;
        const blob = await res.blob();
        bytes += blob.size;
        await c.put(u, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } }));
        return;
      } catch (e) {
        if (e && e.name === 'QuotaExceededError') throw e;
      }
    }
    failed++;
  };
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');
      const g = list[i++];
      await one(g);
      onProgress && onProgress(++done, list.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (signal && signal.aborted) throw new DOMException('aborted', 'AbortError');
  if (failed === list.length) throw new Error('blocked');
  if (failed) throw new Error(`partial:${failed}`);
  O().audio[ed] = O().audio[ed] || {};
  O().audio[ed][s] = bytes;
  store.save();
  return bytes;
}

export async function removeSurah(ed, s, gFrom, gTo) {
  const c = await caches.open(AUDIO_CACHE);
  for (let g = gFrom; g <= gTo; g++) for (const br of [...BR, 192, 40, 32]) await c.delete(audioUrl(ed, g, br));
  if (O().audio[ed]) { delete O().audio[ed][s]; if (!Object.keys(O().audio[ed]).length) delete O().audio[ed]; }
  store.save();
}
export async function removeAllAudio() {
  try { await caches.delete(AUDIO_CACHE); } catch (e) {}
  O().audio = {}; store.save();
}
