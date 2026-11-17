// Runs every 15 minutes in GitHub Actions. Sends due reminders through Firebase Cloud Messaging.
// Secret needed: FIREBASE_SERVICE_ACCOUNT (the full JSON of a service-account key).
import admin from 'firebase-admin';
import { sunTimesUTC } from '../js/sun.js';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.log('No FIREBASE_SERVICE_ACCOUNT secret — skipping.'); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const APP_URL = process.env.APP_URL || '';
const now = Date.now();
const WINDOW = 45 * 60 * 1000;   // GitHub cron can be late; still send if within 45 min
const MIN = 60 * 1000;
const PN = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };

function tzOffsetHours(tz, at) {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const p = Object.fromEntries(f.formatToParts(new Date(at)).map(x => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at) / 3600000;
  } catch (e) { return 0; }
}

const snap = await db.collection('reminders').get();
let sent = 0;

if (process.env.TEST === 'true') {
  for (const doc of snap.docs) {
    const r = doc.data(); if (!r.token) continue;
    try {
      await admin.messaging().send({ token: r.token, data: { title: 'أذكاري ✓', body: 'التذكيرات شغّالة — بارك الله فيك', link: '#/home', tag: 'test' }, webpush: { headers: { Urgency: 'high', TTL: '600' } } });
      sent++;
    } catch (err) { console.warn(doc.id, err.code || err.message); }
  }
  console.log(`TEST: ${snap.size} devices, sent ${sent}`);
  process.exit(0);
}
for (const doc of snap.docs) {
  const r = doc.data();
  if (!r.token || !r.prefs) continue;
  const tz = tzOffsetHours(r.tz, now);
  const local = new Date(now + tz * 3600000);
  const y = local.getUTCFullYear(), m = local.getUTCMonth() + 1, d = local.getUTCDate();
  const day = `${y}-${m}-${d}`;
  const t = sunTimesUTC(y, m, d, r.lat, r.lng, tz, { method: r.method, asr: r.asr });
  const ev = [];
  if (r.prefs.morning) ev.push({ id: 'morning', at: t.fajr + 30 * MIN, title: 'أذكار الصباح', body: 'حان وقت أذكار الصباح — حصّن يومك بذكر الله', link: '#/adhkar?p=morning' });
  if (r.prefs.evening) ev.push({ id: 'evening', at: t.asr + 30 * MIN, title: 'أذكار المساء', body: 'حان وقت أذكار المساء', link: '#/adhkar?p=evening' });
  if (r.prefs.sleep) ev.push({ id: 'sleep', at: t.isha + 120 * MIN, title: 'أذكار النوم', body: 'لا تنم قبل أن تقرأ أذكار النوم', link: '#/dua?c=sleep' });
  if (r.prefs.hifz) ev.push({ id: 'hifz', at: t.maghrib + 60 * MIN, title: 'وردك من القرآن', body: 'خصص دقائق لحفظك ومراجعتك اليوم', link: '#/quran' });
  if (r.prefs.prayer) for (const k of Object.keys(PN)) ev.push({ id: 'p_' + k, at: t[k], title: `حان وقت صلاة ${PN[k]}`, body: '«أرحنا بها يا بلال»', link: '#/prayer' });
  const last = r.last || {};
  let changed = false;
  for (const e of ev) {
    if (now >= e.at && now - e.at < WINDOW && last[e.id] !== day) {
      try {
        await admin.messaging().send({
          token: r.token,
          data: { title: e.title, body: e.body, link: e.link, tag: e.id },
          webpush: { headers: { Urgency: 'high', TTL: '1800' }, fcmOptions: APP_URL ? { link: APP_URL + e.link } : undefined }
        });
        last[e.id] = day; changed = true; sent++;
      } catch (err) {
        if (String(err.code).includes('registration-token-not-registered') || String(err.code).includes('invalid-argument')) { await doc.ref.delete(); break; }
        console.warn(doc.id, err.code || err.message);
      }
    }
  }
  if (changed) await doc.ref.set({ last }, { merge: true });
}
console.log(`checked ${snap.size} devices, sent ${sent}`);
