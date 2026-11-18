// نسخة احتياطية — move all local progress between installs (e.g. before re-adding the app to the home screen)
import * as store from './store.js';

const KEY = 'adhkari-v1';
const PREFIX = 'ADHKARI1:';   // gzip + base64
const PLAIN = 'ADHKARI0:';    // base64 only (old browsers)

const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));

async function gzip(text) {
  const cs = new CompressionStream('gzip');
  const out = new Response(new Blob([text]).stream().pipeThrough(cs));
  return new Uint8Array(await out.arrayBuffer());
}
async function gunzip(bytes) {
  const ds = new DecompressionStream('gzip');
  return new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}

export async function makeCode() {
  store.save();
  const json = localStorage.getItem(KEY) || JSON.stringify(store.get());
  if (typeof CompressionStream !== 'undefined') {
    try { return PREFIX + b64(await gzip(json)); } catch (e) {}
  }
  return PLAIN + b64(new TextEncoder().encode(json));
}

export async function readCode(text) {
  const t = (text || '').trim().replace(/\s+/g, '');
  let json;
  if (t.startsWith(PREFIX)) json = await gunzip(unb64(t.slice(PREFIX.length)));
  else if (t.startsWith(PLAIN)) json = new TextDecoder().decode(unb64(t.slice(PLAIN.length)));
  else if (t.startsWith('{')) json = text;
  else throw new Error('format');
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !('days' in data || 'hifz' in data || 'settings' in data)) throw new Error('format');
  return data;
}

export function summary(d) {
  const days = Object.keys(d.days || {}).length;
  const hifz = Object.keys((d.hifz && d.hifz.items) || {}).length;
  let tasbeeh = 0; for (const k in d.days || {}) tasbeeh += (d.days[k].t || 0);
  return { days, hifz, tasbeeh };
}

export function restore(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  location.hash = '#/stats';
  location.reload();
}

export function fileName() {
  const d = new Date();
  return `adhkari-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.txt`;
}
