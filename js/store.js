// Local persistence (localStorage, with in-memory fallback)
const KEY = 'adhkari-v1';
const DEFAULT_LOC = { lat: 31.42, lng: 34.35, label: 'غزة (افتراضي)', auto: false };

const defaults = () => ({
  days: {},                       // 'YYYY-MM-DD' -> { t, i, m:{id:n}, e:{id:n}, md, ed }
  tasbeeh: { sel: 'istighfar', ti: 0, count: 0 },
  settings: { khushu: false, vibrate: true, fs: 1, name: '', loc: null },
  best: 0,                        // longest streak
  circle: null                    // { code, pending, mine:{date:n} }
});

let state = defaults();
let memoryOnly = false;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaults();
      state = { ...d, ...s, tasbeeh: { ...d.tasbeeh, ...s.tasbeeh }, settings: { ...d.settings, ...s.settings } };
    }
  } catch (e) { memoryOnly = true; }
  return state;
}

export function save() {
  if (memoryOnly) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { memoryOnly = true; }
}

export const get = () => state;
export const loc = () => state.settings.loc || DEFAULT_LOC;

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function day(key = dateKey()) {
  if (!state.days[key]) state.days[key] = { t: 0, i: 0, m: {}, e: {}, md: false, ed: false };
  return state.days[key];
}

export function activity(key) {
  const d = state.days[key];
  if (!d) return 0;
  const adhkarTaps = Object.values(d.m).reduce((a, b) => a + b, 0) + Object.values(d.e).reduce((a, b) => a + b, 0);
  return d.t + adhkarTaps;
}

export const isActive = key => activity(key) > 0;

export function streak() {
  const now = new Date();
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!isActive(dateKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (isActive(dateKey(cur))) { n++; cur.setDate(cur.getDate() - 1); }
  if (n > state.best) { state.best = n; save(); }
  return n;
}

export function resetAll() {
  // mutate in place so references held elsewhere stay valid
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, defaults());
  save();
}
