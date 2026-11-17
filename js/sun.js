// Prayer & sun times — adapted from the PrayTimes.org algorithm.
const DEG = Math.PI / 180;
const sin = d => Math.sin(d * DEG), cos = d => Math.cos(d * DEG), tan = d => Math.tan(d * DEG);
const asin = x => Math.asin(x) / DEG, acos = x => Math.acos(x) / DEG, atan2 = (y, x) => Math.atan2(y, x) / DEG;
const acot = x => Math.atan(1 / x) / DEG;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

export const METHODS = {
  mwl: { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17 },
  egypt: { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
  umm: { name: 'أم القرى (مكة)', fajr: 18.5, ishaMin: 90 },
  karachi: { name: 'جامعة العلوم الإسلامية، كراتشي', fajr: 18, isha: 18 },
  isna: { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15 },
  jordan: { name: 'وزارة الأوقاف الأردنية', fajr: 18, isha: 18 }
};

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24);
  return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
}

/** Local clock hours (in the given tz) for one day. */
export function prayerHours(y, m, d, lat, lng, tz, opts = {}) {
  const M = METHODS[opts.method] || METHODS.mwl;
  const asrF = opts.asr === 'hanafi' ? 2 : 1;
  const jd = julian(y, m, d) - lng / (15 * 24);
  const midDay = t => fix(12 - sunPosition(jd + t).eqt, 24);
  const angleTime = (angle, t, ccw) => {
    const decl = sunPosition(jd + t).decl;
    const noon = midDay(t);
    const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = t => { const decl = sunPosition(jd + t).decl; return angleTime(-acot(asrF + tan(Math.abs(lat - decl))), t); };
  const h = {
    fajr: angleTime(M.fajr, 5 / 24, true),
    sunrise: angleTime(0.833, 6 / 24, true),
    dhuhr: midDay(12 / 24),
    asr: asrTime(13 / 24),
    maghrib: angleTime(0.833, 18 / 24)
  };
  h.isha = M.ishaMin ? h.maghrib + M.ishaMin / 60 : angleTime(M.isha, 18 / 24);
  const fallback = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 15, maghrib: 18, isha: 19.5 };
  const adj = opts.adjust || {};
  for (const k in h) {
    let v = h[k] + tz - lng / 15;
    if (!isFinite(v)) v = fallback[k];
    if (k === 'dhuhr') v += 1 / 60;            // safety minute after zawal
    h[k] = v + (adj[k] || 0) / 60;
  }
  return h;
}

/** Date objects in the device's own timezone. */
export function sunTimes(date, lat, lng, opts = {}) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const tz = -date.getTimezoneOffset() / 60;
  const h = prayerHours(y, m, d, lat, lng, tz, opts);
  const out = {};
  for (const k in h) {
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    dt.setTime(dt.getTime() + h[k] * 3600 * 1000);
    out[k] = dt;
  }
  return out;
}

/** UTC epoch ms for a given local date in a fixed tz offset (used by the reminder sender). */
export function sunTimesUTC(y, m, d, lat, lng, tz, opts = {}) {
  const h = prayerHours(y, m, d, lat, lng, tz, opts);
  const base = Date.UTC(y, m - 1, d);
  const out = {};
  for (const k in h) out[k] = base + (h[k] - tz) * 3600 * 1000;
  return out;
}

/**
 * Which adhkar period is active now.
 * morning: from fajr until dhuhr. evening: from asr until next fajr.
 */
export function currentPeriod(now, lat, lng, opts) {
  const t = sunTimes(now, lat, lng, opts);
  if (now >= t.fajr && now < t.dhuhr) return { period: 'morning', active: true, times: t };
  if (now >= t.asr || now < t.fajr) return { period: 'evening', active: true, times: t };
  return { period: 'evening', active: false, times: t };
}

export function fmtTime(d) {
  let h = d.getHours(), m = d.getMinutes();
  const suffix = h < 12 ? 'ص' : 'م';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

/* Qibla bearing from true north */
const KAABA = { lat: 21.4225, lng: 39.8262 };
export function qiblaBearing(lat, lng) {
  const p1 = lat * DEG, p2 = KAABA.lat * DEG, dl = (KAABA.lng - lng) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}
export function distanceToKaaba(lat, lng) {
  const R = 6371, p1 = lat * DEG, p2 = KAABA.lat * DEG, dp = (KAABA.lat - lat) * DEG, dl = (KAABA.lng - lng) * DEG;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
