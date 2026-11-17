// Group istighfar circles — Firebase (anonymous auth + Firestore).
// Individual counts are never stored in the cloud: only the circle total and each member's last active day.
import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';

const V = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

let fb = null;          // { db, auth, uid, fs }
let initPromise = null;
let flushTimer = null;
let unsubs = [];

export const isConfigured = () => !!(firebaseConfig && firebaseConfig.projectId);
export const CDN_URL = CDN;

export function init() {
  if (!isConfigured()) return Promise.reject(new Error('not-configured'));
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const [{ initializeApp }, authMod, fs] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-firestore.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    let db;
    try {
      db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
    } catch (e) {
      db = fs.getFirestore(app);
    }
    const auth = authMod.getAuth(app);
    const user = auth.currentUser || (await new Promise(res => {
      const off = authMod.onAuthStateChanged(auth, u => { if (u) { off(); res(u); } });
      authMod.signInAnonymously(auth).catch(() => {});
    }));
    fb = { db, auth, uid: user.uid, fs, app };
    startFlushLoop();
    return fb;
  })();
  initPromise.catch(() => { initPromise = null; });
  return initPromise;
}

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

export async function createCircle({ name, goal, days, displayName }) {
  const { db, fs, uid } = await init();
  let code, tries = 0;
  do {
    code = newCode();
    const snap = await fs.getDoc(fs.doc(db, 'circles', code));
    if (!snap.exists()) break;
  } while (++tries < 5);
  const endsAt = fs.Timestamp.fromDate(new Date(Date.now() + days * 86400000));
  await fs.setDoc(fs.doc(db, 'circles', code), {
    name, goal, total: 0, owner: uid, createdAt: fs.serverTimestamp(), endsAt
  });
  await joinCircle(code, displayName);
  return code;
}

export async function joinCircle(code, displayName) {
  code = code.trim().toUpperCase();
  const { db, fs, uid } = await init();
  const snap = await fs.getDoc(fs.doc(db, 'circles', code));
  if (!snap.exists()) throw new Error('not-found');
  await fs.setDoc(fs.doc(db, 'circles', code, 'members', uid), {
    name: displayName, joinedAt: fs.serverTimestamp(), lastActive: ''
  }, { merge: true });
  const s = store.get();
  s.circle = { code, pending: 0, mine: {} };
  store.save();
  return code;
}

export async function leaveCircle() {
  const s = store.get();
  if (!s.circle) return;
  const code = s.circle.code;
  stopWatching();
  s.circle = null;
  store.save();
  try {
    const { db, fs, uid } = await init();
    await fs.deleteDoc(fs.doc(db, 'circles', code, 'members', uid));
  } catch (e) { /* offline: ignore */ }
}

/** Live updates: cb({ circle, members, uid }) */
export async function watch(cb, onError) {
  stopWatching();
  const s = store.get();
  if (!s.circle) return;
  const { db, fs, uid } = await init();
  let circle = null, members = [];
  const emit = () => cb({ circle, members, uid });
  unsubs.push(fs.onSnapshot(fs.doc(db, 'circles', s.circle.code), snap => {
    circle = snap.exists() ? snap.data() : null; emit();
  }, onError));
  unsubs.push(fs.onSnapshot(fs.query(fs.collection(db, 'circles', s.circle.code, 'members'), fs.limit(100)), snap => {
    members = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit();
  }, onError));
}

export function stopWatching() {
  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = [];
}

/** Count istighfar toward the circle (batched). */
export function add(n = 1) {
  const s = store.get();
  if (!s.circle) return;
  s.circle.pending = (s.circle.pending || 0) + n;
  const k = store.dateKey();
  s.circle.mine = s.circle.mine || {};
  s.circle.mine[k] = (s.circle.mine[k] || 0) + n;
  store.save();
}

export async function flush() {
  const s = store.get();
  if (!s.circle || !s.circle.pending || !isConfigured()) return;
  const n = Math.min(s.circle.pending, 2000);
  try {
    const { db, fs, uid } = await init();
    const b = fs.writeBatch(db);
    b.update(fs.doc(db, 'circles', s.circle.code), { total: fs.increment(n) });
    b.set(fs.doc(db, 'circles', s.circle.code, 'members', uid), { lastActive: store.dateKey() }, { merge: true });
    s.circle.pending -= n;   // the write is queued locally by Firestore even when offline
    store.save();
    await b.commit();
  } catch (e) {
    console.warn('circle flush failed', e);
  }
}

function startFlushLoop() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
