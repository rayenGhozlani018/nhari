/* Nhari — Nightly review (المحاسبة) + carry-over of what wasn't done */
(function () {
  "use strict";
  const doc = () => Store.doc("review");
  const WHY = [["time", "ما لقيتش وقت", "Pas eu le temps"], ["tired", "تعبت", "Fatigué"], ["forgot", "نسيت", "Oublié"], ["urgent", "حاجة طارئة", "Imprévu"], ["sick", "مريض / السكر", "Malade / glycémie"]];

  // what the day asked of him, with the status the app can already see
  function items(d = new Date()) {
    const dk = U.dkey(d), dow = U.dow(d), out = [];
    const add = (key, label, auto, extra) => out.push(Object.assign({ key, label, auto }, extra || {}));
    const deen = Store.doc("deen"), sp = Store.doc("sport"), st = Store.doc("study");
    const pr = deen.prayers[dk] || {}, n = ["fajr", "dhuhr", "asr", "maghrib", "isha"].filter(k => pr[k]).length;
    add("prayers", L(`الصلوات الخمس (${n}/5)`, `Les 5 prières (${n}/5)`), n === 5 ? "done" : n ? "part" : "miss", { carry: n < 5 ? { label: L("قضاء الصلوات اللي فاتو", "Rattraper les prières manquées"), min: 10 } : null });
    if (dow >= 1 && dow <= 5) add("hifz", L("حفظ جزء الثمن (15 دقيقة)", "Mémoriser la part du thumun (15 min)"), deen.wird && deen.wird[dk] ? "done" : "miss", { carry: { label: L("عوّض حفظ البارح (15 دقيقة)", "Rattraper la mémorisation d'hier (15 min)"), min: 15 } });
    if (dow === 6) add("ard", L("العرض في الحلقة", "Récitation ('ard) à la halaqa"), "", { manual: true });
    const ap = App.adhkarProgress, am = ap("morning"), pm = ap("evening");
    add("adhkar", L("أذكار الصباح والمساء", "Adhkar du matin et du soir"), am.done === am.total && pm.done === pm.total ? "done" : (am.done || pm.done) ? "part" : "miss");
    if (App.S.dayKey(d) !== "rest") add("gym", L("الجيم: ", "Salle : ") + App.S.title(App.S.dayKey(d)), sp.done && sp.done[dk] ? "done" : "miss", { carry: { label: L("عوّض حصة ", "Rattraper la séance ") + App.S.title(App.S.dayKey(d)), min: 75, big: true } });
    if (App.S.gym()) add("creatine", L("الكرياتين 5 غ", "Créatine 5 g"), sp.creatine && sp.creatine[dk] ? "done" : "miss");
    const bg = App.H.entries(2).filter(e => e.type === "bg" && U.dkey(new Date(e.ts)) === dk).length;
    add("glucose", L(`قيس السكر 3 مرات على الأقل (${bg})`, `Glycémie au moins 3 fois (${bg})`), bg >= 3 ? "done" : bg ? "part" : "miss");
    const cls = App.R.classesFor(d);
    if (cls.length) add("classes", L("حضرت القراية", "Présent aux cours") + " — " + [...new Set(cls.map(c => c.subj))].join(", "), "", { manual: true, carry: { label: L("شوف الدرس اللي فاتك في فضاء الطالب (supports)", "Rattraper le cours manqué (supports sur l'espace étudiant)"), min: 30, big: true } });
    const mc = Store.doc("moneycfg");
    if (mc.workDays.includes(dow) && !mc.offDays[dk]) {
      const t = App.W.ticketsOn(dk), done = t.filter(x => x.status === "done").length, left = t.filter(x => x.status === "todo").length;
      let need = 0; try { const c = App.moneyCalc(); need = Math.ceil(c.todayObj / (((App.W.price("orange") + App.W.price("ooredoo")) / 2) || 20)); } catch (e) { /* ignore */ }
      add("work", L(`التدخلات (${done}${need ? "/" + need : ""})`, `Interventions (${done}${need ? "/" + need : ""})`), (need ? done >= need : !left) ? "done" : done ? "part" : "miss", { tickets: left });
    }
    const blocks = App.R.day(d);
    if (blocks.some(b => b.kind === "project")) { const nt = App.Mentor.nextTask(); add("project", L("مهمة المشروع", "Tâche du projet") + (nt ? " — " + L(nt.ar, nt.fr).slice(0, 60) : ""), App.Mentor.doneToday(dk) ? "done" : "miss", { carry: { label: L("كمّل مهمة المشروع", "Terminer la tâche du projet"), min: 45, big: true } }); }
    const plan = App.St.plan(d);
    if (plan.length) { const dn = (st.done[dk] || []).length; add("study", L(`حصص المراجعة (${dn}/${plan.length})`, `Séances de révision (${dn}/${plan.length})`), dn >= plan.length ? "done" : dn ? "part" : "miss", { carry: { label: L("عوّض حصة مراجعة", "Rattraper une séance de révision"), min: 45, big: true } }); }
    const meals = App.F.todayMeals().length;
    add("meals", L(`سجّلت الماكلة (${meals})`, `Repas notés (${meals})`), meals >= 2 ? "done" : meals ? "part" : "miss");
    return out;
  }

  // where a carried task fits today
  function placeFor(c, d = new Date()) {
    const now = Date.now(), blocks = App.R.day(d);
    const free = blocks.filter(b => (b.slot || b.kind === "rest" || b.kind === "project") && b.end > now && (b.end - b.start) / 60000 >= Math.min(c.min || 15, 60));
    if (free.length) return free[0];
    if (!c.big) return blocks.find(b => b.kind === "review") || null;
    return null;
  }
  const pending = () => (doc().carry || []).filter(c => !c.done && c.due <= U.dkey());
  App.Review = { items, pending, placeFor, closed(dk = U.dkey()) { return !!(doc().days || {})[dk]; } };

  function openReview(dk) {
    const d = dk ? U.parseD(dk) : new Date(); dk = U.dkey(d);
    const its = items(d), saved = ((doc().days || {})[dk] || {}).items || {};
    const state = {}; its.forEach(i => { state[i.key] = saved[i.key] ? { ...saved[i.key] } : { s: i.auto === "done" ? "done" : i.auto === "part" ? "part" : i.manual ? "" : "miss", why: "" }; });
    const html = () => `<p class="small muted">${L("بصراحة مع روحك: شنوة عملت اليوم؟ اللي ما كمّلتوش يتعدّى لغدوة ويتحط في وقت فارغ.", "Sois honnête avec toi : qu'as-tu fait aujourd'hui ? Ce qui n'est pas fait passe à demain, dans un créneau libre.")}</p>
      <div class="list" style="margin-top:8px">${its.map(i => { const s = state[i.key]; return `<div class="li rv" style="align-items:flex-start;flex-wrap:wrap"><span class="grow small"><b>${U.esc(i.label)}</b>${i.auto && !i.manual ? `<span class="tiny muted"> · ${L("من التطبيق", "détecté")}</span>` : ""}</span>
        <div class="seg" role="group"><button type="button" data-k="${i.key}" data-v="done" aria-pressed="${s.s === "done"}">${L("عملتها", "Fait")}</button><button type="button" data-k="${i.key}" data-v="part" aria-pressed="${s.s === "part"}">${L("نص", "En partie")}</button><button type="button" data-k="${i.key}" data-v="miss" aria-pressed="${s.s === "miss"}">${L("لا", "Non")}</button></div>
        ${s.s && s.s !== "done" && (s.touched || i.manual) ? `<div class="quick" style="width:100%;margin-top:4px">${WHY.map(w => `<button type="button" data-why="${i.key}" data-v="${w[0]}" style="${s.why === w[0] ? "border-color:var(--accent);background:var(--accent-soft)" : ""}">${L(w[1], w[2])}</button>`).join("")}</div>` : ""}</div>`; }).join("")}</div>
      <label class="f" style="margin-top:10px">${L("كلمة على نهارك (اختياري)", "Un mot sur ta journée (optionnel)")}<input type="text" id="rv-note" maxlength="200" value="${U.esc(((doc().days || {})[dk] || {}).note || "")}"></label>
      <div class="row" style="margin-top:12px;justify-content:space-between"><span class="pill accent" id="rv-score"></span><button class="btn primary" id="rv-save">${I.check}${L("سكّر النهار", "Clôturer la journée")}</button></div>`;
    App.modal(L("محاسبة ", "Bilan du ") + U.dateShort(d), "", (mb) => {
      const draw = () => {
        mb.innerHTML = html();
        const vals = Object.values(state).filter(x => x.s);
        const sc = vals.length ? Math.round(vals.reduce((a, x) => a + (x.s === "done" ? 1 : x.s === "part" ? 0.5 : 0), 0) / vals.length * 100) : 0;
        mb.querySelector("#rv-score").textContent = L("النتيجة ", "Score ") + sc + "%";
        mb.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { state[b.dataset.k].s = b.dataset.v; state[b.dataset.k].touched = true; draw(); });
        mb.querySelectorAll("[data-why]").forEach(b => b.onclick = () => { state[b.dataset.why].why = b.dataset.v; draw(); });
        mb.querySelector("#rv-save").onclick = () => save(dk, its, state, mb.querySelector("#rv-note").value, sc);
      };
      draw();
    });
  }
  function save(dk, its, state, note, score) {
    const r = doc(); r.days = r.days || {}; r.carry = r.carry || [];
    r.days[dk] = { items: state, score, note: (note || "").slice(0, 200), ts: Date.now() };
    // next day that suits: tomorrow for small things, next Thursday/Sunday-type free day for big ones if tomorrow has no room
    const tomorrow = U.addDays(U.parseD(dk), 1);
    its.forEach(i => {
      const s = state[i.key];
      if (!i.carry || !s || s.s === "done" || !s.s) return;
      r.carry = r.carry.filter(c => !(c.key === i.key && !c.done));
      r.carry.push({ id: U.id(), key: i.key, label: i.carry.label, min: i.carry.min, big: !!i.carry.big, from: dk, due: U.dkey(tomorrow), done: false });
    });
    // move unfinished tickets to the next work day
    const t = App.W.ticketsOn(dk).filter(x => x.status === "todo");
    if (t.length) {
      let nd = tomorrow; const wd = Store.doc("moneycfg").workDays; for (let k = 0; k < 7 && !wd.includes(U.dow(nd)); k++) nd = U.addDays(nd, 1);
      const nk = U.dkey(nd), mk = dk.slice(0, 7), nmk = nk.slice(0, 7);
      t.forEach(x => { x.date = nk; if (nmk !== mk) { const m = Store.month("work", mk); m.tickets = m.tickets.filter(y => y.id !== x.id); Store.month("work", nmk).tickets.push(x); } });
      Store.save("work-" + mk); if (nmk !== mk) Store.save("work-" + nmk);
    }
    const lim = U.dkey(U.addDays(new Date(), -60)); for (const k of Object.keys(r.days)) if (k < lim) delete r.days[k];
    r.carry = r.carry.filter(c => !c.done || c.doneAt >= lim);
    Store.save("review"); App.closeModal();
    const miss = its.filter(i => state[i.key] && state[i.key].s && state[i.key].s !== "done" && i.carry).length;
    App.toast(L("تسكّر النهار — تصبح على خير", "Journée clôturée — bonne nuit"), miss ? L(`${miss} حاجات تعدّاو لغدوة.`, `${miss} éléments reportés à demain.`) : L("كمّلت كل شي، ربي يبارك.", "Tout est fait, bravo."), "good");
    App.render();
  }
  App.acts.reviewOpen = (el) => openReview(el && el.dataset && el.dataset.d);
  App.acts.carryDone = (el) => { const c = (doc().carry || []).find(x => x.id === el.dataset.id); if (!c) return; c.done = !c.done; c.doneAt = U.dkey(); Store.save("review"); App.render(); };
  App.acts.carryLater = (el) => { const c = (doc().carry || []).find(x => x.id === el.dataset.id); if (!c) return; c.due = U.dkey(U.addDays(new Date(), 1)); Store.save("review"); App.render(); };
  App.acts.reviewAI = async (el) => {
    if (!App.ai) return;
    const r = doc(), days = Object.keys(r.days || {}).sort().slice(-7);
    const sum = days.map(k => `${k}: ${r.days[k].score}% — ${Object.entries(r.days[k].items).filter(([, v]) => v.s !== "done").map(([kk, v]) => kk + (v.why ? "(" + v.why + ")" : "")).join(", ") || "all done"}`).join("\n");
    el.disabled = true; const out = document.getElementById("rvAi"); if (out) out.innerHTML = `<span class="spinner"></span>`;
    try {
      const res = await App.ai(`You are the caring but honest accountability coach of ${App.who()}. Here are his last nightly reviews (what he did not finish, with reasons):\n${sum}\nHe works as a field technician, studies cybersecurity in the evening, is diabetic on insulin, goes to the gym and memorises Quran. In Tunisian derja written in Arabic script, give in max 90 words: one pattern you notice, one small concrete change for tomorrow, and one encouraging sentence. No medical dosing advice.`, { modelTier: "quick", cache: false });
      if (out) out.innerHTML = `<div class="alertbox info small">${U.esc(res.text)}</div>`;
    } catch (e) { const m = App.aiError(e); if (out) out.innerHTML = m ? `<span class="small">${U.esc(m)}</span>` : ""; }
    el.disabled = false;
  };

  // cards for Today
  App.Review.cards = () => {
    const now = new Date(), dk = U.dkey(), r = doc();
    const carry = pending();
    const sleepBlock = App.R.day(now).find(b => b.kind === "review");
    const evening = sleepBlock ? now >= U.plusMin(sleepBlock.start, -150) : U.hour(now) >= 20;
    const closed = App.Review.closed(dk);
    const last7 = []; for (let i = 6; i >= 0; i--) { const k = U.dkey(U.addDays(now, -i)); last7.push({ k, s: (r.days || {})[k] ? r.days[k].score : null }); }
    const yk = U.dkey(U.addDays(now, -1));
    let html = "";
    if (carry.length) html += `<div class="card stripe warn"><h3>${I.alert}${L("من البارح — لازم تعملهم اليوم", "D'hier — à faire aujourd'hui")}</h3><div class="list">${carry.map(c => { const pl = placeFor(c); return `<div class="li"><label class="check"><input type="checkbox" data-act="carryDone" data-id="${c.id}" aria-label="${L("عملتها", "Fait")}"></label><span class="grow small"><b>${U.esc(c.label)}</b><div class="tiny muted">${pl ? L("وقتاش: ", "Quand : ") + U.hm(pl.start) + " — " + U.esc(pl.title) : L("ما فماش وقت فارغ اليوم", "Pas de créneau libre aujourd'hui")}</div></span><button class="btn sm ghost" data-act="carryLater" data-id="${c.id}">${L("غدوة", "Demain")}</button></div>`; }).join("")}</div></div>`;
    if (!closed && (r.days || {})[yk] == null && U.hour(now) < 12 && Object.keys(r.days || {}).length) html += `<div class="card"><p class="small">${L("ما عملتش محاسبة البارح.", "Pas de bilan hier soir.")} <button class="btn sm" data-act="reviewOpen" data-d="${yk}">${L("اعملها توا", "Le faire maintenant")}</button></p></div>`;
    html += `<div class="card ${evening && !closed ? "stripe accent" : ""}"><div class="row between"><h3 style="margin:0">${I.check}${L("محاسبة اليوم", "Bilan du jour")}</h3><div class="row" style="gap:4px">${last7.map(x => `<span class="dot7 ${x.s == null ? "" : x.s >= 80 ? "good" : x.s >= 50 ? "warn" : "bad"}" title="${x.k}: ${x.s == null ? "–" : x.s + "%"}"></span>`).join("")}</div></div>
      <p class="small muted" style="margin-top:6px">${closed ? L(`سكّرت النهار: ${r.days[dk].score}%.`, `Journée clôturée : ${r.days[dk].score} %.`) : L("قبل ما ترقد: شنوة عملت وشنوة لا. اللي ما عملتوش يتحط غدوة في وقت فارغ.", "Avant de dormir : ce qui est fait ou pas. Le reste est replacé demain dans un créneau libre.")}${sleepBlock ? " · " + U.hm(sleepBlock.start) : ""}</p>
      <div class="row" style="margin-top:8px"><button class="btn ${evening && !closed ? "primary" : ""}" data-act="reviewOpen">${closed ? L("بدّل المحاسبة", "Modifier le bilan") : L("ابدا المحاسبة", "Faire le bilan")}</button>${Object.keys(r.days || {}).length >= 2 ? `<button class="btn sm ghost" data-act="reviewAI" ${App.ai ? "" : "disabled"}>${I.spark}${L("كلمة من المدرب", "Le mot du coach")}</button>` : ""}</div><div id="rvAi" style="margin-top:8px"></div></div>`;
    return html;
  };

  App.eventSources.push(() => {
    const b = App.R.day(new Date()).find(x => x.kind === "review");
    if (!b || App.Review.closed()) return [];
    return [{ key: "review", at: b.start, title: L("محاسبة النهار", "Bilan du jour"), body: L("5 دقايق قبل ما ترقد: شنوة عملت وشنوة لا؟", "5 minutes avant de dormir : qu'as-tu fait ou pas ?"), kind: "info" }];
  });
})();
