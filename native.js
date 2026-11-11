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
  const DHIKR = ["اللهم صلّ وسلّم على نبينا محمد", "أستغفر الله العظيم وأتوب إليه", "سبحان الله وبحمده، سبحان الله العظيم"];

  const DEF = { on: true, adhan: true, voice: "makkah", fajrVoice: "fajr", dhikr: true, morning: true, evening: true, eveningBefore: 30, adhkarVoice: "afasy", sleep: true, gym: true, hifz: true, hifzN: 10, hifzWarn: 5, quietClass: true, notify: true };
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
    for (let i = 0; i < DAYS; i++) {
      const d = U.addDays(new Date(), i), dk = U.dkey(d), dow = U.dow(d);
      let P; try { P = App.prayer.today(d); } catch (e) { continue; }
      let blocks = []; try { blocks = App.R ? App.R.day(d) : []; } catch (e) { blocks = []; }
      const inClass = (t) => blocks.some(b => b.cls && t >= b.start && t < b.end);
      const quiet = (t) => !!(c.quietClass && inClass(t));
      const audio = [];
      const push = (o) => { if (!(o.at > soon)) return; ev.push(o); if (o.kind === "audio") audio.push(o.at); };
      const busy = (t, min) => audio.some(x => Math.abs(x - t) < min * 60000);

      // adhan at the five prayers (quiet during classes and during the Sunday halaqa at the mosque)
      if (c.adhan) for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
        const t = P[k], inHalaqa = dow === 0 && (k === "maghrib" || k === "isha");
        push({ id: `adhan-${dk}-${k}`, at: +t, kind: "audio", prio: 2, stream: "alarm", silent: quiet(t) || inHalaqa,
          title: `🕌 ${L("حان وقت صلاة", "C'est l'heure de")} ${App.prName(k)}`, body: U.hm(t),
          items: [{ t: "url", url: k === "fajr" ? adhanUrl(FAJR, c.fajrVoice) : adhanUrl(ADHAN, c.voice), cache: true }] });
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
        push({ id: `gym-${dk}`, at: +gym.start, kind: "audio", prio: 1, stream: "media", silent: quiet(gym.start),
          title: `🏋️ ${L("وقت الجيم", "C'est l'heure de la salle")}`, body: name,
          items: [{ t: "tts", text: `حان وقت الرياضة. ${name ? "حصة اليوم: " + say(name) + "." : ""} لا تنس قياس السكر قبل التمرين.` }] });
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
      const sleep = blocks.filter(b => b.kind === "rest").sort((a, b) => a.start - b.start).pop();
      if (c.sleep && sleep && U.hm(sleep.start) >= "20:30") push({ id: `sleep-${dk}`, at: +sleep.start, kind: "audio", prio: 1, stream: "media",
        title: `😴 ${L("وقت النوم", "C'est l'heure de dormir")}`, body: L("قيس السكر، وأذكار النوم", "Glycémie, puis adhkar du coucher"),
        items: [{ t: "tts", text: "حان وقت النوم. لا تنس قياس السكر. نبدأ أذكار النوم." }, { t: "url", url: SLEEP, cache: true }] });
      // every two hours between sobh and isha: a short dhikr (not during classes, not over another sound)
      if (c.dhikr) {
        let k = 0;
        for (let t = U.plusMin(P.fajr, 120); t < P.isha; t = U.plusMin(t, 120)) {
          if (inClass(t) || busy(+t, 15) || (hifzAt && t >= hifzAt - 10 * 60000 && t <= hifzAt + 50 * 60000)) continue;
          const text = DHIKR[(k++ + i) % DHIKR.length];
          push({ id: `dhikr-${dk}-${U.hm(t).replace(":", "")}`, at: +t, kind: "audio", prio: 0, stream: "media",
            title: `📿 ${text}`, body: "", items: [{ t: "tts", text }, { t: "tts", text }] });
        }
      }
    }
    // the app's own reminders for today (glycemia, work, car, studies...), as plain notifications
    if (c.notify) {
      const audioAt = ev.filter(e => e.kind === "audio").map(e => e.at);
      for (const src of (App.eventSources || [])) {
        let list = []; try { list = src() || []; } catch (e) { list = []; }
        for (const x of list) {
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
  let lastSig = "", timer = null;
  function sync(force) {
    if (!N) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      let events; try { events = plan(); } catch (e) { return; }
      const sig = JSON.stringify(events);
      if (!force && sig === lastSig) return;
      lastSig = sig;
      try { N.schedule(JSON.stringify({ events })); } catch (e) { /* ignore */ }
    }, force ? 50 : 1500);
  }
  App.nativeSync = sync;
  const info = () => { try { return JSON.parse(N.info()) || {}; } catch (e) { return {}; } };

  if (N) {
    const render = App.render;
    App.render = function () { const r = render.apply(this, arguments); sync(false); return r; };
    window.NhariNativeResume = () => { sync(true); if (App.tab === "prefs") App.render(); };
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
    window.addEventListener("load", () => setTimeout(() => { sync(true); window.NhariNativeSharePending(); }, 800));
    setInterval(() => sync(false), 15 * 60000);
  }

  /* ---------------- settings card (Android app only) ---------------- */
  const opt = (list, cur) => list.map(a => `<option value="${a.id}" ${a.id === cur ? "selected" : ""}>${U.esc(L(a.ar, a.fr))}</option>`).join("");
  const ck = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}" ${on ? "checked" : ""}>${label}</label>`;
  App.NativePrefs = () => {
    if (!N) return "";
    const c = cfg(), s = info(), next = s.next ? `${U.esc(s.next.title)} — ${U.hm(new Date(s.next.at))}${U.dkey(new Date(s.next.at)) !== U.dkey() ? " (" + U.dateShort(U.dkey(new Date(s.next.at))) + ")" : ""}` : L("ما فماش", "aucun");
    const st = (ok, yes, no, act, btn) => `<div class="li"><span class="grow">${ok ? "✅" : "⚠️"} ${ok ? yes : no}</span>${ok ? "" : `<button class="btn sm primary" type="button" data-act="${act}">${btn}</button>`}</div>`;
    const seg = App.thumunSeg ? App.thumunSeg() : null;
    return `<div class="card stripe accent" style="grid-column:1/-1"><h3 id="native-card">🔔 ${L("التنبيهات بالصوت (التلفون)", "Rappels sonores (téléphone)")}</h3>
      <div class="list">
        ${st(s.notif, L("الإشعارات مفتوحة", "Notifications autorisées"), L("الإشعارات مسكّرة", "Notifications bloquées"), "natNotif", L("اسمح", "Autoriser"))}
        ${st(s.exact, L("المنبّه في الوقت بالضبط", "Alarmes à l'heure exacte"), L("المنبّه ما يجيش في الوقت بالضبط", "Alarmes pas à l'heure exacte"), "natExact", L("اسمح", "Autoriser"))}
        ${st(s.battery, L("البطارية: بلا قيود", "Batterie : sans restriction"), L("البطارية تنجم توقف التنبيهات", "La batterie peut bloquer les rappels"), "natBattery", L("بلا قيود", "Sans restriction"))}
        <div class="li"><span class="grow">⏰ ${L("الجاي", "Prochain")}: ${next}</span><span class="tiny muted">${s.count || 0} ${L("تنبيه مبرمج", "rappels prévus")}</span></div>
        ${s.sound === false ? `<div class="li"><span class="grow small muted">🔕 ${L("التلفون في الصامت: التنبيهات تجي بلا صوت (vibreur).", "Téléphone en silencieux : rappels sans son (vibreur).")}</span></div>` : ""}
      </div>
      <form data-form="nativeCfg" class="form" style="margin-top:10px">
        <div class="full" style="display:grid;gap:6px">
          ${ck("on", c.on, L("التنبيهات بالصوت مفتوحة", "Rappels sonores activés"))}
          ${ck("adhan", c.adhan, L("الأذان كامل في الخمس صلوات", "Adhan complet aux cinq prières"))}
          ${ck("morning", c.morning, L("أذكار الصباح وحدها (بعد الحلقة)", "Adhkar du matin (après la halaqa)"))}
          ${ck("evening", c.evening, L("أذكار المساء وحدها (قبل المغرب)", "Adhkar du soir (avant le Maghreb)"))}
          ${ck("sleep", c.sleep, L("وقت النوم + أذكار النوم", "Heure du coucher + adhkar du coucher"))}
          ${ck("gym", c.gym, L("وقت الجيم", "Heure de la salle"))}
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
        <button class="btn sm" type="button" data-act="natTest" data-k="dhikr">🔊 ${L("صلّ على النبي", "Prière sur le Prophète")}</button>
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
    const s = Store.doc("settings"), bools = ["on", "adhan", "morning", "evening", "sleep", "gym", "dhikr", "hifz", "quietClass", "notify"];
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
  App.acts.natTest = (el) => {
    if (!N) return;
    const c = cfg(), k = el.dataset.k;
    let e;
    if (k === "adhan") e = { title: "🕌 " + L("تجربة الأذان", "Test de l'adhan"), stream: "alarm", items: [{ t: "url", url: adhanUrl(ADHAN, c.voice), cache: true }] };
    else if (k === "dhikr") e = { title: "📿 " + DHIKR[0], items: [{ t: "tts", text: DHIKR[0] }] };
    else if (k === "morning") { const v = ADHKAR.find(a => a.id === c.adhkarVoice) || ADHKAR[0]; e = { title: "☀️ " + L("أذكار الصباح", "Adhkar du matin"), items: [{ t: "tts", text: "أذكار الصباح" }, { t: "url", url: AK(v.m), cache: true }] }; }
    else if (k === "hifz") { const th = thumunItems(1); if (!th) { App.toast(L("الثمن موش محدّد", "Thumun non défini"), L("حدّد الحلقة (السورة والآيات) في الإعدادات.", "Indique la halaqa (sourate et versets) dans les réglages."), "warn"); return; } e = { title: "📖 " + th.label, items: th.items }; }
    if (!e) return;
    N.test(JSON.stringify(Object.assign({ id: "test-" + Date.now(), kind: "audio", prio: 3, stream: "media", body: L("تجربة", "Test") }, e)));
  };
})();
