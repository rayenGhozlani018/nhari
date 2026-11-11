/* Nhari — quick actions shared by the PC, the phone and the web version:
   one-tap confirmations (prayer, glucose, gym), "what's next" at the top of Today, light reminder mode
   with a morning and an evening summary, tasbih counter, water, glucose meter photo, hifz self-test. */
(function () {
  "use strict";
  const tab = (name, id, label, render) => { (App.EXT.tabs[name] = App.EXT.tabs[name] || []).push({ id, label, render }); };
  const card = (name, fn) => { (App.EXT.cards[name] = App.EXT.cards[name] || []).push(fn); };
  const PR = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const med = () => { const m = Store.doc("medical"); m.water = m.water || {}; return m; };

  /* =====================================================================
     ONE-TAP LOGGING (also used by the phone's notification buttons)
     ===================================================================== */
  const Q = App.Quick = {
    prayed(k, dk = U.dkey()) {
      const d = Store.doc("deen"); d.prayers[dk] = d.prayers[dk] || {}; d.prayers[dk][k] = true; Store.save("deen");
    },
    bg(value, ctx = "other", ts = Date.now()) {
      App.forms.bgAdd({ bg: String(value), ctx, ts: U.localInput(new Date(ts)), note: "" });
    },
    gymDone(dk = U.dkey()) {
      const sp = Store.doc("sport"); if (sp.done[dk]) return;
      sp.done[dk] = { w: App.S.dayKey(U.parseD(dk)), ts: Date.now() }; Store.save("sport");
    },
    waterGoal() {
      const p = Store.doc("settings").profile || {}, kg = +p.weight || 70;
      const ml = kg * 35 + (App.S.gym() ? 500 : 0);
      return Math.max(6, Math.min(16, Math.round(ml / 250)));
    },
    water(dk = U.dkey()) { return +med().water[dk] || 0; },
    addWater(n = 1) {
      const m = med(), dk = U.dkey();
      m.water[dk] = Math.max(0, (+m.water[dk] || 0) + n);
      const lim = U.dkey(U.addDays(new Date(), -60)); for (const k of Object.keys(m.water)) if (k < lim) delete m.water[k];
      Store.save("medical");
    },
    light() { return (Store.doc("settings").notify || {}).mode !== "full"; }
  };

  /* ---------- what is waiting for a confirmation ---------- */
  const bgSince = (t) => App.H.entries(1).some(e => e.type === "bg" && e.ts >= t);
  function pending(now = new Date()) {
    const out = [], t = +now, dk = U.dkey(now);
    let P = null; try { P = App.prayer.today(now); } catch (e) { /* ignore */ }
    const log = Store.doc("deen").prayers[dk] || {};
    if (P) PR.forEach(k => { if (P[k] <= now && t - P[k] < 14 * 3600000 && !log[k]) out.push({ type: "prayer", k, label: App.prName(k) }); });
    let blocks = []; try { blocks = App.R ? App.R.day(now) : []; } catch (e) { blocks = []; }
    const bgRe = /قيس السكر|glyc/i;
    // a meal or the gym check started in the last hour, or a main meal 2 h ago, with no measure since
    for (const b of blocks) {
      if (!bgRe.test(b.title || "") || (b.kind !== "food" && b.kind !== "health")) continue;
      const s = +b.start, after = s + 120 * 60000, snack = /لمجة|Collation/i.test(b.title);
      if (t >= s - 5 * 60000 && t - s < 60 * 60000 && !bgSince(s - 20 * 60000)) out.push({ type: "bg", ctx: b.kind === "health" ? "presport" : "pre", label: String(b.title).split(/[+—]/)[0].trim() });
      else if (!snack && b.kind === "food" && t >= after && t - after < 60 * 60000 && !bgSince(after - 25 * 60000)) out.push({ type: "bg", ctx: "post", label: L("ساعتين بعد ", "2 h après ") + String(b.title).split(/[+—]/)[0].trim() });
    }
    const gym = blocks.find(b => b.kind === "sport");
    if (gym && App.S.gym() && t > +gym.end && !App.S.doneToday()) out.push({ type: "gym", label: App.S.title(App.S.todayKey()) });
    return out;
  }
  Q.pending = pending;

  function next3(now = new Date()) {
    const t = +now;
    let items = [];
    try { items = App.R.day(now).filter(b => +b.end > t).map(b => ({ b, cur: +b.start <= t })); } catch (e) { items = []; }
    if (items.length < 3) { try { items = items.concat(App.R.day(U.addDays(now, 1)).map(b => ({ b, cur: false, tomorrow: true }))); } catch (e) { /* ignore */ } }
    return items.slice(0, 3);
  }
  Q.next3 = next3;

  const bgStep = () => U.bgUnit() === "gL" ? "0.01" : U.bgUnit() === "mmol" ? "0.1" : "1";
  Q.topCard = () => {
    const now = new Date(), pend = pending(now), nx = next3(now), last = App.H.lastBg();
    let urgent = "";
    if (last && last.bg < 70 && Date.now() - last.ts < 3600000) urgent = `<div class="alertbox bad small" style="margin-bottom:8px">⚠️ ${L("السكر هابط: كول 15 غ سكر سريع وعاود قيس بعد 15 دقيقة.", "Glycémie basse : 15 g de sucre rapide, recontrôle dans 15 min.")}</div>`;
    else if (last && last.bg > 250 && Date.now() - last.ts < 3 * 3600000) urgent = `<div class="alertbox bad small" style="margin-bottom:8px">⚠️ ${L("السكر عالي برشا: اشرب الماء وعاود قيس.", "Glycémie très haute : bois de l'eau et recontrôle.")}</div>`;
    const pr = pend.filter(p => p.type === "prayer"), bg = pend.find(p => p.type === "bg"), gym = pend.find(p => p.type === "gym");
    const pendHtml = (pr.length || bg || gym) ? `<div class="qpend">
        ${pr.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="small muted">${L("صلّيت؟", "Prière faite ?")}</span>${pr.map(p => `<button class="btn sm" data-act="qPray" data-k="${p.k}">✅ ${U.esc(p.label)}</button>`).join("")}</div>` : ""}
        ${bg ? `<form data-form="qBg" class="row" style="gap:6px;align-items:center;margin-top:6px"><span class="small">🩸 ${L("قيس السكر", "Glycémie")} — ${U.esc(bg.label)}</span><input name="v" type="number" step="${bgStep()}" min="0" inputmode="decimal" required placeholder="${U.bgUnitLabel()}" style="max-width:110px"><input type="hidden" name="ctx" value="${bg.ctx}"><button class="btn sm primary" type="submit">${L("سجّل", "Noter")}</button></form>` : ""}
        ${gym ? `<div class="row" style="gap:6px;align-items:center;margin-top:6px"><span class="small">🏋️ ${U.esc(gym.label)}</span><button class="btn sm" data-act="qGym">✅ ${L("عملت الحصة", "Séance faite")}</button></div>` : ""}
      </div>` : "";
    const rows = nx.map(({ b, cur, tomorrow }) => {
      const ic = I[App.R.kindIcon[b.kind]] || I.clock;
      const when = cur ? `<span class="pill accent">${L("توا", "Maintenant")}</span>` : `<span class="tiny muted">${tomorrow ? L("غدوة", "Demain") + " " : ""}${L("بعد", "dans")} ${U.dur(+b.start - Date.now())}</span>`;
      return `<div class="li k-${b.kind}"><span class="k-ico">${ic}</span><span class="num small" style="min-width:44px;font-weight:600">${U.hm(b.start)}</span><span class="grow">${U.esc(b.title)}</span>${when}</div>`;
    }).join("");
    return `<div class="card stripe accent qtop" style="margin:14px 0">${urgent}${pendHtml}
      <h3 style="margin-top:${pendHtml ? "10px" : "0"}">⏭ ${L("الجاي", "À venir")}</h3><div class="list tl">${rows || `<p class="small muted">${L("ما فماش حاجة أخرى اليوم.", "Rien d'autre aujourd'hui.")}</p>`}</div></div>`;
  };
  App.acts.qPray = (el) => { Q.prayed(el.dataset.k); App.toast(L("تقبّل الله", "Qu'Allah l'accepte"), App.prName(el.dataset.k), "good"); App.render(); };
  App.forms.qBg = (fd) => Q.bg(fd.v, fd.ctx || "other");
  App.acts.qGym = () => { Q.gymDone(); App.toast(L("يعطيك الصحة", "Bravo"), L("الحصة تسجّلت.", "Séance enregistrée."), "good"); App.render(); };

  /* ---------- folding sections of Today (remembered per device) ---------- */
  Q.open = (id) => {
    let v = null; try { v = localStorage.getItem("nhari:fold:" + id); } catch (e) { /* ignore */ }
    if (v === "1") return "open"; if (v === "0") return "";
    return window.innerWidth >= 900 ? "open" : "";
  };
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d && d.matches && d.matches("details[data-fold]")) { try { localStorage.setItem("nhari:fold:" + d.dataset.fold, d.open ? "1" : "0"); } catch (err) { /* ignore */ } }
  }, true);

  /* =====================================================================
     LIGHT MODE: adhan, glucose, thumun and adhkar stay; the rest goes into two summaries
     ===================================================================== */
  function digest(kind, d = new Date(), live = true) {
    const dk = U.dkey(d), lines = [];
    let blocks = []; try { blocks = App.R.day(d); } catch (e) { blocks = []; }
    const gym = blocks.find(b => b.kind === "sport"), cls = blocks.find(b => b.cls), hifz = blocks.find(b => b.hifz);
    const goal = Q.waterGoal();
    if (kind === "am") {
      if (gym) lines.push(`🏋️ ${L("الجيم", "Salle")} ${U.hm(gym.start)} — ${App.S.title(App.S.dayKey(d))}`);
      try {
        const mc = Store.doc("moneycfg"), isWork = mc.workDays.includes(U.dow(d)) && !mc.offDays[dk];
        if (isWork) {
          const c = App.moneyCalc(), price = (App.W.price("orange") + App.W.price("ooredoo")) / 2 || 20;
          const open = App.W.ticketsOn(dk).filter(t => t.status === "todo").length;
          const obj = dk === U.dkey() ? c.todayObj : c.dailyObj; // a summary planned for another day: the usual daily goal
          lines.push(`🧰 ${L("الخدمة", "Travail")}: ${obj ? L(`لازمك ${Math.ceil(obj / price)} تدخلات`, `${Math.ceil(obj / price)} interventions`) : ""}${open ? " · " + L(`${open} تيكيات`, `${open} tickets`) : ""}`);
        }
      } catch (e) { /* ignore */ }
      if (hifz) lines.push(`📖 ${L("الحفظ", "Hifz")} ${U.hm(hifz.start)}`);
      if (cls) lines.push(`🎓 ${U.hm(cls.start)} — ${String(cls.title).replace(/^[^:]*:\s*/, "")}`);
      const st = Store.doc("study"), soon = U.dkey(U.addDays(d, 3));
      st.exams.filter(e => e.date >= dk && e.date <= soon).forEach(e => lines.push(`📝 ${L("امتحان", "Examen")} ${e.date === dk ? L("اليوم", "aujourd'hui") : U.dateShort(U.parseD(e.date))}: ${App.St ? App.St.subName(e.subj) : e.subj}`));
      lines.push(`💧 ${L("الماء", "Eau")}: ${goal} ${L("كاسات", "verres")} · 📿 ${L("أكثر من الصلاة على النبي ﷺ", "Multiplie les prières sur le Prophète ﷺ")}`);
      return { title: "☀️ " + L("نهارك اليوم", "Ta journée"), body: lines.join("\n") };
    }
    if (live) {
      const log = Store.doc("deen").prayers[dk] || {}, miss = PR.filter(k => !log[k]).map(k => App.prName(k));
      if (miss.length) lines.push(`🕌 ${L("ما علّمتش", "Pas cochées")}: ${miss.join("، ")}`);
      if (gym && !Store.doc("sport").done[dk]) lines.push(`🏋️ ${L("الجيم موش معلّم", "Salle pas cochée")}`);
      lines.push(`💧 ${L("الماء", "Eau")}: ${Q.water(dk)}/${goal}`);
      try { const open = App.W.ticketsOn(dk).filter(t => t.status === "todo").length; if (open) lines.push(`🧰 ${L(`${open} تيكيات باقين (يتعدّاو لغدوة)`, `${open} tickets restants (reportés à demain)`)}`); } catch (e) { /* ignore */ }
    } else lines.push(`✅ ${L("علّم اللي عملتو اليوم (الصلاة، الجيم، الماء)", "Coche ce que tu as fait (prières, salle, eau)")}`);
    const tm = U.addDays(d, 1); let tb = []; try { tb = App.R.day(tm); } catch (e) { tb = []; }
    const tg = tb.find(b => b.kind === "sport"), tc = tb.find(b => b.cls);
    const tmr = [tg ? `${L("الجيم", "salle")} ${U.hm(tg.start)} (${App.S.title(App.S.dayKey(tm))})` : "", tc ? `${L("قراية", "cours")} ${U.hm(tc.start)}` : ""].filter(Boolean);
    if (tmr.length) lines.push(`➡️ ${L("غدوة", "Demain")}: ${tmr.join(" · ")}`);
    return { title: "🌙 " + L("آخر النهار", "Fin de journée"), body: lines.join("\n") };
  }
  Q.digest = digest;
  Q.digestTimes = (d = new Date()) => {
    let P = null; try { P = App.prayer.today(d); } catch (e) { return null; }
    const rc = App.R ? App.R.cfg() : { halaqaMin: 30 };
    let am = U.plusMin(P.fajr, 15 + (+rc.halaqaMin || 30) + 30);
    const floor = U.atTime("06:30", d); if (am < floor) am = floor;
    let blocks = []; try { blocks = App.R.day(d); } catch (e) { blocks = []; }
    // before the first thing of the day (a morning gym, work, a class, the road), but after the dawn prayer
    const first = blocks.filter(b => /^(sport|work|study|travel|project)$/.test(b.kind) && +b.start > +P.fajr).sort((a, b) => a.start - b.start)[0];
    if (first && U.plusMin(first.start, -15) < am) am = new Date(Math.max(+U.plusMin(first.start, -15), +U.plusMin(P.fajr, 20)));
    const sleep = blocks.filter(b => b.kind === "rest").sort((a, b) => a.start - b.start).pop();
    const pm = sleep ? U.plusMin(sleep.start, -60) : U.atTime("21:30", d);
    return { am, pm };
  };
  // reminders on the PC / web: in light mode keep the important ones and add the two summaries
  // kept in light mode: prayer, adhkar, glucose, thumun, sleep, and the rare ones (Friday, supplements, absences, car)
  const KEEP = Q.KEEP = /^(adhan-|adhkar-|hypo|meal-|fri-|kahf|supp-|abs-|car-|r-(health|food|quran|rest)-)/;
  const collect = App.collectEvents;
  App.collectEvents = () => {
    const list = collect();
    if (!Q.light()) return list;
    const out = list.filter(e => KEEP.test(e.key || ""));
    const tt = Q.digestTimes(new Date());
    if (tt) {
      const am = digest("am", new Date()), pm = digest("pm", new Date(), true);
      out.push({ key: "q-digest-am-" + U.dkey(), at: tt.am, title: am.title, body: am.body, kind: "info" });
      out.push({ key: "q-digest-pm-" + U.dkey(), at: tt.pm, title: pm.title, body: pm.body, kind: "info" });
    }
    return out.sort((a, b) => a.at - b.at);
  };
  Q.modeChips = () => {
    const light = Q.light();
    return `<div class="row" style="gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px"><span class="small muted">${L("التنبيهات", "Rappels")}:</span>
      <button class="btn sm ${light ? "primary" : ""}" data-act="qMode" data-v="light">${L("خفيف", "Léger")}</button>
      <button class="btn sm ${light ? "" : "primary"}" data-act="qMode" data-v="full">${L("كامل", "Complet")}</button>
      <span class="tiny muted">${light ? L("الأذان، السكر، الثمن والأذكار + ملخّص الصباح والعشية", "Adhan, glycémie, thumun, adhkar + résumé matin et soir") : L("كل التنبيهات", "Tous les rappels")}</span></div>`;
  };
  App.acts.qMode = (el) => {
    const s = Store.doc("settings"); s.notify = s.notify || {}; s.notify.mode = el.dataset.v; Store.save("settings");
    if (App.nativeSync) App.nativeSync(true);
    App.toast(el.dataset.v === "light" ? L("الوضع الخفيف", "Mode léger") : L("الوضع الكامل", "Mode complet"), "", "good"); App.render();
  };

  /* =====================================================================
     WATER
     ===================================================================== */
  card("tiles", () => {
    const n = Q.water(), g = Q.waterGoal(), pct = Math.min(100, Math.round(n / g * 100));
    return `<div class="tile"><span class="k">💧 ${L("الماء", "Eau")}</span><span class="v">${n}<small class="tiny muted"> / ${g}</small></span>
      <div class="bar ${pct >= 100 ? "good" : ""}" style="margin:4px 0;height:8px"><i style="width:${pct}%"></i></div>
      <span class="row" style="gap:6px"><button class="btn sm primary" data-act="qWater" data-n="1" aria-label="${L("زيد كاس", "Un verre de plus")}">+1 ${L("كاس", "verre")}</button><button class="btn sm ghost" data-act="qWater" data-n="-1" aria-label="${L("نقّص", "Retirer")}">−</button></span></div>`;
  });
  App.acts.qWater = (el) => { Q.addWater(+el.dataset.n || 1); if (+el.dataset.n > 0 && Q.water() === Q.waterGoal()) App.toast(L("وصلت للهدف 💧", "Objectif atteint 💧"), "", "good"); App.render(); };

  /* =====================================================================
     TASBIH COUNTER
     ===================================================================== */
  const ZK = [["سبحان الله", "Subhanallah"], ["الحمد لله", "Alhamdulillah"], ["الله أكبر", "Allahu akbar"], ["أستغفر الله", "Astaghfirullah"], ["لا إله إلا الله", "La ilaha illa Allah"], ["اللهم صلّ على محمد", "Salat sur le Prophète"], ["سبحان الله وبحمده", "Subhanallah wa bihamdih"]];
  const ts = { n: 0, z: 0, target: 33, saveT: null };
  const vib = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
  function tasbihView() {
    const d = Store.doc("deen"); const today = (d.tasbih || {})[U.dkey()] || {};
    const total = U.sum(Object.values(today), x => +x || 0);
    return `<div class="grid g2"><div class="card stripe accent" style="text-align:center"><h3 style="justify-content:center">📿 ${L("السبحة", "Tasbih")}</h3>
      <div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap">
        <select data-change="tsZ" aria-label="${L("الذكر", "Dhikr")}">${ZK.map((z, i) => `<option value="${i}" ${i === ts.z ? "selected" : ""}>${z[0]}</option>`).join("")}</select>
        <select data-change="tsT" aria-label="${L("العدد", "Objectif")}">${[33, 99, 100, 0].map(n => `<option value="${n}" ${n === ts.target ? "selected" : ""}>${n || "∞"}</option>`).join("")}</select></div>
      <button class="tasbih" data-act="tsTap" aria-label="${L("سبّح", "Compter")}"><span id="tsN">${ts.n}</span><small>${ts.target ? "/ " + ts.target : ""}</small><em>${ZK[ts.z][0]}</em></button>
      <div class="row" style="gap:8px;justify-content:center"><button class="btn sm ghost" data-act="tsReset">${L("من الأول", "Remettre à zéro")}</button></div>
      <p class="small muted" style="margin-top:8px">${L("اليوم", "Aujourd'hui")}: <b id="tsTotal">${total}</b> · ${L("التلفون يرعش مع كل تسبيحة، ويرعش أقوى كي توفى العدد.", "Le téléphone vibre à chaque tasbih, plus fort quand l'objectif est atteint.")}</p></div>
      <div class="card"><h3>${L("اليوم", "Aujourd'hui")}</h3><div class="list">${Object.keys(today).length ? Object.entries(today).map(([k, v]) => `<div class="li"><span class="grow">${U.esc(k)}</span><b class="num">${v}</b></div>`).join("") : `<p class="small muted">${L("ما سبّحتش بالسبحة اليوم.", "Pas encore de tasbih aujourd'hui.")}</p>`}</div></div></div>`;
  }
  function tsSave() {
    clearTimeout(ts.saveT);
    ts.saveT = setTimeout(() => { Store.save("deen"); if (App.tab === "deen") App.render(); }, 1500); // and refresh the list of the day
  }
  App.acts.tsTap = () => {
    const d = Store.doc("deen"); d.tasbih = d.tasbih || {}; const dk = U.dkey(); d.tasbih[dk] = d.tasbih[dk] || {};
    const name = ZK[ts.z][0]; d.tasbih[dk][name] = (+d.tasbih[dk][name] || 0) + 1;
    const lim = U.dkey(U.addDays(new Date(), -30)); for (const k of Object.keys(d.tasbih)) if (k < lim) delete d.tasbih[k];
    ts.n++;
    if (ts.target && ts.n >= ts.target) { vib([90, 60, 90]); ts.n = 0; App.toast(L("كمّلت", "Terminé"), `${ts.target} × ${name}`, "good"); }
    else vib(15);
    const el = document.getElementById("tsN"); if (el) el.textContent = ts.n;
    const tt = document.getElementById("tsTotal"); if (tt) tt.textContent = U.sum(Object.values(d.tasbih[dk]), x => +x || 0);
    tsSave();
  };
  App.acts.tsReset = () => { ts.n = 0; App.render(); };
  App.changes.tsZ = (el) => { ts.z = +el.value || 0; ts.n = 0; App.render(); };
  App.changes.tsT = (el) => { ts.target = +el.value || 0; ts.n = 0; App.render(); };
  tab("deen", "tasbih", () => L("السبحة", "Tasbih"), tasbihView);

  /* =====================================================================
     GLUCOSE METER PHOTO → value read by the AI, confirmed by the user
     ===================================================================== */
  App.changes.bgPhoto = async (el) => {
    const f = el.files && el.files[0]; el.value = "";
    if (!f) return;
    if (!App.ai) { App.toast(L("يستحق الذكاء الاصطناعي", "IA nécessaire"), L("زيد clé Gemini في الإعدادات.", "Ajoute une clé Gemini dans les réglages."), "warn"); return; }
    const out = document.getElementById("bgPhotoOut");
    if (out) out.innerHTML = `<span class="spinner"></span> ${L("نقرا في الرقم…", "Lecture du chiffre…")}`;
    const prompt = `This is a photo of a blood glucose meter (or a continuous glucose monitor screen).
Read the main glucose value shown on the display and its unit. Do not guess: if the display is not readable, say so.
Reply with ONLY one JSON object: {"value": number or null, "unit": "mg/dL" | "g/L" | "mmol/L" | null, "readable": true|false, "note": "short reason if not readable"}`;
    try {
      const j = await App.ai.json(prompt, { images: [f], modelTier: "quick" });
      const v = j && +j.value;
      if (!j || !j.readable || !(v > 0)) { if (out) out.innerHTML = `<span class="small">⚠️ ${L("ما نجمتش نقرا الرقم. صوّر من قريب وبلا ضو يلمع، ولا اكتبو بيدك.", "Chiffre illisible. Reprends la photo de près, sans reflet, ou tape-le.")}</span>`; return; }
      let mg = v;
      const unit = String(j.unit || "").toLowerCase();
      if (unit.includes("mmol")) mg = v * 18; else if (unit.includes("g/l")) mg = v * 100; else if (!unit && v < 30) mg = U.bgUnit() === "mmol" ? v * 18 : v * 100;
      const shown = U.bgFromMg(mg), inp = document.getElementById("bg-val");
      if (inp) { inp.value = shown; inp.focus(); }
      if (out) out.innerHTML = `<span class="small">✅ ${L("قريت", "Lu")}: <b>${U.esc(U.bgFmt(mg))}</b> — ${L("تثبّت وانزل «سجّل».", "Vérifie puis « Enregistrer ».")}</span>`;
    } catch (e) {
      if (out) out.innerHTML = `<span class="small">⚠️ ${U.esc(App.aiError ? App.aiError(e) : L("صار مشكل", "Erreur"))}</span>`;
    }
  };

  /* =====================================================================
     HIFZ SELF-TEST: the start of each verse, recite, reveal, mark
     ===================================================================== */
  // letters only (no harakat, alef wasla as alef), to recognise the basmala whatever the order of the marks
  const bare = (w) => w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/[ٱأإآ]/g, "ا");
  const isWord = (w) => /[\u0621-\u064A\u0671]/.test(w); // not a pause mark or ۞ alone
  const dropBasmala = (text) => { const w = text.split(/\s+/); return w.length > 4 && bare(w.slice(0, 4).join(" ")) === "بسم الله الرحمن الرحيم" ? w.slice(4).join(" ") : text; };
  async function surahText(s) {
    const key = "nhari:qtext:" + s;
    try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch (e) { /* ignore */ }
    const r = await fetch(`https://api.alquran.cloud/v1/surah/${s}/quran-uthmani`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const list = (j.data && j.data.ayahs || []).map(a => String(a.text || ""));
    if (s !== 1 && s !== 9 && list[0]) list[0] = dropBasmala(list[0]).trim();
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* ignore */ }
    return list;
  }
  const ht = () => (App.uiState.ht = App.uiState.ht || { st: "idle" });
  function testView() {
    const h = (App.Q && App.Q.halaqa && App.Q.halaqa()) || {}, t = ht();
    const s = +t.s || +h.surah || 9, a = +t.a || parseInt(h.from) || 1, b = +t.b || parseInt(h.to) || a + 7;
    let body = "";
    if (t.st === "loading") body = `<p class="small"><span class="spinner"></span> ${L("نجيب في الآيات…", "Chargement des versets…")}</p>`;
    else if (t.st === "err") body = `<div class="alertbox warn small">${L("ما نجمتش نجيب النص (يستحق انترنت مرة لكل سورة).", "Impossible de charger le texte (internet nécessaire une fois par sourate).")}</div>`;
    else if (t.st === "run") {
      const v = t.list[t.i], head = v.text.split(/\s+/).filter(isWord).slice(0, 3).join(" ");
      body = `<div class="small muted">${L("الآية", "Verset")} ${v.n} · ${t.i + 1}/${t.list.length} · ✅ ${t.ok} · ❌ ${t.bad.length}</div>
        <div class="quran" style="font-size:1.45rem;line-height:2.2;margin:12px 0;min-height:4em">${t.shown ? U.esc(v.text) : U.esc(head) + ` <span class="muted">…</span>`}</div>
        ${t.shown ? `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn good" data-act="htMark" data-v="1">✅ ${L("قريتها صحيحة", "Juste")}</button><button class="btn" data-act="htMark" data-v="0">❌ ${L("غلطت ولا وقفت", "Erreur / blocage")}</button></div>`
          : `<p class="small muted">${L("كمّل الآية من حفظك (بالصوت ولا في بالك)، وبعد شوف.", "Continue le verset de mémoire (à voix haute ou dans ta tête), puis vérifie.")}</p><button class="btn primary" data-act="htShow">👁 ${L("ورّيني الآية", "Afficher le verset")}</button>`}`;
    } else if (t.st === "done") {
      const n = t.ok + t.bad.length;
      body = `<div class="mid">${t.ok}/${n} ${L("صحيحة", "justes")}</div>
        ${t.bad.length ? `<p class="small" style="margin-top:6px">${L("راجع الآيات", "Revois les versets")}: ${t.bad.map(x => x.n).join("، ")}</p><button class="btn primary" style="margin-top:8px" data-act="htRetry">🔁 ${L("عاود الغلطات", "Refaire les erreurs")}</button>` : `<p class="small" style="margin-top:6px">${L("ما شاء الله، الثمن محفوظ. جاهز للعرض.", "Ma sha Allah, thumun maîtrisé. Prêt pour le 'ard.")}</p>`}`;
    }
    const seg = App.thumunSeg ? App.thumunSeg() : null;
    return `<div class="grid g2"><div class="card stripe accent"><h3>🧠 ${L("اختبر حفظك", "Teste ton hifz")}</h3>
      <form data-form="htStart" class="form">
        <label class="f">${L("السورة", "Sourate")}<input name="s" type="number" min="1" max="114" value="${s}"></label>
        <label class="f">${L("من الآية", "Du verset")}<input name="a" type="number" min="1" value="${a}"></label>
        <label class="f">${L("للآية", "Au verset")}<input name="b" type="number" min="1" value="${b}"></label>
        <label class="f">${L("الترتيب", "Ordre")}<select name="o"><option value="seq">${L("بالترتيب", "Dans l'ordre")}</option><option value="mix">${L("مخلّط", "Mélangé")}</option></select></label>
        <button class="btn primary full" type="submit">${t.st === "run" ? L("عاود من الأول", "Recommencer") : L("ابدا الاختبار", "Commencer le test")}</button></form>
      <div style="margin-top:12px">${body}</div>
      <p class="tiny muted" style="margin-top:10px">${L("النص المكتوب برواية حفص (المصحف العثماني): انتبه للفروق مع قالون.", "Texte en lecture Hafs (mushaf uthmani) : attention aux différences avec Qalun.")}${seg ? ` <button class="btn sm" type="button" data-act="auSeg">🎧 ${L("اسمع الثمن بقالون", "Écouter le thumun en Qalun")}</button>` : ""}</p></div>
      <div class="card"><h3>${L("آخر الاختبارات", "Derniers tests")}</h3>${(() => {
        const tests = Object.entries(Store.doc("deen").hifzTests || {}).sort((x, y) => y[0].localeCompare(x[0])).slice(0, 8);
        return tests.length ? `<div class="list">${tests.map(([dk, r]) => `<div class="li"><span class="grow">${U.dateShort(U.parseD(dk))} — ${L("سورة", "S.")} ${r.s} (${r.a}–${r.b})</span><b class="num">${r.ok}/${r.n}</b></div>`).join("")}</div>` : `<p class="small muted">${L("ما عملتش اختبار بعد. أحسن وقت: نهار الجمعة قبل العرض.", "Pas encore de test. Idéal : vendredi, avant le 'ard du samedi.")}</p>`;
      })()}</div></div>`;
  }
  App.forms.htStart = async (fd) => {
    const s = Math.min(114, Math.max(1, +fd.s || 9)), t = ht();
    Object.assign(t, { st: "loading", s, a: +fd.a || 1, b: +fd.b || 1 }); App.render();
    try {
      const all = await surahText(s), a = Math.min(all.length, Math.max(1, +fd.a || 1)), b = Math.min(all.length, Math.max(a, +fd.b || a));
      let list = []; for (let n = a; n <= b; n++) list.push({ n, text: all[n - 1] });
      if (fd.o === "mix") list = list.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
      Object.assign(t, { st: "run", a, b, list, i: 0, ok: 0, bad: [], shown: false });
    } catch (e) { t.st = "err"; }
    App.render();
  };
  App.acts.htShow = () => { ht().shown = true; App.render(); };
  App.acts.htMark = (el) => {
    const t = ht(); if (t.st !== "run") return;
    if (el.dataset.v === "1") t.ok++; else t.bad.push(t.list[t.i]);
    t.i++; t.shown = false;
    if (t.i >= t.list.length) {
      t.st = "done";
      const d = Store.doc("deen"); d.hifzTests = d.hifzTests || {};
      d.hifzTests[U.dkey()] = { s: t.s, a: t.a, b: t.b, ok: t.ok, n: t.ok + t.bad.length };
      const keys = Object.keys(d.hifzTests).sort(); while (keys.length > 30) delete d.hifzTests[keys.shift()];
      Store.save("deen");
    }
    App.render();
  };
  App.acts.htRetry = () => { const t = ht(); Object.assign(t, { st: "run", list: t.bad.slice(), i: 0, ok: 0, bad: [], shown: false }); App.render(); };
  tab("deen", "test", () => L("اختبر حفظك", "Tester le hifz"), testView);
})();
