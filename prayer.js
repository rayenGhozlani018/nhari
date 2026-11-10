/* Nhari — prayer time calculation (standard astronomical formulas).
   Works in UTC; formatting to the city's time zone is done by the app. */
(function (global) {
  "use strict";
  const DEG = Math.PI / 180;
  const sin = d => Math.sin(d * DEG), cos = d => Math.cos(d * DEG), tan = d => Math.tan(d * DEG);
  const asin = x => Math.asin(x) / DEG, acos = x => Math.acos(x) / DEG, atan2 = (y, x) => Math.atan2(y, x) / DEG;
  const acot = x => Math.atan(1 / x) / DEG;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixHour = h => fix(h, 24);

  const METHODS = {
    tunisia: { fajr: 18, isha: 18, label: { ar: "تونس (وزارة الشؤون الدينية)", fr: "Tunisie (Ministère)" } },
    mwl: { fajr: 18, isha: 17, label: { ar: "رابطة العالم الإسلامي", fr: "Ligue islamique mondiale" } },
    uoif: { fajr: 12, isha: 12, label: { ar: "فرنسا (12°)", fr: "France UOIF (12°)" } },
    france15: { fajr: 15, isha: 15, label: { ar: "فرنسا (15°)", fr: "France (15°)" } },
    makkah: { fajr: 18.5, ishaMin: 90, label: { ar: "أم القرى", fr: "Umm al-Qura" } },
    egypt: { fajr: 19.5, isha: 17.5, label: { ar: "الهيئة المصرية", fr: "Égypte" } }
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
    const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    const eqt = q / 15 - fixHour(RA);
    const decl = asin(sin(e) * sin(L));
    return { decl, eqt };
  }

  /** Compute prayer times (UTC hours) for a calendar date at lat/lng. */
  function computeUTC(y, m, d, lat, lng, methodKey, asrFactor) {
    const method = METHODS[methodKey] || METHODS.tunisia;
    const jDate = julian(y, m, d) - lng / (15 * 24);
    const midDay = t => fixHour(12 - sunPosition(jDate + t).eqt);
    const sunAngleTime = (angle, t, ccw) => {
      const decl = sunPosition(jDate + t).decl;
      const noon = midDay(t);
      const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
      return noon + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const decl = sunPosition(jDate + t).decl;
      const angle = -acot(factor + tan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t);
    };
    // initial guesses (fraction of day)
    let times = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
    for (let i = 0; i < 2; i++) {
      const p = {}; for (const k in times) p[k] = times[k] / 24;
      times = {
        fajr: sunAngleTime(method.fajr, p.fajr, true),
        sunrise: sunAngleTime(0.833, p.sunrise, true),
        dhuhr: midDay(p.dhuhr),
        asr: asrTime(asrFactor || 1, p.asr),
        maghrib: sunAngleTime(0.833, p.maghrib),
        isha: method.ishaMin ? null : sunAngleTime(method.isha, p.isha)
      };
      if (method.ishaMin) times.isha = times.maghrib + method.ishaMin / 60;
    }
    // high-latitude safety (angle-based portion of the night)
    const night = 24 - (times.sunrise > times.maghrib ? times.sunrise - times.maghrib : times.maghrib - times.sunrise + 0) ;
    const nightLen = fixHour(times.sunrise - times.maghrib);
    const fajrMax = method.fajr / 60 * nightLen;
    if (isNaN(times.fajr) || fixHour(times.sunrise - times.fajr) > fajrMax) times.fajr = times.sunrise - fajrMax;
    if (!method.ishaMin) {
      const ishaMax = method.isha / 60 * nightLen;
      if (isNaN(times.isha) || fixHour(times.isha - times.maghrib) > ishaMax) times.isha = times.maghrib + ishaMax;
    }
    void night;
    // convert local-solar to UTC
    const out = {};
    for (const k in times) out[k] = times[k] - lng / 15;
    out.dhuhr += 1 / 60; // 1 minute after zenith, as most calendars do
    return out;
  }

  /** Returns {fajr, sunrise, dhuhr, asr, maghrib, isha} as Date objects.
      dateParts = {y,m,d} in the city's calendar. adj = minutes per prayer. */
  function prayerTimes(dateParts, cfg) {
    const { y, m, d } = dateParts;
    const utc = computeUTC(y, m, d, cfg.lat, cfg.lng, cfg.method, cfg.asr);
    const base = Date.UTC(y, m - 1, d);
    const res = {};
    for (const k in utc) {
      const adj = (cfg.adj && cfg.adj[k]) || 0;
      // round to nearest minute
      const ms = base + utc[k] * 3600000 + adj * 60000;
      res[k] = new Date(Math.round(ms / 60000) * 60000);
    }
    // If the city is far east/west the UTC date could shift; app passes the city's local date, so this is fine.
    return res;
  }

  global.NhariPrayer = { prayerTimes, METHODS };
})(typeof window !== "undefined" ? window : globalThis);
