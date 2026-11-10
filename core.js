/* Nhari — core: language, utils, sync store, router, modal, toast, notifications. */
(function () {
  "use strict";
  const D = window.NhariData;

  /* ---------------- language ---------------- */
  const App = window.App = {
    lang: "ar", tab: "today", sub: {}, views: {}, acts: {}, forms: {}, changes: {}, events: [], ai: null, aiImages: false,
    deferRender: false, uiState: {}
  };
  const L = window.L = (ar, fr) => (App.lang === "fr" ? fr : ar);

  /* ---------------- utils ---------------- */
  const U = window.U = {
    esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
    id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    pad(n) { return String(n).padStart(2, "0"); },
    // All calendar math runs in the app's time zone (the city's, Africa/Tunis by default),
    // whatever time zone the device is set to.
    tz() { const s = Store.peek("settings"); return (s && s.tz) || "Africa/Tunis"; },
    P(d = new Date()) {
      const tz = U.tz(); let f = U._f[tz];
      if (!f) { try { f = U._f[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }); } catch (e) { f = U._f[tz] = new Intl.DateTimeFormat("en-US", { hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }); } }
      const o = {}; for (const p of f.formatToParts(d)) o[p.type] = p.value;
      return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday] };
    },
    _f: {},
    wall(y, m, d, h = 0, mi = 0) {
      const guess = Date.UTC(y, m - 1, d, h, mi);
      const off = (t) => { const p = U.P(new Date(t)); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(t / 60000) * 60000; };
      let t = guess - off(guess);
      const o2 = off(t); if (guess - o2 !== t) t = guess - o2;
      return new Date(t);
    },
    dow(d = new Date()) { return U.P(d).dow; },
    hour(d = new Date()) { return U.P(d).h; },
    dkey(d = new Date()) { const p = U.P(d); return p.y + "-" + U.pad(p.m) + "-" + U.pad(p.d); },
    mkey(d = new Date()) { const p = U.P(d); return p.y + "-" + U.pad(p.m); },
    prevMkey(d = new Date()) { const p = U.P(d); return p.m === 1 ? (p.y - 1) + "-12" : p.y + "-" + U.pad(p.m - 1); },
    parseD(k) { const [y, m, dd] = k.split("-").map(Number); return U.wall(y, m, dd, 0, 0); },
    addDays(d, n) { const p = U.P(d); return U.wall(p.y, p.m, p.d + n, p.h, p.mi); },
    atTime(hhmm, base = new Date()) { const [h, m] = String(hhmm || "00:00").split(":").map(Number); const p = U.P(base); return U.wall(p.y, p.m, p.d, h || 0, m || 0); },
    plusMin(d, min) { return new Date(d.getTime() + min * 60000); },
    localInput(d = new Date()) { const p = U.P(d); return p.y + "-" + U.pad(p.m) + "-" + U.pad(p.d) + "T" + U.pad(p.h) + ":" + U.pad(p.mi); },
    fromInput(str) { const m = String(str || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? U.wall(+m[1], +m[2], +m[3], +m[4], +m[5]) : new Date(); },
    hm(d, tz) {
      if (!(d instanceof Date) || isNaN(d)) return "--:--";
      try { return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz || U.tz() }); }
      catch (e) { return U.pad(d.getHours()) + ":" + U.pad(d.getMinutes()); }
    },
    hmNow() { return U.hm(new Date()); },
    fmt(d, opts) { try { return new Intl.DateTimeFormat(App.lang === "fr" ? "fr-FR" : "ar-TN-u-nu-latn", { timeZone: U.tz(), ...opts }).format(d); } catch (e) { return d.toDateString(); } },
    dateLong(d) { return U.fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); },
    dateShort(d) { return U.fmt(d, { weekday: "short", day: "numeric", month: "short" }); },
    weekday(d) { return U.fmt(d, { weekday: "short" }); },
    monthYear(d) { return U.fmt(d, { month: "long", year: "numeric" }); },
    hijri(d, adj = 0) {
      const x = U.addDays(d, adj);
      try { return new Intl.DateTimeFormat(App.lang === "fr" ? "fr-FR-u-ca-islamic-umalqura" : "ar-TN-u-ca-islamic-umalqura-nu-latn", { timeZone: U.tz(), day: "numeric", month: "long", year: "numeric" }).format(x); }
      catch (e) { return ""; }
    },
    dur(ms) {
      if (ms < 0) ms = 0;
      const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      return (h ? h + ":" : "") + U.pad(m) + ":" + U.pad(ss);
    },
    num(n, max = 2) { if (n == null || isNaN(n)) return "–"; return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: max }); },
    clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
    daysInMonth(d = new Date()) { const p = U.P(d); return new Date(Date.UTC(p.y, p.m, 0)).getUTCDate(); },
    sum(arr, f) { return arr.reduce((a, x) => a + (Number(f ? f(x) : x) || 0), 0); },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    ltr(s) { return "\u2066" + s + "\u2069"; },
    range(a, b) { return "\u2066" + U.hm(a) + "–" + U.hm(b) + "\u2069"; },
    // light markdown → safe HTML (headings, bullets, bold, code)
    md(s) {
      const lines = U.esc(s || "").split(/\r?\n/);
      let out = "", inList = false;
      const inline = t => t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
      for (const raw of lines) {
        const l = raw.trim();
        if (/^[-*•]\s+/.test(l)) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + inline(l.replace(/^[-*•]\s+/, "")) + "</li>"; continue; }
        if (inList) { out += "</ul>"; inList = false; }
        if (/^#{1,4}\s+/.test(l)) out += "<h4>" + inline(l.replace(/^#{1,4}\s+/, "")) + "</h4>";
        else if (l) out += "<p>" + inline(l) + "</p>";
      }
      if (inList) out += "</ul>";
      return out;
    }
  };

  /* money + glucose formatting */
  U.money = (n) => {
    const cur = (Store.peek("moneycfg") || {}).currency || "DT";
    const s = U.num(n, cur === "DT" ? 3 : 2);
    if (cur === "DT") return App.lang === "fr" ? U.ltr(s + " DT") : s + " د.ت";
    if (cur === "EUR") return App.lang === "fr" ? U.ltr(s + " €") : s + " €";
    return s + " " + cur;
  };
  U.bgUnit = () => (Store.doc("settings").glucose.unit || "gL");
  U.bgFmt = (mg) => {
    if (mg == null || isNaN(mg)) return "–";
    const u = U.bgUnit();
    if (u === "gL") return U.ltr(U.num(mg / 100, 2) + " g/L");
    if (u === "mmol") return U.ltr(U.num(mg / 18, 1) + " mmol/L");
    return U.ltr(Math.round(mg) + " mg/dL");
  };
  U.bgToMg = (v) => {
    const x = parseFloat(String(v).replace(",", "."));
    if (isNaN(x)) return NaN;
    const u = U.bgUnit();
    if (u === "gL") return x < 10 ? x * 100 : x;           // tolerate "120" typed in g/L mode
    if (u === "mmol") return x * 18;
    return x;
  };
  U.bgFromMg = (mg) => { const u = U.bgUnit(); if (u === "gL") return +(mg / 100).toFixed(2); if (u === "mmol") return +(mg / 18).toFixed(1); return Math.round(mg); };
  U.bgUnitLabel = () => ({ gL: "g/L", mmol: "mmol/L", mg: "mg/dL" }[U.bgUnit()]);
  U.bgState = (mg) => {
    const g = Store.doc("settings").glucose;
    if (mg < 54) return "bad";
    if (mg < (g.low || 70)) return "bad";
    if (mg > 250) return "bad";
    if (mg > (g.high || 180)) return "warn";
    return "good";
  };

  /* ---------------- icons ---------------- */
  const ic = (p, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
  window.I = {
    today: ic('<path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="4"/>'),
    money: ic('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>'),
    work: ic('<path d="M12 21v-9"/><path d="M8.5 8.5a5 5 0 0 1 7 0M6 6a8.5 8.5 0 0 1 12 0"/><circle cx="12" cy="11" r="1.3"/><path d="M8 21h8"/>'),
    health: ic('<path d="M12 21s-7.5-4.6-9.2-9.4C1.7 8.3 3.9 5 7.2 5c2 0 3.6 1.1 4.8 2.8C13.2 6.1 14.8 5 16.8 5c3.3 0 5.5 3.3 4.4 6.6C19.5 16.4 12 21 12 21z"/><path d="M6 12h3l1.5-2.5L13 15l1.5-3H18"/>'),
    food: ic('<circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="13" r="3"/><path d="M3 3v6M5 3v6M3 6h2M4 9v12M21 3c-1.5 1-2 3-2 5v4h2V3zM20 12v9"/>'),
    study: ic('<path d="M3 6.5 12 3l9 3.5-9 3.5z"/><path d="M7 8.3V13c0 1.7 2.2 3 5 3s5-1.3 5-3V8.3M21 6.5V12"/>'),
    deen: ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3.5l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z"/>'),
    prefs: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    trash: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    bell: ic('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    drop: ic('<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>'),
    syringe: ic('<path d="M18 2l4 4M20 4l-9.5 9.5M14 6l4 4M8.5 11.5l4 4M3 21l3.5-3.5M6 14l4 4-2.5 2.5-4-4z"/>'),
    run: ic('<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 3v3M6 12l3-4h5l2 4 3 1M11 15l-1-5"/>'),
    camera: ic('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    spark: ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    alert: ic('<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>'),
    book: ic('<path d="M4 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4zM20 4h-6a3 3 0 0 0-3 3"/><path d="M20 4v13.5h-6.5A2.5 2.5 0 0 0 11 20"/>'),
    link: ic('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
    play: ic('<path d="M7 4l13 8-13 8z"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    moon: ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    copy: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    target: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>')
  };

  /* ---------------- defaults ---------------- */
  const DEFAULTS = {
    settings: () => ({
      lang: "ar", name: "",
      profile: { sex: "m", age: 23, birth: "", weight: 72, height: 176, activity: "moderate", goal: "keep" },
      glucose: { unit: "gL", low: 70, high: 180 },
      doctor: { enabled: false, confirmed: false, icr: "", isf: "", target: "", dia: 4 },
      meals: { breakfast: "07:30", lunch: "13:00", snack: "16:30", dinner: "20:00" },
      city: "tunis", lat: 36.8065, lng: 10.1815, tz: "Africa/Tunis", method: "tunisia", asr: 1,
      adj: { fajr: 0, sunrise: 0, dhuhr: 5, asr: 0, maghrib: 2, isha: 0 }, hijriAdj: 0,
      study: { facName: "", facUrl: "", field: "", level: "", interests: "", dailyHours: 3, start: "17:30", sessionMin: 45, breakMin: 10 },
      sport: { level: "normal", week: U.clone(D.DEFAULT_WEEK), time: "18:30", mode: "gym" },
      quran: { direction: "back", dailyNew: 5, halaqa: { label: "", surah: 9, from: "", to: "" } },
      places: [], routine: {}, school: "",
      notify: { enabled: false, sound: true },
      seenDoctorTip: false
    }),
    moneycfg: () => ({
      currency: "DT", charges: [], savings: 150, personal: 300, salary: 0,
      workDays: [1, 2, 3, 4, 5, 6], maxHours: 8, hourly: "", offDays: {}
    }),
    sport: () => ({ done: {}, log: {}, creatine: {} }),
    workcfg: () => ({ ops: { orange: { name: "Orange", price: 20, fuel: "op", mat: "op", matCost: 0 }, ooredoo: { name: "Ooredoo", price: 20, fuel: "op", mat: "me", matCost: 0 } }, installMin: 60, speed: 30, cons: 7, fuelPrice: 2.2, startFrom: "home" }),
    work: () => ({ tickets: [] }),
    car: () => ({ km: 0, kmDate: "", items: [], fuel: [] }),
    medical: () => ({ checks: [], stock: [], hypo: null, sleep: {} }),
    review: () => ({ days: {}, carry: [] }),
    discover: () => ({ st: {}, bump: 0 }),
    study: () => ({ subjects: [], exams: [], classes: [], done: {}, projects: [] }),
    notes: () => ({ items: [] }),
    deen: () => ({ quran: {}, prayers: {}, adhkar: {} }),
    money: () => ({ incomes: [], expenses: [], paid: {} }),
    health: () => ({ entries: [] }),
    food: () => ({ meals: [] })
  };
  const defFor = (name) => (DEFAULTS[name] || DEFAULTS[name.split("-")[0]] || (() => ({})))();
  function mergeDefaults(def, val) {
    if (Array.isArray(def) || def === null || typeof def !== "object") return val === undefined ? def : val;
    const out = {};
    const v = (val && typeof val === "object" && !Array.isArray(val)) ? val : {};
    for (const k of Object.keys(def)) out[k] = mergeDefaults(def[k], v[k]);
    for (const k of Object.keys(v)) if (!(k in out)) out[k] = v[k];
    return out;
  }

  /* ---------------- store (cloud db + local cache) ---------------- */
  const Store = window.Store = {
    docs: {}, json: {}, dirty: {}, ver: {}, timers: {}, chain: {}, subs: {}, fetched: {}, localHad: {},
    db: null, uid: null, mode: "local", status: "local", loadTimer: null, readOnly: false,
    lsGet(name) { try { const s = localStorage.getItem("nhari:" + name); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    lsSet(name) { try { localStorage.setItem("nhari:" + name, JSON.stringify(this.docs[name])); } catch (e) { /* storage unavailable */ } },
    peek(name) { return this.docs[name]; },
    doc(name) {
      if (!this.docs[name]) {
        const local = this.lsGet(name);
        this.localHad[name] = !!local;
        this.docs[name] = mergeDefaults(defFor(name), local || undefined);
        this.json[name] = JSON.stringify(this.docs[name]);
        this.ensure(name);
      }
      return this.docs[name];
    },
    month(prefix, mk) { return this.doc(prefix + "-" + (mk || U.mkey())); },
    ref(name) { return this.db.collection("data/users/" + this.uid).doc(name); },
    save(name) {
      this.ver[name] = (this.ver[name] || 0) + 1;
      this.dirty[name] = true;
      this.json[name] = JSON.stringify(this.docs[name]);
      this.lsSet(name);
      clearTimeout(this.timers[name]);
      this.timers[name] = setTimeout(() => this.flush(name), 600);
    },
    flush(name) {
      this.timers[name] = null;
      if (this.mode !== "cloud" || this.readOnly) { this.dirty[name] = false; return; }
      const v = this.ver[name];
      const body = JSON.parse(this.json[name]);
      this.chain[name] = (this.chain[name] || Promise.resolve())
        .then(() => this.ref(name).set(body))
        .then(() => { if (this.ver[name] === v && !this.timers[name]) this.dirty[name] = false; this.setStatus("ok"); })
        .catch(e => {
          this.dirty[name] = false;
          const code = e && e.code;
          if (code === "quota_exceeded") App.toast(L("المساحة كملت", "Espace plein"), L("امسح شوية ملاحظات قدم باش تنجم تسجّل.", "Supprime d'anciennes notes pour continuer à enregistrer."), "bad");
          else if (code === "invalid_argument") { this.readOnly = true; this.setStatus("local"); App.toast(L("ما نجمتش نسجّل في السحاب", "Sauvegarde cloud refusée"), L("البيانات محفوظة في هذا الجهاز برك.", "Les données restent sur cet appareil."), "warn"); }
          else if (code === "revoked") { this.mode = "local"; this.setStatus("local"); }
          else this.setStatus("err");
        });
    },
    ensure(name) {
      if (this.mode !== "cloud" || this.subs[name] || this.fetched[name]) return;
      const live = !/-\d{4}-\d{2}$/.test(name) || name.endsWith(U.mkey());
      if (live) {
        this.subs[name] = this.ref(name).onSnapshot(snap => this.onSnap(name, snap), err => { this.subs[name] = null; if (err && err.code === "revoked") { this.mode = "local"; this.setStatus("local"); } });
      } else {
        this.fetched[name] = true;
        this.ref(name).get().then(snap => this.onSnap(name, snap)).catch(() => {});
      }
    },
    onSnap(name, snap) {
      if (!snap.metadata || !snap.metadata.fromCache) { clearTimeout(this.loadTimer); this.setStatus("ok"); }
      if (this.dirty[name]) return;
      if (!snap.exists) { if (this.localHad[name] && !snap.metadata.fromCache) { this.localHad[name] = false; this.save(name); } return; }
      const raw = JSON.stringify(snap.data());
      const merged = mergeDefaults(defFor(name), JSON.parse(raw));
      const s = JSON.stringify(merged);
      if (s === this.json[name]) return;
      this.docs[name] = merged; this.json[name] = s; this.lsSet(name);
      App.remoteChanged(name);
    },
    setStatus(s) { this.status = s; const el = document.getElementById("sync"); if (el) el.outerHTML = App.syncChip(); },
    async connect() {
      if (!window.claude || typeof window.claude.use !== "function") return;
      try {
        const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
        if (!db || !user) return;
        const uid = await user.id();
        if (!uid) return;
        this.db = db; this.uid = uid; this.mode = "cloud"; this.setStatus("loading");
        this.loadTimer = setTimeout(() => { if (this.status === "loading") { this.setStatus("slow"); } }, 10000);
        Object.keys(this.docs).forEach(n => this.ensure(n));
      } catch (e) { /* stay local */ }
    }
  };

  App.who = () => {
    const s = Store.doc("settings"), st = s.study || {}, a = App.age();
    const bits = [s.name || "the user", a ? a + " years old" : "", [st.level, st.field].filter(Boolean).join(" "), st.facName ? "at " + st.facName : ""].filter(Boolean);
    return bits.join(", ");
  };
  App.age = () => {
    const p = Store.doc("settings").profile;
    if (p.birth && /^\d{4}-\d{2}-\d{2}$/.test(p.birth)) { const [y, m, d] = p.birth.split("-").map(Number); const n = U.P(new Date()); return n.y - y - ((n.m < m || (n.m === m && n.d < d)) ? 1 : 0); }
    return +p.age || 25;
  };

  /* ---------------- UI helpers ---------------- */
  App.syncChip = () => {
    const s = Store.status;
    const map = {
      ok: ["ok", L("متزامن", "Synchronisé")],
      loading: ["", L("يتزامن…", "Synchro…")],
      slow: ["local", L("السحاب ما جاوبش بعد", "Cloud injoignable")],
      err: ["local", L("مشكل في التسجيل", "Erreur de synchro")],
      local: ["local", L("محفوظ في الجهاز", "Sur cet appareil")]
    }[s] || ["local", ""];
    return `<span class="chip ${map[0]}" id="sync" title="${U.esc(map[1])}"><span class="dot"></span>${U.esc(map[1])}</span>`;
  };

  App.toast = (title, body, kind) => {
    const box = document.getElementById("toasts");
    if (!box) return;
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<div><b>${U.esc(title)}</b>${body ? `<span class="small">${U.esc(body)}</span>` : ""}</div><button class="x" aria-label="${L("سكّر", "Fermer")}">×</button>`;
    el.querySelector(".x").onclick = () => el.remove();
    box.appendChild(el);
    setTimeout(() => el.remove(), kind === "bad" ? 12000 : 6000);
  };

  App.modal = (title, html, onMount) => {
    App.closeModal();
    const back = document.createElement("div");
    back.className = "modal-back"; back.id = "modal";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${U.esc(title)}"><div class="mh"><h3>${U.esc(title)}</h3><button class="iconbtn" data-act="closeModal" aria-label="${L("سكّر", "Fermer")}">${I.x}</button></div><div class="mb">${html}</div></div>`;
    back.addEventListener("click", e => { if (e.target === back) App.closeModal(); });
    document.body.appendChild(back);
    if (onMount) onMount(back.querySelector(".mb"));
  };
  App.closeModal = () => { const m = document.getElementById("modal"); if (m) m.remove(); };
  App.acts.closeModal = () => App.closeModal();

  // confirm dialog built into the page (native confirm is blocked)
  App.confirm = (msg, onYes) => {
    App.modal(L("تأكيد", "Confirmation"), `<p>${U.esc(msg)}</p><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-act="closeModal">${L("لا", "Non")}</button><button class="btn primary" id="cfYes">${L("إيه", "Oui")}</button></div>`,
      mb => { mb.querySelector("#cfYes").onclick = () => { App.closeModal(); onYes(); }; });
  };

  App.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); App.toast(L("تنسخ", "Copié"), "", "good"); }
    catch (e) { App.toast(L("ما نجمتش ننسخ", "Copie impossible"), L("اختار النص وانسخو بيدك.", "Sélectionne le texte et copie-le."), "warn"); }
  };

  /* ---------------- AI (sample) ---------------- */
  App.aiError = (e) => {
    const c = e && e.code;
    if (c === "not_granted" || c === "sampling_disabled" || c === "not_declared" || c === "capability_disabled") return L("الذكاء الاصطناعي موش مسموح في هذا العرض.", "L'IA n'est pas autorisée ici.");
    if (c === "rate_limited") return L("برشا طلبات — استنى شوية وعاود.", "Trop de demandes — réessaie dans un moment.");
    if (c === "invalid_key") return L("الـclé API غالطة ولا ما فيهاش رصيد — ثبّت في الإعدادات.", "Clé API invalide ou sans crédit — vérifie dans Réglages.");
    if (c === "quota") return L("الحصة المجانية متاع اليوم كملت — ترجع الصباح (حوالي 9:00).", "Quota gratuit du jour épuisé — il revient demain matin (vers 9:00).");
    if (c === "region") return L("Google ما يقبلش الطلب من البلاد هذي (VPN؟) — طفي الـVPN وعاود.", "Google refuse la demande depuis ce pays (VPN ?) — coupe le VPN et réessaie.");
    if (c === "refused") return L("الذكاء الاصطناعي رفض يجاوب على هذا — بدّل الطلب ولا التصويرة.", "L'IA a refusé de répondre — reformule ou change de photo.");
    if (c === "model_missing") return L("الموديل هذا ما عادش موجود — اختار «أوتوماتيك» في الإعدادات.", "Ce modèle n'existe plus — choisis « Automatique » dans Réglages.");
    if (c === "no_network") return L("ما فماش انترنت — الذكاء الاصطناعي يستحق الكونيكسيون.", "Pas de connexion — l'IA a besoin d'internet.");
    if (c === "image_rejected") return L("التصويرة ما تقبلتش — جرب تصويرة أخرى (JPG/PNG).", "Image refusée — essaie une autre photo (JPG/PNG).");
    if (c === "invalid_json") return L("الجواب ما جاش في الشكل الصحيح — عاود.", "Réponse mal formée — réessaie.");
    if (c === "session_expired") return L("لازمك تعاود تدخل لحسابك.", "Reconnecte-toi à ton compte.");
    if (c === "cancelled") return "";
    return L("صار مشكل — عاود بعد شوية.", "Un problème est survenu — réessaie.");
  };
  App.aiNote = () => window.NHARI_LOCAL
    ? `<div class="alertbox info small">${L("الميزة هذي تخدم بالذكاء الاصطناعي: زيد clé API في الإعدادات (Gemini بلاش).", "Cette fonction utilise l'IA : ajoute une clé API dans Réglages (Gemini est gratuit).")} <a href="#prefs">${L("الإعدادات", "Réglages")}</a></div>`
    : `<div class="alertbox info small">${L("الميزة هذي تخدم بالذكاء الاصطناعي كي تحل التطبيق من حسابك في Claude.", "Cette fonction utilise l'IA quand l'app est ouverte depuis ton compte Claude.")}</div>`;
  App.setAI = async (sample) => {
    App.ai = sample || null; App.aiImages = false; App.aiImgLimits = null;
    if (sample) { const lim = await sample.limits().catch(() => null); App.aiImages = !!(lim && lim.images); App.aiImgLimits = lim && lim.images; }
    App.render();
  };

  /* ---------------- router + render ---------------- */
  const TABS = ["today", "work", "money", "health", "food", "study", "deen", "prefs"];
  App.tabLabel = (t) => ({
    today: L("اليوم", "Aujourd'hui"), work: L("الخدمة", "Travail"), money: L("الفلوس", "Finances"), health: L("الصحة", "Santé"),
    food: L("الماكلة", "Nutrition"), study: L("القراية", "Études"), deen: L("الدين", "Dine"), prefs: L("الإعدادات", "Réglages")
  }[t]);

  App.renderShell = () => {
    const nav = TABS.filter(t => t !== "prefs").map(t => `<a href="#${t}" ${App.tab === t ? 'aria-current="page"' : ""}>${I[t]}<span>${App.tabLabel(t)}</span></a>`).join("");
    document.getElementById("root").innerHTML = `
      <div class="app">
        <nav class="side" aria-label="${L("القائمة", "Menu")}">
          <div class="brand">${L("نهاري", "Nhari")}</div>
          ${nav}
          <a href="#prefs" ${App.tab === "prefs" ? 'aria-current="page"' : ""}>${I.prefs}<span>${App.tabLabel("prefs")}</span></a>
          <div class="foot">${L("تنظيم نهارك: فلوس، صحة، قراية، دين", "Ta journée : argent, santé, études, dine")}</div>
        </nav>
        <main class="main">
          <div class="topbar">
            <div class="brand">${L("نهاري", "Nhari")}</div>
            <div class="grow"></div>
            ${App.syncChip()}
            <div class="seg" role="group" aria-label="Langue">
              <button data-act="lang" data-v="ar" aria-pressed="${App.lang === "ar"}">ع</button>
              <button data-act="lang" data-v="fr" aria-pressed="${App.lang === "fr"}">FR</button>
            </div>
            <a class="iconbtn" href="#prefs" aria-label="${App.tabLabel("prefs")}">${I.prefs}</a>
          </div>
          <div id="view"></div>
        </main>
        <nav class="tabbar" aria-label="${L("القائمة", "Menu")}">${nav}</nav>
      </div>`;
  };

  /* ---------------- extension points (extras.js adds sub-tabs and cards) ---------------- */
  App.EXT = { tabs: {}, cards: {} };
  App.extTabs = (tab) => (App.EXT.tabs[tab] || []).map(x => [x.id, x.label()]);
  App.extView = (tab, sub) => { const x = (App.EXT.tabs[tab] || []).find(t => t.id === sub); if (!x) return ""; try { return x.render(); } catch (e) { console.error(e); return `<div class="alertbox bad small">${U.esc(e.message)}</div>`; } };
  App.extCards = (tab) => (App.EXT.cards[tab] || []).map(f => { try { return f() || ""; } catch (e) { console.error(e); return ""; } }).join("");

  App.render = () => {
    const v = App.views[App.tab] || App.views.today;
    const el = document.getElementById("view");
    if (!el) return;
    let html = "";
    try { html = v.render(); }
    catch (e) { console.error(e); html = `<div class="card alertbox bad"><b>${L("صار مشكل في العرض", "Erreur d'affichage")}</b><span class="small">${U.esc(e.message)}</span></div>`; }
    el.innerHTML = html;
    if (v.after) { try { v.after(el); } catch (e) { console.error(e); } }
    App.tickLive();
  };

  App.go = (tab) => {
    if (!TABS.includes(tab)) tab = "today";
    App.tab = tab;
    App.renderShell();
    App.render();
    window.scrollTo(0, 0);
  };

  App.remoteChanged = (name) => {
    if (name === "settings") {
      const s = Store.doc("settings");
      if (s.lang && s.lang !== App.lang) { App.lang = s.lang; App.applyLang(); App.renderShell(); }
    }
    const a = document.activeElement;
    if (a && a.closest && a.closest("#view") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { App.deferRender = true; return; }
    if (document.getElementById("modal")) { App.deferRender = true; return; }
    App.render();
  };
  document.addEventListener("focusout", () => setTimeout(() => {
    if (!App.deferRender) return;
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    if (document.getElementById("modal")) return;
    App.deferRender = false; App.render();
  }, 200));

  App.applyLang = () => {
    document.documentElement.lang = App.lang === "fr" ? "fr" : "ar";
    document.documentElement.dir = App.lang === "fr" ? "ltr" : "rtl";
    document.title = "Nhari نهاري";
  };
  App.acts.lang = (el) => {
    App.lang = el.dataset.v; App.applyLang();
    const s = Store.doc("settings"); s.lang = App.lang; Store.save("settings");
    App.renderShell(); App.render();
  };
  App.acts.sub = (el) => { App.sub[el.dataset.tab || App.tab] = el.dataset.v; App.render(); };

  /* ---------------- events ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = App.acts[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-form]");
    if (!f) return;
    e.preventDefault();
    const fn = App.forms[f.dataset.form];
    if (fn) { const fd = Object.fromEntries(new FormData(f).entries()); fn(fd, f, e); }
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]");
    if (!el) return;
    const fn = App.changes[el.dataset.change];
    if (fn) fn(el, e);
  });
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "");
    if (h && h !== App.tab) App.go(h);
  });

  /* ---------------- live clock + notifications ---------------- */
  App.tickLive = () => {
    const now = Date.now();
    document.querySelectorAll("[data-cd]").forEach(el => {
      const t = +el.dataset.cd;
      el.textContent = U.dur(t - now);
    });
  };
  const Notifier = App.Notifier = {
    fired: {},
    key: () => "nhari:fired:" + U.dkey(),
    load() { try { this.fired = JSON.parse(localStorage.getItem(this.key()) || "{}"); } catch (e) { this.fired = {}; } },
    store() { try { localStorage.setItem(this.key(), JSON.stringify(this.fired)); } catch (e) { /* ignore */ } },
    async enable() {
      const s = Store.doc("settings");
      s.notify.enabled = true; Store.save("settings");
      let ok = false;
      try {
        if ("Notification" in window) {
          const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
          ok = p === "granted";
        }
      } catch (e) { ok = false; }
      try { this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)(); await this.audio.resume(); } catch (e) { /* no audio */ }
      App.toast(L("التنبيهات مفعّلة", "Rappels activés"), ok ? L("توصلك تنبيهات ما دام التطبيق محلول.", "Tu recevras des alertes tant que l'app est ouverte.") : L("المتصفح ما سمحش بالإشعارات — باش تظهر التنبيهات داخل التطبيق كي يكون محلول.", "Le navigateur bloque les notifications : les rappels s'afficheront dans l'app quand elle est ouverte."), "good");
      App.render();
    },
    beep() {
      try {
        const a = this.audio; if (!a || a.state !== "running") return;
        const o = a.createOscillator(), g = a.createGain();
        o.frequency.value = 660; g.gain.value = 0.0001;
        o.connect(g); g.connect(a.destination); o.start();
        g.gain.exponentialRampToValueAtTime(0.15, a.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
        o.stop(a.currentTime + 0.85);
      } catch (e) { /* ignore */ }
    },
    check() {
      const s = Store.doc("settings");
      if (!s.notify.enabled) return;
      if (this.day !== U.dkey()) { this.day = U.dkey(); this.load(); }
      const now = Date.now();
      let list = [];
      try { list = App.collectEvents(); } catch (e) { list = []; }
      for (const ev of list) {
        const t = ev.at.getTime();
        if (now >= t && now - t < 10 * 60000 && !this.fired[ev.key]) {
          this.fired[ev.key] = 1; this.store();
          App.toast(ev.title, ev.body, ev.kind);
          if (s.notify.sound) this.beep();
          App.sysNotify(ev.title, ev.body || "", ev.key);
        }
      }
    }
  };
  App.sysNotify = async (title, body, tag) => {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const reg = navigator.serviceWorker && navigator.serviceWorker.getRegistration ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
      if (reg && reg.showNotification) { await reg.showNotification(title, { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png" }); return; }
      new Notification(title, { body, tag });
    } catch (e) { /* ignore */ }
  };
  App.acts.enableNotify = () => Notifier.enable();
  App.acts.disableNotify = () => { const s = Store.doc("settings"); s.notify.enabled = false; Store.save("settings"); App.render(); };

  // modules push functions into App.eventSources: () => [{key, at: Date, title, body, kind}]
  App.eventSources = [];
  App.collectEvents = () => App.eventSources.flatMap(f => { try { return f() || []; } catch (e) { return []; } }).sort((a, b) => a.at - b.at);

  /* ---------------- boot ---------------- */
  App.boot = () => {
    const s = Store.doc("settings");
    App.lang = s.lang || "ar";
    App.applyLang();
    const hot = window.claude && window.claude.hot;
    const start = (data) => {
      data = data || {};
      if (data.sub) App.sub = data.sub;
      const h = (location.hash || "").replace("#", "");
      App.go(h || data.tab || "today");
      Store.connect().then(async () => {
        try {
          if (window.claude && window.claude.use) {
            const sample = await window.claude.use("sample");
            if (sample) {
              App.ai = sample;
              const lim = await sample.limits().catch(() => null);
              App.aiImages = !!(lim && lim.images);
              App.aiImgLimits = lim && lim.images;
              App.render();
            }
          }
        } catch (e) { /* no ai */ }
      });
      setInterval(App.tickLive, 1000);
      let lastDay = U.dkey(), lastMin = new Date().getMinutes();
      setInterval(() => {
        const d = new Date();
        if (U.dkey() !== lastDay) { lastDay = U.dkey(); App.render(); }
        if (d.getMinutes() !== lastMin) { lastMin = d.getMinutes(); if (App.views[App.tab] && App.views[App.tab].minute) App.views[App.tab].minute(); }
        Notifier.check();
      }, 15000);
    };
    if (hot && hot.snapshot) { try { hot.snapshot(() => ({ tab: App.tab, sub: App.sub })); } catch (e) { /* ignore */ } }
    if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  };
})();
