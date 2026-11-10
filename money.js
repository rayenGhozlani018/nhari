/* Nhari — Finances */
(function () {
  "use strict";
  const CATS = [
    ["food", "ماكلة", "Alimentation"], ["transport", "نقل", "Transport"], ["health", "صحة ودواء", "Santé / insuline"],
    ["study", "قراية", "Études"], ["family", "عائلة", "Famille"], ["home", "دار وفواتير", "Maison / factures"],
    ["fun", "ترفيه", "Loisirs"], ["clothes", "لبسة", "Vêtements"], ["gift", "هدايا", "Cadeaux"], ["supp", "مكمّلات (زنك، كرياتين…)", "Compléments (zinc, créatine…)"], ["sadaqa", "صدقة", "Sadaqa"], ["work", "مواد ومازوط الخدمة", "Matériel / gasoil (travail)"], ["car", "كرهبة (صيانة وقطع)", "Voiture (entretien, pièces)"], ["other", "أخرى", "Autre"]
  ];
  const catName = (k) => { const c = CATS.find(x => x[0] === k) || CATS[CATS.length - 1]; return L(c[1], c[2]); };
  App.moneyCats = CATS; App.catName = catName;
  const CHARGE_SUGGEST = [["كراء", "Loyer"], ["نقل", "Transport"], ["تلفون وانترنت", "Téléphone / internet"], ["أنسولين وأشرطة", "Insuline / bandelettes"], ["ماكلة الدار", "Courses"], ["ضو وماء", "STEG / SONEDE"], ["كريدي", "Crédit"]];
  const WD = () => [L("أحد", "Dim"), L("اثنين", "Lun"), L("ثلاثاء", "Mar"), L("أربعاء", "Mer"), L("خميس", "Jeu"), L("جمعة", "Ven"), L("سبت", "Sam")];

  /* ---------- cash in hand, money on the way, big payments (fac fees…) ---------- */
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const monthsBetween = (a, b) => { const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };
  const NOT_PERSONAL = App.NOT_PERSONAL = ["work", "car", "supp"]; // work tools, car, supplements: their own budgets, not the personal one
  const personalExp = (x) => !NOT_PERSONAL.includes(x.cat) && !x.env; // x.env: paid from a savings pot
  const MW = App.MW = {
    cfg() { const c = Store.doc("moneycfg"); if (!Array.isArray(c.pending)) c.pending = []; if (!Array.isArray(c.goals)) c.goals = []; return c; },
    on() { return !!MW.cfg().wallet; },
    bal() { const w = MW.cfg().wallet; return w ? +w.balance || 0 : 0; },
    move(amount, note, ref, date) {
      const c = MW.cfg(); if (!c.wallet) return;
      c.wallet.balance = r3((+c.wallet.balance || 0) + amount);
      c.wallet.log = [{ id: U.id(), ts: Date.now(), date: date || U.dkey(), amount: r3(amount), note: note || "", ref: ref || "" }, ...(c.wallet.log || [])].slice(0, 300);
      Store.save("moneycfg");
    },
    undo(ref) {
      const c = MW.cfg(); if (!c.wallet || !ref) return;
      const i = (c.wallet.log || []).findIndex(x => x.ref === ref); if (i < 0) return;
      c.wallet.balance = r3(c.wallet.balance - c.wallet.log[i].amount); c.wallet.log.splice(i, 1); Store.save("moneycfg");
    },
    goalPaid(g) { return U.sum(g.paid || [], p => +p.amount || 0); },
    // what this goal asks for in the current month: what was left at the start of the month ÷ months until the due date
    goalPlan(g, now = new Date()) {
      const mk = U.mkey(now), paid = MW.goalPaid(g);
      if (g.kind === "fund") return { perMonth: 0, monthsLeft: 0, remaining: Math.max(0, (+g.total || 0) - paid), paid, paidThisMonth: 0, fund: true };
      const paidBefore = U.sum((g.paid || []).filter(p => !p.date || p.date.slice(0, 7) < mk), p => +p.amount || 0);
      const paidThisMonth = paid - paidBefore;
      const remainingAtStart = Math.max(0, (+g.total || 0) - paidBefore), remaining = Math.max(0, (+g.total || 0) - paid);
      const due = (g.due || "").slice(0, 7);
      if (!remainingAtStart) return { perMonth: 0, monthsLeft: 0, remaining, paid, paidThisMonth };
      const monthsLeft = due ? Math.max(1, monthsBetween(mk, due) + 1) : 0;
      return { perMonth: monthsLeft ? Math.ceil(remainingAtStart / monthsLeft) : 0, monthsLeft, remaining, paid, paidThisMonth };
    }
  };

  function calc() {
    const cfg = Store.doc("moneycfg");
    const m = Store.month("money");
    const now = new Date(), tk = U.dkey(now), dim = U.daysInMonth(now), NP = U.P(now), today = NP.d;
    const chargesTotal = U.sum(cfg.charges, c => c.amount);
    const savings = +cfg.savings || 0, personal = +cfg.personal || 0, salary = +cfg.salary || 0;
    const goalsMonthly = U.sum(MW.cfg().goals, g => MW.goalPlan(g, now).perMonth);
    const env = App.envMonthly ? App.envMonthly(now) : { total: 0, save: 0 };
    const need = chargesTotal + savings + personal + goalsMonthly + env.total;
    const workTarget = Math.max(0, need - salary);
    const earned = U.sum(m.incomes, x => x.amount);
    const earnedToday = U.sum(m.incomes.filter(x => x.date === tk), x => x.amount);
    const spentVar = U.sum(m.expenses, x => x.amount);
    const spentToday = U.sum(m.expenses.filter(x => x.date === tk && personalExp(x)), x => x.amount);
    const spentPersonal = U.sum(m.expenses.filter(personalExp), x => x.amount);
    const paidCharges = U.sum(cfg.charges.filter(c => m.paid[c.id]), c => c.amount);
    const isWork = (d) => cfg.workDays.includes(U.dow(d)) && !cfg.offDays[U.dkey(d)];
    let daysLeft = 0;
    for (let d = today; d <= dim; d++) if (isWork(U.wall(NP.y, NP.m, d, 12, 0))) daysLeft++;
    const workToday = isWork(now);
    const remainingBeforeToday = Math.max(0, workTarget - (earned - earnedToday));
    const dailyObj = Math.ceil(daysLeft > 0 ? remainingBeforeToday / daysLeft : remainingBeforeToday);
    const todayObj = workToday ? dailyObj : 0;
    const todayLeft = Math.max(0, todayObj - earnedToday);
    const hourly = parseFloat(cfg.hourly) || 0;
    const hoursNeeded = hourly ? todayObj / hourly : null;
    const maxHours = +cfg.maxHours || 8;
    const overload = hourly ? hoursNeeded > maxHours : false;
    const maxPossible = hourly ? hourly * maxHours * daysLeft : null;
    const shortfall = hourly ? Math.max(0, remainingBeforeToday - maxPossible) : 0;
    const personalLeft = personal - spentPersonal;
    const calDaysLeft = dim - today + 1;
    const perDay = Math.floor(Math.max(0, personalLeft) / calDaysLeft * 2) / 2;
    const profit = salary + earned - paidCharges - spentVar;
    const nextWorkDay = (() => { for (let i = 1; i < 14; i++) { const d = U.addDays(now, i); if (isWork(d)) return d; } return null; })();
    return { goalsMonthly, env, spentPersonal, cfg, m, chargesTotal, savings, personal, salary, need, workTarget, earned, earnedToday, spentVar, spentToday, paidCharges, daysLeft, workToday, dailyObj, todayObj, todayLeft, hourly, hoursNeeded, maxHours, overload, shortfall, personalLeft, perDay, profit, calDaysLeft, nextWorkDay, remainingBeforeToday };
  }
  App.moneyCalc = calc;

  function healthStrain() {
    // how unsettled glucose is today (used to suggest a lighter day)
    try {
      const h = Store.month("health");
      const tk = U.dkey();
      const bgs = h.entries.filter(e => e.type === "bg" && U.dkey(new Date(e.ts)) === tk);
      const hypo = bgs.some(e => e.bg < 70);
      const off = bgs.filter(e => U.bgState(e.bg) !== "good").length;
      return { hypo, off };
    } catch (e) { return { hypo: false, off: 0 }; }
  }

  function chart(c) {
    const now = new Date(), dim = U.daysInMonth(now), NP = U.P(now);
    const per = [];
    for (let d = 1; d <= dim; d++) { const k = U.dkey(U.wall(NP.y, NP.m, d, 12, 0)); per.push(U.sum(c.m.incomes.filter(x => x.date === k), x => x.amount)); }
    const maxV = Math.max(c.dailyObj * 1.3, ...per, 1);
    const W = innerWidth < 600 ? 360 : 620, H = innerWidth < 600 ? 130 : 150, pl = 30, pb = 20, bw = (W - pl - 6) / dim;
    const yv = v => H - pb - (v / maxV) * (H - pb - 10);
    let bars = "";
    per.forEach((v, i) => {
      const x = pl + i * bw + 1.5, top = yv(v), isT = i + 1 === NP.d;
      if (v > 0) bars += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${(H - pb - top).toFixed(1)}" rx="2" fill="${v >= c.dailyObj && c.dailyObj > 0 ? "var(--good)" : "var(--accent)"}" opacity="${isT ? 1 : .8}"/>`;
      if ((i + 1) % 5 === 1 || i + 1 === dim) bars += `<text x="${(x + bw / 2 - 1.5).toFixed(1)}" y="${H - 5}" text-anchor="middle">${i + 1}</text>`;
    });
    const grid = [0, .5, 1].map(f => { const v = maxV * f, yy = yv(v); return `<line x1="${pl}" x2="${W}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pl - 4}" y="${yy + 3}" text-anchor="end">${U.num(v, 0)}</text>`; }).join("");
    const obj = c.dailyObj > 0 ? `<line x1="${pl}" x2="${W}" y1="${yv(c.dailyObj)}" y2="${yv(c.dailyObj)}" stroke="var(--saffron)" stroke-width="2"/><text x="${W - 2}" y="${yv(c.dailyObj) - 4}" text-anchor="end" style="fill:var(--warn)">${L("هدف اليوم", "objectif/jour")}</text>` : "";
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("المدخول اليومي في الشهر", "Revenus par jour ce mois-ci")}">${grid}${bars}${obj}</svg></div>`;
  }

  function render() {
    const c = calc();
    const sub = App.sub.money || "day";
    const tabs = [["day", L("اليوم", "Aujourd'hui")], ["month", L("الشهر", "Le mois")], ["budget", L("الميزانية", "Budget")], ...App.extTabs("money")];
    let html = `<div class="sectionhead"><h2>${L("الفلوس", "Finances")}</h2><span class="muted small">${U.esc(U.monthYear(new Date()))}</span></div>
      <div class="subtabs">${tabs.map(t => `<button data-act="sub" data-tab="money" data-v="${t[0]}" aria-pressed="${sub === t[0]}">${t[1]}</button>`).join("")}</div>`;
    if (!c.cfg.charges.length && !c.salary && sub !== "budget") {
      html += `<div class="card stripe saffron" style="margin-bottom:14px"><h3>${I.target}${L("ابدا من هنا", "Commence ici")}</h3><p class="small">${L("حط مصاريفك الثابتة (كراء، نقل، أنسولين…) والفلوس اللي تحب توفرها، والتطبيق يحسبلك قداش لازمك تجيب كل نهار خدمة.", "Ajoute tes charges fixes (loyer, transport, insuline…) et ton objectif d'épargne : l'app calcule combien gagner par jour de travail.")}</p><button class="btn primary" style="margin-top:10px" data-act="sub" data-tab="money" data-v="budget">${L("حضّر الميزانية", "Préparer le budget")}</button></div>`;
    }
    if (sub === "day") html += viewDay(c);
    if (sub === "month") html += viewMonth(c);
    if (sub === "budget") html += viewBudget(c);
    html += App.extView("money", sub);
    return html;
  }

  function addForm(c) {
    const today = U.dkey();
    return `<div class="card"><h3>${I.plus}${L("سجّل", "Enregistrer")}</h3>
      <form data-form="moneyAdd" class="form">
        <label class="f">${L("النوع", "Type")}<select name="kind" id="m-kind"><option value="in">${L("دخل (خدمة)", "Revenu (travail)")}</option><option value="out">${L("مصروف", "Dépense")}</option></select></label>
        <label class="f">${L("المبلغ", "Montant")}<input id="m-amount" name="amount" type="number" step="0.001" min="0" inputmode="decimal" required placeholder="0"></label>
        <label class="f">${L("الصنف (للمصروف)", "Catégorie (dépense)")}<select name="cat" id="m-cat">${CATS.map(x => `<option value="${x[0]}">${L(x[1], x[2])}</option>`).join("")}</select></label>
        <label class="f">${L("النهار", "Date")}<input id="m-date" name="date" type="date" value="${today}"></label>
        <label class="f full">${L("ملاحظة", "Note")}<input id="m-note" name="note" type="text" maxlength="80" placeholder="${L("مثلا: خدمة نهار السبت", "ex : mission samedi")}"></label>
        <button class="btn primary full" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
      </form></div>`;
  }


  function walletCard(c) {
    const cfg = MW.cfg();
    if (!cfg.wallet) return `<div class="card stripe saffron" style="grid-column:1/-1"><h3>${I.money}${L("الفلوس اللي عندك توا", "L'argent que tu as maintenant")}</h3>
      <p class="small muted">${L("حط قداش عندك فلوس توا (في يدك وفي الحساب)، والتطبيق ينقّص وحدو كل مصروف وكل خلاص، ويزيد كي توصلك الشهرية.", "Indique combien tu as maintenant (liquide + compte) ; l'app retire chaque dépense et paiement, et ajoute ton salaire quand il arrive.")}</p>
      <form data-form="walletSet" class="form" style="margin-top:8px"><label class="f">${L("المبلغ", "Montant")}<input id="w-start" name="balance" type="number" step="0.001" required inputmode="decimal"></label><button class="btn primary" type="submit">${L("ابدا", "Commencer")}</button></form></div>`;
    const bal = MW.bal(), pend = cfg.pending;
    const planned = cfg.goals.filter(g => g.kind !== "fund").map(g => ({ g, amt: Math.min(+g.next || 0, MW.goalPlan(g).remaining) })).filter(x => x.amt > 0);
    const unpaid = cfg.charges.filter(ch => !c.m.paid[ch.id]), unpaidSum = U.sum(unpaid, ch => +ch.amount || 0);
    const after = r3(bal + U.sum(pend, p => +p.amount || 0) - U.sum(planned, x => x.amt) - unpaidSum);
    const log = (cfg.wallet.log || []).slice(0, 6);
    return `<div class="card stripe accent" style="grid-column:1/-1">
      <div class="row between"><h3>${I.money}${L("الفلوس اللي عندك توا", "L'argent que tu as maintenant")}</h3><button class="btn sm ghost" data-act="walletFix">${L("صحّح", "Corriger")}</button></div>
      <div class="big" style="color:${bal < 0 ? "var(--bad)" : "inherit"}">${U.money(bal)}</div>
      ${App.envReservedLine ? App.envReservedLine(bal) : ""}
      ${pend.length || planned.length || unpaid.length ? `<div class="list" style="margin-top:10px">
        ${pend.map(p => `<div class="li"><span class="pill good">${L("جاية", "À venir")}</span><span class="grow small">${U.esc(p.label)}</span><span class="amt" style="color:var(--good)">+${U.money(p.amount)}</span><button class="btn sm" data-act="pendGot" data-id="${p.id}">${L("وصلت", "Reçu")}</button></div>`).join("")}
        ${planned.map(x => `<div class="li"><span class="pill accent">${L("باش تخلّص", "À payer")}</span><span class="grow small">${U.esc(x.g.label)}</span><span class="amt" style="color:var(--bad)">−${U.money(x.amt)}</span><button class="btn sm" data-act="goalPayNext" data-id="${x.g.id}">${L("خلّصت", "Payé")}</button></div>`).join("")}
        ${unpaid.length ? `<div class="li"><span class="pill">${L("التزامات الشهر", "Charges du mois")}</span><span class="grow small">${unpaid.map(ch => U.esc(ch.name)).join("، ")}</span><span class="amt" style="color:var(--bad)">−${U.money(unpaidSum)}</span></div>` : ""}
      </div>
      <div class="row between" style="margin-top:10px"><span class="small">${L("كي يتعدّى هذا الكل، يبقالك", "Après tout ça, il te restera")}</span><b class="mid" style="color:${after < 0 ? "var(--bad)" : "var(--accent)"}">${U.money(after)}</b></div>` : ""}
      ${log.length ? `<details style="margin-top:10px"><summary class="small muted">${L("آخر الحركات", "Derniers mouvements")}</summary><div class="list" style="margin-top:6px">${log.map(x => `<div class="li"><span class="grow small">${U.esc(x.note)} <span class="tiny muted">${U.ltr(x.date)}</span></span><span class="amt" style="color:${x.amount < 0 ? "var(--bad)" : "var(--good)"}">${x.amount > 0 ? "+" : ""}${U.money(x.amount)}</span></div>`).join("")}</div></details>` : ""}
      <p class="tiny muted" style="margin-top:8px">${L("كل مصروف تسجّلو، وكل التزام تعلّم عليه «خلصتو»، ينقص من هنا وحدو. التدخلات تولّي فلوس في يدك كي توصل الشهرية («وصلت»).", "Chaque dépense enregistrée et chaque charge cochée « payée » est retirée d'ici. Les interventions deviennent de l'argent en main quand le salaire arrive (« Reçu »).")}</p>
    </div>`;
  }

  function goalsCard() {
    const gs = MW.cfg().goals; if (!gs.length) return "";
    return `<div class="card" style="grid-column:1/-1"><h3>${I.target}${L("خلاصات كبيرة", "Gros paiements")}</h3>${gs.map(g => {
      const pl = MW.goalPlan(g), pct = +g.total ? U.clamp(pl.paid / g.total * 100, 0, 100) : 0;
      return `<div style="margin-top:10px">
        <div class="row between"><b>${U.esc(g.label)}</b><span class="small num">${U.money(pl.paid)} / ${U.money(g.total)}</span></div>
        <div class="bar good" style="margin:8px 0"><i style="width:${pct}%"></i></div>
        <div class="row between small muted" style="flex-wrap:wrap;gap:6px"><span>${g.kind === "fund" ? L("باقي للهدف", "Reste jusqu'à l'objectif") : L("باقي", "Reste")} <b class="num">${U.money(pl.remaining)}</b></span>${g.due && pl.remaining ? `<span>${L("قبل", "Avant le")} ${U.ltr(g.due)} · ${L(`لازمك ≈ ${U.money(pl.perMonth)} كل شهر`, `≈ ${U.money(pl.perMonth)} par mois`)}</span>` : ""}</div>
        ${g.kind === "fund" ? `<form data-form="goalPay" class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><input type="hidden" name="id" value="${g.id}"><input name="amount" id="gp-${g.id}" type="number" step="0.001" min="0" inputmode="decimal" placeholder="${L("المبلغ", "Montant")}" style="max-width:150px" value="${+g.monthly || ""}"><button class="btn sm primary" type="submit" name="dir" value="in">${L("حطّيت فيه", "Mis de côté")}</button><button class="btn sm" type="button" data-act="fundTake" data-id="${g.id}">${L("خذيت منو", "Retiré")}</button></form><p class="tiny muted" style="margin-top:4px">${L("الفلوس اللي تحطها هنا تنقص من «اللي عندك توا» باش ما تصرفهاش. استعملها كان للحالات الطارئة (كرهبة، صحة).", "L'argent mis ici sort de « ce que tu as » pour ne pas le dépenser. Seulement pour les urgences (voiture, santé).")}</p>`
          : pl.remaining ? `<form data-form="goalPay" class="row" style="margin-top:8px;gap:8px"><input type="hidden" name="id" value="${g.id}"><input name="amount" id="gp-${g.id}" type="number" step="0.001" min="0" inputmode="decimal" placeholder="${L("المبلغ", "Montant")}" style="max-width:150px" value="${(+g.next || 0) > 0 ? Math.min(+g.next, pl.remaining) : ""}"><button class="btn sm primary" type="submit">${L("سجّل خلاص", "Enregistrer un paiement")}</button></form>` : `<span class="pill good">${L("تخلّص الكل", "Tout est payé")}</span>`}
        ${(g.paid || []).length ? `<details style="margin-top:6px"><summary class="tiny muted">${L("الخلاصات", "Paiements")} (${g.paid.length})</summary>${g.paid.map(p => `<div class="row between tiny" style="margin-top:4px"><span>${p.date ? U.ltr(p.date) : L("قبل التطبيق", "avant l'app")} ${U.esc(p.note || "")}</span><span class="num">${U.money(p.amount)}</span></div>`).join("")}</details>` : ""}
      </div>`;
    }).join("")}</div>`;
  }

  function viewDay(c) {
    const pct = c.todayObj > 0 ? U.clamp(c.earnedToday / c.todayObj * 100, 0, 100) : 100;
    const strain = healthStrain();
    let warn = "";
    if (c.workToday && (strain.hypo || strain.off >= 2)) {
      warn += `<div class="alertbox warn" style="margin-top:10px"><b>${L("صحتك قبل الفلوس", "Ta santé d'abord")}</b>${L("السكر اليوم موش مستقر. خفف الخدمة وارتاح — إذا خذيت راحة، الهدف يتقسم على بقية الأيام.", "Glycémie instable aujourd'hui. Lève le pied : si tu prends ta journée, l'objectif se répartit sur les autres jours.")}<div style="margin-top:8px"><button class="btn sm" data-act="moneyOff">${L("خذ راحة اليوم", "Prendre ma journée")}</button></div></div>`;
    }
    if (c.overload) {
      warn += `<div class="alertbox bad" style="margin-top:10px"><b>${L("الهدف هذا يتعبك", "Objectif trop lourd")}</b>${L(`لازمك ${U.num(c.hoursNeeded, 1)} ساعة اليوم، والحد متاعك ${c.maxHours} ساعات. بالحد هذا ينقصك ${U.money(c.shortfall)} آخر الشهر: نقص من المصروف الشخصي ولا من التوفير، ولا زيد نهار خدمة.`, `Il faudrait ${U.num(c.hoursNeeded, 1)} h aujourd'hui pour une limite de ${c.maxHours} h. À ce rythme il manquera ${U.money(c.shortfall)} en fin de mois : réduis les dépenses perso ou l'épargne, ou ajoute un jour de travail.`)}</div>`;
    }
    const todayEntries = [...c.m.incomes.map(x => ({ ...x, k: "in" })), ...c.m.expenses.map(x => ({ ...x, k: "out" }))].filter(x => x.date === U.dkey()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return `<div class="grid g2">
      ${walletCard(c)}
      <div class="card stripe accent">
        <h3>${I.target}${L("هدف الخدمة اليوم", "Objectif de travail du jour")}</h3>
        ${c.workToday ? `
          <div class="row between"><div class="big">${U.money(c.todayObj)}</div><span class="pill ${c.todayLeft <= 0 ? "good" : "accent"}">${c.todayLeft <= 0 ? L("وصلت للهدف", "Objectif atteint") : L("باقي ", "Reste ") + U.money(c.todayLeft)}</span></div>
          <div class="bar ${pct >= 100 ? "good" : ""}" style="margin:10px 0 6px"><i style="width:${pct}%"></i></div>
          <div class="row between small muted"><span>${L("جبت اليوم", "Gagné aujourd'hui")}: <b class="num">${U.money(c.earnedToday)}</b></span>${c.hoursNeeded != null ? `<span>≈ ${U.num(c.hoursNeeded, 1)} ${L("ساعة", "h")}</span>` : ""}</div>
          <p class="small muted" style="margin-top:8px">${L(`باقي ${c.daysLeft} نهار خدمة في الشهر (اليوم معاهم). الهدف يتحسب من جديد كل نهار حسب اللي جبتو.`, `${c.daysLeft} jours de travail restants (aujourd'hui inclus). L'objectif se recalcule chaque jour selon ce que tu as gagné.`)}</p>
          <div class="row" style="margin-top:10px"><button class="btn sm" data-act="moneyOff">${L("اليوم راحة", "Jour de repos")}</button></div>`
        : `<div class="mid">${L("اليوم نهار راحة", "Aujourd'hui : repos")}</div><p class="small muted" style="margin-top:6px">${L("ارتاح، الجسم يستحق. ", "Repose-toi. ")}${c.nextWorkDay ? L("النهار الجاي للخدمة: ", "Prochain jour de travail : ") + U.esc(U.dateShort(c.nextWorkDay)) + " — " + U.money(c.dailyObj) : ""}</p>${c.cfg.offDays[U.dkey()] ? `<button class="btn sm" style="margin-top:10px" data-act="moneyOn">${L("رجّعو نهار خدمة", "Remettre en jour de travail")}</button>` : ""}`}
        ${warn}
      </div>
      <div class="card">
        <h3>${I.money}${L("المصروف الشخصي", "Dépenses perso")}</h3>
        <div class="row between"><div><div class="tiny muted">${L("تنجم تصرف اليوم", "Tu peux dépenser aujourd'hui")}</div><div class="big">${U.money(Math.max(0, c.perDay - 0))}</div></div>
        <div style="text-align:end"><div class="tiny muted">${L("صرفت اليوم", "Dépensé aujourd'hui")}</div><div class="mid ${c.spentToday > c.perDay ? "" : ""}" style="color:${c.spentToday > Math.max(0, c.perDay) ? "var(--bad)" : "inherit"}">${U.money(c.spentToday)}</div></div></div>
        <div class="bar ${c.personalLeft < 0 ? "bad" : c.spentPersonal > c.personal * .8 ? "warn" : "good"}" style="margin:10px 0 6px"><i style="width:${c.personal > 0 ? U.clamp(c.spentPersonal / c.personal * 100, 0, 100) : 0}%"></i></div>
        <p class="small muted">${L(`صرفت ${U.money(c.spentPersonal)} من ${U.money(c.personal)} هذا الشهر — باقي ${c.calDaysLeft} نهار.`, `${U.money(c.spentPersonal)} dépensés sur ${U.money(c.personal)} ce mois — ${c.calDaysLeft} jours restants.`)}</p>
      </div>
      ${addForm(c)}
      <div class="card"><h3>${I.clock}${L("حركات اليوم", "Mouvements du jour")}</h3>${entriesList(todayEntries)}</div>
      ${goalsCard()}
    </div>`;
  }

  function entriesList(list) {
    if (!list.length) return `<div class="empty">${L("ما فما حتى شي مسجّل.", "Rien d'enregistré.")}</div>`;
    return `<div class="list">${list.map(x => `<div class="li"><span class="pill ${x.k === "in" ? "good" : "bad"}">${x.k === "in" ? L("دخل", "Revenu") : U.esc(catName(x.cat))}</span><span class="grow small">${U.esc(x.note || "")}<span class="tiny muted"> ${U.esc(x.date)}</span></span><span class="amt" style="color:${x.k === "in" ? "var(--good)" : "var(--bad)"}">${x.k === "in" ? "+" : "−"}${U.money(x.amount)}</span><button class="iconbtn" style="width:30px;height:30px" data-act="moneyDel" data-k="${x.k}" data-id="${x.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("")}</div>`;
  }

  function viewMonth(c) {
    const all = [...c.m.incomes.map(x => ({ ...x, k: "in" })), ...c.m.expenses.map(x => ({ ...x, k: "out" }))].sort((a, b) => (b.date + (b.ts || 0)).localeCompare(a.date + (a.ts || 0)));
    const byCat = {};
    c.m.expenses.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const maxCat = Math.max(1, ...cats.map(x => x[1]));
    const savedSoFar = Math.max(0, c.profit);
    return `<div class="tiles" style="margin-top:0">
        <div class="tile"><span class="k">${L("المدخول", "Revenus")}</span><span class="v" style="color:var(--good)">${U.money(c.salary + c.earned)}</span><span class="s">${c.salary ? L("بالشهرية", "salaire inclus") : L("من الخدمة", "du travail")}</span></div>
        <div class="tile"><span class="k">${L("المصاريف", "Dépenses")}</span><span class="v" style="color:var(--bad)">${U.money(c.paidCharges + c.spentVar)}</span><span class="s">${L("ثابتة خالصة + مصروف", "charges payées + perso")}</span></div>
        <div class="tile"><span class="k">${L("الربح (الباقي)", "Bénéfice (reste)")}</span><span class="v" style="color:${c.profit >= 0 ? "var(--accent)" : "var(--bad)"}">${U.money(c.profit)}</span><span class="s">${L("مدخول − مصاريف", "revenus − dépenses")}</span></div>
        <div class="tile"><span class="k">${L("هدف الخدمة في الشهر", "Objectif travail du mois")}</span><span class="v">${U.money(c.workTarget)}</span><span class="s">${L("جبت ", "atteint ")}${c.workTarget ? Math.round(c.earned / c.workTarget * 100) : 100}%</span></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h3>${L("المدخول كل نهار", "Revenus par jour")}</h3>${chart(c)}</div>
        <div class="card"><h3>${L("التوفير", "Épargne")}</h3>
          ${(() => { const sv = c.savings + (c.env.save || 0); return `<div class="row between"><span class="mid">${U.money(Math.min(savedSoFar, sv))} / ${U.money(sv)}</span><span class="pill ${savedSoFar >= sv ? "good" : "saffron"}">${sv ? Math.round(U.clamp(savedSoFar / sv * 100, 0, 100)) : 0}%</span></div>
          <div class="bar saffron" style="margin:10px 0"><i style="width:${sv ? U.clamp(savedSoFar / sv * 100, 0, 100) : 0}%"></i></div>`; })()}
          <h3 style="margin-top:14px">${L("وين مشات الفلوس", "Où va l'argent")}</h3>
          ${cats.length ? cats.map(([k, v]) => `<div class="row between small" style="margin-top:6px"><span>${U.esc(catName(k))}</span><span class="num">${U.money(v)}</span></div><div class="bar" style="height:7px"><i style="width:${v / maxCat * 100}%"></i></div>`).join("") : `<div class="empty">${L("ما فما حتى مصروف.", "Aucune dépense.")}</div>`}
        </div>
        <div class="card" style="grid-column:1/-1"><h3>${L("كل الحركات", "Tous les mouvements")}</h3>${entriesList(all)}</div>
      </div>`;
  }

  function viewBudget(c) {
    const cfg = c.cfg, m = c.m;
    const wd = WD();
    return `<div class="grid g2">
      <div class="card stripe accent"><h3>${I.target}${L("شنوة لازمك كل شهر", "Ce qu'il te faut chaque mois")}</h3>
        <div class="list">
          <div class="li"><span class="grow">${L("مصاريف ثابتة", "Charges fixes")}</span><span class="amt">${U.money(c.chargesTotal)}</span></div>
          <div class="li"><span class="grow">${L("توفير", "Épargne")}</span><span class="amt">${U.money(c.savings)}</span></div>
          <div class="li"><span class="grow">${L("مصروف شخصي (ماكلة برّا، ترفيه…)", "Dépenses perso (sorties, loisirs…)")}</span><span class="amt">${U.money(c.personal)}</span></div>
          ${MW.cfg().goals.filter(g => MW.goalPlan(g).perMonth > 0).map(g => `<div class="li"><span class="grow">${L("قسط", "Tranche")} · ${U.esc(g.label)}</span><span class="amt">${U.money(MW.goalPlan(g).perMonth)}</span></div>`).join("")}
          ${(c.env.lines || []).map(x => `<div class="li"><span class="grow">${U.esc(x.label)}</span><span class="amt">${U.money(x.amount)}</span></div>`).join("")}
          <div class="li"><b class="grow">${L("المجموع", "Total")}</b><b class="amt">${U.money(c.need)}</b></div>
          ${c.salary ? `<div class="li"><span class="grow">${L("− الشهرية", "− Salaire")}</span><span class="amt">${U.money(c.salary)}</span></div>` : ""}
          <div class="li"><b class="grow">${L("لازمك تجيب من الخدمة", "À gagner par le travail")}</b><b class="amt" style="color:var(--accent)">${U.money(c.workTarget)}</b></div>
        </div>
      </div>
      <div class="card"><h3>${L("المصاريف الثابتة", "Charges fixes")}</h3>
        <div class="list">${cfg.charges.length ? cfg.charges.map(ch => `<div class="li"><label class="check" title="${L("خلصتها هذا الشهر", "Payée ce mois")}"><input type="checkbox" data-change="chargePaid" data-id="${ch.id}" ${m.paid[ch.id] ? "checked" : ""}></label><span class="grow">${U.esc(ch.name)}</span><span class="amt">${U.money(ch.amount)}</span><button class="iconbtn" style="width:30px;height:30px" data-act="chargeDel" data-id="${ch.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("") : `<div class="empty">${L("زيد المصاريف اللي تخلصها كل شهر.", "Ajoute ce que tu paies chaque mois.")}</div>`}</div>
        <p class="tiny muted">${L("علّم ✓ كي تخلص المصروف هذا الشهر.", "Coche ✓ quand la charge est payée ce mois-ci.")}</p>
        <form data-form="chargeAdd" class="form" style="margin-top:10px">
          <label class="f">${L("الاسم", "Nom")}<input id="ch-name" name="name" type="text" required maxlength="40"></label>
          <label class="f">${L("المبلغ في الشهر", "Montant / mois")}<input id="ch-amount" name="amount" type="number" step="0.001" min="0" required inputmode="decimal"></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
        <div class="quick" style="margin-top:10px">${CHARGE_SUGGEST.map(s => `<button type="button" data-act="chargeSuggest" data-v="${U.esc(L(s[0], s[1]))}">+ ${U.esc(L(s[0], s[1]))}</button>`).join("")}</div>
      </div>
      <div class="card"><h3>${L("فلوس جاية", "Argent à venir")}</h3>
        <div class="list">${MW.cfg().pending.length ? MW.cfg().pending.map(p => `<div class="li"><span class="grow small">${U.esc(p.label)}</span><span class="amt">${U.money(p.amount)}</span><button class="iconbtn" data-act="pendDel" data-id="${p.id}" aria-label="${L("امسح", "Supprimer")}">${I.x}</button></div>`).join("") : `<div class="empty">${L("حتى شي.", "Rien.")}</div>`}</div>
        <form data-form="pendAdd" class="form" style="margin-top:10px">
          <label class="f">${L("شنوة", "Quoi")}<input id="pd-label" name="label" type="text" required maxlength="50" placeholder="${L("مثلا: شهرية نوفمبر", "ex : salaire de novembre")}"></label>
          <label class="f">${L("المبلغ", "Montant")}<input id="pd-amount" name="amount" type="number" step="0.001" min="0" required inputmode="decimal"></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
        ${c.earned ? `<p class="tiny muted" style="margin-top:8px">${L(`التدخلات متاع الشهر هذا لتوا: ${U.money(c.earned)} — تزيدها هنا كي تعرف قداش باش تجيك الشهرية.`, `Interventions de ce mois jusqu'ici : ${U.money(c.earned)} — ajoute-les ici quand tu connais le salaire.`)}</p>` : ""}
      </div>
      <div class="card"><h3>${L("خلاص كبير جديد", "Nouveau gros paiement")}</h3>
        <form data-form="goalAdd" class="form">
          <label class="f full">${L("شنوة", "Quoi")}<input id="gl-label" name="label" type="text" required maxlength="60" placeholder="${L("مثلا: معاليم الفاك", "ex : frais de scolarité")}"></label>
          <label class="f">${L("المجموع", "Total")}<input id="gl-total" name="total" type="number" step="0.001" min="0" required inputmode="decimal"></label>
          <label class="f">${L("خلّصت منو قبل", "Déjà payé")}<input id="gl-paid" name="paid" type="number" step="0.001" min="0" inputmode="decimal" value="0"></label>
          <label class="f">${L("آخر أجل", "Échéance")}<input id="gl-due" name="due" type="date"></label>
          <label class="f">${L("الخلاص الجاي", "Prochain paiement")}<input id="gl-next" name="next" type="number" step="0.001" min="0" inputmode="decimal"></label>
          <label class="f">${L("النوع", "Type")}<select id="gl-kind" name="kind"><option value="debt">${L("خلاص (دين، فاك…)", "À payer (dette, scolarité…)")}</option><option value="fund">${L("صندوق توفير", "Cagnotte d'épargne")}</option></select></label>
          <button class="btn primary full" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
        ${MW.cfg().goals.map(g => `<div class="row between small" style="margin-top:8px"><span>${U.esc(g.label)}</span><button class="btn sm ghost" data-act="goalDel" data-id="${g.id}">${L("امسح", "Supprimer")}</button></div>`).join("")}
      </div>
      <div class="card" style="grid-column:1/-1"><h3>${L("الأهداف والخدمة", "Objectifs et travail")}</h3>
        <form data-form="moneyCfg" class="form">
          <label class="f">${L("توفير في الشهر", "Épargne / mois")}<input id="cfg-sav" name="savings" type="number" step="0.001" min="0" value="${cfg.savings}"></label>
          <label class="f">${L("مصروف شخصي في الشهر", "Dépenses perso / mois")}<input id="cfg-per" name="personal" type="number" step="0.001" min="0" value="${cfg.personal}"></label>
          <label class="f">${L("شهرية ثابتة (إذا عندك)", "Salaire fixe (si tu en as)")}<input id="cfg-sal" name="salary" type="number" step="0.001" min="0" value="${cfg.salary}"></label>
          <label class="f">${L("قداش تجيب في الساعة (اختياري)", "Gain par heure (optionnel)")}<input id="cfg-hr" name="hourly" type="number" step="0.001" min="0" value="${cfg.hourly}"></label>
          <label class="f">${L("أقصى ساعات في النهار", "Heures max / jour")}<input id="cfg-max" name="maxHours" type="number" min="1" max="16" value="${cfg.maxHours}"></label>
          <label class="f">${L("العملة", "Devise")}<select id="cfg-cur" name="currency"><option value="DT" ${cfg.currency === "DT" ? "selected" : ""}>${L("دينار تونسي", "Dinar (DT)")}</option><option value="EUR" ${cfg.currency === "EUR" ? "selected" : ""}>Euro (€)</option></select></label>
          <fieldset class="full" style="border:0;padding:0;margin:0"><legend class="small muted" style="margin-bottom:6px">${L("أيام الخدمة (الباقي راحة)", "Jours de travail (le reste = repos)")}</legend>
            <div class="row">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="check"><input type="checkbox" name="wd${d}" ${cfg.workDays.includes(d) ? "checked" : ""}>${wd[d]}</label>`).join("")}</div></fieldset>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <p class="tiny muted" style="margin-top:8px">${L("الهدف اليومي = (اللي لازمك من الخدمة − اللي جبتو) ÷ أيام الخدمة الباقية. كي تاخذ راحة، يتوزع على البقية بلا ما يفوت أقصى ساعات.", "Objectif du jour = (à gagner − déjà gagné) ÷ jours de travail restants. Un jour de repos se répartit sur les autres, dans ta limite d'heures.")}</p>
      </div>
    </div>`;
  }

  App.forms.moneyAdd = (fd) => {
    const amount = parseFloat(String(fd.amount).replace(",", "."));
    if (!(amount > 0)) return;
    const date = fd.date || U.dkey();
    const mk = date.slice(0, 7);
    const m = Store.month("money", mk);
    const item = { id: U.id(), ts: Date.now(), date, amount, note: (fd.note || "").trim() };
    if (fd.kind === "out") { item.cat = fd.cat; m.expenses.push(item); } else m.incomes.push(item);
    Store.save("money-" + mk);
    if (fd.kind === "out" && MW.on()) MW.move(-amount, item.note || catName(item.cat), "x:" + item.id, date);
    App.toast(fd.kind === "out" ? L("تسجّل المصروف", "Dépense enregistrée") : L("تسجّل الدخل", "Revenu enregistré"), U.money(amount), "good");
    App.render();
  };
  App.acts.moneyDel = (el) => {
    App.confirm(L("تمسح الحركة هذي؟", "Supprimer ce mouvement ?"), () => {
      const m = Store.month("money");
      const key = el.dataset.k === "in" ? "incomes" : "expenses";
      m[key] = m[key].filter(x => x.id !== el.dataset.id);
      Store.save("money-" + U.mkey());
      if (key === "expenses") MW.undo("x:" + el.dataset.id);
      App.render();
    });
  };
  App.acts.moneyOff = () => { const cfg = Store.doc("moneycfg"); cfg.offDays[U.dkey()] = true; prune(cfg); Store.save("moneycfg"); App.toast(L("ارتاح اليوم", "Bon repos"), L("الهدف تقسّم على بقية الأيام.", "L'objectif est réparti sur les autres jours."), "good"); App.render(); };
  App.acts.moneyOn = () => { const cfg = Store.doc("moneycfg"); delete cfg.offDays[U.dkey()]; Store.save("moneycfg"); App.render(); };
  function prune(cfg) { const lim = U.dkey(U.addDays(new Date(), -40)); for (const k of Object.keys(cfg.offDays)) if (k < lim) delete cfg.offDays[k]; }
  App.forms.chargeAdd = (fd, f) => {
    const amount = parseFloat(String(fd.amount).replace(",", "."));
    if (!fd.name || !(amount >= 0)) return;
    const cfg = Store.doc("moneycfg");
    cfg.charges.push({ id: U.id(), name: fd.name.trim(), amount });
    Store.save("moneycfg"); App.render();
  };
  App.acts.chargeSuggest = (el) => { const i = document.getElementById("ch-name"); if (i) { i.value = el.dataset.v; const a = document.getElementById("ch-amount"); if (a) a.focus(); } };
  App.acts.chargeDel = (el) => {
    App.confirm(L("تمسح المصروف الثابت هذا؟", "Supprimer cette charge ?"), () => {
      const cfg = Store.doc("moneycfg"); cfg.charges = cfg.charges.filter(c => c.id !== el.dataset.id); Store.save("moneycfg"); App.render();
    });
  };
  App.changes.chargePaid = (el) => {
    const m = Store.month("money"), id = el.dataset.id, ref = "c:" + id + ":" + U.mkey(), ch = Store.doc("moneycfg").charges.find(x => x.id === id);
    if (el.checked) { m.paid[id] = true; if (ch && MW.on()) MW.move(-(+ch.amount || 0), ch.name, ref); }
    else { delete m.paid[id]; MW.undo(ref); }
    Store.save("money-" + U.mkey()); App.render();
  };
  const num = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(x) ? 0 : x; };
  App.forms.walletSet = (fd) => { const cfg = MW.cfg(); const b = r3(num(fd.balance)); cfg.wallet = { balance: b, since: U.dkey(), log: [{ id: U.id(), ts: Date.now(), date: U.dkey(), amount: b, note: L("البداية", "Départ"), ref: "start" }] }; Store.save("moneycfg"); App.render(); };
  App.acts.walletFix = () => App.modal(L("صحّح الفلوس اللي عندك", "Corriger le solde"), `<form data-form="walletFix" class="form"><label class="f full">${L("قداش عندك بالضبط توا؟", "Combien as-tu exactement maintenant ?")}<input id="wf-bal" name="balance" type="number" step="0.001" required inputmode="decimal" value="${MW.bal()}"></label><button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  App.forms.walletFix = (fd) => { const d = r3(num(fd.balance) - MW.bal()); if (d) MW.move(d, L("تصحيح", "Correction"), "fix:" + U.id()); App.closeModal(); App.render(); };
  App.acts.pendGot = (el) => {
    const cfg = MW.cfg(), p = cfg.pending.find(x => x.id === el.dataset.id); if (!p) return;
    cfg.pending = cfg.pending.filter(x => x.id !== p.id); Store.save("moneycfg");
    MW.move(+p.amount || 0, p.label, "p:" + p.id);
    App.toast(L("وصلت", "Reçu"), "+" + U.money(p.amount), "good"); App.render();
  };
  App.forms.pendAdd = (fd) => { const a = num(fd.amount); if (!fd.label || !(a > 0)) return; MW.cfg().pending.push({ id: U.id(), label: fd.label.trim(), amount: a }); Store.save("moneycfg"); App.render(); };
  App.acts.pendDel = (el) => App.confirm(L("تمسحها؟", "Supprimer ?"), () => { const cfg = MW.cfg(); cfg.pending = cfg.pending.filter(x => x.id !== el.dataset.id); Store.save("moneycfg"); App.render(); });
  function goalPay(g, amount) {
    const pid = U.id();
    g.paid = g.paid || []; g.paid.push({ id: pid, date: U.dkey(), amount });
    if (+g.next > 0) g.next = Math.max(0, r3(+g.next - amount));
    Store.save("moneycfg");
    MW.move(-amount, g.label, "g:" + pid);
    App.toast(L("تسجّل الخلاص", "Paiement enregistré"), U.money(amount), "good"); App.render();
  }
  App.acts.goalPayNext = (el) => { const g = MW.cfg().goals.find(x => x.id === el.dataset.id); if (!g) return; const a = Math.min(+g.next || 0, MW.goalPlan(g).remaining); if (a > 0) App.confirm(L(`تخلّص ${U.money(a)} — ${g.label}؟`, `Payer ${U.money(a)} — ${g.label} ?`), () => goalPay(g, a)); };
  App.forms.goalPay = (fd) => { const g = MW.cfg().goals.find(x => x.id === fd.id), a = num(fd.amount); if (g && a > 0) goalPay(g, a); };
  App.forms.goalAdd = (fd) => {
    const total = num(fd.total); if (!fd.label || !(total > 0)) return;
    const g = { id: U.id(), label: fd.label.trim(), total, due: fd.kind === "fund" ? "" : (fd.due || ""), next: fd.kind === "fund" ? 0 : num(fd.next), monthly: fd.kind === "fund" ? num(fd.next) : 0, kind: fd.kind === "fund" ? "fund" : "debt", paid: [] };
    if (num(fd.paid) > 0) g.paid.push({ id: U.id(), date: "", amount: num(fd.paid), note: L("قبل التطبيق", "avant l'app") });
    MW.cfg().goals.push(g); Store.save("moneycfg"); App.render();
  };
  App.acts.fundTake = (el) => {
    const g = MW.cfg().goals.find(x => x.id === el.dataset.id); if (!g) return;
    const inp = document.getElementById("gp-" + g.id), a = Math.min(num(inp && inp.value), MW.goalPaid(g));
    if (!(a > 0)) return;
    App.confirm(L(`تاخذ ${U.money(a)} من ${g.label}؟`, `Retirer ${U.money(a)} de ${g.label} ?`), () => {
      const pid = U.id(); g.paid = g.paid || []; g.paid.push({ id: pid, date: U.dkey(), amount: -a, note: L("سحب", "retrait") });
      Store.save("moneycfg"); MW.move(a, g.label, "g:" + pid); App.render();
    });
  };
  App.acts.goalDel = (el) => App.confirm(L("تمسح الخلاص الكبير هذا؟", "Supprimer ce paiement ?"), () => { const cfg = MW.cfg(); cfg.goals = cfg.goals.filter(x => x.id !== el.dataset.id); Store.save("moneycfg"); App.render(); });
  App.forms.moneyCfg = (fd) => {
    const cfg = Store.doc("moneycfg");
    const n = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(x) ? 0 : x; };
    cfg.savings = n(fd.savings); cfg.personal = n(fd.personal); cfg.salary = n(fd.salary);
    cfg.hourly = fd.hourly === "" ? "" : n(fd.hourly); cfg.maxHours = U.clamp(n(fd.maxHours) || 8, 1, 16); cfg.currency = fd.currency || "DT";
    cfg.workDays = [0, 1, 2, 3, 4, 5, 6].filter(d => fd["wd" + d]);
    Store.save("moneycfg"); App.toast(L("تسجّل", "Enregistré"), "", "good"); App.render();
  };

  App.views.money = { render };
})();
