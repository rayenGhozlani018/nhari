/* Nhari — extras (10 Nov 2026): salary check, monthly report, car logbook, quick +1, emergency fund,
   glucose trends + hypo protocol, medical checks, supplies stock, sleep, quiz from courses,
   absence alerts, exam countdown, Quran audio, Friday reminders, missed prayers, weekly report, car mode. */
(function () {
  "use strict";
  const MW = App.MW, W = App.W;
  const num = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(x) ? 0 : x; };
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const tab = (name, id, label, render) => { (App.EXT.tabs[name] = App.EXT.tabs[name] || []).push({ id, label, render }); };
  const card = (name, fn) => { (App.EXT.cards[name] = App.EXT.cards[name] || []).push(fn); };
  const evt = (fn) => App.eventSources.push(fn);
  const daysTo = (dk) => Math.round((U.wall(...dk.split("-").map(Number), 12, 0) - U.wall(...U.dkey().split("-").map(Number), 12, 0)) / 86400000);
  const addMonths = (dk, n) => { const [y, m, d] = dk.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1 + n, Math.min(d, 28))); return t.toISOString().slice(0, 10); };
  const monthName = (mk) => { const [y, m] = mk.split("-").map(Number); return new Intl.DateTimeFormat(App.lang === "fr" ? "fr-FR" : "ar-TN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15))); };
  const prevMk = (mk) => { const [y, m] = mk.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
  const at = (hm, d = new Date()) => U.atTime(hm, d);

  /* =====================================================================
     FINANCES
     ===================================================================== */
  // expected pay of a month = interventions recorded that month
  const workIncome = (mk) => U.sum(Store.month("money", mk).incomes.filter(x => x.ticketId), x => +x.amount || 0);
  const workCount = (mk, op) => Store.month("work", mk).tickets.filter(t => t.status === "done" && (!op || t.op === op)).length;

  // at the start of a month, last month's interventions become "money on the way"
  function ensurePayPending() {
    const cfg = MW.cfg(); if (!cfg.wallet) return;
    const pm = prevMk(U.mkey()); cfg.payLog = cfg.payLog || [];
    if (cfg.pending.some(p => p.month === pm) || cfg.payLog.some(p => p.month === pm)) return;
    const exp = workIncome(pm); if (!(exp > 0)) return;
    cfg.pending.push({ id: U.id(), label: L(`الشهرية (تدخلات ${monthName(pm)})`, `Salaire (interventions de ${monthName(pm)})`), amount: exp, expected: exp, month: pm });
    Store.save("moneycfg");
  }
  // "Reçu": ask how much really arrived, compare with what the interventions say
  App.acts.pendGot = (el) => {
    const p = MW.cfg().pending.find(x => x.id === el.dataset.id); if (!p) return;
    App.modal(L("وصلت الفلوس", "Argent reçu"), `<form data-form="pendGot2" class="form"><input type="hidden" name="id" value="${p.id}">
      <p class="small full">${U.esc(p.label)}${p.expected ? ` — ${L("حسب التدخلات لازم", "selon les interventions :")} <b>${U.money(p.expected)}</b>` : ""}</p>
      <label class="f full">${L("قداش وصلك بالضبط؟", "Combien as-tu reçu exactement ?")}<input id="pg-amt" name="amount" type="number" step="0.001" min="0" required inputmode="decimal" value="${p.amount}"></label>
      <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.pendGot2 = (fd) => {
    const cfg = MW.cfg(), p = cfg.pending.find(x => x.id === fd.id); if (!p) return;
    const got = num(fd.amount); if (!(got >= 0)) return;
    cfg.pending = cfg.pending.filter(x => x.id !== p.id);
    cfg.payLog = cfg.payLog || []; cfg.payLog.unshift({ id: p.id, label: p.label, month: p.month || "", expected: p.expected || null, received: got, date: U.dkey() });
    cfg.payLog = cfg.payLog.slice(0, 36);
    Store.save("moneycfg"); MW.move(got, p.label, "p:" + p.id); App.closeModal();
    const diff = p.expected ? r3(got - p.expected) : 0;
    if (p.expected && diff < -0.5) App.toast(L(`ناقصة ${U.money(-diff)}`, `Il manque ${U.money(-diff)}`), L(`حسب التطبيق ${Math.round(-diff / 20)} تدخلات ما تخلصوش. ثبّت مع المسؤول وورّيه القائمة في «تقرير الشهر».`, `D'après l'app, ~${Math.round(-diff / 20)} interventions non payées. Vérifie avec ton responsable (liste dans « Rapport du mois »).`), "warn");
    else App.toast(L("وصلت", "Reçu"), "+" + U.money(got), "good");
    App.render();
  };

  // monthly report (printable)
  function reportView() {
    const mk = App.uiState.repMk || U.mkey(), m = Store.month("money", mk), cfg = MW.cfg(), wc = W.cfg();
    const ops = Object.keys(wc.ops).map(k => ({ k, name: wc.ops[k].name || k, n: workCount(mk, k), amt: U.sum(Store.month("work", mk).tickets.filter(t => t.status === "done" && t.op === k), t => W.price(t.op)) }));
    const earned = U.sum(ops, o => o.amt);
    const byCat = {}; m.expenses.forEach(e => byCat[e.cat || "other"] = (byCat[e.cat || "other"] || 0) + (+e.amount || 0));
    const spent = U.sum(m.expenses, e => +e.amount || 0);
    const charges = cfg.charges.filter(c => m.paid[c.id]), chargesSum = U.sum(charges, c => +c.amount || 0);
    const goalPays = cfg.goals.flatMap(g => (g.paid || []).filter(p => p.date && p.date.slice(0, 7) === mk).map(p => ({ label: g.label, amount: p.amount })));
    const pay = (cfg.payLog || []).find(p => p.month === mk);
    const tickets = Store.month("work", mk).tickets.filter(t => t.status === "done").sort((a, b) => a.date.localeCompare(b.date));
    const months = []; for (let i = 0; i < 6; i++) { let x = U.mkey(); for (let j = 0; j < i; j++) x = prevMk(x); months.push(x); }
    const catLabel = (k) => ({ food: L("ماكلة", "Alimentation"), transport: L("نقل", "Transport"), health: L("صحة", "Santé"), study: L("قراية", "Études"), family: L("عائلة", "Famille"), home: L("دار", "Maison"), fun: L("ترفيه", "Loisirs"), clothes: L("لبسة", "Vêtements"), sadaqa: L("صدقة", "Sadaqa"), work: L("مواد الخدمة", "Matériel travail"), car: L("كرهبة", "Voiture") }[k] || L("أخرى", "Autre"));
    return `<div class="card report" style="grid-column:1/-1">
      <div class="row between noprint" style="flex-wrap:wrap;gap:8px"><select data-change="repMk" style="width:auto">${months.map(x => `<option value="${x}" ${x === mk ? "selected" : ""}>${U.esc(monthName(x))}</option>`).join("")}</select>
        <button class="btn primary" data-act="printReport">${L("طبع / PDF", "Imprimer / PDF")}</button></div>
      <h2 style="margin:12px 0 4px">${L("تقرير", "Rapport")} — ${U.esc(monthName(mk))}</h2>
      <p class="tiny muted">${U.esc(Store.doc("settings").name || "")}</p>
      <h3 style="margin-top:12px">${L("التدخلات", "Interventions")}</h3>
      <div class="list">${ops.map(o => `<div class="li"><span class="grow">${U.esc(o.name)}</span><span class="num">${o.n}</span><span class="amt">${U.money(o.amt)}</span></div>`).join("")}
        <div class="li"><b class="grow">${L("المجموع", "Total")}</b><b class="num">${U.sum(ops, o => o.n)}</b><b class="amt">${U.money(earned)}</b></div></div>
      ${pay ? `<div class="alertbox ${pay.expected && pay.received < pay.expected - 0.5 ? "warn" : "good"} small" style="margin-top:8px">${L("الشهرية اللي وصلت:", "Salaire reçu :")} <b>${U.money(pay.received)}</b>${pay.expected ? ` · ${L("المتوقع", "attendu")} ${U.money(pay.expected)}${pay.received < pay.expected - 0.5 ? ` · ${L("ناقص", "manque")} ${U.money(pay.expected - pay.received)}` : " ✓"}` : ""}</div>` : mk === U.mkey() ? `<p class="small muted" style="margin-top:6px">${L(`الشهرية المتوقعة على التدخلات هذوما: ${U.money(earned)}`, `Salaire attendu pour ces interventions : ${U.money(earned)}`)}</p>` : ""}
      <h3 style="margin-top:12px">${L("المصاريف", "Dépenses")}</h3>
      <div class="list">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="li"><span class="grow">${U.esc(catLabel(k))}</span><span class="amt">${U.money(v)}</span></div>`).join("") || `<div class="empty">—</div>`}
        ${charges.length ? `<div class="li"><span class="grow">${L("التزامات خالصة", "Charges payées")}: ${charges.map(c => U.esc(c.name)).join("، ")}</span><span class="amt">${U.money(chargesSum)}</span></div>` : ""}
        ${goalPays.map(g => `<div class="li"><span class="grow">${U.esc(g.label)}</span><span class="amt">${U.money(g.amount)}</span></div>`).join("")}
        <div class="li"><b class="grow">${L("المجموع", "Total")}</b><b class="amt">${U.money(spent + chargesSum + U.sum(goalPays.filter(g => g.amount > 0), g => g.amount))}</b></div></div>
      <h3 style="margin-top:12px">${L("الصافي (التدخلات − المصاريف − الالتزامات)", "Net (interventions − dépenses − charges)")}</h3>
      <div class="big" style="color:${earned - spent - chargesSum >= 0 ? "var(--good)" : "var(--bad)"}">${U.money(r3(earned - spent - chargesSum))}</div>
      <details style="margin-top:12px" ${App.uiState.printing ? "open" : ""}><summary class="small">${L("قائمة التدخلات", "Liste des interventions")} (${tickets.length})</summary>
        <table class="rtable"><thead><tr><th>${L("النهار", "Date")}</th><th>${L("المشغّل", "Opérateur")}</th><th>${L("الحريف", "Client")}</th><th>${L("رقم التيكي", "N° ticket")}</th></tr></thead><tbody>${tickets.map(t => `<tr><td>${U.esc(t.date)}</td><td>${U.esc((wc.ops[t.op] || {}).name || t.op)}</td><td>${U.esc(t.client || t.addr || (t.bulk ? L("مسجّلة بالجملة", "saisie groupée") : ""))}</td><td>${U.esc(t.ref || "")}</td></tr>`).join("")}</tbody></table></details>
    </div>`;
  }
  App.changes.repMk = (el) => { App.uiState.repMk = el.value; App.render(); };
  App.acts.printReport = () => { App.uiState.printing = true; App.render(); document.body.classList.add("printing"); setTimeout(() => { window.print(); document.body.classList.remove("printing"); App.uiState.printing = false; }, 300); };
  tab("money", "report", () => L("تقرير الشهر", "Rapport du mois"), () => { ensurePayPending(); return `<div class="grid">${reportView()}</div>`; });

  // car logbook
  const CAR_DEFAULTS = () => [
    { id: "oil", ar: "تبديل الزيت (vidange)", fr: "Vidange", everyKm: 10000, everyMonths: 12 },
    { id: "ins", ar: "التأمين", fr: "Assurance", everyMonths: 12 },
    { id: "visit", ar: "الفيزيت (visite technique)", fr: "Visite technique", everyMonths: 12 },
    { id: "vign", ar: "الفينيات (vignette)", fr: "Vignette", everyMonths: 12 },
    { id: "tires", ar: "العجلات", fr: "Pneus", everyKm: 40000 },
    { id: "brakes", ar: "الفرانات (plaquettes)", fr: "Plaquettes de frein", everyKm: 30000 }
  ];
  const car = () => { const c = Store.doc("car"); if (!c.items || !c.items.length) c.items = CAR_DEFAULTS(); c.fuel = c.fuel || []; return c; };
  function carStatus(it, c) {
    let dueDate = it.dueDate || (it.lastDate && it.everyMonths ? addMonths(it.lastDate, it.everyMonths) : "");
    const dueKm = it.everyKm && it.lastKm != null && it.lastKm !== "" ? +it.lastKm + it.everyKm : null;
    const dDays = dueDate ? daysTo(dueDate) : null, dKm = dueKm != null && c.km ? dueKm - c.km : null;
    const late = (dDays != null && dDays < 0) || (dKm != null && dKm < 0), soon = !late && ((dDays != null && dDays <= 15) || (dKm != null && dKm <= 500));
    const known = dueDate || dueKm != null;
    return { dueDate, dueKm, dDays, dKm, late, soon, known };
  }
  function carView() {
    const c = car(), mk = U.mkey(), m = Store.month("money", mk);
    const carSpent = U.sum(m.expenses.filter(e => e.cat === "car"), e => +e.amount || 0);
    const n = workCount(mk);
    const fuelM = U.sum(c.fuel.filter(f => f.date.slice(0, 7) === mk), f => +f.amount || 0);
    const rows = c.items.map(it => { const s = carStatus(it, c); return `<div class="li"><span class="pill ${s.late ? "bad" : s.soon ? "warn" : s.known ? "good" : ""}">${s.late ? L("فات وقتها", "En retard") : s.soon ? L("قريب", "Bientôt") : s.known ? "✓" : L("ناقص", "À renseigner")}</span>
      <span class="grow small"><b>${U.esc(L(it.ar, it.fr))}</b><span class="tiny muted"> ${s.dueDate ? L("قبل ", "avant le ") + U.ltr(s.dueDate) : ""}${s.dueKm != null ? " · " + U.ltr(s.dueKm.toLocaleString("fr-FR") + " km") : ""}${s.dDays != null ? ` (${s.dDays >= 0 ? s.dDays + " " + L("يوم", "j") : L("فات", "dépassé")})` : ""}</span></span>
      <button class="btn sm" data-act="carDone" data-id="${it.id}">${L("عملتها", "Fait")}</button><button class="btn sm ghost" data-act="carEdit" data-id="${it.id}">${L("بدّل", "Modifier")}</button></div>`; }).join("");
    return `<div class="grid g2">
      <div class="card stripe accent"><h3>${I.link}${L("الكيلومتراج", "Kilométrage")}</h3>
        <div class="big">${c.km ? U.ltr(Number(c.km).toLocaleString("fr-FR") + " km") : "—"}</div><p class="tiny muted">${c.kmDate ? L("آخر تحديث ", "Mis à jour le ") + U.ltr(c.kmDate) : L("حط الكيلومتراج باش التطبيق يفكرك بالفيدونج.", "Indique le kilométrage pour les rappels de vidange.")}</p>
        <form data-form="carKm" class="row" style="gap:8px;margin-top:8px"><input id="car-km" name="km" type="number" min="0" step="1" inputmode="numeric" placeholder="km" style="max-width:160px"><button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button></form></div>
      <div class="card"><h3>${I.money}${L("مصاريف الكرهبة هذا الشهر", "Coûts voiture ce mois")}</h3>
        <div class="row between"><span>${L("صيانة وقطع", "Entretien, pièces")}</span><b class="num">${U.money(carSpent - fuelM)}</b></div>
        <div class="row between"><span>${L("مازوط/بنزين", "Carburant")}</span><b class="num">${U.money(fuelM)}</b></div>
        <div class="row between" style="margin-top:6px"><span>${L("على كل تدخل", "Par intervention")}</span><b class="num">${n ? U.money(r3(carSpent / n)) : "—"}</b></div>
        <p class="tiny muted" style="margin-top:6px">${L(`${n} تدخلات هذا الشهر. الكرهبة هي عدّة الخدمة، الكلفة هذي تنقص من الربح متاع كل تدخل.`, `${n} interventions ce mois. La voiture est ton outil de travail : ce coût réduit le gain de chaque intervention.`)}</p></div>
      <div class="card" style="grid-column:1/-1"><h3>${I.bell}${L("الصيانة والوثائق", "Entretien et papiers")}</h3><div class="list">${rows}</div>
        <p class="tiny muted" style="margin-top:6px">${L("«عملتها» تسجّل اليوم والكيلومتراج الحالي، والتطبيق يحسب الموعد الجاي ويفكرك قبل 15 يوم ولا 500 كم.", "« Fait » enregistre la date et le km actuels ; l'app calcule l'échéance suivante et te prévient 15 jours ou 500 km avant.")}</p></div>
      <div class="card" style="grid-column:1/-1"><h3>${I.plus}${L("عمّرت", "Plein de carburant")}</h3>
        <form data-form="carFuel" class="form">
          <label class="f">${L("المبلغ", "Montant")}<input id="cf-amt" name="amount" type="number" step="0.001" min="0" required inputmode="decimal"></label>
          <label class="f">${L("اللترات (اختياري)", "Litres (optionnel)")}<input id="cf-l" name="liters" type="number" step="0.01" min="0" inputmode="decimal"></label>
          <label class="f">${L("الكيلومتراج (اختياري)", "Km (optionnel)")}<input id="cf-km" name="km" type="number" min="0" step="1" inputmode="numeric"></label>
          <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button></form>
        ${c.fuel.length ? `<div class="list" style="margin-top:8px">${c.fuel.slice(0, 6).map(f => `<div class="li"><span class="grow small">${U.ltr(f.date)}${f.liters ? " · " + f.liters + " L" : ""}${f.km ? " · " + U.ltr(Number(f.km).toLocaleString("fr-FR") + " km") : ""}</span><span class="amt">${U.money(f.amount)}</span></div>`).join("")}</div>` : ""}
        ${(() => { const withKm = c.fuel.filter(f => f.km && f.liters).sort((a, b) => a.km - b.km); if (withKm.length < 2) return ""; const first = withKm[0], last = withKm[withKm.length - 1]; const l = U.sum(withKm.slice(1), f => +f.liters); const km = last.km - first.km; return km > 0 ? `<p class="small" style="margin-top:6px">${L("الاستهلاك:", "Consommation :")} <b>${U.num(l / km * 100, 1)} L/100 km</b></p>` : ""; })()}
      </div></div>`;
  }
  App.forms.carKm = (fd) => { const c = car(), k = Math.round(num(fd.km)); if (!(k > 0)) return; c.km = k; c.kmDate = U.dkey(); Store.save("car"); App.render(); };
  App.acts.carDone = (el) => { const c = car(), it = c.items.find(x => x.id === el.dataset.id); if (!it) return; it.lastDate = U.dkey(); if (c.km) it.lastKm = c.km; if (it.dueDate) it.dueDate = it.everyMonths ? addMonths(U.dkey(), it.everyMonths) : ""; Store.save("car"); App.toast(L("تسجّل", "Enregistré"), L(it.ar, it.fr), "good"); App.render(); };
  App.acts.carEdit = (el) => {
    const c = car(), it = c.items.find(x => x.id === el.dataset.id); if (!it) return;
    App.modal(L(it.ar, it.fr), `<form data-form="carEdit" class="form"><input type="hidden" name="id" value="${it.id}">
      <label class="f">${L("آخر مرة (النهار)", "Dernière fois (date)")}<input id="ce-ld" name="lastDate" type="date" value="${it.lastDate || ""}"></label>
      <label class="f">${L("آخر مرة (كم)", "Dernière fois (km)")}<input id="ce-lk" name="lastKm" type="number" min="0" value="${it.lastKm ?? ""}"></label>
      <label class="f">${L("آخر أجل (إذا عندو تاريخ ثابت)", "Échéance (si date fixe)")}<input id="ce-dd" name="dueDate" type="date" value="${it.dueDate || ""}"></label>
      <label class="f">${L("كل قداش شهر", "Tous les … mois")}<input id="ce-em" name="everyMonths" type="number" min="0" value="${it.everyMonths || ""}"></label>
      <label class="f">${L("كل قداش كم", "Tous les … km")}<input id="ce-ek" name="everyKm" type="number" min="0" value="${it.everyKm || ""}"></label>
      <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.carEdit = (fd) => { const c = car(), it = c.items.find(x => x.id === fd.id); if (!it) return; it.lastDate = fd.lastDate || ""; it.lastKm = fd.lastKm === "" ? "" : Math.round(num(fd.lastKm)); it.dueDate = fd.dueDate || ""; it.everyMonths = Math.round(num(fd.everyMonths)) || 0; it.everyKm = Math.round(num(fd.everyKm)) || 0; Store.save("car"); App.closeModal(); App.render(); };
  App.forms.carFuel = (fd) => {
    const c = car(), a = num(fd.amount); if (!(a > 0)) return;
    const f = { id: U.id(), date: U.dkey(), amount: a, liters: num(fd.liters) || "", km: Math.round(num(fd.km)) || "" };
    c.fuel.unshift(f); c.fuel = c.fuel.slice(0, 200); if (f.km && f.km > (c.km || 0)) { c.km = f.km; c.kmDate = f.date; }
    Store.save("car");
    const m = Store.month("money"), it = { id: U.id(), ts: Date.now(), date: f.date, amount: a, cat: "car", note: L("مازوط", "Carburant") };
    m.expenses.push(it); Store.save("money-" + U.mkey()); if (MW.on()) MW.move(-a, it.note, "x:" + it.id);
    App.toast(L("تسجّل", "Enregistré"), U.money(a), "good"); App.render();
  };
  tab("money", "car", () => L("الكرهبة", "Voiture"), carView);
  card("today", () => {
    const c = car(); const due = c.items.map(it => ({ it, s: carStatus(it, c) })).filter(x => x.s.late || x.s.soon);
    if (!due.length) return "";
    return `<a class="card" href="#money" data-act="goSub" data-tab="money" data-v="car" style="display:block;text-decoration:none;color:inherit"><h3>${I.link}${L("الكرهبة", "Voiture")}</h3>${due.map(x => `<div class="row between small" style="margin-top:4px"><span>${U.esc(L(x.it.ar, x.it.fr))}</span><span class="pill ${x.s.late ? "bad" : "warn"}">${x.s.late ? L("فات وقتها", "en retard") : x.s.dDays != null && x.s.dDays <= 15 ? x.s.dDays + " " + L("يوم", "j") : U.ltr(x.s.dKm + " km")}</span></div>`).join("")}</a>`;
  });
  evt(() => { const c = car(), now = new Date(); return c.items.map(it => ({ it, s: carStatus(it, c) })).filter(x => x.s.dDays === 7 || x.s.dDays === 1 || x.s.dDays === 0).map(x => ({ at: at("08:00", now), key: "car-" + x.it.id + "-" + U.dkey(), title: L("الكرهبة: ", "Voiture : ") + L(x.it.ar, x.it.fr), body: x.s.dDays ? L(`باقي ${x.s.dDays} يوم`, `dans ${x.s.dDays} j`) : L("اليوم آخر أجل", "échéance aujourd'hui"), kind: "warn" })); });

  // quick +1 after an intervention
  card("tiles", () => {
    const c = App.moneyCalc(); if (!c.workToday) return "";
    const wc = W.cfg();
    return `<div class="tile quickadd"><span class="k">${I.plus}${L("كمّلت تدخل؟", "Intervention finie ?")}</span><div class="row" style="gap:6px;margin-top:6px">${Object.keys(wc.ops).map(k => `<button class="btn sm ${k === "orange" ? "op-orange" : "op-ooredoo"}" data-act="quickDone" data-op="${k}">+1 ${U.esc(wc.ops[k].name || k)}</button>`).join("")}</div></div>`;
  });
  App.acts.quickDone = (el) => {
    const op = el.dataset.op, mk = U.mkey();
    const t = { id: U.id(), status: "todo", op, date: U.dkey(), client: "", phone: "", addr: "", note: L("سريع", "rapide"), src: "quick" };
    W.month(mk).tickets.push(t); W.setDone(t, true); Store.save("work-" + mk);
    App.uiState.lastQuick = t.id;
    App.toast(L("يعطيك الصحة", "Bravo") + " +" + U.money(W.price(op)), L("غلطت؟ انزل «الخدمة» ← رجّع.", "Erreur ? Travail → Annuler."), "good"); App.render();
  };

  /* =====================================================================
     HEALTH
     ===================================================================== */
  const H = App.H;
  function bgDays(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) { const d = U.addDays(new Date(), -i), k = U.dkey(d); out.push({ k, v: [] }); }
    const idx = Object.fromEntries(out.map((x, i) => [x.k, i]));
    H.entries(days + 1).filter(e => e.type === "bg").forEach(e => { const k = U.dkey(new Date(e.ts)); if (k in idx) out[idx[k]].v.push(e.bg); });
    return out;
  }
  function trendsView() {
    const days = App.uiState.bgDays || 30;
    // H.entries only spans this and last month: enough for 30 days
    const d = bgDays(days), all = d.flatMap(x => x.v);
    const avg = all.length ? U.sum(all, x => x) / all.length : 0;
    const tir = all.length ? all.filter(x => x >= 70 && x <= 180).length / all.length * 100 : 0;
    const hypo = all.filter(x => x < 70).length, high = all.filter(x => x > 250).length;
    const daysWith = d.filter(x => x.v.length).length;
    const gmi = 3.31 + 0.02392 * avg;
    const Wd = 640, Hh = 200, pl = 34, pr = 8, pt = 10, pb = 22, max = Math.max(260, ...all), y = (v) => pt + (1 - v / max) * (Hh - pt - pb), bw = (Wd - pl - pr) / d.length;
    let svg = `<svg viewBox="0 0 ${Wd} ${Hh}" class="chart" role="img" aria-label="${L("معدل السكر كل نهار", "Moyenne glycémique par jour")}">`;
    svg += `<rect x="${pl}" y="${y(180)}" width="${Wd - pl - pr}" height="${y(70) - y(180)}" fill="var(--good-soft)"/>`;
    [70, 180, 250].forEach(v => { svg += `<line x1="${pl}" x2="${Wd - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="var(--muted)">${U.esc(U.bgFmt(v).split(" ")[0])}</text>`; });
    d.forEach((x, i) => {
      if (!x.v.length) return;
      const a = U.sum(x.v, v => v) / x.v.length, lo = Math.min(...x.v), hi = Math.max(...x.v), cx = pl + i * bw + bw / 2;
      const col = a < 70 ? "var(--bad)" : a <= 180 ? "var(--good)" : a <= 250 ? "var(--warn)" : "var(--bad)";
      svg += `<line x1="${cx}" x2="${cx}" y1="${y(hi)}" y2="${y(lo)}" stroke="${col}" stroke-opacity=".45" stroke-width="${Math.max(2, bw * .35)}" stroke-linecap="round"/><circle cx="${cx}" cy="${y(a)}" r="3.5" fill="${col}"><title>${U.esc(x.k + " · " + U.bgFmt(Math.round(a)))}</title></circle>`;
    });
    [0, Math.floor(d.length / 2), d.length - 1].forEach(i => { svg += `<text x="${pl + i * bw + bw / 2}" y="${Hh - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">${d[i].k.slice(5)}</text>`; });
    svg += `</svg>`;
    return `<div class="grid g2">
      <div class="card" style="grid-column:1/-1"><div class="row between" style="flex-wrap:wrap;gap:8px"><h3 style="margin:0">${L("تطور السكر", "Évolution de la glycémie")}</h3>
        <div class="seg">${[14, 30].map(n => `<button data-act="bgDays" data-v="${n}" aria-pressed="${days === n}">${n} ${L("يوم", "j")}</button>`).join("")}</div></div>
        ${all.length ? svg : `<div class="empty">${L("ما فماش قياسات بعد.", "Pas encore de mesures.")}</div>`}
        <p class="tiny muted">${L("النقطة = معدل النهار، والخط = من أقل قيمة لأعلى قيمة. المنطقة الخضراء 70–180.", "Point = moyenne du jour, trait = min → max. Zone verte : 70–180.")}</p></div>
      <div class="card"><h3>${L("الأرقام", "Chiffres")}</h3>
        <div class="row between"><span>${L("في المجال (70–180)", "Dans la cible (70–180)")}</span><b class="num">${Math.round(tir)}%</b></div>
        <div class="row between"><span>${L("المعدل", "Moyenne")}</span><b>${all.length ? U.esc(U.bgFmt(Math.round(avg))) : "—"}</b></div>
        <div class="row between"><span>${L("هبوط (< 70)", "Hypos (< 70)")}</span><b class="num" style="color:${hypo ? "var(--bad)" : "inherit"}">${hypo}</b></div>
        <div class="row between"><span>${L("> 250", "> 250")}</span><b class="num">${high}</b></div>
        <div class="row between"><span>${L("عدد القياسات", "Mesures")}</span><b class="num">${all.length} · ${daysWith} ${L("يوم", "j")}</b></div></div>
      <div class="card stripe saffron"><h3>${L("HbA1c تقديري", "HbA1c estimée")}</h3>
        ${daysWith >= 14 && all.length >= 30 ? `<div class="big">${U.num(gmi, 1)}%</div><p class="tiny muted">${L("محسوب من معدل القياسات (GMI). موش تحليل: التحليل في المخبر هو اللي يعطي الرقم الصحيح.", "Calculée à partir de la moyenne (GMI). Ce n'est pas une analyse : seul le labo donne la vraie valeur.")}</p>`
          : `<p class="small muted">${L(`يستحق على الأقل 14 يوم فيهم قياسات و30 قياس (توا ${daysWith} يوم و${all.length} قياس).`, `Il faut au moins 14 jours de mesures et 30 mesures (actuellement ${daysWith} j, ${all.length} mesures).`)}</p>`}
      </div></div>`;
  }
  App.acts.bgDays = (el) => { App.uiState.bgDays = +el.dataset.v; App.render(); };
  tab("health", "trends", () => L("تطور السكر", "Évolution"), trendsView);

  // hypo protocol (15/15) after a low reading
  const med = () => { const m = Store.doc("medical"); m.checks = m.checks || []; m.stock = m.stock || []; m.sleep = m.sleep || {}; return m; };
  const origBg = App.forms.bgAdd;
  App.forms.bgAdd = (fd) => {
    origBg(fd);
    const mg = U.bgToMg(fd.bg); if (!(mg > 10 && mg < 70)) return;
    const m = med(); m.hypo = { ts: Date.now(), bg: Math.round(mg), recheck: Date.now() + 15 * 60000, round: (m.hypo && Date.now() - m.hypo.ts < 3600000 ? (m.hypo.round || 1) + 1 : 1) }; Store.save("medical");
    hypoModal();
  };
  function hypoModal() {
    const m = med(), h = m.hypo; if (!h) return;
    App.modal(L("السكر هابط", "Hypoglycémie"), `<div class="stack">
      <div class="alertbox bad"><b>${U.esc(U.bgFmt(h.bg))}</b> — ${L("طبّق قاعدة 15/15 توا:", "Applique la règle 15/15 maintenant :")}</div>
      <ol class="small" style="margin:0;padding-inline-start:20px;line-height:1.9">
        <li>${L("كول 15 غرام سكر سريع: 3 طوابع سكر، ولا 150 ml عصير، ولا 3 تمرات.", "Prends 15 g de sucre rapide : 3 morceaux de sucre, ou 150 ml de jus, ou 3 dattes.")}</li>
        <li>${L("ما تسوقش، ما تخدمش على السلّم، وأقعد.", "Ne conduis pas, ne monte pas sur une échelle, assieds-toi.")}</li>
        <li>${L("استنى 15 دقيقة وعاود قيس.", "Attends 15 minutes et remesure.")}</li>
        <li>${L("إذا مازال تحت 70: عاود 15 غرام. كي يطلع فوق 70 وماكلتك بعيدة، كول حاجة فيها نشويات (خبزة، بسكويت).", "Si toujours < 70 : reprends 15 g. Une fois > 70, si le repas est loin, mange un glucide lent (pain, biscuits).")}</li>
      </ol>
      <div class="timer" id="hypoT">15:00</div>
      <p class="tiny muted">${L("إذا ولّيت ما تنجمش تبلع ولا تحس روحك باش تطيح: كلم حد قريب ولا الإسعاف 190.", "Si tu ne peux plus avaler ou te sens partir : appelle un proche ou le SAMU (190).")}</p>
      <button class="btn primary" data-act="closeModal">${L("فهمت", "Compris")}</button></div>`, (mb) => {
      const t = mb.querySelector("#hypoT"); const tick = () => { if (!document.getElementById("hypoT")) return clearInterval(iv); const left = Math.max(0, h.recheck - Date.now()); t.textContent = U.dur(left); if (!left) { t.textContent = L("عاود قيس توا", "Remesure maintenant"); clearInterval(iv); } }; const iv = setInterval(tick, 1000); tick();
    });
  }
  evt(() => { const h = med().hypo; if (!h || Date.now() - h.ts > 3 * 3600000) return []; return [{ at: new Date(h.recheck), key: "hypo-" + h.ts, title: L("عاود قيس السكر", "Remesure ta glycémie"), body: L("فاتو 15 دقيقة على الهبوط.", "15 minutes depuis l'hypo."), kind: "bad" }]; });

  // medical checks
  const CHECKS = () => [
    { id: "a1c", ar: "تحليل HbA1c", fr: "Analyse HbA1c", every: 3 },
    { id: "kid", ar: "تحليل الكلى (créatinine/DFG + microalbumine)", fr: "Rein (créatinine/DFG + microalbumine)", every: 12 },
    { id: "lip", ar: "تحليل الدهون (cholestérol)", fr: "Bilan lipidique", every: 12 },
    { id: "eye", ar: "فحص عينين (fond d'œil)", fr: "Fond d'œil", every: 12 },
    { id: "doc", ar: "زيارة طبيب السكري", fr: "Consultation diabétologue", every: 3 },
    { id: "dent", ar: "طبيب الأسنان", fr: "Dentiste", every: 6 },
    { id: "feet", ar: "فحص الساقين (pieds)", fr: "Examen des pieds", every: 12 }
  ];
  const checks = () => { const m = med(); if (!m.checks.length) m.checks = CHECKS(); return m.checks; };
  const checkDue = (c) => c.last ? addMonths(c.last, c.every) : "";
  function medView() {
    const cs = checks(), m = med();
    const st = m.stock;
    return `<div class="grid g2">
      <div class="card" style="grid-column:1/-1"><h3>${I.bell}${L("التحاليل والزيارات", "Analyses et visites")}</h3>
        <p class="small muted">${L("بما إنك تزرق الأنسولين وحدك، التحاليل هذي تحميك. التطبيق يفكرك كي يقرب موعدها.", "Comme tu gères seul ton insuline, ces examens te protègent. L'app te prévient à l'approche.")}</p>
        <div class="list" style="margin-top:8px">${cs.map(c => { const due = checkDue(c), dd = due ? daysTo(due) : null; return `<div class="li"><span class="pill ${!c.last ? "warn" : dd < 0 ? "bad" : dd <= 14 ? "warn" : "good"}">${!c.last ? L("ما عملتوش", "Jamais") : dd < 0 ? L("فات وقتو", "En retard") : dd <= 14 ? dd + " " + L("يوم", "j") : "✓"}</span><span class="grow small"><b>${U.esc(L(c.ar, c.fr))}</b><span class="tiny muted"> · ${L(`كل ${c.every} شهور`, `tous les ${c.every} mois`)}${c.last ? " · " + L("آخر مرة ", "dernière fois ") + U.ltr(c.last) : ""}${c.val ? " · " + U.esc(c.val) : ""}</span></span><button class="btn sm" data-act="chkDone" data-id="${c.id}">${L("عملتو", "Fait")}</button></div>`; }).join("")}</div></div>
      <div class="card" style="grid-column:1/-1"><h3>${I.drop}${L("الستوك (أنسولين، شرايط…)", "Stock (insuline, bandelettes…)")}</h3>
        ${st.length ? `<div class="list">${st.map(s => { const r = stockLeft(s); return `<div class="li"><span class="pill ${r.days != null && r.days <= 7 ? "bad" : r.days != null && r.days <= 14 ? "warn" : "good"}">${r.days != null ? r.days + " " + L("يوم", "j") : "—"}</span><span class="grow small"><b>${U.esc(s.name)}</b><span class="tiny muted"> · ${L("باقي", "reste")} ${Math.max(0, Math.round(r.left))} ${U.esc(s.unit)}${r.perDay ? " · " + U.num(r.perDay, 1) + " " + U.esc(s.unit) + L("/نهار", "/jour") : ""}</span></span><button class="btn sm" data-act="stockAdd" data-id="${s.id}">${L("شريت", "Racheté")}</button><button class="iconbtn" data-act="stockDel" data-id="${s.id}" aria-label="${L("امسح", "Supprimer")}">${I.x}</button></div>`; }).join("")}</div>` : `<div class="empty">${L("زيد الحاجات اللي تستعملها.", "Ajoute ce que tu utilises.")}</div>`}
        <form data-form="stockNew" class="form" style="margin-top:10px">
          <label class="f">${L("شنوة", "Quoi")}<select id="sk-kind" name="kind"><option value="rapid">${L("أنسولين سريع", "Insuline rapide")}</option><option value="basal">${L("أنسولين بطيء", "Insuline lente")}</option><option value="strips">${L("شرايط القياس", "Bandelettes")}</option><option value="needles">${L("إبر", "Aiguilles")}</option><option value="other">${L("حاجة أخرى", "Autre")}</option></select></label>
          <label class="f">${L("قداش عندك توا", "Quantité actuelle")}<input id="sk-qty" name="qty" type="number" min="0" step="1" required inputmode="numeric"></label>
          <label class="f">${L("في النهار (للحاجات الأخرى)", "Par jour (pour « autre »)")}<input id="sk-pd" name="perDay" type="number" min="0" step="0.1" inputmode="decimal"></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button></form>
        <p class="tiny muted" style="margin-top:6px">${L("الأنسولين بالوحدات (stylo = 300 وحدة عادة)، الشرايط والإبر بالحبة. التطبيق ينقّص وحدو من القياسات والزرقات اللي تسجّلهم.", "Insuline en unités (un stylo = 300 U en général), bandelettes et aiguilles à l'unité. L'app décompte toute seule les mesures et injections enregistrées.")}</p></div>
    </div>`;
  }
  function stockLeft(s) {
    const used = (kind, since) => { const e = H.entries(62).filter(x => x.ts >= since); if (kind === "strips") return e.filter(x => x.type === "bg").length; if (kind === "needles") return e.filter(x => x.type === "ins").length; if (kind === "rapid" || kind === "basal") return U.sum(e.filter(x => x.type === "ins" && (kind === "basal" ? x.itype === "basal" : x.itype !== "basal")), x => +x.units || 0); return null; };
    let left, perDay = null;
    if (s.kind === "other") { const d = (Date.now() - s.since) / 86400000; perDay = +s.perDay || 0; left = s.qty - perDay * d; }
    else { left = s.qty - used(s.kind, s.since); const u14 = used(s.kind, Date.now() - 14 * 86400000); perDay = u14 ? u14 / 14 : null; }
    return { left, perDay, days: perDay ? Math.floor(Math.max(0, left) / perDay) : null };
  }
  App.forms.stockNew = (fd) => {
    const names = { rapid: L("أنسولين سريع", "Insuline rapide"), basal: L("أنسولين بطيء", "Insuline lente"), strips: L("شرايط القياس", "Bandelettes"), needles: L("إبر", "Aiguilles"), other: L("حاجة", "Autre") };
    const units = { rapid: L("وحدة", "U"), basal: L("وحدة", "U"), strips: L("حبة", "pcs"), needles: L("حبة", "pcs"), other: L("حبة", "pcs") };
    med().stock.push({ id: U.id(), kind: fd.kind, name: names[fd.kind], unit: units[fd.kind], qty: num(fd.qty), perDay: num(fd.perDay), since: Date.now() }); Store.save("medical"); App.render();
  };
  App.acts.stockAdd = (el) => {
    const s = med().stock.find(x => x.id === el.dataset.id); if (!s) return;
    App.modal(L("شريت", "Racheté"), `<form data-form="stockAdd2" class="form"><input type="hidden" name="id" value="${s.id}"><label class="f full">${L(`قداش ${s.unit} عندك توا (الكل)؟`, `Combien de ${s.unit} as-tu maintenant (au total) ?`)}<input id="sa-q" name="qty" type="number" min="0" required value="${Math.max(0, Math.round(stockLeft(s).left))}"></label><button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.stockAdd2 = (fd) => { const s = med().stock.find(x => x.id === fd.id); if (!s) return; s.qty = num(fd.qty); s.since = Date.now(); Store.save("medical"); App.closeModal(); App.render(); };
  App.acts.stockDel = (el) => App.confirm(L("تمسحها؟", "Supprimer ?"), () => { const m = med(); m.stock = m.stock.filter(x => x.id !== el.dataset.id); Store.save("medical"); App.render(); });
  App.acts.chkDone = (el) => {
    const c = checks().find(x => x.id === el.dataset.id); if (!c) return;
    App.modal(L(c.ar, c.fr), `<form data-form="chkDone2" class="form"><input type="hidden" name="id" value="${c.id}"><label class="f">${L("النهار", "Date")}<input id="cd-d" name="date" type="date" value="${U.dkey()}"></label><label class="f">${L("النتيجة (اختياري)", "Résultat (optionnel)")}<input id="cd-v" name="val" type="text" maxlength="40" placeholder="${c.id === "a1c" ? "7.2%" : ""}"></label><button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.chkDone2 = (fd) => { const c = checks().find(x => x.id === fd.id); if (!c) return; c.last = fd.date || U.dkey(); c.val = (fd.val || "").trim(); Store.save("medical"); App.closeModal(); App.render(); };
  tab("health", "medical", () => L("التحاليل والستوك", "Analyses & stock"), medView);
  card("today", () => {
    const cs = checks().filter(c => c.last && daysTo(checkDue(c)) <= 14), lows = med().stock.map(s => ({ s, r: stockLeft(s) })).filter(x => x.r.days != null && x.r.days <= 7);
    if (!cs.length && !lows.length) return "";
    return `<a class="card" href="#health" data-act="goSub" data-tab="health" data-v="medical" style="display:block;text-decoration:none;color:inherit"><h3>${I.drop}${L("الصحة: لازم تعمل", "Santé : à prévoir")}</h3>${cs.map(c => `<div class="row between small" style="margin-top:4px"><span>${U.esc(L(c.ar, c.fr))}</span><span class="pill ${daysTo(checkDue(c)) < 0 ? "bad" : "warn"}">${daysTo(checkDue(c)) < 0 ? L("فات وقتو", "en retard") : daysTo(checkDue(c)) + " " + L("يوم", "j")}</span></div>`).join("")}${lows.map(x => `<div class="row between small" style="margin-top:4px"><span>${U.esc(x.s.name)}</span><span class="pill bad">${L(`يكمل بعد ${x.r.days} يوم`, `fini dans ${x.r.days} j`)}</span></div>`).join("")}</a>`;
  });

  // sleep
  const sleepKey = () => U.dkey();
  card("today", () => {
    const m = med(), k = sleepKey(), now = new Date();
    if (m.sleep[k] || now.getHours() >= 14) { const s = m.sleep[k]; return s && s.h < 6 && now.getHours() < 20 ? `<div class="card stripe warn"><h3>${L("رقدت قليل", "Peu dormi")}: ${U.num(s.h, 1)} ${L("ساعة", "h")}</h3><p class="small">${L("خفّف الجيم اليوم: نقّص سيرية من كل تمرين وما توصلش للعجز. قيس السكر قبل وبعد، والنوم الليلة قبل الوقت.", "Allège la salle aujourd'hui : une série de moins par exercice, pas jusqu'à l'échec. Mesure ta glycémie avant/après, et couche-toi plus tôt ce soir.")}</p></div>` : ""; }
    const r = App.R && App.R.cfg ? App.R.cfg() : {};
    return `<div class="card"><h3>${L("كيفاش رقدت البارح؟", "Comment as-tu dormi ?")}</h3>
      <form data-form="sleepLog" class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
        <label class="f" style="flex:1">${L("رقدت", "Couché")}<input id="sl-b" name="bed" type="time" value="${U.esc(r.sleep || "22:45")}"></label>
        <label class="f" style="flex:1">${L("فقت", "Levé")}<input id="sl-w" name="wake" type="time" value="${U.esc(r.wake || "04:45")}"></label>
        <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button></form></div>`;
  });
  App.forms.sleepLog = (fd) => {
    const [bh, bm] = (fd.bed || "23:00").split(":").map(Number), [wh, wm] = (fd.wake || "05:00").split(":").map(Number);
    let h = ((wh * 60 + wm) - (bh * 60 + bm)) / 60; if (h <= 0) h += 24;
    const m = med(); m.sleep[sleepKey()] = { bed: fd.bed, wake: fd.wake, h: Math.round(h * 10) / 10 };
    const lim = U.dkey(U.addDays(new Date(), -60)); for (const k of Object.keys(m.sleep)) if (k < lim) delete m.sleep[k];
    Store.save("medical"); App.render();
  };

  /* =====================================================================
     STUDIES
     ===================================================================== */
  const st = () => { const s = Store.doc("study"); s.quizzes = s.quizzes || []; return s; };
  const fileB64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
  function quizView() {
    const s = st(), cur = App.uiState.quiz;
    if (cur) return quizPlay(cur);
    const canPdf = !!(App.ai && App.aiPdf);
    return `<div class="grid g2">
      <div class="card stripe accent" style="grid-column:1/-1"><h3>${I.spark}${L("QCM من الدرس متاعك", "QCM à partir de ton cours")}</h3>
        <p class="small muted">${canPdf ? L("اختار ملف PDF متاع الدرس (ولا تصاور)، والذكاء الاصطناعي يحضّرلك أسئلة. الغلطات يرجعولك بعد في «راجع غلطاتك».", "Choisis le PDF du cours (ou des photos) : l'IA prépare des questions. Tes erreurs reviennent dans « Revoir mes erreurs ».") : L("صوّر صفحات الدرس ولا الصق النص، والذكاء الاصطناعي يحضّرلك أسئلة.", "Photographie les pages ou colle le texte : l'IA prépare des questions.")}</p>
        <form data-form="quizMake" class="form" style="margin-top:8px">
          <label class="f full">${L("الملف", "Fichier")}<input id="qz-f" name="file" type="file" accept="${canPdf ? "application/pdf," : ""}image/*" multiple data-change="quizFiles"></label>
          <label class="f full">${L("ولا الصق جزء من الدرس", "Ou colle un extrait")}<textarea id="qz-t" name="text" maxlength="20000" style="min-height:70px"></textarea></label>
          <label class="f">${L("المادة", "Matière")}<select id="qz-s" name="subj">${Store.doc("study").subjects.map(x => `<option value="${x.id}">${U.esc(x.name)}</option>`).join("")}<option value="">${L("أخرى", "Autre")}</option></select></label>
          <label class="f">${L("قداش من سؤال", "Nombre de questions")}<select id="qz-n" name="n"><option>8</option><option selected>12</option><option>20</option></select></label>
          <button class="btn primary full" type="submit" id="qz-go" ${App.ai ? "" : "disabled"}>${I.spark}${L("حضّر الأسئلة", "Préparer les questions")}</button></form>
        ${App.ai ? "" : App.aiNote()}<div id="qzOut" style="margin-top:8px"></div></div>
      <div class="card" style="grid-column:1/-1"><h3>${L("الاختبارات متاعك", "Tes quiz")}</h3>
        ${s.quizzes.length ? `<div class="list">${s.quizzes.map(q => { const last = (q.results || [])[0]; const wrong = q.qs.filter(x => x.wrong).length; return `<div class="li"><span class="grow small"><b>${U.esc(q.title)}</b><span class="tiny muted"> · ${q.qs.length} ${L("سؤال", "questions")}${last ? " · " + L("آخر نتيجة ", "dernier score ") + last.score + "%" : ""}</span></span>${wrong ? `<button class="btn sm" data-act="quizStart" data-id="${q.id}" data-mode="wrong">${L(`راجع غلطاتك (${wrong})`, `Revoir mes erreurs (${wrong})`)}</button>` : ""}<button class="btn sm primary" data-act="quizStart" data-id="${q.id}">${L("ابدا", "Commencer")}</button><button class="iconbtn" data-act="quizDel" data-id="${q.id}" aria-label="${L("امسح", "Supprimer")}">${I.x}</button></div>`; }).join("")}</div>` : `<div class="empty">${L("ما عملت حتى اختبار.", "Aucun quiz pour l'instant.")}</div>`}</div></div>`;
  }
  App.changes.quizFiles = (el) => { App.uiState.quizFiles = Array.from(el.files || []).slice(0, 5); };
  App.forms.quizMake = async (fd) => {
    if (!App.ai) return;
    const files = App.uiState.quizFiles || [], text = (fd.text || "").trim();
    if (!files.length && !text) return;
    const out = document.getElementById("qzOut"), go = document.getElementById("qz-go"); if (go) go.disabled = true;
    if (out) out.innerHTML = `<div class="row" style="gap:8px"><span class="spinner"></span><span class="small muted">${L("نقرا الدرس ونحضّر الأسئلة…", "Lecture du cours et préparation des questions…")}</span></div>`;
    const n = +fd.n || 12, subj = Store.doc("study").subjects.find(x => x.id === fd.subj);
    const prompt = `You are a strict but kind university teacher (engineering school, cybersecurity track). Build a multiple-choice quiz from the course material ${files.length ? "attached" : "below"}${subj ? ` (subject: ${subj.name})` : ""}.
${text ? "COURSE:\n" + text.slice(0, 18000) : ""}
Rules: ${n} questions, each with exactly 4 options and one correct answer; test understanding (definitions, mechanisms, comparisons, small calculations), not trivia; questions in the language of the course; short explanation (1–2 sentences) of why the answer is right; never invent content that is not in the course.
Reply with ONLY JSON: {"title":"short course title","qs":[{"q":"","o":["","","",""],"a":0,"e":"","topic":""}]}`;
    try {
      const opts = { modelTier: "default" };
      const imgs = files.filter(f => /^image\//.test(f.type)), pdfs = files.filter(f => f.type === "application/pdf");
      if (imgs.length) opts.images = imgs;
      if (pdfs.length) {
        if (U.sum(pdfs, f => f.size) > 14e6) throw { code: "too_big" };
        opts.files = await Promise.all(pdfs.map(async f => ({ type: "application/pdf", data: await fileB64(f), name: f.name })));
      }
      const r = await App.ai.json(prompt, opts);
      const qs = (r && Array.isArray(r.qs) ? r.qs : []).filter(x => x && x.q && Array.isArray(x.o) && x.o.length >= 2 && x.a >= 0 && x.a < x.o.length).slice(0, 30).map(x => ({ q: String(x.q), o: x.o.map(String), a: +x.a, e: String(x.e || ""), topic: String(x.topic || "") }));
      if (!qs.length) throw { code: "invalid_json" };
      const q = { id: U.id(), title: String(r.title || (files[0] && files[0].name) || L("اختبار", "Quiz")).slice(0, 80), subj: fd.subj || "", date: U.dkey(), qs, results: [] };
      const s = st(); s.quizzes.unshift(q); s.quizzes = s.quizzes.slice(0, 30); Store.save("study");
      App.uiState.quizFiles = null; App.uiState.quiz = { id: q.id, i: 0, picks: [], mode: "all" }; App.render();
    } catch (e) { const m = e && e.code === "too_big" ? L("الملف كبير برشا (أكثر من 14 ميغا). قسّمو ولا صوّر الصفحات المهمة.", "Fichier trop gros (> 14 Mo). Découpe-le ou photographie les pages utiles.") : App.aiError(e); if (out) out.innerHTML = m ? `<div class="alertbox warn small">${U.esc(m)}</div>` : ""; }
    if (go) go.disabled = false;
  };
  function quizPlay(cur) {
    const q = st().quizzes.find(x => x.id === cur.id); if (!q) { App.uiState.quiz = null; return ""; }
    const list = cur.mode === "wrong" ? q.qs.map((x, i) => ({ x, i })).filter(y => y.x.wrong) : q.qs.map((x, i) => ({ x, i }));
    if (cur.i >= list.length) {
      const ok = cur.picks.filter(p => p.ok).length, score = list.length ? Math.round(ok / list.length * 100) : 0;
      return `<div class="card stripe ${score >= 70 ? "good" : "warn"}" style="max-width:640px"><h3>${U.esc(q.title)}</h3><div class="big">${score}%</div><p class="small">${L(`${ok} صحاح من ${list.length}.`, `${ok} bonnes réponses sur ${list.length}.`)} ${score >= 85 ? L("ممتاز!", "Excellent !") : score >= 70 ? L("باهي، راجع الغلطات.", "Bien, revois tes erreurs.") : L("راجع الدرس وعاود بعد يومين.", "Revois le cours et refais-le dans deux jours.")}</p>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" data-act="quizEnd">${L("رجوع", "Retour")}</button>${q.qs.some(x => x.wrong) ? `<button class="btn" data-act="quizStart" data-id="${q.id}" data-mode="wrong">${L("راجع غلطاتك", "Revoir mes erreurs")}</button>` : ""}</div></div>`;
    }
    const { x } = list[cur.i], pick = cur.picks[cur.i];
    return `<div class="card" style="max-width:720px"><div class="row between"><span class="tiny muted">${U.esc(q.title)} · ${cur.i + 1}/${list.length}</span><button class="btn sm ghost" data-act="quizEnd">${L("وقّف", "Arrêter")}</button></div>
      <div class="bar" style="margin:8px 0"><i style="width:${cur.i / list.length * 100}%"></i></div>
      <h3 dir="auto" style="line-height:1.6">${U.esc(x.q)}</h3>
      <div class="stack" style="margin-top:10px">${x.o.map((o, j) => `<button class="btn quizopt ${pick ? (j === x.a ? "good" : j === pick.j ? "danger" : "") : ""}" dir="auto" data-act="quizPick" data-j="${j}" ${pick ? "disabled" : ""} style="justify-content:flex-start;text-align:start;white-space:normal">${String.fromCharCode(65 + j)}. ${U.esc(o)}</button>`).join("")}</div>
      ${pick ? `<div class="alertbox ${pick.ok ? "good" : "warn"} small" dir="auto" style="margin-top:10px">${pick.ok ? L("صحيح. ", "Correct. ") : L("غالط. ", "Faux. ")}${U.esc(x.e)}</div><button class="btn primary" style="margin-top:10px" data-act="quizNext">${L("اللي بعدو", "Suivante")}</button>` : ""}</div>`;
  }
  App.acts.quizStart = (el) => { App.uiState.quiz = { id: el.dataset.id, i: 0, picks: [], mode: el.dataset.mode || "all" }; App.render(); };
  App.acts.quizPick = (el) => {
    const cur = App.uiState.quiz, q = st().quizzes.find(x => x.id === cur.id); if (!q) return;
    const list = cur.mode === "wrong" ? q.qs.filter(x => x.wrong) : q.qs, x = list[cur.i], j = +el.dataset.j, ok = j === x.a;
    cur.picks[cur.i] = { j, ok }; x.wrong = !ok; Store.save("study"); App.render();
  };
  App.acts.quizNext = () => {
    const cur = App.uiState.quiz; cur.i++;
    const q = st().quizzes.find(x => x.id === cur.id);
    if (q && cur.mode === "all" && cur.i >= q.qs.length) { const ok = cur.picks.filter(p => p.ok).length; q.results = [{ date: U.dkey(), score: Math.round(ok / q.qs.length * 100) }, ...(q.results || [])].slice(0, 10); Store.save("study"); }
    App.render();
  };
  App.acts.quizEnd = () => { App.uiState.quiz = null; App.render(); };
  App.acts.quizDel = (el) => App.confirm(L("تمسح الاختبار؟", "Supprimer ce quiz ?"), () => { const s = st(); s.quizzes = s.quizzes.filter(x => x.id !== el.dataset.id); Store.save("study"); App.render(); });
  tab("study", "quiz", () => L("QCM", "QCM"), quizView);

  // absence alerts on class days + exam countdown
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
  function riskyToday(d = new Date()) {
    const ab = (Store.doc("study").absences || {}).items || [];
    const cls = App.R && App.R.classesFor ? App.R.classesFor(d) : [];
    const out = [];
    cls.forEach(c => { const a = ab.find(x => norm(x.subj) === norm(c.subj) || norm(x.subj).includes(norm(c.subj)) || norm(c.subj).includes(norm(x.subj))); if (a && a.rate >= 10 && !out.some(o => o.a === a)) out.push({ c, a }); });
    return out;
  }
  evt(() => riskyToday().map(({ c, a }) => ({ at: new Date(c.s.getTime() - 3 * 3600000), key: "abs-" + c.id + "-" + U.dkey(), title: L(`ما تغيبش اليوم: ${c.subj}`, `Ne rate pas : ${c.subj}`), body: L(`الغيابات ${a.rate}% · ${U.hm(c.s)}`, `Absences ${a.rate} % · ${U.hm(c.s)}`), kind: "warn" })));
  card("today", () => {
    const r = riskyToday(), ex = App.St && App.St.nextExam ? App.St.nextExam() : null, dd = ex ? daysTo(ex.date) : null;
    if (!r.length && !(ex && dd <= 21)) return "";
    return `<div class="card ${r.length ? "stripe bad" : ""}">${r.length ? `<h3>${I.alert}${L("ما تغيبش اليوم", "Ne rate pas aujourd'hui")}</h3>${r.map(({ c, a }) => `<div class="row between small" style="margin-top:4px"><span>${U.esc(c.subj)} · ${U.hm(c.s)}</span><span class="pill ${a.rate >= 25 ? "bad" : "warn"}">${a.rate}%</span></div>`).join("")}` : ""}
      ${ex && dd <= 21 ? `<div class="row between" style="margin-top:${r.length ? 10 : 0}px"><span class="small"><b>${U.esc(App.St.subName(ex.subj))}</b> — ${L("امتحان", "examen")}</span><span class="pill ${dd <= 3 ? "bad" : dd <= 10 ? "warn" : "accent"}">${dd === 0 ? L("اليوم", "aujourd'hui") : dd + " " + L("يوم", "j")}</span></div><div class="row" style="margin-top:8px;gap:8px"><button class="btn sm primary" data-act="pomodoro">${I.play}${L("حصة مراجعة توا", "Réviser maintenant")}</button><a class="btn sm" href="#study" data-act="goSub" data-tab="study" data-v="quiz">QCM</a></div>` : ""}</div>`;
  });

  /* =====================================================================
     DEEN
     ===================================================================== */
  // Quran audio: Qalun (whole surah, mp3quran.net) or Hafs ayah by ayah with repeats (everyayah.com)
  const AYAT = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];
  const RECITERS = [
    { id: "qalun-husr", ar: "الحصري — قالون (السورة كاملة)", fr: "Al-Husary — Qalun (sourate entière)", rewaya: "qalun", surah: (s) => `https://server13.mp3quran.net/husr/Rewayat-Qalon-A-n-Nafi/${String(s).padStart(3, "0")}.mp3` },
    { id: "qalun-deban", ar: "أحمد ديبان — قالون (السورة كاملة)", fr: "Ahmad Deban — Qalun (sourate entière)", rewaya: "qalun", surah: (s) => `https://server16.mp3quran.net/deban/Rewayat-Qalon-A-n-Nafi/${String(s).padStart(3, "0")}.mp3` },
    { id: "hafs-husary-m", ar: "الحصري المعلّم — حفص (آية بآية)", fr: "Al-Husary Mu'allim — Hafs (verset par verset)", rewaya: "hafs", ayah: (s, a) => `https://everyayah.com/data/Husary_Muallim_128kbps/${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3` },
    { id: "hafs-minshawi", ar: "المنشاوي — حفص (آية بآية)", fr: "Al-Minshawi — Hafs (verset par verset)", rewaya: "hafs", ayah: (s, a) => `https://everyayah.com/data/Minshawy_Murattal_128kbps/${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3` }
  ];
  const audio = { el: null, q: [], i: 0, rep: 0, on: false };
  function audioView() {
    const h = (App.Q && App.Q.halaqa && App.Q.halaqa()) || {}, a = App.uiState.au || {};
    const surah = +a.surah || +h.surah || 9, from = +a.from || +h.from || 1, to = +a.to || +h.to || Math.min(AYAT[surah - 1], from + 9);
    const rec = RECITERS.find(r => r.id === (a.rec || "qalun-husr")) || RECITERS[0];
    const playing = audio.on;
    return `<div class="card" style="grid-column:1/-1"><h3>${I.play}${L("استمع للحفظ", "Écouter pour mémoriser")}</h3>
      <form data-form="auPlay" class="form" style="margin-top:6px">
        <label class="f full">${L("القارئ", "Récitateur")}<select id="au-rec" name="rec">${RECITERS.map(r => `<option value="${r.id}" ${r.id === rec.id ? "selected" : ""}>${U.esc(L(r.ar, r.fr))}</option>`).join("")}</select></label>
        <label class="f">${L("السورة (رقم)", "Sourate (n°)")}<input id="au-s" name="surah" type="number" min="1" max="114" value="${surah}"></label>
        <label class="f">${L("من الآية", "Du verset")}<input id="au-f" name="from" type="number" min="1" value="${from}"></label>
        <label class="f">${L("للآية", "Au verset")}<input id="au-t" name="to" type="number" min="1" value="${to}"></label>
        <label class="f">${L("كل آية قداش مرة", "Répéter chaque verset")}<select id="au-r" name="rep">${[1, 3, 5, 10].map(n => `<option ${n === (+a.rep || 3) ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <div class="row full" style="gap:8px"><button class="btn primary" type="submit">${I.play}${playing ? L("عاود من الأول", "Recommencer") : L("ابدا", "Lancer")}</button>${playing ? `<button class="btn" type="button" data-act="auStop">${L("وقّف", "Arrêter")}</button>` : ""}</div></form>
      <div id="auNow" class="small" style="margin-top:8px">${playing ? auStatus() : ""}</div>
      <p class="tiny muted" style="margin-top:6px">${L("تلاوات قالون (رواية تونس) موجودة بالسورة كاملة برك. باش تعاود آية بآية، اختار تلاوة «آية بآية» (برواية حفص) وانتبه للفروق في القراءة.", "Les récitations en Qalun (lecture tunisienne) existent seulement par sourate entière. Pour répéter verset par verset, choisis une récitation « verset par verset » (lecture Hafs) et attention aux différences de lecture.")} ${L("يستحق انترنت.", "Nécessite internet.")}</p></div>`;
  }
  const auStatus = () => { const it = audio.q[audio.i]; return it ? (it.a ? L(`الآية ${it.a} — المرة ${audio.rep + 1}/${it.n}`, `Verset ${it.a} — fois ${audio.rep + 1}/${it.n}`) : L("السورة كاملة", "Sourate entière")) : ""; };
  App.forms.auPlay = (fd) => {
    const surah = Math.min(114, Math.max(1, +fd.surah || 9)), max = AYAT[surah - 1];
    const from = Math.min(max, Math.max(1, +fd.from || 1)), to = Math.min(max, Math.max(from, +fd.to || from)), rep = +fd.rep || 3;
    App.uiState.au = { rec: fd.rec, surah, from, to, rep };
    const rec = RECITERS.find(r => r.id === fd.rec) || RECITERS[0];
    audio.q = rec.ayah ? Array.from({ length: to - from + 1 }, (_, k) => ({ url: rec.ayah(surah, from + k), a: from + k, n: rep })) : [{ url: rec.surah(surah), a: 0, n: 1 }];
    audio.i = 0; audio.rep = 0; audio.on = true; playCur(); App.render();
  };
  function playCur() {
    const it = audio.q[audio.i]; if (!it) { audio.on = false; App.render(); return; }
    if (!audio.el) { audio.el = new Audio(); audio.el.addEventListener("ended", () => { const c = audio.q[audio.i]; if (!c) return; audio.rep++; if (audio.rep >= c.n) { audio.rep = 0; audio.i++; } if (audio.i >= audio.q.length) { audio.i = 0; } playCur(); }); audio.el.addEventListener("error", () => { App.toast(L("الصوت ما خدمش", "Audio indisponible"), L("ثبّت في الانترنت ولا بدّل القارئ.", "Vérifie internet ou change de récitateur."), "warn"); audio.on = false; App.render(); }); }
    audio.el.src = it.url; audio.el.play().catch(() => {});
    const n = document.getElementById("auNow"); if (n) n.textContent = auStatus();
  }
  App.acts.auStop = () => { if (audio.el) audio.el.pause(); audio.on = false; App.render(); };
  tab("deen", "listen", () => L("استمع", "Écouter"), () => `<div class="grid">${audioView()}</div>`);

  // Friday: al-Kahf and the hour of answered du'a
  const isFri = (d = new Date()) => U.dow(d) === 5;
  evt(() => {
    const now = new Date(); if (!isFri(now)) return [];
    const P = App.prayer.today(now);
    return [
      { at: at("07:30", now), key: "fri-kahf-" + U.dkey(), title: L("اليوم الجمعة: سورة الكهف", "Vendredi : sourate al-Kahf"), body: L("واكثر من الصلاة على النبي ﷺ.", "Et multiplie les prières sur le Prophète ﷺ."), kind: "good" },
      { at: new Date(P.maghrib.getTime() - 45 * 60000), key: "fri-hour-" + U.dkey(), title: L("ساعة الاستجابة", "L'heure de l'exaucement"), body: L("آخر ساعة قبل المغرب: ادعي بحاجتك.", "Dernière heure avant le Maghreb : fais tes invocations."), kind: "good" }
    ];
  });
  card("today", () => {
    if (!isFri()) return "";
    const d = Store.doc("deen"); d.fri = d.fri || {}; const done = !!d.fri[U.dkey()];
    return `<div class="card stripe saffron"><h3>${I.book}${L("اليوم الجمعة", "C'est vendredi")}</h3><label class="check" style="margin-top:6px"><input type="checkbox" data-change="kahfDone" ${done ? "checked" : ""}>${L("قريت سورة الكهف", "J'ai lu sourate al-Kahf")}</label><p class="tiny muted" style="margin-top:6px">${L("واكثر من الصلاة على النبي ﷺ، وآخر ساعة قبل المغرب للدعاء.", "Multiplie les prières sur le Prophète ﷺ ; la dernière heure avant le Maghreb est pour les invocations.")}</p></div>`;
  });
  App.changes.kahfDone = (el) => { const d = Store.doc("deen"); d.fri = d.fri || {}; if (el.checked) d.fri[U.dkey()] = true; else delete d.fri[U.dkey()]; Store.save("deen"); App.render(); };

  // missed prayers (qada)
  const PRS = [["fajr", "الصبح", "Sobh"], ["dhuhr", "الظهر", "Dhohr"], ["asr", "العصر", "Asr"], ["maghrib", "المغرب", "Maghreb"], ["isha", "العشاء", "Icha"]];
  function qadaView() {
    const d = Store.doc("deen"); d.qada = d.qada || {}; const total = U.sum(PRS, p => +d.qada[p[0]] || 0);
    return `<div class="grid g2"><div class="card stripe accent"><h3>${L("قضاء الصلوات", "Rattrapage des prières")}</h3>
      <p class="small muted">${L("حط قداش عليك من كل صلاة (تقدير). كل ما تقضي وحدة انزل «قضيت».", "Indique combien tu dois de chaque prière (estimation). À chaque rattrapage, appuie sur « Rattrapée ».")}</p>
      <div class="list" style="margin-top:8px">${PRS.map(([k, ar, fr]) => `<div class="li"><span class="grow"><b>${L(ar, fr)}</b></span><input type="number" min="0" step="1" value="${+d.qada[k] || 0}" data-change="qadaSet" data-k="${k}" style="max-width:90px" aria-label="${L(ar, fr)}"><button class="btn sm primary" data-act="qadaDone" data-k="${k}" ${+d.qada[k] ? "" : "disabled"}>${L("قضيت", "Rattrapée")}</button></div>`).join("")}</div>
      <div class="row between" style="margin-top:10px"><span>${L("الباقي", "Reste")}</span><b class="mid">${total}</b></div>
      <p class="tiny muted" style="margin-top:6px">${L("نصيحة: صلاة قضاء مع كل صلاة حاضرة، تكمل بالشوية بالشوية.", "Conseil : une prière rattrapée avec chaque prière du jour, petit à petit.")}</p></div></div>`;
  }
  App.changes.qadaSet = (el) => { const d = Store.doc("deen"); d.qada = d.qada || {}; d.qada[el.dataset.k] = Math.max(0, Math.round(+el.value || 0)); Store.save("deen"); App.render(); };
  App.acts.qadaDone = (el) => { const d = Store.doc("deen"); d.qada = d.qada || {}; d.qada[el.dataset.k] = Math.max(0, (+d.qada[el.dataset.k] || 0) - 1); d.qadaLog = d.qadaLog || {}; d.qadaLog[U.dkey()] = (d.qadaLog[U.dkey()] || 0) + 1; Store.save("deen"); App.toast(L("تقبّل الله", "Qu'Allah l'accepte"), "", "good"); App.render(); };
  tab("deen", "qada", () => L("القضاء", "Rattrapage"), qadaView);

  /* =====================================================================
     WEEKLY REPORT + STREAKS
     ===================================================================== */
  function streak(test, maxDays = 120, skip) {
    let n = 0;
    for (let i = 0; i < maxDays; i++) { const d = U.addDays(new Date(), -i); if (skip && skip(d)) continue; if (test(d)) n++; else if (i === 0) continue; else break; }
    return n;
  }
  function weekStats() {
    const deen = Store.doc("deen"), sport = Store.doc("sport"), s = Store.doc("settings"), rv = Store.doc("review");
    const days = Array.from({ length: 7 }, (_, i) => U.addDays(new Date(), -i));
    const prayers = U.sum(days, d => Object.values(deen.prayers[U.dkey(d)] || {}).filter(Boolean).length);
    const gymPlan = days.filter(d => s.sport.week[U.dow(d)] !== "rest").length, gymDone = days.filter(d => sport.done[U.dkey(d)]).length;
    const hifz = days.filter(d => deen.wird && deen.wird[U.dkey(d)]).length;
    let tickets = 0; days.forEach(d => { tickets += Store.month("work", U.mkey(d)).tickets.filter(t => t.status === "done" && t.date === U.dkey(d)).length; });
    const earned = U.sum(days, d => U.sum(Store.month("money", U.mkey(d)).incomes.filter(x => x.date === U.dkey(d)), x => +x.amount || 0));
    const bgs = H.entries(7).filter(e => e.type === "bg"), tir = bgs.length ? Math.round(bgs.filter(e => e.bg >= 70 && e.bg <= 180).length / bgs.length * 100) : null;
    const scores = days.map(d => (rv.days[U.dkey(d)] || {}).score).filter(x => x != null), rvAvg = scores.length ? Math.round(U.sum(scores, x => x) / scores.length) : null;
    const streaks = {
      fajr: streak(d => !!(deen.prayers[U.dkey(d)] || {}).fajr),
      prayers: streak(d => Object.values(deen.prayers[U.dkey(d)] || {}).filter(Boolean).length >= 5),
      gym: streak(d => !!sport.done[U.dkey(d)], 120, d => s.sport.week[U.dow(d)] === "rest"),
      hifz: streak(d => !!(deen.wird && deen.wird[U.dkey(d)]), 120, d => U.dow(d) === 0 || U.dow(d) === 6)
    };
    return { prayers, gymPlan, gymDone, hifz, tickets, earned, tir, rvAvg, streaks };
  }
  function weekCard(full) {
    const w = weekStats();
    const row = (k, v, ok) => `<div class="row between small" style="margin-top:4px"><span>${k}</span><b class="num" style="color:${ok == null ? "inherit" : ok ? "var(--good)" : "var(--warn)"}">${v}</b></div>`;
    return `<div class="card stripe accent"><h3>${I.target}${L("بيلان الجمعة (آخر 7 أيام)", "Bilan de la semaine (7 derniers jours)")}</h3>
      ${row(L("الصلوات", "Prières"), `${w.prayers}/35`, w.prayers >= 33)}
      ${row(L("الجيم", "Salle"), `${w.gymDone}/${w.gymPlan}`, w.gymDone >= w.gymPlan)}
      ${row(L("الحفظ", "Hifz"), `${w.hifz}/5`, w.hifz >= 5)}
      ${row(L("التدخلات", "Interventions"), `${w.tickets} · ${U.money(w.earned)}`, null)}
      ${w.tir != null ? row(L("السكر في المجال", "Glycémie dans la cible"), w.tir + "%", w.tir >= 70) : ""}
      ${w.rvAvg != null ? row(L("محاسبة الليل (معدل)", "Bilan du soir (moyenne)"), w.rvAvg + "%", w.rvAvg >= 70) : ""}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
        <span class="pill accent">${L("الصبح", "Sobh")} ${w.streaks.fajr} ${L("يوم متتالي", "j de suite")}</span>
        <span class="pill accent">${L("5 صلوات", "5 prières")} ${w.streaks.prayers}</span>
        <span class="pill accent">${L("الجيم", "Salle")} ${w.streaks.gym}</span>
        <span class="pill accent">${L("الحفظ", "Hifz")} ${w.streaks.hifz}</span></div>
      ${full ? "" : ""}</div>`;
  }
  card("today", () => { const now = new Date(); return U.dow(now) === 0 && now >= App.prayer.today(now).maghrib ? weekCard() : ""; });
  evt(() => { const now = new Date(); if (U.dow(now) !== 0) return []; return [{ at: new Date(App.prayer.today(now).maghrib.getTime() + 75 * 60000), key: "week-" + U.dkey(), title: L("بيلان الجمعة جاهز", "Ton bilan de la semaine est prêt"), body: L("شوف شنوة عملت هالجمعة.", "Regarde ta semaine."), kind: "good" }]; });
  App.weekCard = weekCard;

  /* =====================================================================
     CAR MODE: big buttons while driving between tickets
     ===================================================================== */
  function nextTicket() {
    const list = W.month(U.mkey()).tickets.filter(t => t.date === U.dkey() && t.status === "todo");
    if (!list.length) return null;
    const home = App.place("home"), from = list.find(t => isFinite(t.lat)) && home ? home : null;
    if (!from) return list[0];
    return list.filter(t => isFinite(t.lat)).sort((a, b) => App.Geo.km(from, a) - App.Geo.km(from, b))[0] || list[0];
  }
  function carMode() {
    const t = nextTicket(), P = App.prayer.status(), wc = W.cfg(), c = App.moneyCalc();
    const doneT = W.month(U.mkey()).tickets.filter(x => x.date === U.dkey() && x.status === "done").length;
    return `<div class="carmode" role="dialog" aria-label="${L("وضع الكرهبة", "Mode voiture")}">
      <div class="row between"><b>${L("وضع الكرهبة", "Mode voiture")}</b><button class="btn" data-act="carModeOff">${L("سكّر", "Fermer")}</button></div>
      <div class="cm-big">${App.prName(P.next.k)} ${U.hm(P.next.at)}</div>
      <div class="cm-sub">${L(`اليوم: ${doneT} تدخلات · ${U.money(c.earnedToday)}`, `Aujourd'hui : ${doneT} interventions · ${U.money(c.earnedToday)}`)}</div>
      ${t ? `<div class="cm-card"><div class="cm-sub">${L("التيكي الجاي", "Prochain ticket")}</div><div class="cm-mid">${U.esc(t.client || t.addr || "—")}</div><div class="cm-sub">${U.esc(t.addr || "")}</div>
        <div class="cm-row">${isFinite(t.lat) ? `<a class="cm-btn primary" href="${App.Geo.dir(null, t)}" target="_blank" rel="noopener">${L("الطريق", "Itinéraire")}</a>` : ""}${t.phone ? `<a class="cm-btn" href="tel:${U.esc(t.phone.replace(/\s/g, ""))}">${L("كلّم", "Appeler")}</a>` : ""}<button class="cm-btn good" data-act="tkDone" data-id="${t.id}">${L("كمّلت", "Terminé")}</button></div></div>`
        : `<div class="cm-row">${Object.keys(wc.ops).map(k => `<button class="cm-btn ${k === "orange" ? "op-orange" : "op-ooredoo"}" data-act="quickDone" data-op="${k}">+1 ${U.esc(wc.ops[k].name || k)}</button>`).join("")}</div>`}
      <div class="cm-row"><a class="cm-btn" href="#health" data-act="carModeOff">${L("سجّل السكر", "Glycémie")}</a></div>
      <p class="cm-sub" style="margin-top:auto">${L("ما تستعملش التلفون وانت تسوق: وقّف الكرهبة قبل.", "N'utilise pas le téléphone en conduisant : arrête-toi d'abord.")}</p></div>`;
  }
  App.acts.carModeOn = () => { App.uiState.carMode = true; renderCarMode(); };
  App.acts.carModeOff = () => { App.uiState.carMode = false; renderCarMode(); };
  function renderCarMode() {
    let el = document.getElementById("carmode");
    if (!App.uiState.carMode) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "carmode"; document.body.appendChild(el); }
    el.innerHTML = carMode();
  }
  const origRender = App.render;
  App.render = () => { origRender(); if (App.uiState.carMode) renderCarMode(); };
  card("tiles", () => `<button class="tile carmode-tile" data-act="carModeOn"><span class="k">${I.link}${L("وضع الكرهبة", "Mode voiture")}</span><span class="v" style="font-size:1rem">${L("بوتونات كبار", "Gros boutons")}</span><span class="s">${L("بين تيكي وتيكي", "entre deux tickets")}</span></button>`);
})();
