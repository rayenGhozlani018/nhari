/* Nhari — Android app: the reminders that speak (adhan, adhkar, dhikr, gym, sleep, thumun ×10).
   The web app plans the next days and hands the plan to the phone (window.NhariAndroid),
   which rings and plays on time even when the app is closed. */
(function () {
  "use strict";
  const N = window.NhariAndroid;
  App.isNative = !!N;

  const RAW = "https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/";
  const ADHAN = [
    { id: "makkah", ar: "الحرم المكي", fr: "Masjid al-Haram (La Mecque)", file: "Athan Makkah" },
    { id: "afasy", ar: "مشاري العفاسي", fr: "Mishary Alafasy", file: "Athan Mishary Alafasi" },
    { id: "basit", ar: "عبد الباسط عبد الصمد", fr: "Abdelbasset Abdessamad", file: "Athan Abed Albase6" },
    { id: "menshawy", ar: "محمد المنشاوي", fr: "Mohammed al-Minshawi", file: "Athan Mohammad Almenshawy" },
    { id: "refaat", ar: "محمد رفعت", fr: "Mohammed Refaat", file: "Athan Mohammad Ref3at" },
    { id: "qatami", ar: "ناصر القطامي", fr: "Nasser al-Qatami", file: "Athan Nasser Alqatami" },
    { id: "hamathani", ar: "ماجد الحمداني", fr: "Majed al-Hamathani", file: "Athan Majed Al-hamathani" }
  ];
  const FAJR = [{ id: "fajr", ar: "أذان الفجر (الصلاة خير من النوم)", fr: "Adhan du Fajr (as-salatu khayrun mina n-nawm)", file: "Athan Al-fajer - Malek chebae" }, ...ADHAN];
  const adhanUrl = (list, id) => RAW + encodeURIComponent((list.find(a => a.id === id) || list[0]).file) + ".mp3";

  const AK = (n) => `https://archive.org/download/makkah-live.-net-athkar-01/MakkahLive.Net_athkar_${String(n).padStart(2, "0")}.mp3`;
  const ADHKAR = [
    { id: "afasy", ar: "مشاري العفاسي", fr: "Mishary Alafasy", m: 3, e: 4 },
    { id: "fares", ar: "فارس عباد", fr: "Fares Abbad", m: 5, e: 6 },
    { id: "jibril", ar: "محمد جبريل", fr: "Muhammad Jibril", m: 7, e: 8 }
  ];
  const SLEEP = AK(11);
  // short recordings, so the reminder is heard even when the phone has no Arabic voice
  const MEA = (n) => `https://thenasihun.github.io/me-azkar-web/assets/${n}.mp3`;
  const DHIKR = [
    { title: "اللهم صلّ على محمد وعلى آل محمد", url: MEA(30) },
    { title: "أستغفر الله — ﴿فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا﴾", url: "https://everyayah.com/data/Minshawy_Murattal_128kbps/071010.mp3" },
    { title: "سبحان الله وبحمده، عدد خلقه ورضا نفسه", url: MEA(14) }
  ];

  const DEF = { on: true, adhan: true, voice: "makkah", fajrVoice: "fajr", dhikr: true, morning: true, evening: true, eveningBefore: 30, adhkarVoice: "afasy", sleep: true, gym: true, glucose: true, hifz: true, hifzN: 10, hifzWarn: 5, quietClass: true, notify: true };
  const cfg = () => Object.assign({}, DEF, Store.doc("settings").native || {});
  const DAYS = 7;
  const say = (s) => String(s || "").replace(/\s*\+\s*/g, " و ").replace(/[—–]/g, "، ");

  /* ---------------- the plan ---------------- */
  function thumunItems(n) {
    const h = (App.Q && App.Q.halaqa && App.Q.halaqa()) || null;
    const label = h ? h.label : L("الثمن", "Le thumun");
    const seg = App.thumunSeg ? App.thumunSeg() : null;
    const recs = App.Reciters || [];
    const intro = { t: "tts", text: `نبدأ قراءة الثمن ${n === 10 ? "عشر" : n} مرات` };
    if (seg) {
      const r = recs.find(x => x.id === seg.rec);
      if (r && r.surah) return { label, qalun: true, items: [intro, { t: "url", url: r.surah(seg.surah), s: seg.s, e: seg.e, n, label }] };
    }
    // not marked yet: verse by verse (Hafs, al-Husary al-Mu'allim) over the thumun's verses
    const s = h && +h.surah, a = h && parseInt(h.from), b = h && parseInt(h.to);
    const r = recs.find(x => x.id === "hafs-husary-m");
    if (!r || !s || !(a > 0) || !(b >= a)) return null;
    const items = [intro];
    for (let k = 1; k <= n; k++) for (let v = a; v <= b && items.length < 600; v++) items.push({ t: "url", url: r.ayah(s, v), label: `${label} — ${L("المرة", "fois")} ${k}/${n}` });
    return { label, qalun: false, items };
  }

  function plan() {
    const c = cfg(); if (!c.on) return [];
    const ev = [], now = Date.now(), soon = now + 30000;
    // light mode: adhan, adhkar, dhikr, glucose and thumun stay; the rest becomes a morning and an evening summary
    const light = !!(App.Quick && App.Quick.light());
    const unit = U.bgUnit(), unitLbl = U.bgUnitLabel();
    let lastBg = 0; try { const b = App.H.lastBg(); lastBg = b ? b.ts : 0; } catch (e) { lastBg = 0; }
    const PRS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    for (let i = 0; i < DAYS; i++) {
      const d = U.addDays(new Date(), i), dk = U.dkey(d), dow = U.dow(d);
      let P; try { P = App.prayer.today(d); } catch (e) { continue; }
      let blocks = []; try { blocks = App.R ? App.R.day(d) : []; } catch (e) { blocks = []; }
      const inClass = (t) => blocks.some(b => b.cls && t >= b.start && t < b.end);
      const sleep = blocks.filter(b => b.kind === "rest").sort((a, b) => a.start - b.start).pop();
      const quiet = (t) => !!(c.quietClass && inClass(t));
      const audio = [];
      const push = (o) => { if (!(o.at > soon)) return; ev.push(o); if (o.kind === "audio") audio.push(o.at); };
      const busy = (t, min) => audio.some(x => Math.abs(x - t) < min * 60000);

      // adhan at the five prayers (quiet during classes and during the Sunday halaqa at the mosque)
      if (c.adhan) for (const k of PRS) {
        const t = P[k], inHalaqa = dow === 0 && (k === "maghrib" || k === "isha");
        const nk = PRS[PRS.indexOf(k) + 1], until = nk ? +P[nk] : +t + 5 * 3600000;
        push({ id: `adhan-${dk}-${k}`, at: +t, kind: "audio", prio: 2, stream: "alarm", silent: quiet(t) || inHalaqa,
          title: `🕌 ${L("حان وقت صلاة", "C'est l'heure de")} ${App.prName(k)}`, body: U.hm(t),
          items: [{ t: "url", url: k === "fajr" ? adhanUrl(FAJR, c.fajrVoice) : adhanUrl(ADHAN, c.voice), cache: true }],
          // after the adhan: « ✅ صليت » in the notification
          act: { t: "pray", key: `pray-${dk}-${k}`, k, dk, name: App.prName(k), ttl: Math.max(30 * 60000, until - +t - 5 * 60000),
            title: `🕌 ${App.prName(k)} — ${L("صلّيت؟", "c'est prié ?")}`, body: L("اضغط «✅ صليت» وتتسجّل وحدها.", "Touche « ✅ صليت » pour l'enregistrer.") } });
      }
      // morning adhkar: after the dawn halaqa, before sunrise
      const voice = ADHKAR.find(a => a.id === c.adhkarVoice) || ADHKAR[0];
      if (c.morning) {
        const rc = App.R ? App.R.cfg() : { halaqaMin: 30 };
        let t = U.plusMin(P.fajr, 15 + (+rc.halaqaMin || 30));
        if (P.sunrise && t > U.plusMin(P.sunrise, -10)) t = U.plusMin(P.sunrise, -25);
        push({ id: `adhkar-m-${dk}`, at: +t, kind: "audio", prio: 1, stream: "media", silent: quiet(t),
          title: `☀️ ${L("أذكار الصباح", "Adhkar du matin")}`, body: L(voice.ar, voice.fr),
          items: [{ t: "tts", text: "أذكار الصباح" }, { t: "url", url: AK(voice.m), cache: true }] });
      }
      // evening adhkar: before maghrib
      if (c.evening) {
        let t = U.plusMin(P.maghrib, -(+c.eveningBefore || 30));
        if (t < U.plusMin(P.asr, 10)) t = U.plusMin(P.asr, 10);
        if (!busy(+t, 5)) push({ id: `adhkar-e-${dk}`, at: +t, kind: "audio", prio: 1, stream: "media", silent: quiet(t),
          title: `🌙 ${L("أذكار المساء", "Adhkar du soir")}`, body: L(voice.ar, voice.fr),
          items: [{ t: "tts", text: "أذكار المساء" }, { t: "url", url: AK(voice.e), cache: true }] });
      }
      // gym
      const gym = blocks.find(b => b.kind === "sport");
      if (c.gym && gym) {
        const name = String(gym.title || "").split(/[:：]/).slice(1).join(":").trim();
        // in light mode the time of the gym is in the morning summary (unless the gym comes first)
        let amAt = 0; if (light) { try { amAt = +App.Quick.digestTimes(d).am; } catch (e) { amAt = 0; } }
        if (!light || +gym.start <= amAt + 5 * 60000) push({ id: `gym-${dk}`, at: +gym.start, kind: "audio", prio: 1, stream: "media", silent: quiet(gym.start),
          title: `🏋️ ${L("وقت الجيم", "C'est l'heure de la salle")}`, body: name,
          items: [{ t: "tts", text: `حان وقت الرياضة. ${name ? "حصة اليوم: " + say(name) + "." : ""} لا تنس قياس السكر قبل التمرين.` }] });
        // at the end of the session: « ✅ عملتها » (quiet)
        if (!(i === 0 && App.S && App.S.doneToday())) push({ id: `gymq-${dk}`, at: +gym.end, kind: "notify", silent: true,
          title: `🏋️ ${L("عملت حصة الجيم؟", "Séance faite ?")}`, body: name,
          act: { t: "gym", key: `gym-${dk}`, dk, ttl: 8 * 3600000, title: `🏋️ ${L("عملت حصة الجيم؟", "Séance faite ?")}`,
            body: (name ? name + " — " : "") + L("اضغط «✅ عملتها» وتتسجّل.", "Touche « ✅ عملتها » pour l'enregistrer.") } });
      }
      // thumun ×10, with a warning before
      const hifz = blocks.find(b => b.hifz);
      let hifzAt = 0;
      if (c.hifz && hifz) {
        const n = Math.max(1, Math.min(20, +c.hifzN || 10)), th = thumunItems(n);
        if (th) {
          const t = +hifz.start, warn = Math.max(1, +c.hifzWarn || 5);
          hifzAt = t;
          push({ id: `hifz-warn-${dk}`, at: t - warn * 60000, kind: "warn", target: `hifz-${dk}`, postponeMin: 30,
            title: `📖 ${L(`بعد ${warn} دقايق: الثمن ×${n}`, `Dans ${warn} min : le thumun ×${n}`)}`,
            body: th.label + (th.qalun ? "" : " — " + L("حفص (علّم الثمن في «استمع» باش يولّي قالون)", "Hafs (marque le thumun dans « Écouter » pour Qalun)")) });
          push({ id: `hifz-${dk}`, at: t, kind: "audio", prio: 1, stream: "media", silent: quiet(t),
            title: `📖 ${L("الثمن", "Le thumun")} ×${n}`, body: th.label, items: th.items });
        }
      }
      // sleep: reminder + adhkar of sleep
      if (c.sleep && sleep && U.hm(sleep.start) >= "20:30") push({ id: `sleep-${dk}`, at: +sleep.start, kind: "audio", prio: 1, stream: "media",
        title: `😴 ${L("وقت النوم", "C'est l'heure de dormir")}`, body: L("قيس السكر، وأذكار النوم", "Glycémie, puis adhkar du coucher"),
        items: [{ t: "tts", text: "حان وقت النوم. لا تنس قياس السكر. نبدأ أذكار النوم." }, { t: "url", url: SLEEP, cache: true }] });
      // glucose: before each meal, and 2 h after the main meals
      if (c.glucose) {
        const bgText = /قيس السكر|glyc/i;
        const meals = blocks.filter(b => b.kind === "food" && bgText.test(b.title));
        const pre = blocks.filter(b => b.kind === "health" && bgText.test(b.title)); // before the gym
        const bgAct = (key, ctx, what) => ({ t: "bg", key, ctx, dk, unit, ttl: 75 * 60000, label: `${L("السكر", "Glycémie")} (${unitLbl})`,
          title: `🩸 ${L("قست السكر؟", "Glycémie mesurée ?")}`, body: L(`اكتب القيمة هنا (${unitLbl})`, `Écris la valeur ici (${unitLbl})`) + (what ? " — " + what : "") });
        const fresh = (t) => lastBg && t >= lastBg && t - lastBg < 25 * 60000; // just measured: no need to remind
        for (const b of [...meals, ...pre]) {
          const t = +b.start, hhmm = U.hm(b.start).replace(":", "");
          if (busy(t, 3) || fresh(t)) continue;
          push({ id: `bg-${dk}-${hhmm}`, at: t, kind: "audio", prio: 1, stream: "media", silent: quiet(b.start),
            title: `🩸 ${L("قيس السكر", "Mesure ta glycémie")}`, body: String(b.title || ""),
            items: [{ t: "tts", text: "قِس السكر" }],
            act: bgAct(`bg-${dk}-${hhmm}`, b.kind === "health" ? "presport" : "pre", String(b.title || "").split(/[+—]/)[0].trim()) });
        }
        for (const b of meals) {
          if (/لمجة|Collation/i.test(b.title)) continue; // snacks: before only
          const t = U.plusMin(b.start, 120);
          if (sleep && t >= sleep.start) continue;
          if (fresh(+t)) continue;
          const hhmm = U.hm(b.start).replace(":", "");
          push({ id: `bg2-${dk}-${hhmm}`, at: +t, kind: "audio", prio: 1, stream: "media", silent: quiet(t),
            title: `🩸 ${L("قيس السكر — ساعتين بعد الماكلة", "Glycémie — 2 h après le repas")}`, body: String(b.title || "").split(/[+]/)[0].trim(),
            items: [{ t: "tts", text: "قِس السكر. مرّت ساعتان بعد الأكل." }],
            act: bgAct(`bg2-${dk}-${hhmm}`, "post", L("ساعتين بعد ", "2 h après ") + String(b.title || "").split(/[+—]/)[0].trim()) });
        }
      }
      // every two hours between sobh and isha: a short dhikr (not during classes, not over another sound)
      if (c.dhikr) {
        let k = 0;
        for (let t = U.plusMin(P.fajr, 120); t < P.isha; t = U.plusMin(t, 120)) {
          if (inClass(t) || busy(+t, 15) || (hifzAt && t >= hifzAt - 10 * 60000 && t <= hifzAt + 50 * 60000)) continue;
          const dz = DHIKR[(k++ + i) % DHIKR.length];
          push({ id: `dhikr-${dk}-${U.hm(t).replace(":", "")}`, at: +t, kind: "audio", prio: 0, stream: "media",
            title: `📿 ${dz.title}`, body: "", items: [{ t: "url", url: dz.url, cache: true }] });
        }
      }
      // light mode: the summaries of the morning and the evening
      if (light && c.notify && App.Quick.digestTimes) {
        let tt = null; try { tt = App.Quick.digestTimes(d); } catch (e) { tt = null; }
        if (tt) for (const kind of ["am", "pm"]) {
          // the evening summary says what is not ticked only when it is computed shortly before (else it would be stale)
          const live = i === 0 && +tt[kind] - Date.now() < 45 * 60000;
          let g = null; try { g = App.Quick.digest(kind, d, live); } catch (e) { g = null; }
          if (g) push({ id: `dg-${kind}-${dk}`, at: +tt[kind], kind: "notify", silent: quiet(tt[kind]), title: g.title, body: g.body });
        }
      }
    }
    // the app's own reminders for today (glycemia, work, car, studies...), as plain notifications
    if (c.notify) {
      const audioAt = ev.filter(e => e.kind === "audio").map(e => e.at);
      const keep = light && App.Quick.KEEP;
      for (const src of (App.eventSources || [])) {
        let list = []; try { list = src() || []; } catch (e) { list = []; }
        for (const x of list) {
          if (keep && !keep.test(x.key || "")) continue; // in the summaries instead
          const at = x.at instanceof Date ? +x.at : +new Date(x.at);
          if (!(at > soon) || at > now + 36 * 3600000) continue;
          if (audioAt.some(a => Math.abs(a - at) < 3 * 60000)) continue;
          const head = String(x.title || "").slice(0, 10);
          if (ev.some(e => e.kind === "notify" && Math.abs(e.at - at) < 2 * 60000 && e.title.slice(0, 10) === head)) continue;
          ev.push({ id: "n-" + (x.key || at), at, kind: "notify", title: String(x.title || "Nhari"), body: String(x.body || "") });
        }
      }
    }
    ev.sort((a, b) => a.at - b.at);
    return ev;
  }
  App.nativePlan = plan;

  /* ---------------- hand the plan to the phone ---------------- */
  let lastSig = "", timer = null, lastW = "";
  // home-screen widget: next prayer, work, last glucose, water, gym
  function widgetState() {
    const now = new Date(), out = { prayers: [] };
    for (let i = 0; i < 2; i++) {
      let P = null; try { P = App.prayer.today(U.addDays(now, i)); } catch (e) { P = null; }
      if (P) for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) out.prayers.push({ n: App.prName(k), at: +P[k] });
    }
    try {
      const c = App.moneyCalc(), open = App.W.ticketsOn(U.dkey()).filter(t => t.status === "todo").length;
      const goal = c.todayObj > 0 ? (c.todayLeft > 0 ? L("باقي ", "reste ") + U.money(c.todayLeft) : L("وصلت للهدف ✅", "objectif atteint ✅")) : L("ما فماش خدمة اليوم", "pas de travail aujourd'hui");
      out.work = `🧰 ${open ? L(`${open} تيكيات`, `${open} tickets`) : L("حتى تيكي", "0 ticket")} · 🎯 ${goal}`;
    } catch (e) { /* ignore */ }
    try { const b = App.H.lastBg(); if (b) { out.bg = U.bgFmt(b.bg).replace(/[\u200e\u200f\u2066-\u2069]/g, ""); out.bgAt = b.ts; } } catch (e) { /* ignore */ }
    try { out.water = `💧 ${App.Quick.water()}/${App.Quick.waterGoal()}`; } catch (e) { /* ignore */ }
    try {
      const k = App.S.todayKey();
      out.gym = k === "rest" ? "😴 " + L("راحة من الجيم اليوم", "Repos (salle)") : App.S.doneToday() ? "🏋️ ✅ " + L("الحصة تعملت", "Séance faite") : "🏋️ " + App.S.title(k);
    } catch (e) { /* ignore */ }
    return out;
  }
  function doneActs() {
    let posted; try { posted = JSON.parse(N.postedActs() || "[]"); } catch (e) { return []; }
    if (!Array.isArray(posted) || !posted.length) return [];
    const deen = Store.doc("deen"), sp = Store.doc("sport");
    let bgs = []; try { bgs = App.H.entries(2).filter(e => e.type === "bg"); } catch (e) { bgs = []; }
    return posted.filter(p => (p.t === "pray" && p.k && (deen.prayers[p.dk] || {})[p.k]) || (p.t === "gym" && sp.done[p.dk])
      || (p.t === "bg" && bgs.some(e => e.ts >= (+p.at || 0) - 25 * 60000))).map(p => p.key);
  }
  function extras() {
    if (typeof N.setWidget === "function") {
      let w = ""; try { w = JSON.stringify(widgetState()); } catch (e) { w = ""; }
      if (w && w !== lastW) { lastW = w; try { N.setWidget(w); } catch (e) { /* ignore */ } }
    }
    if (typeof N.postedActs === "function") {
      const done = doneActs();
      if (done.length) try { N.clearActs(JSON.stringify(done)); } catch (e) { /* ignore */ }
    }
  }
  let forcing = false;
  function sync(force) {
    if (!N) return;
    if (forcing && !force) return; // a forced sync is about to run anyway
    clearTimeout(timer);
    forcing = !!force;
    timer = setTimeout(() => {
      forcing = false;
      try { extras(); } catch (e) { /* ignore */ }
      let events; try { events = plan(); } catch (e) { return; }
      const sig = JSON.stringify(events);
      if (!force && sig === lastSig) return;
      lastSig = sig;
      try { N.schedule(JSON.stringify({ events })); } catch (e) { /* ignore */ }
    }, force ? 50 : 1500);
  }
  App.nativeSync = sync;
  const info = () => { try { return JSON.parse(N.info()) || {}; } catch (e) { return {}; } };

  let applying = false;
  async function applyActions() {
    if (!N || typeof N.takeActions !== "function" || !App.Quick || applying) return;
    applying = true;
    try {
      // let the cloud copy arrive first, so this does not overwrite what the PC changed meanwhile
      for (let i = 0; i < 30 && Store.mode === "cloud" && Store.status !== "ok"; i++) await new Promise(r => setTimeout(r, 300));
      if (Store.mode === "cloud") await new Promise(r => setTimeout(r, 600));
      let list; try { list = JSON.parse(N.takeActions() || "[]"); } catch (e) { list = []; }
      if (!Array.isArray(list) || !list.length) return;
      let n = 0, tests = 0;
      for (const a of list) {
        try {
          if (String(a.key || "").startsWith("test-")) { tests++; continue; }
          const dk = a.dk || U.dkey(new Date(a.ts || Date.now()));
          if (a.t === "pray" && a.k) { App.Quick.prayed(a.k, dk); n++; }
          else if (a.t === "gym") { App.Quick.gymDone(dk); n++; }
          else if (a.t === "bg" && (a.mg || a.raw)) { App.Quick.bg(a.mg ? U.bgFromMg(+a.mg) : a.raw, a.ctx || "other", a.ts || Date.now()); n++; }
        } catch (e) { /* ignore */ }
      }
      if (n) App.toast(L(`تسجّل من الإشعارات: ${n}`, `Enregistré depuis les notifications : ${n}`), "", "good");
      if (tests) App.toast(L("الزر يخدم ✅", "Le bouton marche ✅"), L("هذي تجربة، ما تسجّل شي.", "C'était un test, rien n'est enregistré."), "good");
      if (n || tests) App.render();
    } finally { applying = false; }
  }
  window.NhariNativeActions = applyActions;

  if (N) {
    const render = App.render;
    App.render = function () { const r = render.apply(this, arguments); sync(false); return r; };
    window.NhariNativeResume = () => { applyActions(); sync(true); if (App.tab === "prefs") App.render(); };
    window.NhariNativeSharePending = async () => {
      let o; try { o = JSON.parse(N.takeShared() || "{}"); } catch (e) { o = {}; }
      const files = (o.files || []).map((f, i) => {
        const bin = atob(f.data), u8 = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        return new File([u8], "capture-" + (i + 1) + ".jpg", { type: f.type || "image/jpeg" });
      });
      if (!files.length && !o.text) return;
      for (let i = 0; i < 25 && !App.ai; i++) await new Promise(r => setTimeout(r, 200));
      App.go("work");
      if (!App.ai) { App.toast(L("زيد clé API باش يقرا التيكيات", "Ajoute une clé API pour lire les tickets"), "", "warn"); return; }
      App.importTickets(files.length ? { imgs: files } : { text: o.text });
    };
    window.addEventListener("load", () => setTimeout(() => { applyActions(); sync(true); window.NhariNativeSharePending(); }, 800));
    setInterval(() => sync(false), 15 * 60000);
  }

  /* ---------------- settings card (Android app only) ---------------- */
  const opt = (list, cur) => list.map(a => `<option value="${a.id}" ${a.id === cur ? "selected" : ""}>${U.esc(L(a.ar, a.fr))}</option>`).join("");
  const ck = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}" ${on ? "checked" : ""}>${label}</label>`;
  App.NativePrefs = () => {
    if (!N) return "";
    const c = cfg(), s = info(), next = s.next ? `${U.esc(s.next.title)} — ${U.hm(new Date(s.next.at))}${U.dkey(new Date(s.next.at)) !== U.dkey() ? " (" + U.dateShort(new Date(s.next.at)) + ")" : ""}` : L("ما فماش", "aucun");
    const st = (ok, yes, no, act, btn) => `<div class="li"><span class="grow">${ok ? "✅" : "⚠️"} ${ok ? yes : no}</span>${ok ? "" : `<button class="btn sm primary" type="button" data-act="${act}">${btn}</button>`}</div>`;
    const seg = App.thumunSeg ? App.thumunSeg() : null;
    return `<div class="card stripe accent" style="grid-column:1/-1"><h3 id="native-card">🔔 ${L("التنبيهات بالصوت (التلفون)", "Rappels sonores (téléphone)")}</h3>
      <div class="list">
        ${st(s.notif, L("الإشعارات مفتوحة", "Notifications autorisées"), L("الإشعارات مسكّرة", "Notifications bloquées"), "natNotif", L("اسمح", "Autoriser"))}
        ${st(s.exact, L("المنبّه في الوقت بالضبط", "Alarmes à l'heure exacte"), L("المنبّه ما يجيش في الوقت بالضبط", "Alarmes pas à l'heure exacte"), "natExact", L("اسمح", "Autoriser"))}
        ${st(s.battery, L("البطارية: بلا قيود", "Batterie : sans restriction"), L("البطارية تنجم توقف التنبيهات", "La batterie peut bloquer les rappels"), "natBattery", L("بلا قيود", "Sans restriction"))}
        <div class="li"><span class="grow">⏰ ${L("الجاي", "Prochain")}: ${next}</span><span class="tiny muted">${s.count || 0} ${L("تنبيه مبرمج", "rappels prévus")}</span></div>
        ${!s.tts || s.tts === "ok" || s.tts === "checking" ? "" : `<div class="li"><span class="grow">⚠️ ${L("التلفون ما عندوش صوت عربي: «قيس السكر» ووقت الجيم والنوم يجيو بصفّارة برك.", "Pas de voix arabe sur le téléphone : glycémie, salle et coucher arrivent avec un simple bip.")}</span><button class="btn sm primary" type="button" data-act="natVoice">${L("زيد الصوت العربي", "Ajouter la voix arabe")}</button></div>`}
        ${s.sound === false ? `<div class="li"><span class="grow small muted">🔕 ${L("التلفون في الصامت: التنبيهات تجي بلا صوت (vibreur).", "Téléphone en silencieux : rappels sans son (vibreur).")}</span></div>` : ""}
      </div>
      ${App.Quick ? App.Quick.modeChips() : ""}
      ${typeof N.takeActions === "function" ? `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><span class="small muted">${L("جرّب الأزرار:", "Tester les boutons :")}</span>
        <button class="btn sm" type="button" data-act="natTestAct" data-k="pray">✅ ${L("صليت", "Prié")}</button>
        <button class="btn sm" type="button" data-act="natTestAct" data-k="bg">🩸 ${L("قست", "Mesuré")}</button></div>` : ""}
      ${typeof N.setWidget === "function" ? `<p class="tiny muted" style="margin-top:6px">📱 ${L("الويدجت: اضغط مطوّل على الشاشة الرئيسية ← Widgets ← Nhari.", "Widget : appui long sur l'écran d'accueil → Widgets → Nhari.")}</p>` : ""}
      <form data-form="nativeCfg" class="form" style="margin-top:10px">
        <div class="full" style="display:grid;gap:6px">
          ${ck("on", c.on, L("التنبيهات بالصوت مفتوحة", "Rappels sonores activés"))}
          ${ck("adhan", c.adhan, L("الأذان كامل في الخمس صلوات", "Adhan complet aux cinq prières"))}
          ${ck("morning", c.morning, L("أذكار الصباح وحدها (بعد الحلقة)", "Adhkar du matin (après la halaqa)"))}
          ${ck("evening", c.evening, L("أذكار المساء وحدها (قبل المغرب)", "Adhkar du soir (avant le Maghreb)"))}
          ${ck("sleep", c.sleep, L("وقت النوم + أذكار النوم", "Heure du coucher + adhkar du coucher"))}
          ${ck("gym", c.gym, L("وقت الجيم + «عملتها؟» في آخر الحصة", "Heure de la salle + « faite ? » à la fin"))}
          ${ck("glucose", c.glucose, L("«قيس السكر» قبل الماكلة وساعتين بعدها", "« Mesure ta glycémie » avant les repas et 2 h après"))}
          ${ck("dhikr", c.dhikr, L("كل ساعتين من الصبح للعشاء: صلّ على النبي / أستغفر الله", "Toutes les 2 h de Sobh à Icha : prière sur le Prophète / istighfar"))}
          ${ck("hifz", c.hifz, L("الثمن يتقرا وحدو في وقت الحفظ", "Le thumun lu tout seul à l'heure du hifz"))}
          ${ck("quietClass", c.quietClass, L("بلا صوت وقت القراية (vibreur برك)", "Silencieux pendant les cours (vibreur)"))}
          ${ck("notify", c.notify, L("تنبيهات النهار الأخرى (السكر، الخدمة…)", "Autres rappels du jour (glycémie, travail…)"))}
        </div>
        <label class="f">${L("صوت الأذان", "Voix de l'adhan")}<select name="voice">${opt(ADHAN, c.voice)}</select></label>
        <label class="f">${L("أذان الصبح", "Adhan du Sobh")}<select name="fajrVoice">${opt(FAJR, c.fajrVoice)}</select></label>
        <label class="f">${L("الأذكار بصوت", "Adhkar par")}<select name="adhkarVoice">${opt(ADHKAR, c.adhkarVoice)}</select></label>
        <label class="f">${L("أذكار المساء: قبل المغرب بـ (دقيقة)", "Adhkar du soir : avant le Maghreb (min)")}<input name="eveningBefore" type="number" min="10" max="120" value="${c.eveningBefore}"></label>
        <label class="f">${L("الثمن: قداش من مرة", "Thumun : combien de fois")}<input name="hifzN" type="number" min="1" max="20" value="${c.hifzN}"></label>
        <label class="f">${L("نبّهني قبل الثمن بـ (دقيقة)", "Prévenir avant le thumun (min)")}<input name="hifzWarn" type="number" min="1" max="30" value="${c.hifzWarn}"></label>
        <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
      </form>
      <div class="small" style="margin-top:10px">${seg ? "🎯 " + L("الثمن معلّم في تلاوة قالون: يتقرا بقالون.", "Thumun marqué dans la récitation Qalun : lecture en Qalun.") : "ℹ️ " + L("الثمن موش معلّم: يتقرا آية بآية بحفص. باش يولّي بقالون: الدين ← «استمع» ← علّم بداية ونهاية الثمن.", "Thumun pas encore marqué : lecture verset par verset en Hafs. Pour Qalun : Dine → « Écouter » → marque le début et la fin.")}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn sm" type="button" data-act="natTest" data-k="adhan">🔊 ${L("الأذان", "Adhan")}</button>
        <button class="btn sm" type="button" data-act="natTest" data-k="fajr">🔊 ${L("أذان الصبح", "Adhan du Sobh")}</button>
        <button class="btn sm" type="button" data-act="natTest" data-k="dhikr">🔊 ${L("الذكر", "Dhikr")}</button>
        <button class="btn sm" type="button" data-act="natTest" data-k="bg">🔊 ${L("قيس السكر", "Glycémie")}</button>
        <button class="btn sm" type="button" data-act="natTest" data-k="morning">🔊 ${L("أذكار الصباح", "Adhkar du matin")}</button>
        <button class="btn sm" type="button" data-act="natTest" data-k="hifz">🔊 ${L("الثمن (مرة)", "Thumun (1 fois)")}</button>
        <button class="btn sm ghost" type="button" data-act="natStop">⏹ ${L("وقّف", "Arrêter")}</button>
      </div>
      <p class="tiny muted" style="margin-top:8px">${L("الأصوات تتنزّل مرة وحدة وبعد تخدم بلا انترنت (الأذان والأذكار). الثمن يستحق انترنت. كي يكون التلفون صامت ولا «ما تزعجنيش»، تجي الإشعارات بلا صوت.", "Les sons sont téléchargés une fois puis marchent sans internet (adhan, adhkar). Le thumun demande internet. Téléphone en silencieux ou « ne pas déranger » : notifications sans son.")} · v${U.esc(s.version || "")}</p></div>`;
  };

  // top of Today in the Android app, until the phone lets the reminders ring on time
  const sb = App.SetupBanner;
  App.SetupBanner = (fresh) => {
    let html = "";
    if (N) {
      const s = info();
      if (!s.notif || !s.exact || !s.battery) html = `<div class="card stripe accent" style="margin-bottom:14px"><h3>🔔 ${L("التنبيهات بالصوت: باقي خطوة", "Rappels sonores : encore une étape")}</h3>
        <p class="small">${L("باش الأذان والأذكار والثمن يخدمو حتى والتطبيق مسكّر، لازم تسمحلهم:", "Pour que l'adhan, les adhkar et le thumun marchent même app fermée, autorise :")}
        ${!s.notif ? "<b>" + L("الإشعارات", "les notifications") + "</b> · " : ""}${!s.exact ? "<b>" + L("المنبّه في الوقت", "les alarmes exactes") + "</b> · " : ""}${!s.battery ? "<b>" + L("البطارية بلا قيود", "la batterie sans restriction") + "</b>" : ""}</p>
        <button class="btn primary" style="margin-top:8px" data-act="natGo">${L("كمّل", "Continuer")}</button></div>`;
    }
    return html + (sb ? sb(fresh) : "");
  };
  App.acts.natGo = () => { App.go("prefs"); setTimeout(() => { const el = document.getElementById("native-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150); };

  App.forms.nativeCfg = (fd, form) => {
    const s = Store.doc("settings"), bools = ["on", "adhan", "morning", "evening", "sleep", "gym", "glucose", "dhikr", "hifz", "quietClass", "notify"];
    const n = Object.assign({}, cfg());
    bools.forEach(k => { const el = form.querySelector(`[name="${k}"]`); n[k] = !!(el && el.checked); });
    ["voice", "fajrVoice", "adhkarVoice"].forEach(k => { if (fd[k]) n[k] = fd[k]; });
    n.eveningBefore = Math.max(10, Math.min(120, +fd.eveningBefore || 30));
    n.hifzN = Math.max(1, Math.min(20, +fd.hifzN || 10));
    n.hifzWarn = Math.max(1, Math.min(30, +fd.hifzWarn || 5));
    s.native = n; Store.save("settings");
    sync(true);
    App.toast(L("تسجّل", "Enregistré"), L("التنبيهات تبرمجت للـ7 أيام الجايين.", "Rappels programmés pour les 7 prochains jours."), "good");
    setTimeout(() => App.render(), 300);
  };
  App.acts.natNotif = () => N && N.askNotifications();
  App.acts.natExact = () => N && N.openExactAlarms();
  App.acts.natBattery = () => N && N.openBattery();
  App.acts.natStop = () => N && N.stop();
  App.acts.natTestAct = (el) => {
    if (!N) return;
    const k = el.dataset.k, at = Date.now();
    const act = k === "bg"
      ? { t: "bg", key: "test-bg", ctx: "other", dk: U.dkey(), unit: U.bgUnit(), label: `${L("السكر", "Glycémie")} (${U.bgUnitLabel()})`, ttl: 10 * 60000, title: "🩸 " + L("تجربة: قست السكر؟", "Test : glycémie ?"), body: L("اكتب أي رقم (تجربة، ما يتسجّلش)", "Écris un chiffre (test, rien n'est enregistré)") }
      : { t: "pray", key: "test-pray", k: "dhuhr", dk: U.dkey(), name: L("تجربة", "Test"), ttl: 10 * 60000, title: "🕌 " + L("تجربة: صلّيت؟", "Test : prié ?"), body: L("اضغط «✅ صليت» (تجربة، ما يتسجّلش)", "Touche « ✅ صليت » (test, rien n'est enregistré)") };
    N.test(JSON.stringify({ id: "test-act-" + at, at, kind: "notify", silent: true, title: act.title, body: act.body, act }));
    App.toast(L("شوف الإشعارات", "Regarde les notifications"), "", "good");
  };
  App.acts.natVoice = () => {
    if (!N || !N.installVoice) { App.toast(L("حدّث التطبيق", "Mets l'application à jour"), L("نزّل آخر نسخة من nhari.apk.", "Télécharge la dernière version de nhari.apk."), "warn"); return; }
    N.installVoice();
    App.toast(L("الصوت العربي", "Voix arabe"), L("في الصفحة اللي تتحل: اختار «العربية» ونزّلها، وبعد ارجع لـ Nhari.", "Dans la page qui s'ouvre : choisis « Arabe », télécharge-la, puis reviens dans Nhari."), "info");
  };
  App.acts.natTest = (el) => {
    if (!N) return;
    const c = cfg(), k = el.dataset.k;
    let e;
    if (k === "adhan") e = { title: "🕌 " + L("تجربة الأذان", "Test de l'adhan"), stream: "alarm", items: [{ t: "url", url: adhanUrl(ADHAN, c.voice), cache: true }] };
    else if (k === "fajr") e = { title: "🕌 " + L("تجربة أذان الصبح", "Test de l'adhan du Sobh"), stream: "alarm", items: [{ t: "url", url: adhanUrl(FAJR, c.fajrVoice), cache: true }] };
    else if (k === "dhikr") { const dz = DHIKR[Math.floor(Math.random() * DHIKR.length)]; e = { title: "📿 " + dz.title, items: [{ t: "url", url: dz.url, cache: true }] }; }
    else if (k === "bg") e = { title: "🩸 " + L("قيس السكر", "Mesure ta glycémie"), items: [{ t: "tts", text: "قِس السكر" }] };
    else if (k === "morning") { const v = ADHKAR.find(a => a.id === c.adhkarVoice) || ADHKAR[0]; e = { title: "☀️ " + L("أذكار الصباح", "Adhkar du matin"), items: [{ t: "tts", text: "أذكار الصباح" }, { t: "url", url: AK(v.m), cache: true }] }; }
    else if (k === "hifz") { const th = thumunItems(1); if (!th) { App.toast(L("الثمن موش محدّد", "Thumun non défini"), L("حدّد الحلقة (السورة والآيات) في الإعدادات.", "Indique la halaqa (sourate et versets) dans les réglages."), "warn"); return; } e = { title: "📖 " + th.label, items: th.items }; }
    if (!e) return;
    N.test(JSON.stringify(Object.assign({ id: "test-" + Date.now(), kind: "audio", prio: 3, stream: "media", body: L("تجربة", "Test") }, e)));
  };
})();
