/* Nhari — Work: Orange / Ooredoo outdoor-wifi interventions, nearest-first route, earnings, and the personal map */
(function () {
  "use strict";
  const OPS = { orange: { color: "#ff7900" }, ooredoo: { color: "#e2001a" } };
  const STATUS = [["todo", "باقية", "À faire"], ["done", "كمّلت", "Faite"], ["later", "مأجّلة", "Reportée"], ["cancel", "ملغية", "Annulée"]];
  const stName = (k) => { const s = STATUS.find(x => x[0] === k) || STATUS[0]; return L(s[1], s[2]); };

  /* ---------- geo helpers ---------- */
  const G = App.Geo = {
    km(a, b) {
      const R = 6371, toR = Math.PI / 180;
      const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    },
    road(km) { return km * 1.35; },
    parse(str) {
      const s = String(str || "").trim();
      let m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i) || s.match(/^\s*(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)\s*$/);
      if (m) { const lat = +m[1], lng = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }; }
      return null;
    },
    isShort(str) { return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(str || "")); },
    gmaps(p) { return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`; },
    dir(from, to, way) {
      let u = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${to.lat},${to.lng}`;
      if (from) u += `&origin=${from.lat},${from.lng}`;
      if (way && way.length) u += `&waypoints=${way.slice(0, 9).map(p => p.lat + "," + p.lng).join("%7C")}`;
      return u;
    }
  };
  App.places = () => (Store.doc("settings").places || []).filter(p => isFinite(p.lat) && isFinite(p.lng));
  App.place = (id) => App.places().find(p => p.id === id);

  /* ---------- data ---------- */
  const W = App.W = {
    cfg() { return Store.doc("workcfg"); },
    month(mk) { return Store.month("work", mk); },
    ticketsOn(dk) { const mk = dk.slice(0, 7); return W.month(mk).tickets.filter(t => t.date === dk); },
    find(id) { for (const mk of [U.mkey(), U.prevMkey()]) { const t = W.month(mk).tickets.find(x => x.id === id); if (t) return { t, mk }; } return null; },
    price(op) { return +(W.cfg().ops[op] || {}).price || 0; },
    route(startId) {
      const tk = U.dkey(), list = W.ticketsOn(tk).filter(t => t.status === "todo");
      const withLoc = list.filter(t => isFinite(t.lat) && isFinite(t.lng)), noLoc = list.filter(t => !(isFinite(t.lat) && isFinite(t.lng)));
      let cur = W.startPoint(startId); const order = [];
      const rest = withLoc.slice();
      while (rest.length) {
        let bi = 0, bd = Infinity;
        rest.forEach((t, i) => { const d = cur ? G.km(cur, t) : 0; if (d < bd) { bd = d; bi = i; } });
        const t = rest.splice(bi, 1)[0];
        order.push({ t, km: cur ? G.road(G.km(cur, t)) : 0 });
        cur = t;
      }
      noLoc.forEach(t => order.push({ t, km: null }));
      return order;
    },
    startPoint(id) {
      if (id === "last") {
        const done = W.ticketsOn(U.dkey()).filter(t => t.status === "done" && isFinite(t.lat)).sort((a, b) => (b.doneTs || 0) - (a.doneTs || 0))[0];
        if (done) return { lat: done.lat, lng: done.lng, name: L("آخر تدخل", "Dernière intervention") };
      }
      return App.place(id) || App.place("home") || null;
    },
    setDone(t, done) {
      const cfg = W.cfg(), op = cfg.ops[t.op] || {};
      const mk = t.date.slice(0, 7), m = Store.month("money", mk);
      m.incomes = m.incomes.filter(x => x.ticketId !== t.id);
      m.expenses = m.expenses.filter(x => x.ticketId !== t.id);
      if (done) {
        m.incomes.push({ id: U.id(), ts: Date.now(), date: t.date, amount: +op.price || 0, note: (op.name || t.op) + " · " + (t.client || t.addr || ""), ticketId: t.id });
        if (op.mat === "me" && +op.matCost > 0) m.expenses.push({ id: U.id(), ts: Date.now(), date: t.date, amount: +op.matCost, cat: "work", note: L("مواد · ", "Matériel · ") + (t.client || ""), ticketId: t.id });
        t.status = "done"; t.doneTs = Date.now();
      } else { t.status = "todo"; delete t.doneTs; }
      Store.save("money-" + mk);
    }
  };

  /* ---------- views ---------- */
  function render() {
    const sub = App.sub.work || "today";
    const tabs = [["today", L("تدخلات اليوم", "Interventions du jour")], ["map", L("الخريطة", "Carte")], ["month", L("الحساب والإعدادات", "Bilan et réglages")], ...App.extTabs("work")];
    let html = `<div class="sectionhead"><h2>${L("الخدمة", "Travail")}</h2><span class="muted small">Orange · Ooredoo — outdoor wifi</span></div>
      <div class="subtabs">${tabs.map(t => `<button data-act="sub" data-tab="work" data-v="${t[0]}" aria-pressed="${sub === t[0]}">${t[1]}</button>`).join("")}</div>`;
    if (sub === "today") html += viewToday();
    if (sub === "map") html += viewMap();
    if (sub === "month") html += viewMonth();
    html += App.extView("work", sub);
    return html;
  }
  App.views.work = { render, after(el) { if ((App.sub.work || "today") === "map") mountMap(el); } };

  function opPill(op) { const c = (OPS[op] || {}).color || "#888"; return `<span class="pill" style="background:${c}1f;color:${c}">${U.esc((W.cfg().ops[op] || {}).name || op)}</span>`; }

  function viewToday() {
    const cfg = W.cfg(), tk = U.dkey(), all = W.ticketsOn(tk);
    const startId = App.uiState.workStart || cfg.startFrom || "home";
    const order = W.route(startId);
    const done = all.filter(t => t.status === "done");
    const earned = U.sum(done, t => W.price(t.op));
    let need = null;
    try { const c = App.moneyCalc(); const avg = (W.price("orange") + W.price("ooredoo")) / 2 || 20; need = c.workToday ? Math.max(0, Math.ceil(c.todayObj / avg)) : 0; } catch (e) { /* ignore */ }
    const totalKm = U.sum(order, o => o.km || 0);
    const minutes = U.sum(order, o => (o.km ? o.km / (+cfg.speed || 30) * 60 : 15) + (+cfg.installMin || 60));
    const R = App.R ? App.R.cfg() : { workEnd: "17:00" };
    const firstClass = App.R ? App.R.classesFor(new Date())[0] : null;
    const endAt = firstClass ? U.plusMin(firstClass.s, -(R.commute || 40) - 20) : U.atTime(R.workEnd);
    const startAt = new Date(Math.max(Date.now(), U.atTime(R.workStart || "08:30").getTime()));
    const avail = Math.max(0, (endAt - startAt) / 60000);
    const start = W.startPoint(startId);
    let t = new Date(startAt);
    const rows = order.map((o, i) => {
      const drive = o.km != null ? o.km / (+cfg.speed || 30) * 60 : 15;
      t = U.plusMin(t, drive); const eta = new Date(t); t = U.plusMin(t, +cfg.installMin || 60);
      const late = eta > endAt;
      const prev = i === 0 ? start : order[i - 1].t;
      const x = o.t;
      return `<div class="ticket ${late ? "late" : ""}">
        <div class="tnum">${i + 1}</div>
        <div class="grow">
          <div class="row" style="gap:6px">${opPill(x.op)}<b>${U.esc(x.client || L("حريف", "Client"))}</b>${o.km != null ? `<span class="tiny muted">${U.num(o.km, 1)} km · ≈ ${U.hm(eta)}</span>` : `<span class="pill warn">${L("ما فيهاش موقع", "sans position")}</span>`}${late ? `<span class="pill bad">${L("بعد وقت الخروج", "après l'heure de fin")}</span>` : ""}</div>
          ${x.addr ? `<div class="small">${U.esc(x.addr)}</div>` : ""}
          ${x.phone ? `<div class="small">${L("تلفون", "Tél")}: <a href="tel:${U.esc(x.phone.replace(/\s/g, ""))}"><bdi>${U.esc(x.phone)}</bdi></a></div>` : ""}
          ${x.note ? `<div class="tiny muted">${U.esc(x.note)}</div>` : ""}
          <div class="row" style="margin-top:6px;gap:6px">
            ${isFinite(x.lat) ? `<a class="btn sm" href="${G.dir(prev && isFinite(prev.lat) ? prev : null, x)}" target="_blank" rel="noopener">${L("الطريق", "Itinéraire")}</a>` : ""}
            <button class="btn sm primary" data-act="tkDone" data-id="${x.id}">${I.check}${L("كمّلت", "Faite")}</button>
            <button class="btn sm" data-act="tkLater" data-id="${x.id}">${L("أجّل لغدوة", "Reporter à demain")}</button>
            <button class="btn sm ghost" data-act="tkEdit" data-id="${x.id}">${L("بدّل", "Modifier")}</button>
          </div>
        </div></div>`;
    }).join("");
    const way = order.filter(o => o.km != null).map(o => o.t);
    const fullRoute = way.length && start ? G.dir(start, way[way.length - 1], way.slice(0, -1)) : "";
    return `<div class="tiles" style="margin-top:0">
        <div class="tile"><span class="k">${I.target}${L("باقي اليوم", "Restantes")}</span><span class="v">${order.length}</span><span class="s">${done.length} ${L("كمّلت", "faites")}</span></div>
        <div class="tile"><span class="k">${I.money}${L("دخلت اليوم", "Gagné aujourd'hui")}</span><span class="v">${U.money(earned)}</span><span class="s">${need != null ? L("الهدف: ", "Objectif : ") + need + L(" تدخلات", " interventions") : ""}</span></div>
        <div class="tile"><span class="k">${I.clock}${L("الوقت", "Temps")}</span><span class="v">${Math.round(minutes / 60 * 10) / 10} ${L("س", "h")}</span><span class="s">${L("متاح", "dispo")} ${Math.round(avail / 60 * 10) / 10} ${L("س", "h")}${firstClass ? " · " + L("TEK-UP على ", "TEK-UP à ") + U.hm(firstClass.s) : ""}</span></div>
        <div class="tile"><span class="k">${I.link}${L("الطريق", "Trajet")}</span><span class="v">${U.num(totalKm, 1)} km</span><span class="s">≈ ${U.money(totalKm * (+cfg.cons || 7) / 100 * (+cfg.fuelPrice || 2.2))} ${L("مازوط", "gasoil")}</span></div>
      </div>
      ${minutes > avail && order.length ? `<div class="alertbox warn" style="margin-top:12px"><b>${L("التيكيات أكثر من الوقت", "Plus de tickets que de temps")}</b>${L("ما يلحقش الوقت قبل ما تمشي للقراية. أجّل الأبعد لغدوة.", "Tu n'auras pas le temps avant les cours. Reporte les plus éloignés à demain.")}</div>` : ""}
      <div class="grid g2" style="margin-top:14px">
        <div class="card" style="grid-column:1/-1">
          <div class="row between" style="margin-bottom:8px"><h3 style="margin:0">${I.link}${L("الترتيب: الأقرب الأول", "Ordre : le plus proche d'abord")}</h3>
            <label class="f" style="flex-direction:row;align-items:center;gap:8px">${L("تبدا من", "Départ")}<select data-change="workStart" style="width:auto">${App.places().map(p => `<option value="${p.id}" ${startId === p.id ? "selected" : ""}>${U.esc(p.name)}</option>`).join("")}<option value="last" ${startId === "last" ? "selected" : ""}>${L("آخر تدخل كمّلتو", "Dernière intervention faite")}</option></select></label></div>
          ${order.length ? rows : `<div class="empty">${L("ما فما حتى تيكي اليوم. زيد التيكيات متاع اليوم من تحت.", "Aucun ticket aujourd'hui. Ajoute-les ci-dessous.")}</div>`}
          ${fullRoute ? `<a class="btn primary" style="margin-top:10px" href="${fullRoute}" target="_blank" rel="noopener">${I.link}${L("الطريق الكامل في Google Maps", "Itinéraire complet dans Google Maps")}</a>` : ""}
        </div>
        <div class="card"><h3>${I.plus}${L("زيد تيكي", "Ajouter un ticket")}</h3>${ticketForm({})}</div>
        <div class="card stripe saffron" id="tkDrop" style="grid-column:1/-1"><h3>${I.spark}${L("زيد التيكيات من capture", "Ajouter les tickets depuis une capture")}</h3>
          <p class="small muted">${L("اختار capture (ولا برشا)، ولا الصقها بـ Ctrl+V، ولا اسحبها هنا — وفي التلفون: «Partager ← Nhari». التطبيق يقرا كل شي ويزيد التيكيات وحدو.", "Choisis une ou plusieurs captures, colle-les (Ctrl+V) ou glisse-les ici — sur le téléphone : « Partager → Nhari ». L'app lit tout et ajoute les tickets toute seule.")}</p>
          <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
            <label class="btn primary" for="tk-ai-img" ${App.ai && App.aiImages ? "" : 'aria-disabled="true" style="opacity:.5;pointer-events:none"'}>${I.plus}${L("اختار capture", "Choisir une capture")}</label>
            <input id="tk-ai-img" class="hide" type="file" accept="image/*" multiple data-change="tkImg">
            <button class="btn" type="button" data-act="tkTextToggle">${L("ولا الصق نص التيكي", "Ou coller le texte")}</button>
          </div>
          <form data-form="tkAI" class="stack ${App.uiState.tkText ? "" : "hide"}" style="margin-top:10px">
            <label class="f">${L("نص التيكي (من تطبيق الخدمة)", "Texte du ticket")}<textarea id="tk-ai-text" name="text" maxlength="8000" style="min-height:90px"></textarea></label>
            <button class="btn primary" type="submit" id="tk-ai-go" ${App.ai ? "" : "disabled"}>${I.spark}${L("زيد التيكيات", "Ajouter les tickets")}</button>
          </form>
          ${App.ai ? "" : App.aiNote()}
          <div id="tkAiOut" style="margin-top:10px">${App.uiState.tkLast ? lastImportHtml() : ""}</div>
        </div>
        ${done.length ? `<div class="card" style="grid-column:1/-1"><h3>${I.check}${L("اللي كمّلتهم اليوم", "Faites aujourd'hui")}</h3><div class="list">${done.map(x => `<div class="li">${opPill(x.op)}<span class="grow small">${U.esc(x.client || "")} <span class="tiny muted">${U.esc(x.addr || "")}</span></span><span class="amt" style="color:var(--good)">+${U.money(W.price(x.op))}</span><button class="btn sm ghost" data-act="tkUndo" data-id="${x.id}">${L("رجّع", "Annuler")}</button></div>`).join("")}</div></div>` : ""}
      </div>`;
  }

  function ticketForm(t) {
    const cfg = W.cfg();
    return `<form data-form="tkSave" class="form">
      <input type="hidden" name="id" value="${U.esc(t.id || "")}">
      <label class="f">${L("المشغّل", "Opérateur")}<select name="op" id="tk-op">${Object.keys(cfg.ops).map(k => `<option value="${k}" ${t.op === k ? "selected" : ""}>${U.esc(cfg.ops[k].name)}</option>`).join("")}</select></label>
      <label class="f">${L("النهار", "Date")}<input type="date" name="date" id="tk-date" value="${U.esc(t.date || U.dkey())}"></label>
      <label class="f">${L("الحريف", "Client")}<input type="text" name="client" id="tk-client" maxlength="60" value="${U.esc(t.client || "")}"></label>
      <label class="f">${L("التلفون", "Téléphone")}<input type="text" name="phone" id="tk-phone" maxlength="30" inputmode="tel" value="${U.esc(t.phone || "")}"></label>
      <label class="f full">${L("العنوان", "Adresse")}<input type="text" name="addr" id="tk-addr" maxlength="160" value="${U.esc(t.addr || "")}"></label>
      <label class="f full">${L("الموقع: رابط Google Maps ولا lat, lng", "Position : lien Google Maps ou lat, lng")}<input type="text" name="loc" id="tk-loc" maxlength="600" value="${isFinite(t.lat) ? t.lat + ", " + t.lng : ""}" placeholder="36.80, 10.15"></label>
      <label class="f full">${L("ملاحظة", "Note")}<input type="text" name="note" id="tk-note" maxlength="160" value="${U.esc(t.note || "")}"></label>
      <button class="btn primary full" type="submit">${t.id ? L("سجّل", "Enregistrer") : I.plus + L("زيد", "Ajouter")}</button>
      ${t.id ? `<button class="btn danger full" type="button" data-act="tkDel" data-id="${t.id}">${I.trash}${L("امسح التيكي", "Supprimer le ticket")}</button>` : ""}
    </form>
    <p class="tiny muted" style="margin-top:6px">${L("الرابط القصير (maps.app.goo.gl) ما يتقراش هنا: حلّو، واستنى يتبدّل الرابط في الأعلى، وانسخ الرابط الطويل.", "Les liens courts (maps.app.goo.gl) ne se lisent pas ici : ouvre-le, attends que l'adresse change, puis copie le lien long.")}</p>`;
  }

  function viewMonth() {
    const cfg = W.cfg(), mk = U.mkey(), list = W.month(mk).tickets;
    const done = list.filter(t => t.status === "done");
    const by = (op) => done.filter(t => t.op === op);
    const mat = U.sum(done.filter(t => (cfg.ops[t.op] || {}).mat === "me"), t => +(cfg.ops[t.op] || {}).matCost || 0);
    const fuelLabel = { op: L("يخلصو المشغّل", "payé par l'opérateur"), me: L("على حسابي", "à ma charge") };
    return `<div class="tiles" style="margin-top:0">
        ${Object.keys(cfg.ops).map(k => `<div class="tile"><span class="k">${opPill(k)}</span><span class="v">${by(k).length}</span><span class="s">${U.money(U.sum(by(k), t => W.price(t.op)))}</span></div>`).join("")}
        <div class="tile"><span class="k">${L("مواد على حسابي", "Matériel à ma charge")}</span><span class="v">${U.money(mat)}</span><span class="s">${L("هذا الشهر", "ce mois-ci")}</span></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        ${Object.keys(cfg.ops).map(k => { const o = cfg.ops[k]; return `<div class="card"><h3>${opPill(k)}</h3>
          <form data-form="opCfg" class="form"><input type="hidden" name="op" value="${k}">
            <label class="f">${L("السوم على التدخل", "Prix par intervention")}<input type="number" step="0.5" min="0" name="price" id="op-${k}-price" value="${o.price}"></label>
            <label class="f">${L("المازوط", "Carburant")}<select name="fuel" id="op-${k}-fuel"><option value="op" ${o.fuel === "op" ? "selected" : ""}>${fuelLabel.op}</option><option value="me" ${o.fuel === "me" ? "selected" : ""}>${fuelLabel.me}</option></select></label>
            <label class="f">${L("الشوفيات والتيرفونات", "Chevilles / tire-fonds")}<select name="mat" id="op-${k}-mat"><option value="op" ${o.mat === "op" ? "selected" : ""}>${fuelLabel.op}</option><option value="me" ${o.mat === "me" ? "selected" : ""}>${fuelLabel.me}</option></select></label>
            <label class="f">${L("كلفة المواد على التدخل", "Coût matériel / intervention")}<input type="number" step="0.1" min="0" name="matCost" id="op-${k}-mc" value="${o.matCost}"></label>
            <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form></div>`; }).join("")}
        <div class="card"><h3>${I.clock}${L("الوقت والكرهبة", "Temps et voiture")}</h3>
          <form data-form="workCfg" class="form">
            <label class="f">${L("وقت التركيب (دقيقة)", "Durée d'une installation (min)")}<input type="number" min="15" max="240" name="installMin" id="wc-inst" value="${cfg.installMin}"></label>
            <label class="f">${L("السرعة في المدينة (كم/س)", "Vitesse en ville (km/h)")}<input type="number" min="10" max="80" name="speed" id="wc-speed" value="${cfg.speed}"></label>
            <label class="f">${L("استهلاك الكرهبة (ل/100كم)", "Conso (L/100 km)")}<input type="number" step="0.1" min="2" max="20" name="cons" id="wc-cons" value="${cfg.cons}"></label>
            <label class="f">${L("سوم لتر المازوط", "Prix du litre")}<input type="number" step="0.001" min="0" name="fuelPrice" id="wc-fuel" value="${cfg.fuelPrice}"></label>
            <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
          </form>
          <p class="tiny muted" style="margin-top:6px">${L("كل تدخل تعلّمو «كمّلت» يتزاد وحدو في الفلوس كدخل (والمواد إذا على حسابك كمصروف).", "Chaque intervention marquée « faite » s'ajoute aux Finances comme revenu (et le matériel à ta charge comme dépense).")}</p>
        </div>
      </div>`;
  }

  /* ---------- actions ---------- */
  App.changes.workStart = (el) => { App.uiState.workStart = el.value; const c = W.cfg(); c.startFrom = el.value === "last" ? c.startFrom : el.value; Store.save("workcfg"); App.render(); };
  App.forms.tkSave = (fd) => {
    let loc = G.parse(fd.loc);
    if (!loc && fd.loc && G.isShort(fd.loc)) App.toast(L("الرابط القصير ما يتقراش", "Lien court illisible"), L("حلّو في المتصفح وانسخ الرابط الطويل.", "Ouvre-le et copie le lien long."), "warn");
    const date = fd.date || U.dkey(), mk = date.slice(0, 7);
    let t;
    if (fd.id) { const f = W.find(fd.id); if (f) { t = f.t; if (f.mk !== mk) { W.month(f.mk).tickets = W.month(f.mk).tickets.filter(x => x.id !== t.id); W.month(mk).tickets.push(t); Store.save("work-" + f.mk); } } }
    if (!t) { t = { id: U.id(), status: "todo" }; W.month(mk).tickets.push(t); }
    Object.assign(t, { op: fd.op, date, client: (fd.client || "").trim(), phone: (fd.phone || "").trim(), addr: (fd.addr || "").trim(), note: (fd.note || "").trim() });
    if (loc) { if (loc.lat !== t.lat || loc.lng !== t.lng) delete t.approx; t.lat = loc.lat; t.lng = loc.lng; } else if (!fd.loc) { delete t.lat; delete t.lng; delete t.approx; }
    Store.save("work-" + mk); App.closeModal(); App.toast(L("تسجّل التيكي", "Ticket enregistré"), t.client || t.addr || "", "good"); App.render();
  };
  App.acts.tkEdit = (el) => { const f = W.find(el.dataset.id); if (f) App.modal(L("بدّل التيكي", "Modifier le ticket"), ticketForm(f.t)); };
  App.acts.tkDel = (el) => App.confirm(L("تمسح التيكي؟", "Supprimer ce ticket ?"), () => { const f = W.find(el.dataset.id); if (!f) return; if (f.t.status === "done") W.setDone(f.t, false); W.month(f.mk).tickets = W.month(f.mk).tickets.filter(x => x.id !== f.t.id); Store.save("work-" + f.mk); App.closeModal(); App.render(); });
  App.acts.tkDone = (el) => { const f = W.find(el.dataset.id); if (!f) return; W.setDone(f.t, true); Store.save("work-" + f.mk); App.toast(L("يعطيك الصحة", "Bravo"), "+" + U.money(W.price(f.t.op)), "good"); App.uiState.workStart = "last"; App.render(); };
  App.acts.tkUndo = (el) => { const f = W.find(el.dataset.id); if (!f) return; W.setDone(f.t, false); Store.save("work-" + f.mk); App.render(); };
  App.acts.tkLater = (el) => {
    const f = W.find(el.dataset.id); if (!f) return;
    let d = U.addDays(new Date(), 1); const wd = Store.doc("moneycfg").workDays; for (let i = 0; i < 7 && !wd.includes(U.dow(d)); i++) d = U.addDays(d, 1);
    const nk = U.dkey(d), nmk = nk.slice(0, 7);
    f.t.date = nk;
    if (nmk !== f.mk) { W.month(f.mk).tickets = W.month(f.mk).tickets.filter(x => x.id !== f.t.id); W.month(nmk).tickets.push(f.t); Store.save("work-" + nmk); }
    Store.save("work-" + f.mk); App.toast(L("تأجّل لـ ", "Reporté au ") + U.dateShort(d), "", "good"); App.render();
  };
  App.forms.opCfg = (fd) => { const o = W.cfg().ops[fd.op]; if (!o) return; o.price = +fd.price || 0; o.fuel = fd.fuel; o.mat = fd.mat; o.matCost = +fd.matCost || 0; Store.save("workcfg"); App.toast(L("تسجّل", "Enregistré"), "", "good"); App.render(); };
  App.forms.workCfg = (fd) => { const c = W.cfg(); c.installMin = U.clamp(+fd.installMin || 60, 15, 240); c.speed = U.clamp(+fd.speed || 30, 10, 80); c.cons = +fd.cons || 7; c.fuelPrice = +fd.fuelPrice || 2.2; Store.save("workcfg"); App.toast(L("تسجّل", "Enregistré"), "", "good"); App.render(); };
  /* ---------- tickets from screenshots: read, then add right away ---------- */
  const digits = (x) => String(x || "").replace(/\D/g, "").slice(-8);
  const normTxt = (x) => String(x || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  function delegCenter(name) {
    const NM = window.NhariMap; if (!NM || !name) return null;
    const n = normTxt(name);
    const d = NM.deleg.find(x => normTxt(x.fr) === n || normTxt(x.ar) === n) || NM.deleg.find(x => n && (normTxt(x.fr).includes(n) || n.includes(normTxt(x.fr)) || normTxt(x.ar).includes(n) || n.includes(normTxt(x.ar))));
    return d ? { lat: d.c[1], lng: d.c[0], name: d.fr } : null;
  }
  function isDuplicate(t) {
    return W.month(t.date.slice(0, 7)).tickets.some(o => o.date === t.date && (
      (t.ref && o.ref && normTxt(t.ref) === normTxt(o.ref)) ||
      (digits(t.phone).length >= 8 && digits(t.phone) === digits(o.phone)) ||
      (t.client && normTxt(t.client) === normTxt(o.client) && normTxt(t.addr) === normTxt(o.addr))));
  }
  function lastImportHtml() {
    const r = App.uiState.tkLast; if (!r) return "";
    const items = r.added.map(id => (W.find(id) || {}).t).filter(Boolean);
    return `<div class="alertbox ${items.length ? "good" : "info"} small">${items.length ? L(`تزادو ${items.length} تيكيات`, `${items.length} ticket(s) ajouté(s)`) : L("ما تزاد حتى تيكي جديد", "Aucun nouveau ticket")}${r.dup ? L(` · ${r.dup} موجودين من قبل`, ` · ${r.dup} déjà présent(s)`) : ""}</div>
      ${items.length ? `<div class="list" style="margin-top:8px">${items.map(t => `<div class="li">${opPill(t.op)}<span class="grow small"><b>${U.esc(t.client || "")}</b> ${U.esc(t.addr || "")}${t.phone ? " · " + U.esc(t.phone) : ""}${t.ref ? ` <span class="tiny muted">#${U.esc(t.ref)}</span>` : ""}${t.approx ? ` <span class="tiny muted">(${L("بلاصة تقريبية", "position approx.")})</span>` : ""}</span><button class="btn sm ghost" data-act="tkEdit" data-id="${t.id}">${L("بدّل", "Modifier")}</button></div>`).join("")}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="tkUndoImport">${L("رجّع (امسحهم)", "Annuler (les supprimer)")}</button></div>` : ""}`;
  }
  async function importTickets({ text = "", imgs = [] }) {
    if (!App.ai || (!text && !imgs.length)) return;
    const out = () => document.getElementById("tkAiOut");
    if (out()) out().innerHTML = `<p class="small"><span class="spinner"></span> ${L("نقرا التيكيات…", "Lecture des tickets…")}</p>`;
    const NM = window.NhariMap, delegs = NM ? NM.deleg.map(d => d.fr).join(", ") : "";
    const prompt = `Extract field-technician tickets (outdoor wifi installations or repairs for Orange or Ooredoo in Tunisia) from this content. Today is ${U.dkey()} (Africa/Tunis).
${text ? "TEXT:\n" + text.slice(0, 7000) : "Read the attached screenshot(s) carefully; one screenshot may contain one or several tickets."}
Reply with ONLY a JSON array, one object per ticket:
[{"op":"orange|ooredoo","ref":"ticket/order number or empty","client":"","phone":"","addr":"full address as written","deleg":"closest delegation from this list or empty: ${delegs}","gps":"GPS coordinates or Google Maps link exactly as written, or empty","date":"YYYY-MM-DD if a date is written, else empty","slot":"time window if written","type":"installation|sav|other","note":"other useful remarks (short)"}]
Never invent data: leave a field empty when it is not visible.`;
    try {
      const opts = imgs.length ? { images: imgs } : {};
      const arr = await App.ai.json(prompt, opts);
      const list = (Array.isArray(arr) ? arr : (arr && Array.isArray(arr.tickets) ? arr.tickets : [])).filter(x => x && (x.client || x.addr || x.phone || x.ref)).slice(0, 30);
      const tk = U.dkey(), touched = new Set(), added = []; let dup = 0;
      for (const x of list) {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(x.date || "") ? x.date : tk, mk = date.slice(0, 7);
        const t = { id: U.id(), status: "todo", op: /ooredoo/i.test(x.op || "") ? "ooredoo" : "orange", date,
          ref: String(x.ref || "").slice(0, 40), client: String(x.client || "").slice(0, 60), phone: String(x.phone || "").slice(0, 30), addr: String(x.addr || "").slice(0, 160),
          note: [x.slot, x.type && x.type !== "other" ? x.type.toUpperCase() : "", x.note].filter(Boolean).join(" · ").slice(0, 160), src: "capture" };
        const loc = G.parse(x.gps || "") || G.parse(x.addr || "");
        if (loc) { t.lat = loc.lat; t.lng = loc.lng; }
        else { const c = delegCenter(x.deleg) || delegCenter(x.addr); if (c) { t.lat = c.lat; t.lng = c.lng; t.approx = true; } }
        if (isDuplicate(t)) { dup++; continue; }
        W.month(mk).tickets.push(t); touched.add(mk); added.push(t.id);
      }
      touched.forEach(mk => Store.save("work-" + mk));
      App.uiState.tkLast = { added, dup };
      if (added.length) App.toast(L("تزادو التيكيات", "Tickets ajoutés"), String(added.length), "good");
      App.render();
    } catch (e) { const m = App.aiError(e); if (out()) out().innerHTML = m ? `<div class="alertbox warn small">${U.esc(m)}</div>` : ""; }
  }
  App.importTickets = importTickets;
  App.changes.tkImg = (el) => { const files = Array.from(el.files || []).slice(0, (App.aiImgLimits && App.aiImgLimits.maxCount) || 5); el.value = ""; if (files.length) importTickets({ imgs: files }); };
  App.acts.tkTextToggle = () => { App.uiState.tkText = !App.uiState.tkText; App.render(); };
  App.forms.tkAI = (fd) => importTickets({ text: (fd.text || "").trim() });
  App.acts.tkUndoImport = () => {
    const r = App.uiState.tkLast; if (!r) return;
    const touched = new Set();
    r.added.forEach(id => { const f = W.find(id); if (f && f.t.status !== "done") { W.month(f.mk).tickets = W.month(f.mk).tickets.filter(x => x.id !== id); touched.add(f.mk); } });
    touched.forEach(mk => Store.save("work-" + mk)); App.uiState.tkLast = null; App.render();
  };
  // paste (Ctrl+V) or drop screenshots anywhere on the Work screen
  const imgFiles = (dt) => Array.from((dt && dt.files) || []).filter(f => /^image\//.test(f.type));
  document.addEventListener("paste", (e) => {
    if (App.tab !== "work" || !App.ai || !App.aiImages) return;
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
    const files = imgFiles(e.clipboardData); if (files.length) { e.preventDefault(); importTickets({ imgs: files.slice(0, 5) }); }
  });
  document.addEventListener("dragover", (e) => { if (App.tab === "work" && e.dataTransfer && Array.from(e.dataTransfer.items || []).some(i => i.kind === "file")) e.preventDefault(); });
  document.addEventListener("drop", (e) => {
    if (App.tab !== "work" || !App.ai || !App.aiImages) return;
    const files = imgFiles(e.dataTransfer); if (files.length) { e.preventDefault(); importTickets({ imgs: files.slice(0, 5) }); }
  });

  /* ---------- map ---------- */
  const M = { lat0: 36.82, lng0: 9.98, latTop: 36.94 };
  const KX = Math.cos(M.lat0 * Math.PI / 180) * 111.32, KY = 110.57;
  const proj = (lng, lat) => [(lng - M.lng0) * KX, (M.latTop - lat) * KY];
  const ICON = { home: "⌂", gym: "◆", tekup: "▲", mosque: "☾", zitouna: "☾", other: "●" };
  function viewMap() {
    const places = App.places(), home = App.place("home");
    const sel = App.uiState.mapSel;
    const all = [...places.map(p => ({ ...p, t: "place" })), ...W.route(App.uiState.workStart || W.cfg().startFrom || "home").filter(o => o.km != null).map((o, i) => ({ id: o.t.id, name: (i + 1) + ". " + (o.t.client || o.t.addr || L("تيكي", "Ticket")), lat: o.t.lat, lng: o.t.lng, t: "ticket", op: o.t.op }))];
    const s = all.find(x => x.id === sel);
    return `<div class="card" style="padding:0;overflow:hidden">
        <div id="mapbox" class="mapbox"></div>
        <div class="row between" style="padding:8px 12px"><div class="row" style="gap:6px"><button class="iconbtn" data-act="mapZoom" data-z="0.7" aria-label="+">+</button><button class="iconbtn" data-act="mapZoom" data-z="1.4" aria-label="−">−</button><button class="btn sm" data-act="mapFit">${L("رجّع الكل", "Tout voir")}</button></div><span class="tiny muted">geoBoundaries (CC BY 4.0) · Natural Earth</span></div>
      </div>
      ${s ? `<div class="card" style="margin-top:12px"><div class="row between"><b>${U.esc(s.name)}</b>${home && s.id !== "home" ? `<span class="pill accent">${U.num(G.road(G.km(home, s)), 1)} km ${L("مالدار", "de la maison")}</span>` : ""}</div>
        <div class="row" style="margin-top:8px"><a class="btn sm" href="${G.gmaps(s)}" target="_blank" rel="noopener">${L("حل في Google Maps", "Ouvrir dans Google Maps")}</a>${home && s.id !== "home" ? `<a class="btn sm primary" href="${G.dir(home, s)}" target="_blank" rel="noopener">${L("الطريق مالدار", "Itinéraire depuis la maison")}</a>` : ""}</div></div>` : ""}
      <div class="grid g2" style="margin-top:12px">
        <div class="card"><h3>${L("بلايصي", "Mes lieux")}</h3><div class="list">${places.map(p => `<div class="li"><span class="pill accent">${ICON[p.kind] || "●"}</span><span class="grow small"><b>${U.esc(p.name)}</b>${home && p.id !== "home" ? ` <span class="tiny muted">${U.num(G.road(G.km(home, p)), 1)} km · ≈ ${Math.round(G.road(G.km(home, p)) / 30 * 60 + 3)} ${L("د", "min")}</span>` : ""}</span><button class="btn sm" data-act="mapSel" data-id="${p.id}">${L("وريني", "Voir")}</button>${["home", "gym", "tekup", "zitouna"].includes(p.id) ? "" : `<button class="iconbtn" style="width:30px;height:30px" data-act="placeDel" data-id="${p.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button>`}</div>`).join("")}</div></div>
        <div class="card"><h3>${I.plus}${L("زيد بلاصة (مثلا جامع الحومة)", "Ajouter un lieu (ex. mosquée du quartier)")}</h3>
          <form data-form="placeAdd" class="form">
            <label class="f">${L("الاسم", "Nom")}<input type="text" name="name" id="pl-name" required maxlength="40"></label>
            <label class="f">${L("النوع", "Type")}<select name="kind" id="pl-kind"><option value="mosque">${L("جامع", "Mosquée")}</option><option value="other">${L("أخرى", "Autre")}</option></select></label>
            <label class="f full">${L("رابط Google Maps ولا lat, lng", "Lien Google Maps ou lat, lng")}<input type="text" name="loc" id="pl-loc" required maxlength="600"></label>
            <button class="btn primary full" type="submit">${L("زيد", "Ajouter")}</button>
          </form></div>
      </div>`;
  }
  function mountMap(root) {
    const box = root.querySelector("#mapbox"); if (!box || !window.NhariMap) return;
    const NM = window.NhariMap;
    const places = App.places();
    const order = W.route(App.uiState.workStart || W.cfg().startFrom || "home").filter(o => o.km != null);
    const pts = [...places, ...order.map(o => o.t)].map(p => proj(p.lng, p.lat));
    const fit = () => {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = Math.max(1.5, (x1 - x0) * 0.15);
      x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
      const ar = box.clientWidth / Math.max(1, box.clientHeight);
      let w = x1 - x0, h = y1 - y0;
      if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
      return { x: x0, y: y0, w, h };
    };
    let vb = App.uiState.mapVB || fit();
    const path = (ring) => "M" + ring.map(c => proj(c[0], c[1]).map(v => v.toFixed(2)).join(",")).join("L") + "Z";
    const line = (l) => "M" + l.map(c => proj(c[0], c[1]).map(v => v.toFixed(2)).join(",")).join("L");
    const deleg = NM.deleg.map(d => `<path class="land" d="${d.r.map(path).join(" ")}"/>`).join("");
    const labels = NM.deleg.map(d => { const [x, y] = proj(d.c[0], d.c[1]); return `<text class="dl" x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle">${U.esc(App.lang === "fr" ? d.fr : d.ar)}</text>`; }).join("");
    const roads = NM.roads.map(l => `<path class="road" d="${line(l)}"/>`).join("");
    const homeP = App.place("home");
    const routePts = order.length && homeP ? [W.startPoint(App.uiState.workStart || W.cfg().startFrom || "home"), ...order.map(o => o.t)].filter(Boolean).map(p => proj(p.lng, p.lat).map(v => v.toFixed(2)).join(",")).join(" ") : "";
    const mk = (p, cls, label, id, num) => { const [x, y] = proj(p.lng, p.lat); return `<g class="mk ${cls}" data-act="mapSel" data-id="${id}" transform="translate(${x.toFixed(2)},${y.toFixed(2)})"><circle class="mkc" r="1"/>${num ? `<text class="mkn" text-anchor="middle" dy=".35em">${num}</text>` : ""}<text class="mkl" x="1.6" dy=".35em">${U.esc(label)}</text></g>`; };
    box.innerHTML = `<svg id="mapsvg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" role="img" aria-label="${L("خريطة البلايص متاعي", "Carte de mes lieux")}">
      <rect class="sea" x="-50" y="-50" width="200" height="200"/>${deleg}${roads}<g class="dlg">${labels}</g>
      ${routePts ? `<polyline class="route" points="${routePts}"/>` : ""}
      ${order.map((o, i) => mk(o.t, "tk " + o.t.op, o.t.client || "", o.t.id, i + 1)).join("")}
      ${places.map(p => mk(p, "pl " + (p.kind || "other"), (ICON[p.kind] || "") + " " + p.name, p.id)).join("")}
      <g id="scalebar"></g></svg>`;
    const svg = box.querySelector("svg");
    const apply = () => {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      const u = vb.w / Math.max(300, box.clientWidth);
      svg.style.setProperty("--u", u);
      svg.querySelectorAll(".mkc").forEach(c => c.setAttribute("r", (7 * u).toFixed(3)));
      svg.querySelectorAll(".mkl").forEach(t => { t.setAttribute("font-size", (12 * u).toFixed(3)); t.setAttribute("x", (10 * u).toFixed(3)); });
      svg.querySelectorAll(".mkn").forEach(t => t.setAttribute("font-size", (9 * u).toFixed(3)));
      svg.querySelector(".dlg").setAttribute("font-size", (10 * u).toFixed(3));
      svg.querySelectorAll(".land,.road,.route").forEach(p => p.style.strokeWidth = (p.classList.contains("route") ? 2.5 : p.classList.contains("road") ? 1.6 : 0.8) * u);
      const km = [0.5, 1, 2, 5, 10].find(k => k / u > 60) || 10;
      const sx = vb.x + 12 * u, sy = vb.y + vb.h - 14 * u;
      svg.querySelector("#scalebar").innerHTML = `<line x1="${sx}" y1="${sy}" x2="${sx + km}" y2="${sy}" stroke="var(--ink)" stroke-width="${2.5 * u}"/><text x="${sx}" y="${sy - 5 * u}" font-size="${10 * u}" fill="var(--ink)">${km} km</text>`;
      App.uiState.mapVB = vb;
    };
    apply();
    App.mapZoom = (z, cx, cy) => { cx = cx ?? vb.x + vb.w / 2; cy = cy ?? vb.y + vb.h / 2; const nw = U.clamp(vb.w * z, 0.6, 60); const f = nw / vb.w; vb = { x: cx - (cx - vb.x) * f, y: cy - (cy - vb.y) * f, w: nw, h: vb.h * f }; apply(); };
    App.mapFit = () => { vb = fit(); apply(); };
    const toSvg = (ev) => { const r = svg.getBoundingClientRect(); return [vb.x + (ev.clientX - r.left) / r.width * vb.w, vb.y + (ev.clientY - r.top) / r.height * vb.h]; };
    svg.addEventListener("wheel", (ev) => { ev.preventDefault(); const [x, y] = toSvg(ev); App.mapZoom(ev.deltaY > 0 ? 1.15 : 0.87, x, y); }, { passive: false });
    const ptrs = new Map(); let last = null, pinch = null, moved = false;
    svg.addEventListener("pointerdown", (ev) => { ptrs.set(ev.pointerId, ev); moved = false; if (ptrs.size === 1) last = [ev.clientX, ev.clientY]; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    svg.addEventListener("pointermove", (ev) => {
      if (!ptrs.has(ev.pointerId)) return; ptrs.set(ev.pointerId, ev);
      const r = svg.getBoundingClientRect();
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (d > 0) { App.mapZoom(pinch / d); pinch = d; } moved = true; return; }
      if (last) { const dx = ev.clientX - last[0], dy = ev.clientY - last[1]; if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; if (!svg.hasPointerCapture(ev.pointerId)) try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } } vb = { ...vb, x: vb.x - dx / r.width * vb.w, y: vb.y - dy / r.height * vb.h }; last = [ev.clientX, ev.clientY]; apply(); }
    });
    const up = (ev) => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) last = null; };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("click", (ev) => { if (moved) { ev.stopPropagation(); ev.preventDefault(); } }, true);
  }
  App.acts.mapZoom = (el) => App.mapZoom && App.mapZoom(+el.dataset.z);
  App.acts.mapFit = () => { App.uiState.mapVB = null; App.mapFit && App.mapFit(); };
  App.acts.mapSel = (el) => { App.uiState.mapSel = el.dataset.id; App.render(); };
  App.forms.placeAdd = (fd) => {
    const loc = G.parse(fd.loc);
    if (!loc) { App.toast(L("ما لقيتش الإحداثيات", "Coordonnées introuvables"), G.isShort(fd.loc) ? L("الرابط القصير: حلّو وانسخ الرابط الطويل.", "Lien court : ouvre-le et copie le lien long.") : L("حط رابط Google Maps ولا «36.80, 10.15».", "Colle un lien Google Maps ou « 36.80, 10.15 »."), "warn"); return; }
    const s = Store.doc("settings"); s.places = s.places || [];
    s.places.push({ id: U.id(), name: fd.name.trim(), kind: fd.kind, lat: loc.lat, lng: loc.lng });
    Store.save("settings"); App.render();
  };
  App.acts.placeDel = (el) => { const s = Store.doc("settings"); s.places = (s.places || []).filter(p => p.id !== el.dataset.id); Store.save("settings"); App.render(); };

  // reminder: tickets still open near the end of the work window
  App.eventSources.push(() => {
    const open = W.ticketsOn(U.dkey()).filter(t => t.status === "todo").length;
    if (!open) return [];
    const R = App.R ? App.R.cfg() : { workEnd: "17:00" };
    return [{ key: "work-left", at: U.plusMin(U.atTime(R.workEnd), -60), title: L(`باقي ${open} تيكيات`, `${open} tickets restants`), body: L("أجّل اللي ما يلحقش لغدوة.", "Reporte ce qui ne passera pas à demain."), kind: "info" }];
  });
})();
