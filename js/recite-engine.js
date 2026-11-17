// Live recitation matcher — pure logic, no DOM (so it can be tested in node).
// Follows the reciter word by word against the expected Uthmani text and decides,
// conservatively, when something is really a mistake (wrong word / skipped words).

export const normAr = w => (w || '')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '')
  .replace(/[^ء-ي]/g, '');

function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
export function similar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length <= 2 && b.length <= 2) return false;
  return 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.6;
}

// isti'adha + basmala: said before a surah / at the start, not part of the page text
const IGNORE = 'اعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم'.split(' ').map(normAr);
const ignorable = h => IGNORE.some(x => similar(h, x));

// surahs that open with disconnected letters (spelled out when recited: "ألف لام ميم")
const MUQATTAAT = new Set([2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 50, 68]);

/** Build the word list for a range of global ayah indexes [from, to). */
export function buildWords(TEXT, from, to, sa) {
  const words = [];
  for (let g = from; g < to; g++) {
    const { s, a } = sa(g);
    const toks = TEXT[g].split(' ').filter(Boolean);
    toks.forEach((t, i) => {
      const n = normAr(t);
      words.push({
        t, n, g, s, a,
        first: i === 0, last: i === toks.length - 1,
        skip: !n,                                   // ۞ ۩ and other marks
        free: i === 0 && MUQATTAAT.has(s) && (a === 1 || (s === 42 && a === 2)),
        st: 0                                       // 0 hidden · 1 ok · 2 mistake
      });
    });
  }
  return words;
}

export function newState(words) {
  return { words, k: 0, used: 0, freeN: 0, mistakes: [], started: false, replay: -1 };
}

/** Split a raw transcript into parallel raw / normalized word arrays. */
export function heardWords(txt) {
  const raw = [], norm = [];
  for (const w of (txt || '').split(/\s+/)) { const n = normAr(w); if (n) { raw.push(w); norm.push(n); } }
  return { raw, norm };
}

/**
 * Advance the state with the current session transcript.
 * final=true means no more words are coming for now (silence / end) so the last
 * word may be judged. Returns { progressed, mistake, pending }.
 * Stops right after the first mistake so the UI can pause and show it.
 */
export function advance(st, heard, final = false) {
  const W = st.words, N = W.length, H = heard.norm;
  if (st.used > H.length) st.used = H.length;      // recognizer revised (shrank) its text
  let i = st.used, progressed = false;
  const ok = k => { W[k].st = 1; progressed = true; st.started = true; };
  const skipMarks = () => { while (st.k < N && W[st.k].skip) { ok(st.k); st.k++; } };
  skipMarks();
  while (i < H.length && st.k < N) {
    const k = st.k, E = W[k], h = H[i], nx = H[i + 1];
    const last = nx === undefined;
    // 0. disconnected letters are spelled out ("ألف لام ميم") — let them through
    if (E.free) {
      if (k + 1 < N && similar(h, W[k + 1].n)) { ok(k); st.k++; st.freeN = 0; continue; }
      if (st.freeN === 0 && E.first && (E.a === 1 || !st.started) && ignorable(h) && !similar(h, E.n)) { i++; continue; }
      i++; st.started = true;
      if (++st.freeN > 8) { ok(k); st.k++; st.freeN = 0; }
      continue;
    }
    // R. following a repeated passage (the reciter went back) until it catches up
    if (st.replay >= 0) {
      if (similar(h, W[st.replay].n)) { st.replay++; i++; if (st.replay >= k) st.replay = -1; continue; }
      st.replay = -1;
    }
    // 1. the expected word
    if (similar(h, E.n)) { ok(k); st.k++; i++; st.freeN = 0; skipMarks(); continue; }
    // 2. recognizer glued two words / split one word
    if (k + 1 < N && similar(h, E.n + W[k + 1].n)) { ok(k); ok(k + 1); st.k += 2; i++; skipMarks(); continue; }
    if (!last && similar(h + nx, E.n)) { ok(k); st.k++; i += 2; skipMarks(); continue; }
    // 4. isti'adha / basmala before a surah or at the very start
    if (E.first && (E.a === 1 || !st.started) && ignorable(h)) { i++; continue; }
    // 5. going back and repeating what was already recited (very common) — not a mistake
    if ((k > 0 && similar(h, W[k - 1].n)) || (k > 1 && similar(h, W[k - 2].n))) { i++; continue; }
    let back = -1, wait = false;
    for (let j = k - 3; j >= Math.max(0, k - 40); j--) {
      if (!similar(h, W[j].n)) continue;
      if (last) { if (!final) { wait = true; break; } back = j; break; }
      if (similar(nx, W[j + 1].n) || (j + 2 < k && similar(nx, W[j + 1].n + W[j + 2].n))) { back = j; break; }
    }
    if (back >= 0) { st.replay = back + 1; i++; continue; }
    if (wait && !E.free) { st.used = i; return { progressed, pending: true }; }
    // 6. a stray word that is immediately corrected
    if (!last && similar(nx, E.n)) { i++; continue; }
    // 7. skipped word(s): h matches a word a little further, confirmed by the next word
    let jump = 0;
    for (let j = 1; j <= 4 && k + j < N; j++) {
      if (!similar(h, W[k + j].n)) continue;
      const confirmed = last ? final : (k + j + 1 >= N || similar(nx, W[k + j + 1].n));
      if (confirmed) { jump = j; break; }
    }
    if (jump) {
      const ks = [];
      for (let x = k; x < k + jump; x++) { if (!W[x].skip) { W[x].st = 2; ks.push(x); } }
      st.k = k + jump; ok(st.k); st.k++; i++;
      st.used = i; st.replay = -1; skipMarks();
      const m = { kind: 'skip', ks, said: '' };
      st.mistakes.push(m);
      return { progressed: true, mistake: m };
    }
    // 8. not enough evidence yet — wait for the next word or for silence
    if (last && !final) { st.used = i; return { progressed, pending: true }; }
    // 9. wrong word
    W[k].st = 2; st.k++;
    const said = heard.raw.slice(i, i + 3).join(' ');
    st.used = i + 1; skipMarks();                  // the rest is taken by catchUp()
    const m = { kind: 'wrong', ks: [k], said };
    st.mistakes.push(m);
    return { progressed: true, mistake: m };
  }
  st.used = i;
  return { progressed };
}

/** The reciter asked for help: reveal the current word, counted as a mistake. */
export function hint(st) {
  const W = st.words;
  while (st.k < W.length && W[st.k].skip) { W[st.k].st = 1; st.k++; }
  if (st.k >= W.length) return null;
  W[st.k].st = 2;
  const m = { kind: 'hint', ks: [st.k], said: '' };
  st.k++;
  while (st.k < W.length && W[st.k].skip) { W[st.k].st = 1; st.k++; }
  st.mistakes.push(m);
  return m;
}

/** After a mistake: take in the words already said right after it, without judging. */
export function catchUp(st, heard) {
  const W = st.words, H = heard.norm;
  let i = st.used;
  while (i < H.length && st.k < W.length) {
    while (st.k < W.length && W[st.k].skip) { W[st.k].st = 1; st.k++; }
    if (st.k >= W.length || !similar(H[i], W[st.k].n)) break;
    W[st.k].st = 1; st.k++; i++;
  }
  st.used = i; st.replay = -1;
}

export const done = st => st.k >= st.words.length;
