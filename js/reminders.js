// reminders.js — real push reminders (Firebase Cloud Messaging + a scheduled sender in GitHub Actions)
import * as store from './store.js';
import * as circle from './challenge.js';
import { vapidKey } from './firebase-config.js';

let ctx = null; // { I, toast, render }
export function initReminders(c) { ctx = c; }

export const TYPES = [
  { id: 'morning', name: 'أذكار الصباح', desc: 'بعد الفجر بنصف ساعة' },
  { id: 'evening', name: 'أذكار المساء', desc: 'بعد العصر بنصف ساعة' },
  { id: 'sleep', name: 'أذكار النوم', desc: 'بعد العشاء بساعتين' },
  { id: 'hifz', name: 'ورد القرآن', desc: 'بعد المغرب بساعة' },
  { id: 'prayer', name: 'أوقات الصلاة', desc: 'عند دخول وقت كل صلاة' }
];

const supported = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
export const ready = () => circle.isConfigured() && !!vapidKey;
const R = () => { const s = store.get(); s.rem = s.rem || { on: false, prefs: { morning: true, evening: true, sleep: false, hifz: true, prayer: false } }; return s.rem; };

async function save(extra = {}) {
  const fb = await circle.init();
  const L = store.loc(), st = store.get().settings;
  await fb.fs.setDoc(fb.fs.doc(fb.db, 'reminders', fb.uid), {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    lat: L.lat, lng: L.lng, method: st.method || 'mwl', asr: st.asrMethod || 'std',
    prefs: R().prefs, updatedAt: Date.now(), ...extra
  }, { merge: true });
}

export async function enable() {
  if (!supported()) { ctx.toast('جهازك لا يدعم الإشعارات من المتصفح — ثبّت التطبيق على الشاشة الرئيسية أولاً'); return false; }
  if (!ready()) { ctx.toast('التذكيرات بحاجة لربط Firebase أولاً'); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { ctx.toast('لازم تسمح بالإشعارات'); return false; }
  try {
    const fb = await circle.init();
    const { getMessaging, getToken } = await import(`${circle.CDN_URL}/firebase-messaging.js`);
    const reg = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(fb.app), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) throw new Error('no-token');
    await save({ token });
    R().on = true; store.save();
    ctx.toast('تم تفعيل التذكيرات ✓');
    return true;
  } catch (e) {
    console.warn(e);
    ctx.toast('تعذّر تفعيل التذكيرات — تأكد من الإنترنت');
    return false;
  }
}

export async function disable() {
  R().on = false; store.save();
  try { const fb = await circle.init(); await fb.fs.deleteDoc(fb.fs.doc(fb.db, 'reminders', fb.uid)); } catch (e) {}
  ctx.toast('تم إيقاف التذكيرات');
}

export async function setPref(id, val) {
  R().prefs[id] = val; store.save();
  if (R().on) { try { await save(); } catch (e) { ctx.toast('رح تنحفظ لما يرجع الإنترنت'); } }
}

export function html() {
  const I = ctx.I, r = R();
  if (!ready()) {
    return `<section class="card stack" style="gap:8px">
      <div class="row" style="gap:10px"><span class="now-icon">${I.bell}</span><b style="font-size:15px;flex:1">التذكيرات</b><span class="chip mute">غير مفعّلة</span></div>
      <span class="muted" style="font-size:13px;line-height:1.7">تذكيرات بأوقات الأذكار والصلاة والورد، بتوصلك حتى لو التطبيق مسكّر. بتشتغل بعد ربط التطبيق بـ Firebase (التفاصيل في ملف README).</span></section>`;
  }
  return `<section class="card" style="padding:4px 16px">
    <div class="setting"><span class="lbl">التذكيرات<small>${r.on ? 'مفعّلة على هذا الجهاز' : 'إشعارات حتى لو التطبيق مسكّر'}</small></span>
      <button class="btn ${r.on ? 'ghost' : ''} sm" data-act="rem">${r.on ? 'إيقاف' : 'تفعيل'}</button></div>
    ${r.on ? TYPES.map(t => `<div class="setting"><span class="lbl" id="rm-${t.id}">${t.name}<small>${t.desc}</small></span>
      <button class="switch" role="switch" aria-labelledby="rm-${t.id}" aria-checked="${!!r.prefs[t.id]}" data-rem="${t.id}"></button></div>`).join('') : ''}
  </section>`;
}

export function bind(root) {
  root.querySelector('[data-act="rem"]')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    if (R().on) await disable(); else await enable();
    ctx.render();
  });
  root.querySelectorAll('[data-rem]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.rem, v = !R().prefs[id];
    b.setAttribute('aria-checked', v); setPref(id, v);
  }));
}

/** keep server copy in sync when location / method change */
export function syncIfOn() { if (R().on && ready()) save().catch(() => {}); }
