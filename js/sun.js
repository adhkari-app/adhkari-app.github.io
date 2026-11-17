// Sun-based times (fajr, sunrise, dhuhr, asr, maghrib) — adapted from the PrayTimes.org algorithm.
const DEG = Math.PI / 180;
const sin = d => Math.sin(d * DEG), cos = d => Math.cos(d * DEG), tan = d => Math.tan(d * DEG);
const asin = x => Math.asin(x) / DEG, acos = x => Math.acos(x) / DEG, atan2 = (y, x) => Math.atan2(y, x) / DEG;
const acot = x => Math.atan(1 / x) / DEG;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

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

/**
 * Returns Date objects for the given day and location.
 * Fajr angle 18°, Asr = standard (shadow factor 1).
 */
export function sunTimes(date, lat, lng) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = julian(y, m, d) - lng / (15 * 24);
  const tz = -date.getTimezoneOffset() / 60;

  const midDay = t => fix(12 - sunPosition(jd + t).eqt, 24);
  const angleTime = (angle, t, ccw) => {
    const decl = sunPosition(jd + t).decl;
    const noon = midDay(t);
    const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = t => {
    const decl = sunPosition(jd + t).decl;
    return angleTime(-acot(1 + tan(Math.abs(lat - decl))), t);
  };

  const hours = {
    fajr: angleTime(18, 5 / 24, true),
    sunrise: angleTime(0.833, 6 / 24, true),
    dhuhr: midDay(12 / 24),
    asr: asrTime(13 / 24),
    maghrib: angleTime(0.833, 18 / 24)
  };

  const out = {};
  for (const k in hours) {
    let h = hours[k] + tz - lng / 15;
    if (!isFinite(h)) h = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 15, maghrib: 18 }[k];
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    dt.setTime(dt.getTime() + h * 3600 * 1000);
    out[k] = dt;
  }
  return out;
}

/**
 * Which adhkar period is active now.
 * morning: from fajr until dhuhr. evening: from asr until next fajr.
 * Between dhuhr and asr: none (next = evening).
 */
export function currentPeriod(now, lat, lng) {
  const t = sunTimes(now, lat, lng);
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
