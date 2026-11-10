/* Nhari — budgets and food supplements.
   - Monthly budgets per category (outings, clothes…): spent this month vs the limit.
   - Savings pots (wedding, new car, car repairs, a gift…): money put aside is "reserved" inside the cash
     you have; spending from a pot records the expense and frees the reserved money.
   - Food supplements (zinc, creatine…): a pack runs out on a known day; its monthly cost is set aside
     in the "supplements" pot, and a reminder comes before it runs out. */
(function () {
  "use strict";
  const MW = App.MW;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
  const envs = () => { const c = MW.cfg(); if (!Array.isArray(c.envelopes)) c.envelopes = []; return c.envelopes; };
  const med = () => { const m = Store.doc("medical"); if (!Array.isArray(m.supps)) m.supps = []; return m; };
  const supps = () => med().supps;
  const dayDiff = (a, b) => Math.round((U.parseD(b) - U.parseD(a)) / 864e5);
  const monthsBetween = (a, b) => { const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };
  const catName = (k) => App.catName ? App.catName(k) : k;
  const PERSONAL = (k) => !(App.NOT_PERSONAL || []).includes(k);
  const card = (name, fn) => { (App.EXT.cards[name] = App.EXT.cards[name] || []).push(fn); };

  /* ---------- supplements ---------- */
  // s: { id, name, unit, qty (pack), dose (per day), price, since (day key), left (amount at the start of `since`) }
  function suppState(s, today = U.dkey()) {
    const dose = num(s.dose) || 1, qty = num(s.qty) || 0;
    const leftToday = Math.max(0, num(s.left) - Math.max(0, dayDiff(s.since, today)) * dose); // before today's dose
    const days = Math.floor(leftToday / dose + 1e-9);
    const packDays = qty / dose || 0;
    const monthly = packDays ? num(s.price) / packDays * 30.4 : 0;
    const lastDay = days > 0 ? U.dkey(U.addDays(U.parseD(today), days - 1)) : today;
    return { leftToday, days, packDays, monthly, lastDay };
  }
  const suppMonthly = () => U.sum(supps(), s => suppState(s).monthly);

  /* ---------- pots and budgets ---------- */
  // e: { id, name, emoji, kind: "spend"|"save", cats: [] (spend), limit (spend / month),
  //      target, due, monthly, cat (save: category of what is bought from it), auto: "supp", log: [{id,date,amount,note,ref}] }
  const potBal = (e) => r3(U.sum(e.log || [], x => +x.amount || 0));
  function potPlan(e, now = new Date()) {
    const mk = U.mkey(now), bal = potBal(e);
    const inThisMonth = U.sum((e.log || []).filter(x => (x.date || "").slice(0, 7) === mk && x.amount > 0 && !x.ref), x => +x.amount);
    if (e.auto === "supp") return { perMonth: Math.ceil(suppMonthly()), bal, inThisMonth };
    if (+e.monthly > 0) return { perMonth: +e.monthly, bal, inThisMonth };
    if (+e.target > 0 && e.due) {
      const balStart = bal - U.sum((e.log || []).filter(x => (x.date || "").slice(0, 7) === mk), x => +x.amount || 0);
      const left = Math.max(0, +e.target - balStart), months = Math.max(1, monthsBetween(mk, e.due.slice(0, 7)) + 1);
      return { perMonth: Math.ceil(left / months), bal, inThisMonth, months };
    }
    return { perMonth: 0, bal, inThisMonth };
  }
  function spendState(e, m = Store.month("money")) {
    const cats = e.cats || [];
    const spent = U.sum(m.expenses.filter(x => cats.includes(x.cat)), x => +x.amount || 0);
    const limit = +e.limit || 0;
    const now = new Date(), calLeft = U.daysInMonth(now) - U.P(now).d + 1;
    return { spent, limit, left: limit - spent, perDay: limit > spent ? Math.floor((limit - spent) / calLeft * 2) / 2 : 0, pct: limit ? U.clamp(spent / limit * 100, 0, 100) : 0 };
  }
  const reserved = () => r3(U.sum(envs().filter(e => e.kind === "save"), potBal));

  // what the budgets add to the monthly need: savings pots + spend budgets outside the personal budget (car…)
  App.envMonthly = (now = new Date()) => {
    const lines = []; let total = 0, save = 0;
    for (const e of envs()) {
      if (e.kind === "save") { const p = potPlan(e, now).perMonth; if (p > 0) { lines.push({ label: `${e.emoji || ""} ${e.name}`.trim(), amount: p }); total += p; save += p; } }
      else if ((e.cats || []).length && !(e.cats || []).some(PERSONAL) && +e.limit > 0) { lines.push({ label: `${e.emoji || ""} ${e.name}`.trim(), amount: +e.limit }); total += +e.limit; }
    }
    return { total, save, lines };
  };
  App.envReservedLine = (bal) => {
    const res = reserved(); if (!res) return "";
    return `<div class="row between small" style="margin-top:4px;flex-wrap:wrap;gap:6px"><span class="muted">${L("منها محطوطة على جنب (الميزانيات)", "dont mis de côté (budgets)")} <b class="num">${U.money(res)}</b></span><span>${L("تنجم تصرف", "Disponible")} <b class="num" style="color:${bal - res < 0 ? "var(--bad)" : "var(--accent)"}">${U.money(r3(bal - res))}</b></span></div>`;
  };
  // deleting an expense that came out of a pot puts the money back in the pot
  const origUndo = MW.undo;
  MW.undo = (ref) => {
    origUndo(ref);
    let changed = false;
    for (const e of envs()) { const n = (e.log || []).length; e.log = (e.log || []).filter(x => x.ref !== ref); if (e.log.length !== n) changed = true; }
    if (changed) Store.save("moneycfg");
  };

  function spendExpense(amount, cat, note, envId) {
    const date = U.dkey(), mk = date.slice(0, 7), m = Store.month("money", mk);
    const it = { id: U.id(), ts: Date.now(), date, amount: r3(amount), cat, note: note || "" };
    if (envId) it.env = envId;
    m.expenses.push(it); Store.save("money-" + mk);
    if (MW.on()) MW.move(-amount, note || catName(cat), "x:" + it.id, date);
    return it;
  }

  /* ---------- view ---------- */
  function suppCard() {
    const list = supps(), pot = envs().find(e => e.auto === "supp");
    return `<div class="card stripe good" style="grid-column:1/-1"><div class="row between"><h3>🧴 ${L("المكمّلات", "Compléments")}</h3>${pot ? `<span class="small muted">${L("لازمك تحط", "À mettre de côté")} <b class="num">${U.money(Math.ceil(suppMonthly()))}</b> ${L("في الشهر", "/ mois")}</span>` : ""}</div>
      ${list.length ? `<div class="list">${list.map(s => { const st = suppState(s); return `<div class="li" style="flex-wrap:wrap">
        <span class="pill ${st.days <= 3 ? "bad" : st.days <= 10 ? "warn" : "good"}">${st.days} ${L("يوم", "j")}</span>
        <span class="grow small"><b>${U.esc(s.name)}</b><span class="tiny muted"> · ${L("باقي", "reste")} ${U.num(st.leftToday, 1)} ${U.esc(s.unit)} · ${U.num(s.dose, 2)} ${U.esc(s.unit)}${L("/نهار", "/jour")} · ${L("يكمل", "fini le")} ${U.esc(U.dateShort(U.parseD(st.lastDay)))} · ${U.money(Math.round(st.monthly * 10) / 10)}${L("/شهر", "/mois")}</span></span>
        <button class="btn sm primary" data-act="suppBuy" data-id="${s.id}">${L("شريت", "Racheté")}</button><button class="btn sm ghost" data-act="suppFix" data-id="${s.id}">${L("صحّح", "Corriger")}</button><button class="iconbtn" data-act="suppDel" data-id="${s.id}" aria-label="${L("امسح", "Supprimer")}">${I.x}</button></div>`; }).join("")}</div>`
        : `<div class="empty">${L("زيد المكمّلات اللي تاخذها.", "Ajoute les compléments que tu prends.")}</div>`}
      <details style="margin-top:8px"><summary class="small">${I.plus}${L("زيد مكمّل", "Ajouter un complément")}</summary>
      <form data-form="suppNew" class="form" style="margin-top:8px">
        <label class="f">${L("الاسم", "Nom")}<input id="sp-name" name="name" required maxlength="30" placeholder="${L("مثلا: أوميغا 3", "ex : oméga 3")}"></label>
        <label class="f">${L("الوحدة", "Unité")}<select id="sp-unit" name="unit"><option value="${L("حبة", "gél.")}">${L("حبة", "gélule")}</option><option value="g">g</option><option value="ml">ml</option></select></label>
        <label class="f">${L("قداش في العلبة", "Quantité de la boîte")}<input id="sp-qty" name="qty" type="number" min="1" step="any" required></label>
        <label class="f">${L("قداش كل نهار", "Dose par jour")}<input id="sp-dose" name="dose" type="number" min="0.1" step="any" required value="1"></label>
        <label class="f">${L("السوم", "Prix")}<input id="sp-price" name="price" type="number" min="0" step="0.001" inputmode="decimal"></label>
        <label class="f">${L("بديت فيه نهار", "Commencé le")}<input id="sp-start" name="start" type="date" value="${U.dkey()}"></label>
        <button class="btn primary" type="submit">${L("زيد", "Ajouter")}</button>
      </form></details></div>`;
  }

  function potCard(e) {
    const p = potPlan(e), pct = +e.target ? U.clamp(p.bal / e.target * 100, 0, 100) : 0;
    const extra = e.auto === "supp" ? (() => { const next = supps().map(s => ({ s, st: suppState(s) })).sort((a, b) => a.st.days - b.st.days)[0]; return next ? `<p class="tiny muted" style="margin-top:4px">${L("الشرية الجاية:", "Prochain achat :")} ${U.esc(next.s.name)} · ${U.money(next.s.price)} · ${L(`بعد ${next.st.days} يوم`, `dans ${next.st.days} j`)}</p>` : ""; })() : "";
    return `<div class="card">
      <div class="row between"><h3 style="margin:0">${U.esc(e.emoji || "💰")} ${U.esc(e.name)}</h3><button class="iconbtn" data-act="envEdit" data-id="${e.id}" aria-label="${L("بدّل", "Modifier")}">${I.edit || "✎"}</button></div>
      <div class="row between" style="margin-top:8px"><span class="big num">${U.money(p.bal)}</span>${+e.target ? `<span class="small muted">/ ${U.money(e.target)}</span>` : ""}</div>
      ${+e.target ? `<div class="bar good" style="margin:8px 0"><i style="width:${pct}%"></i></div>` : ""}
      <div class="small muted">${p.perMonth ? L(`كل شهر: ${U.money(p.perMonth)} · حطّيت هذا الشهر ${U.money(p.inThisMonth)}`, `Chaque mois : ${U.money(p.perMonth)} · ce mois-ci ${U.money(p.inThisMonth)}`) : L("ما فماش مبلغ في الشهر", "Pas de montant mensuel")}${e.due ? " · " + L("قبل", "avant le") + " " + U.ltr(e.due) : ""}</div>
      ${extra}
      <form data-form="potMove" class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><input type="hidden" name="id" value="${e.id}">
        <input name="amount" id="pm-${e.id}" type="number" step="0.001" min="0" inputmode="decimal" style="max-width:120px" placeholder="${L("المبلغ", "Montant")}" value="${Math.max(0, p.perMonth - p.inThisMonth) || ""}">
        <button class="btn sm primary" type="submit" name="dir" value="in">${L("حطّيت", "Mis de côté")}</button>
        <button class="btn sm" type="submit" name="dir" value="spend">${L("صرفت منها", "Dépensé")}</button>
        <button class="btn sm ghost" type="submit" name="dir" value="out">${L("رجّعتها", "Repris")}</button></form>
    </div>`;
  }

  function spendCard(e) {
    const s = spendState(e);
    return `<div class="card">
      <div class="row between"><h3 style="margin:0">${U.esc(e.emoji || "🧾")} ${U.esc(e.name)}</h3><button class="iconbtn" data-act="envEdit" data-id="${e.id}" aria-label="${L("بدّل", "Modifier")}">${I.edit || "✎"}</button></div>
      <div class="row between" style="margin-top:8px"><span class="mid num" style="color:${s.left < 0 ? "var(--bad)" : "inherit"}">${U.money(s.spent)}</span><span class="small muted">/ ${U.money(s.limit)} ${L("في الشهر", "par mois")}</span></div>
      <div class="bar ${s.left < 0 ? "bad" : s.pct > 80 ? "warn" : "good"}" style="margin:8px 0"><i style="width:${s.pct}%"></i></div>
      <div class="small muted">${s.left >= 0 ? L(`باقي ${U.money(s.left)} · تنجم ${U.money(s.perDay)} في النهار`, `Reste ${U.money(s.left)} · ${U.money(s.perDay)} par jour`) : L(`تعدّيت بـ ${U.money(-s.left)}`, `Dépassé de ${U.money(-s.left)}`)} · ${(e.cats || []).map(catName).join("، ")}</div>
      <form data-form="envSpend" class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><input type="hidden" name="id" value="${e.id}">
        <input name="amount" id="es-${e.id}" type="number" step="0.001" min="0" inputmode="decimal" style="max-width:110px" placeholder="${L("المبلغ", "Montant")}" required>
        <input name="note" type="text" maxlength="40" style="max-width:150px" placeholder="${L("شنوة", "Quoi")}">
        <button class="btn sm primary" type="submit">${L("صرفت", "Dépensé")}</button></form>
    </div>`;
  }

  function envForm(e) {
    const isSave = !e || e.kind === "save";
    return `<form data-form="envSave" class="form">
      <input type="hidden" name="id" value="${e ? e.id : ""}">
      <label class="f">${L("الاسم", "Nom")}<input id="ev-name" name="name" required maxlength="40" value="${U.esc(e ? e.name : "")}"></label>
      <label class="f">${L("رمز", "Emoji")}<input id="ev-emoji" name="emoji" maxlength="4" value="${U.esc(e ? e.emoji || "" : "💰")}"></label>
      <label class="f">${L("النوع", "Type")}<select id="ev-kind" name="kind" ${e && e.auto ? "disabled" : ""}><option value="save" ${isSave ? "selected" : ""}>${L("نلمّ فلوس (عرس، كرهبة، هدية…)", "Mettre de côté (mariage, voiture, cadeau…)")}</option><option value="spend" ${!isSave ? "selected" : ""}>${L("حد في الشهر (خرجات، لبسة…)", "Limite par mois (sorties, vêtements…)")}</option></select></label>
      <label class="f">${L("الصنف", "Catégorie")}<select id="ev-cat" name="cat">${(App.moneyCats || []).map(c => `<option value="${c[0]}" ${(e && ((e.cats || [])[0] === c[0] || e.cat === c[0])) ? "selected" : ""}>${L(c[1], c[2])}</option>`).join("")}</select></label>
      <label class="f">${L("الحد في الشهر (للحد)", "Limite / mois (limite)")}<input id="ev-limit" name="limit" type="number" min="0" step="0.001" value="${e && e.limit || ""}"></label>
      <label class="f">${L("نحط كل شهر (للتلمام)", "À mettre / mois (cagnotte)")}<input id="ev-monthly" name="monthly" type="number" min="0" step="0.001" value="${e && e.monthly || ""}" ${e && e.auto ? "disabled" : ""}></label>
      <label class="f">${L("الهدف (المبلغ الكل)", "Objectif (montant total)")}<input id="ev-target" name="target" type="number" min="0" step="0.001" value="${e && e.target || ""}"></label>
      <label class="f">${L("قبل نهار", "Avant le")}<input id="ev-due" name="due" type="date" value="${e && e.due || ""}"></label>
      <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button>
      ${e && !e.auto ? `<button class="btn danger" type="button" data-act="envDel" data-id="${e.id}">${L("امسح", "Supprimer")}</button>` : ""}
    </form>
    <p class="tiny muted" style="margin-top:6px">${L("للتلمام: حط مبلغ كل شهر، ولا حط الهدف والنهار والتطبيق يحسب قداش كل شهر.", "Cagnotte : un montant par mois, ou un objectif et une date (l'app calcule le montant par mois).")}</p>`;
  }

  function view() {
    const all = envs(), saves = all.filter(e => e.kind === "save"), spends = all.filter(e => e.kind === "spend");
    const em = App.envMonthly(), res = reserved(), bal = MW.bal();
    const missing = saves.map(e => ({ e, p: potPlan(e) })).filter(x => x.p.perMonth > x.p.inThisMonth);
    const toPut = U.sum(missing, x => x.p.perMonth - x.p.inThisMonth);
    return `<div class="grid g2">
      <div class="card stripe accent" style="grid-column:1/-1">
        <div class="row between" style="flex-wrap:wrap;gap:8px"><h3 style="margin:0">${I.target}${L("ميزانياتي", "Mes budgets")}</h3><span class="small muted">${L("تزيد على اللي لازمك كل شهر:", "S'ajoute au besoin mensuel :")} <b class="num">${U.money(em.total)}</b></span></div>
        ${MW.on() ? `<div class="row between small" style="margin-top:8px;flex-wrap:wrap;gap:6px"><span>${L("الفلوس اللي عندك", "Ton argent")} <b class="num">${U.money(bal)}</b></span><span>${L("محطوطة على جنب", "Mis de côté")} <b class="num">${U.money(res)}</b></span><span>${L("تنجم تصرف", "Disponible")} <b class="num" style="color:${bal - res < 0 ? "var(--bad)" : "var(--accent)"}">${U.money(r3(bal - res))}</b></span></div>` : ""}
        ${toPut > 0 ? `<div class="row between" style="margin-top:10px;flex-wrap:wrap;gap:8px"><span class="small">${L(`باقي تحط هذا الشهر: ${U.money(toPut)} (${missing.map(x => U.esc(x.e.name)).join("، ")})`, `Reste à mettre de côté ce mois : ${U.money(toPut)} (${missing.map(x => U.esc(x.e.name)).join(", ")})`)}</span><button class="btn sm primary" data-act="potFillAll">${L("حطّ في الكل", "Tout mettre de côté")}</button></div>` : saves.length ? `<p class="small" style="margin-top:8px;color:var(--good)">${L("حطّيت فلوس الميزانيات الكل هذا الشهر ✓", "Toutes les cagnottes sont remplies ce mois-ci ✓")}</p>` : ""}
      </div>
      ${suppCard()}
      ${spends.length ? `<div class="mid" style="grid-column:1/-1;margin:10px 4px 0;font-weight:700">${L("حد المصروف في الشهر", "Limites de dépenses par mois")}</div>${spends.map(spendCard).join("")}` : ""}
      ${saves.length ? `<div class="mid" style="grid-column:1/-1;margin:10px 4px 0;font-weight:700">${L("نلمّ فلوس لـ…", "Je mets de côté pour…")}</div>${saves.map(potCard).join("")}` : ""}
      <div class="card" style="grid-column:1/-1"><details><summary><b>${I.plus}${L("ميزانية جديدة", "Nouveau budget")}</b></summary><div style="margin-top:8px">${envForm(null)}</div></details></div>
    </div>`;
  }
  (App.EXT.tabs.money = App.EXT.tabs.money || []).push({ id: "budgets", label: () => L("ميزانياتي", "Mes budgets"), render: view });

  /* ---------- actions ---------- */
  App.forms.potMove = (fd, form, ev) => {
    const e = envs().find(x => x.id === fd.id); if (!e) return;
    const dir = (ev && ev.submitter && ev.submitter.value) || "in", amount = r3(num(fd.amount));
    if (!(amount > 0)) { App.toast(L("اكتب المبلغ", "Indique le montant"), "", "warn"); return; }
    e.log = e.log || [];
    if (dir === "in") {
      e.log.push({ id: U.id(), date: U.dkey(), amount, note: L("حطّيت", "mis de côté") });
      App.toast(`${e.emoji || ""} ${e.name}`, L(`حطّيت ${U.money(amount)} على جنب`, `${U.money(amount)} mis de côté`), "good");
    } else if (dir === "out") {
      e.log.push({ id: U.id(), date: U.dkey(), amount: -Math.min(amount, potBal(e)), note: L("رجّعتها", "repris") });
    } else {
      const it = spendExpense(amount, e.cat || "other", e.name, e.id);
      e.log.push({ id: U.id(), date: U.dkey(), amount: -Math.min(amount, Math.max(0, potBal(e))), note: L("صرفت", "dépensé"), ref: "x:" + it.id });
      App.toast(`${e.emoji || ""} ${e.name}`, L(`صرفت ${U.money(amount)} منها`, `${U.money(amount)} dépensés`), "good");
    }
    Store.save("moneycfg"); App.render();
  };
  App.acts.potFillAll = () => {
    const d = U.dkey();
    for (const e of envs().filter(x => x.kind === "save")) {
      const p = potPlan(e), add = r3(p.perMonth - p.inThisMonth);
      if (add > 0) (e.log = e.log || []).push({ id: U.id(), date: d, amount: add, note: L("فلوس الشهر", "montant du mois") });
    }
    Store.save("moneycfg"); App.toast(L("تحطّت فلوس الشهر", "Montants du mois mis de côté"), "", "good"); App.render();
  };
  App.forms.envSpend = (fd) => {
    const e = envs().find(x => x.id === fd.id); if (!e) return;
    const amount = r3(num(fd.amount)); if (!(amount > 0)) return;
    spendExpense(amount, (e.cats || [])[0] || "other", (fd.note || "").trim() || e.name);
    const s = spendState(e);
    App.toast(`${e.emoji || ""} ${e.name}`, s.left >= 0 ? L(`باقي ${U.money(s.left)} هذا الشهر`, `Reste ${U.money(s.left)} ce mois`) : L(`تعدّيت الحد بـ ${U.money(-s.left)}`, `Limite dépassée de ${U.money(-s.left)}`), s.left >= 0 ? "good" : "warn");
    App.render();
  };
  App.acts.envEdit = (el) => {
    const e = envs().find(x => x.id === el.dataset.id); if (!e) return;
    App.modal(`${e.emoji || ""} ${e.name}`, envForm(e));
  };
  App.forms.envSave = (fd) => {
    const list = envs();
    let e = fd.id ? list.find(x => x.id === fd.id) : null;
    if (!e) { e = { id: U.id(), log: [] }; list.push(e); }
    e.name = (fd.name || "").trim() || e.name; e.emoji = (fd.emoji || "").trim();
    if (!e.auto) e.kind = fd.kind === "spend" ? "spend" : "save";
    if (e.kind === "spend") { e.cats = [fd.cat || "other"]; e.limit = num(fd.limit); }
    else { e.cat = fd.cat || e.cat || "other"; if (!e.auto) e.monthly = num(fd.monthly); e.target = num(fd.target); e.due = fd.due || ""; }
    Store.save("moneycfg"); App.closeModal && App.closeModal(); App.toast(L("تسجّلت الميزانية", "Budget enregistré"), e.name, "good"); App.render();
  };
  App.acts.envDel = (el) => App.confirm(L("تمسح الميزانية هذي؟ الفلوس المحطوطة فيها ترجع «تنجم تصرف».", "Supprimer ce budget ? L'argent mis de côté redevient disponible."), () => {
    const c = MW.cfg(); c.envelopes = envs().filter(x => x.id !== el.dataset.id); Store.save("moneycfg"); App.closeModal && App.closeModal(); App.render();
  });

  App.forms.suppNew = (fd) => {
    const qty = num(fd.qty), dose = num(fd.dose) || 1, start = fd.start || U.dkey();
    const used = Math.max(0, dayDiff(start, U.dkey())) * dose;
    supps().push({ id: U.id(), name: (fd.name || "").trim(), unit: fd.unit || "", qty, dose, price: num(fd.price), since: U.dkey(), left: Math.max(0, qty - used) });
    Store.save("medical"); ensureSuppPot(); App.render();
  };
  App.acts.suppBuy = (el) => {
    const s = supps().find(x => x.id === el.dataset.id); if (!s) return;
    App.modal(L(`شريت ${s.name}`, `${s.name} racheté`), `<form data-form="suppBuy2" class="form"><input type="hidden" name="id" value="${s.id}">
      <label class="f">${L("السوم", "Prix")}<input id="sb-price" name="price" type="number" min="0" step="0.001" inputmode="decimal" value="${s.price || ""}"></label>
      <label class="f">${L(`قداش في العلبة (${s.unit})`, `Quantité (${s.unit})`)}<input id="sb-qty" name="qty" type="number" min="1" step="any" value="${s.qty}"></label>
      <label class="check full"><input type="checkbox" name="pay" checked> ${L("سجّل المصروف (ينقص من الفلوس، ومن ميزانية المكمّلات إذا فيها)", "Enregistrer la dépense (retirée de ton argent, et de la cagnotte compléments)")}</label>
      <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.suppBuy2 = (fd) => {
    const s = supps().find(x => x.id === fd.id); if (!s) return;
    const st = suppState(s), price = r3(num(fd.price)), qty = num(fd.qty) || s.qty;
    s.left = st.leftToday + qty; s.since = U.dkey(); s.qty = qty; if (price) s.price = price;
    Store.save("medical");
    if (fd.pay && price > 0) {
      const pot = envs().find(e => e.auto === "supp");
      const it = spendExpense(price, "supp", s.name, pot ? pot.id : "");
      if (pot) { (pot.log = pot.log || []).push({ id: U.id(), date: U.dkey(), amount: -Math.min(price, Math.max(0, potBal(pot))), note: s.name, ref: "x:" + it.id }); Store.save("moneycfg"); }
    }
    App.closeModal(); App.toast(L("تسجّل", "Enregistré"), L(`${s.name}: يكفيك ${suppState(s).days} يوم`, `${s.name} : ${suppState(s).days} jours`), "good"); App.render();
  };
  App.acts.suppFix = (el) => {
    const s = supps().find(x => x.id === el.dataset.id); if (!s) return;
    App.modal(L(`قداش باقي من ${s.name}؟`, `Combien reste-t-il de ${s.name} ?`), `<form data-form="suppFix2" class="form"><input type="hidden" name="id" value="${s.id}">
      <label class="f full">${L(`الباقي توا (${s.unit})`, `Reste maintenant (${s.unit})`)}<input id="sf-left" name="left" type="number" min="0" step="any" value="${U.num(suppState(s).leftToday, 1).replace(/\s/g, "").replace(",", ".")}"></label>
      <label class="f">${L("قداش كل نهار", "Dose par jour")}<input id="sf-dose" name="dose" type="number" min="0.1" step="any" value="${s.dose}"></label>
      <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.suppFix2 = (fd) => { const s = supps().find(x => x.id === fd.id); if (!s) return; s.left = num(fd.left); s.dose = num(fd.dose) || s.dose; s.since = U.dkey(); Store.save("medical"); App.closeModal(); App.render(); };
  App.acts.suppDel = (el) => App.confirm(L("تمسحو؟", "Supprimer ?"), () => { const m = med(); m.supps = m.supps.filter(x => x.id !== el.dataset.id); Store.save("medical"); App.render(); });
  function ensureSuppPot() {
    if (!supps().length || envs().some(e => e.auto === "supp")) return;
    envs().unshift({ id: "pot-supp", auto: "supp", kind: "save", name: L("المكمّلات", "Compléments"), emoji: "🧴", cat: "supp", log: [] });
    Store.save("moneycfg");
  }
  App.acts.budGo = () => { App.sub.money = "budgets"; App.go("money"); };

  /* ---------- Today + reminders ---------- */
  card("today", () => {
    const low = supps().map(s => ({ s, st: suppState(s) })).filter(x => x.st.days <= 5);
    const over = envs().filter(e => e.kind === "spend").map(e => ({ e, st: spendState(e) })).filter(x => x.st.limit && x.st.left < 0);
    if (!low.length && !over.length) return "";
    return `<div class="card stripe warn">${low.map(x => `<div class="row between" style="gap:8px;flex-wrap:wrap"><span class="small">🧴 <b>${U.esc(x.s.name)}</b> ${x.st.days ? L(`يوفى بعد ${x.st.days} يوم`, `fini dans ${x.st.days} j`) : L("وفى", "terminé")} · ${U.money(x.s.price)}</span><button class="btn sm" data-act="suppBuy" data-id="${x.s.id}">${L("شريت", "Racheté")}</button></div>`).join("")}
      ${over.map(x => `<div class="row between" style="gap:8px;margin-top:6px"><span class="small">${U.esc(x.e.emoji || "")} ${U.esc(x.e.name)}: ${L(`تعدّيت الحد بـ ${U.money(-x.st.left)}`, `limite dépassée de ${U.money(-x.st.left)}`)}</span><button class="btn sm ghost" data-act="budGo">${L("شوف", "Voir")}</button></div>`).join("")}</div>`;
  });
  App.eventSources.push(() => {
    const now = new Date(), NP = U.P(now), at = U.wall(NP.y, NP.m, NP.d, 9, 0);
    return supps().map(s => ({ s, st: suppState(s) })).filter(x => x.st.days === 5 || x.st.days === 1).map(x => ({ at, key: "supp-" + x.s.id + "-" + U.dkey(), title: L(`${x.s.name}: باقي ${x.st.days} يوم`, `${x.s.name} : ${x.st.days} j restants`), body: L(`حضّر ${U.money(x.s.price)} باش تشري علبة جديدة.`, `Prévois ${U.money(x.s.price)} pour une nouvelle boîte.`), kind: "warn" }));
  });

  App.Budgets = { suppState, potPlan, spendState, reserved, ensureSuppPot };
})();
