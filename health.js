/* Nhari — Health: glucose + insulin log, and the sport programme */
(function () {
  "use strict";
  const D = window.NhariData;

  const CTX = [
    ["fasting", "الصباح على الريق", "À jeun"], ["pre", "قبل الماكلة", "Avant repas"], ["post", "ساعتين بعد الماكلة", "2 h après repas"],
    ["presport", "قبل الرياضة", "Avant sport"], ["postsport", "بعد الرياضة", "Après sport"], ["bed", "قبل النوم", "Coucher"], ["night", "في الليل", "Nuit"], ["other", "أخرى", "Autre"]
  ];
  const ctxName = (k) => { const c = CTX.find(x => x[0] === k) || CTX[7]; return L(c[1], c[2]); };
  const EFFORT = [["none", "بلا رياضة", "Aucun effort"], ["light", "خفيف (مشي)", "Léger (marche)"], ["moderate", "متوسط", "Modéré"], ["intense", "قوي", "Intense"]];
  const effName = (k) => { const c = EFFORT.find(x => x[0] === k) || EFFORT[0]; return L(c[1], c[2]); };
  const ITYPE = [["rapid", "سريع (للماكلة)", "Rapide (repas)"], ["basal", "بطيء (قاعدي)", "Lente (basale)"], ["mixed", "مخلوط", "Mixte"]];
  const itypeName = (k) => { const c = ITYPE.find(x => x[0] === k) || ITYPE[0]; return L(c[1], c[2]); };

  const H = App.H = {
    entries(days = 14) {
      const cur = Store.month("health").entries;
      const prev = Store.month("health", U.prevMkey()).entries;
      const from = Date.now() - days * 86400000;
      return [...prev, ...cur].filter(e => e.ts >= from).sort((a, b) => a.ts - b.ts);
    },
    lastBg() { const bg = H.entries(30).filter(e => e.type === "bg"); return bg[bg.length - 1] || null; },
    lastRapid() { const r = H.entries(2).filter(e => e.type === "ins" && e.itype !== "basal"); return r[r.length - 1] || null; },
    iob(now = Date.now()) {
      const s = Store.doc("settings"); const dia = parseFloat(s.doctor.dia) || 4;
      return U.sum(H.entries(1).filter(e => e.type === "ins" && e.itype === "rapid"), e => {
        const h = (now - e.ts) / 3600000; return h >= 0 && h < dia ? e.units * (1 - h / dia) : 0;
      });
    },
    guidance(mg, ctx) {
      const g = Store.doc("settings").glucose;
      if (mg < 54) return { kind: "bad", title: L("هبوط قوي — تحرّك توا", "Hypo sévère — agis maintenant"), body: L("كول ولا اشرب 15–20 غرام سكر سريع توا (4 قطع سكر ولا كاس عصير صغير). ما تبقاش وحدك. إذا تحس بدوخة كبيرة، ما تنجمش تبلع ولا بديت تغيب: اطلب الإسعاف — تونس 190، فرنسا 15.", "Prends 15–20 g de sucre rapide maintenant (4 sucres ou un petit verre de jus). Ne reste pas seul. Si tu as des vertiges forts, ne peux pas avaler ou perds connaissance : appelle les secours — Tunisie 190, France 15.") };
      if (mg < (g.low || 70)) return { kind: "bad", title: L("السكر هابط (Hypo)", "Hypoglycémie"), body: L("قاعدة الـ15: كول 15 غرام سكر سريع (3 قطع سكر، ولا نص كاس عصير)، وعاود قيس بعد 15 دقيقة. إذا مازال تحت 70 عاود. ما تزرقش أنسولين سريع توا، وما تعملش رياضة.", "Règle des 15 : prends 15 g de sucre rapide (3 sucres ou ½ verre de jus), recontrôle après 15 min. Si encore < 70, recommence. Pas d'insuline rapide ni de sport maintenant.") };
      if (mg > 250) return { kind: "bad", title: L("السكر عالي برشا", "Glycémie très haute"), body: L("اشرب الماء، ما تعملش رياضة قوية، وعاود قيس بعد ساعتين. إذا عندك تقيؤ، وجيعة كرش، نفس سريع ولا ريحة فم كي التفاح: امشي للطوارئ فورا (خطر الحماض الكيتوني). إذا يتعاود برشا لازمك طبيب.", "Bois de l'eau, évite le sport intense, recontrôle dans 2 h. Vomissements, douleur au ventre, respiration rapide ou haleine fruitée : urgences immédiatement (risque d'acidocétose). Si ça se répète, consulte un médecin.") };
      if (ctx === "presport" && mg < 100) return { kind: "warn", title: L("قبل الرياضة: كول حاجة", "Avant le sport : mange un peu"), body: L("السكر تحت 100: كول 15–30 غرام نشويات (تفاحة، ولا 3 تمرات) قبل ما تبدا، وقيس بعد الرياضة.", "Sous 100 : prends 15–30 g de glucides (une pomme, 3 dattes) avant de commencer, et recontrôle après.") };
      if (mg > (g.high || 180)) return { kind: "warn", title: L("فوق المجال", "Au-dessus de la cible"), body: L("شوف شنوة كليت وقداش زرقت، اشرب الماء، ومشي خفيف يعاون. عاود قيس بعد ساعتين.", "Regarde ce que tu as mangé et ta dose, bois de l'eau ; une marche légère aide. Recontrôle dans 2 h.") };
      if ((ctx === "fasting" || ctx === "pre") && mg > 130) return { kind: "warn", title: L("شوية عالي قبل الماكلة", "Un peu haut avant repas"), body: L("الهدف المعروف قبل الماكلة بين 80 و 130 mg/dL (0.80–1.30 g/L).", "La cible habituelle avant repas est 80–130 mg/dL (0,80–1,30 g/L).") };
      return { kind: "good", title: L("في المجال", "Dans la cible"), body: L("يعطيك الصحة، كمّل هكا.", "Bravo, continue comme ça.") };
    },
    nextMeal(now = new Date()) {
      const m = Store.doc("settings").meals;
      const list = [["breakfast", L("الفطور", "Petit-déj")], ["lunch", L("الغداء", "Déjeuner")], ["snack", L("اللمجة", "Collation")], ["dinner", L("العشاء", "Dîner")]]
        .map(([k, n]) => ({ k, n, at: U.atTime(m[k], now) })).sort((a, b) => a.at - b.at);
      return list.find(x => x.at > now) || { ...list[0], at: U.addDays(list[0].at, 1) };
    },
    history(carbs) {
      const all = H.entries(60);
      const bgs = all.filter(e => e.type === "bg");
      const out = [];
      for (const e of all) {
        if (e.type !== "ins" || e.itype === "basal" || !(e.carbs > 0)) continue;
        if (carbs > 0 && Math.abs(e.carbs - carbs) > Math.max(15, carbs * 0.25)) continue;
        const before = bgs.filter(b => b.ts >= e.ts - 3600000 && b.ts <= e.ts + 600000).sort((a, b) => Math.abs(a.ts - e.ts) - Math.abs(b.ts - e.ts))[0];
        const after = bgs.filter(b => b.ts >= e.ts + 90 * 60000 && b.ts <= e.ts + 240 * 60000).sort((a, b) => Math.abs(a.ts - e.ts - 7200000) - Math.abs(b.ts - e.ts - 7200000))[0];
        out.push({ e, before, after });
      }
      return out.reverse().slice(0, 6);
    }
  };

  /* ---------- glucose chart (last 7 days) ---------- */
  function bgChart() {
    const pts = H.entries(7).filter(e => e.type === "bg");
    const W = innerWidth < 600 ? 360 : 620, Hh = innerWidth < 600 ? 170 : 190, pl = 34, pr = 8, pt = 10, pb = 22;
    const t1 = Date.now(), t0 = t1 - 7 * 86400000;
    const lo = 40, hi = 350;
    const x = t => pl + (t - t0) / (t1 - t0) * (W - pl - pr);
    const y = v => pt + (1 - (U.clamp(v, lo, hi) - lo) / (hi - lo)) * (Hh - pt - pb);
    const g = Store.doc("settings").glucose;
    let s = `<rect x="${pl}" y="${y(g.high || 180)}" width="${W - pl - pr}" height="${y(g.low || 70) - y(g.high || 180)}" fill="var(--good-soft)"/>`;
    [70, 180, 250].forEach(v => { s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end">${U.esc(U.bgFmt(v).split(" ")[0])}</text>`; });
    for (let i = 0; i <= 7; i++) {
      const d = U.parseD(U.dkey(new Date(t1 - i * 86400000)));
      if (d.getTime() < t0) continue;
      s += `<line x1="${x(d)}" x2="${x(d)}" y1="${pt}" y2="${Hh - pb}" stroke="var(--line)" opacity=".5"/><text x="${x(d) + 3}" y="${Hh - 6}">${U.esc(U.weekday(d))}</text>`;
    }
    if (pts.length > 1) s += `<polyline fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".55" points="${pts.map(p => x(p.ts).toFixed(1) + "," + y(p.bg).toFixed(1)).join(" ")}"/>`;
    pts.forEach((p, i) => {
      const st = U.bgState(p.bg); const col = st === "good" ? "var(--good)" : st === "warn" ? "var(--warn)" : "var(--bad)";
      s += `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(p.bg).toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${col}" stroke="var(--surface)" stroke-width="1.5"><title>${U.esc(U.bgFmt(p.bg) + " · " + new Date(p.ts).toLocaleString("fr-FR"))}</title></circle>`;
    });
    if (!pts.length) s += `<text x="${W / 2}" y="${Hh / 2}" text-anchor="middle" style="font-size:13px">${L("ما فما حتى قياس في 7 أيام", "Aucune mesure sur 7 jours")}</text>`;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${L("السكر في 7 أيام", "Glycémie sur 7 jours")}">${s}</svg></div>`;
  }

  function stats() {
    const bg = H.entries(14).filter(e => e.type === "bg");
    if (!bg.length) return null;
    const g = Store.doc("settings").glucose;
    const avg = U.sum(bg, e => e.bg) / bg.length;
    const tir = bg.filter(e => e.bg >= (g.low || 70) && e.bg <= (g.high || 180)).length / bg.length * 100;
    return { n: bg.length, avg, tir, hypo: bg.filter(e => e.bg < 70).length, high: bg.filter(e => e.bg > 250).length };
  }

  function nowLocalInput() { return U.localInput(new Date()); }

  /* ---------- views ---------- */
  function render() {
    const sub = App.sub.health || "sugar";
    const tabs = [["sugar", L("السكر والأنسولين", "Glycémie & insuline")], ["sport", L("الرياضة", "Sport")], ["library", L("كل التمارين", "Tous les exercices")], ...App.extTabs("health")];
    let html = `<div class="sectionhead"><h2>${L("الصحة", "Santé")}</h2></div>
      <div class="subtabs">${tabs.map(t => `<button data-act="sub" data-tab="health" data-v="${t[0]}" aria-pressed="${sub === t[0]}">${t[1]}</button>`).join("")}</div>`;
    if (sub === "sugar") html += viewSugar();
    else if (sub === "sport") html += App.S.gym() ? viewGym() : viewSport();
    else if (sub === "library") html += viewLibrary();
    else html += App.extView("health", sub);
    return html;
  }

  function viewSugar() {
    const s = Store.doc("settings");
    const last = H.lastBg();
    const st = stats();
    const tk = U.dkey();
    const todayList = H.entries(1).filter(e => U.dkey(new Date(e.ts)) === tk).reverse();
    const meals = (App.F ? App.F.todayMeals() : []);
    const timeline = [...todayList.map(e => ({ ts: e.ts, e })), ...meals.map(m => ({ ts: m.ts, m }))].sort((a, b) => b.ts - a.ts);
    const nm = H.nextMeal();
    const gd = last ? H.guidance(last.bg, last.ctx) : null;
    const recentRapid = H.lastRapid();
    const rapidNoMeal = recentRapid && Date.now() - recentRapid.ts < 45 * 60000 && !meals.some(m => m.ts > recentRapid.ts - 20 * 60000);
    const doctorTip = !s.doctor.enabled ? `<div class="card stripe saffron" style="grid-column:1/-1"><h3>${I.alert}${L("قبل كل شي: الدوز", "D'abord : la dose")}</h3>
      <p class="small">${L("ما عندكش طبيب يتابعك، وانت تزرق على حسب التقدير. التطبيق ما يقلّكش قداش تزرق من راسو، خاطر غلطة صغيرة في الأنسولين تنجم تهبطلك السكر برشا. اللي يعملو: يسجّل كل شي، يوريك تجاربك القديمة مع ماكلة كيفها، وينبهك على الهبوط والطلوع.", "Sans suivi médical, tu doses à l'estime. L'app ne te donne pas de dose d'elle-même : une petite erreur d'insuline peut provoquer une hypo sévère. Elle enregistre tout, te montre tes expériences passées avec des repas similaires, et t'alerte sur les hypos et hypers.")}</p>
      <p class="small" style="margin-top:6px"><b>${L("نصيحة مهمة:", "Conseil important :")}</b> ${L("شوف طبيب سكري (endocrinologue) — في تونس تنجم تمشي لمعهد التغذية ولا مستوصف الصحة الأساسية. يعطيك ratio insuline/glucides و facteur de correction ويعملك HbA1c كل 3 شهور. وقتها تحطهم في الإعدادات والتطبيق يحسبلك الدوز.", "Consulte un diabétologue (endocrinologue) : il te donnera ton ratio insuline/glucides, ton facteur de correction et une HbA1c tous les 3 mois. Tu les saisis dans Réglages et l'app calculera la dose.")}</p></div>` : "";
    return `<div class="grid g2">
      ${doctorTip}
      <div class="card stripe ${gd ? gd.kind : "accent"}">
        <h3>${I.drop}${L("آخر قياس", "Dernière mesure")}</h3>
        ${last ? `<div class="row between"><div class="bgbig" style="color:var(--${gd.kind === "good" ? "good" : gd.kind === "warn" ? "warn" : "bad"})">${U.esc(U.bgFmt(last.bg))}</div><div style="text-align:end"><div class="small">${U.esc(ctxName(last.ctx))}</div><div class="tiny muted">${U.esc(U.dateShort(new Date(last.ts)))} · ${U.hm(new Date(last.ts))}</div></div></div>
          <div class="alertbox ${gd.kind}" style="margin-top:10px"><b>${U.esc(gd.title)}</b>${U.esc(gd.body)}</div>`
        : `<div class="empty">${L("سجّل أول قياس متاعك.", "Enregistre ta première mesure.")}</div>`}
        ${rapidNoMeal ? `<div class="alertbox warn" style="margin-top:10px"><b>${L("زرقت السريع — ما تنساش تاكل", "Insuline rapide faite — n'oublie pas de manger")}</b>${L("ما سجلتش ماكلة من بعد الزرقة.", "Aucun repas enregistré depuis l'injection.")}</div>` : ""}
      </div>
      <div class="card"><h3>${I.plus}${L("سجّل قياس السكر", "Noter une glycémie")}</h3>
        <form data-form="bgAdd" class="form">
          <div class="full row" style="gap:8px;align-items:center;flex-wrap:wrap"><label class="btn sm" for="bg-photo">📷 ${L("صوّر الجهاز", "Photo du lecteur")}</label><input id="bg-photo" class="hide" type="file" accept="image/*" capture="environment" data-change="bgPhoto"><span id="bgPhotoOut" class="small muted">${L("الذكاء الاصطناعي يقرا الرقم، وانت تثبّت.", "L'IA lit le chiffre, tu vérifies.")}</span></div>
          <label class="f">${L("السكر", "Glycémie")} (${U.bgUnitLabel()})<input id="bg-val" name="bg" type="number" step="${U.bgUnit() === "gL" ? "0.01" : U.bgUnit() === "mmol" ? "0.1" : "1"}" min="0" required inputmode="decimal" placeholder="${U.bgUnit() === "gL" ? "1.20" : U.bgUnit() === "mmol" ? "6.5" : "120"}"></label>
          <label class="f">${L("الوقت", "Moment")}<select id="bg-ctx" name="ctx">${CTX.map(c => `<option value="${c[0]}">${L(c[1], c[2])}</option>`).join("")}</select></label>
          <label class="f">${L("الساعة", "Heure")}<input id="bg-ts" name="ts" type="datetime-local" value="${nowLocalInput()}"></label>
          <label class="f full">${L("ملاحظة", "Note")}<input id="bg-note" name="note" type="text" maxlength="80"></label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
      </div>
      <div class="card"><h3>${I.syringe}${L("قبل ما تزرق", "Avant d'injecter")}</h3>
        <form data-form="doseCheck" class="form">
          <label class="f">${L("السكر توا", "Glycémie actuelle")} (${U.bgUnitLabel()})<input id="dc-bg" name="bg" type="number" step="any" min="0" inputmode="decimal" value="${last && Date.now() - last.ts < 40 * 60000 ? U.bgFromMg(last.bg) : ""}"></label>
          <label class="f">${L("النشويات (غرام)", "Glucides (g)")}<input id="dc-carbs" name="carbs" type="number" step="1" min="0" inputmode="numeric" value="${App.uiState.pendingCarbs ?? (App.F ? (App.F.recentCarbs() || "") : "")}"></label>
          <label class="f">${L("رياضة من بعد؟", "Effort prévu ?")}<select id="dc-eff" name="effort">${EFFORT.map(e => `<option value="${e[0]}">${L(e[1], e[2])}</option>`).join("")}</select></label>
          <button class="btn primary full" type="submit">${L("شوف", "Vérifier")}</button>
        </form>
        <div id="doseOut" style="margin-top:12px">${App.uiState.doseOut || ""}</div>
      </div>
      <div class="card"><h3>${I.syringe}${L("سجّل زرقة أنسولين", "Noter une injection")}</h3>
        <form data-form="insAdd" class="form">
          <label class="f">${L("الوحدات", "Unités")}<input id="in-units" name="units" type="number" step="0.5" min="0" required inputmode="decimal"></label>
          <label class="f">${L("النوع", "Type")}<select id="in-type" name="itype">${ITYPE.map(t => `<option value="${t[0]}">${L(t[1], t[2])}</option>`).join("")}</select></label>
          <label class="f">${L("نشويات الماكلة (غ)", "Glucides du repas (g)")}<input id="in-carbs" name="carbs" type="number" step="1" min="0" value="${App.uiState.pendingCarbs ?? (App.F ? (App.F.recentCarbs() || "") : "")}"></label>
          <label class="f">${L("رياضة", "Effort")}<select id="in-eff" name="effort">${EFFORT.map(e => `<option value="${e[0]}">${L(e[1], e[2])}</option>`).join("")}</select></label>
          <label class="f">${L("الساعة", "Heure")}<input id="in-ts" name="ts" type="datetime-local" value="${nowLocalInput()}"></label>
          <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <p class="tiny muted" style="margin-top:8px">${L("سجّل النشويات مع كل زرقة سريعة، وقيس ساعتين بعد الماكلة: هكا التطبيق يتعلم من تجاربك ويوريهملك المرة الجاية.", "Note les glucides à chaque injection rapide et mesure 2 h après le repas : l'app te montrera ces expériences la prochaine fois.")}</p>
      </div>
      <div class="card"><h3>${I.clock}${L("وقتاش تاكل", "Quand manger")}</h3>
        <div class="row between"><div><div class="mid">${U.esc(nm.n)}</div><div class="small muted">${U.hm(nm.at)} · ${L("بعد", "dans")} <span class="num" data-cd="${nm.at.getTime()}"></span></div></div><a class="btn sm" href="#food">${I.food}${L("الماكلة", "Repas")}</a></div>
        <p class="small muted" style="margin-top:8px">${L("خلّي الماكلة في نفس الأوقات كل نهار، وما تفوتش 5 سوايع بلا ماكلة ولا لمجة كي تكون تزرق. قيس قبل كل ماكلة.", "Garde des horaires réguliers et ne dépasse pas 5 h sans repas ni collation sous insuline. Mesure avant chaque repas.")}</p>
        <div class="tiny muted" style="margin-top:6px">${[["breakfast", L("فطور", "Petit-déj")], ["lunch", L("غداء", "Déj")], ["snack", L("لمجة", "Collation")], ["dinner", L("عشاء", "Dîner")]].map(([k, n]) => `${n} ${s.meals[k]}`).join(" · ")}</div>
      </div>
      <div class="card" style="grid-column:1/-1"><div class="row between"><h3>${L("السكر في 7 أيام", "Glycémie sur 7 jours")}</h3>${st ? `<div class="row"><span class="pill ${st.tir >= 70 ? "good" : st.tir >= 50 ? "warn" : "bad"}">${L("في المجال", "Dans la cible")} ${Math.round(st.tir)}%</span><span class="pill">${L("المعدل", "Moyenne")} ${U.esc(U.bgFmt(st.avg))}</span>${st.hypo ? `<span class="pill bad">${st.hypo} ${L("هبوط", "hypo")}</span>` : ""}${st.high ? `<span class="pill bad">${st.high} > 250</span>` : ""}</div>` : ""}</div>
        ${bgChart()}
        <p class="tiny muted">${L("الأخضر = المجال المستهدف. الهدف: أكثر من 70% من القياسات في المجال، وبلا هبوط.", "Vert = zone cible. Objectif : plus de 70 % des mesures dans la cible, sans hypo.")}</p>
      </div>
      <div class="card" style="grid-column:1/-1"><h3>${L("اليوم", "Aujourd'hui")}</h3>
        ${timeline.length ? `<div class="list">${timeline.map(t => {
          if (t.m) return `<div class="li"><span class="pill accent">${L("ماكلة", "Repas")}</span><span class="grow small">${U.esc(t.m.name)}<span class="tiny muted"> · ${Math.round(t.m.carbs)} ${L("غ نشويات", "g glucides")}</span></span><span class="tiny muted num">${U.hm(new Date(t.ts))}</span></div>`;
          const e = t.e;
          if (e.type === "bg") { const k = U.bgState(e.bg); return `<div class="li"><span class="pill ${k}">${U.esc(U.bgFmt(e.bg))}</span><span class="grow small">${U.esc(ctxName(e.ctx))}${e.note ? " · " + U.esc(e.note) : ""}</span><span class="tiny muted num">${U.hm(new Date(e.ts))}</span><button class="iconbtn" style="width:30px;height:30px" data-act="hDel" data-id="${e.id}" data-ts="${e.ts}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`; }
          return `<div class="li"><span class="pill saffron">${U.num(e.units, 1)} U</span><span class="grow small">${U.esc(itypeName(e.itype))}${e.carbs ? " · " + e.carbs + L(" غ نشويات", " g glucides") : ""}${e.effort && e.effort !== "none" ? " · " + U.esc(effName(e.effort)) : ""}</span><span class="tiny muted num">${U.hm(new Date(e.ts))}</span><button class="iconbtn" style="width:30px;height:30px" data-act="hDel" data-id="${e.id}" data-ts="${e.ts}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`;
        }).join("")}</div>` : `<div class="empty">${L("ما فما حتى شي اليوم.", "Rien aujourd'hui.")}</div>`}
      </div>
    </div>`;
  }

  function doseHtml(bgMg, carbs, effort) {
    const s = Store.doc("settings");
    const parts = [];
    const lastRapid = H.lastRapid();
    const iob = H.iob();
    if (!isNaN(bgMg) && bgMg > 0) {
      const gd = H.guidance(bgMg, effort !== "none" ? "presport" : "pre");
      if (gd.kind === "bad") parts.push(`<div class="alertbox bad"><b>${U.esc(gd.title)}</b>${U.esc(gd.body)}</div>`);
    }
    if (lastRapid && Date.now() - lastRapid.ts < 3 * 3600000) {
      const mins = Math.round((Date.now() - lastRapid.ts) / 60000);
      parts.push(`<div class="alertbox warn"><b>${L("عندك أنسولين مازال يخدم", "Insuline encore active")}</b>${L(`زرقت ${U.num(lastRapid.units, 1)} وحدة سريعة من ${mins} دقيقة. زرقة أخرى توا تنجم تعمل تراكم وتهبطلك السكر.`, `Tu as injecté ${U.num(lastRapid.units, 1)} U de rapide il y a ${mins} min. Réinjecter maintenant peut cumuler les doses et provoquer une hypo.`)}</div>`);
    }
    if (effort && effort !== "none") parts.push(`<div class="alertbox info"><b>${L("الرياضة تهبّط السكر", "Le sport fait baisser la glycémie")}</b>${L("الأنسولين مع الرياضة يهبّط أكثر. خلّي معاك سكر سريع، قيس قبل وبعد، وإسأل طبيبك قداش تنقص من الدوز كي تعمل رياضة.", "Insuline + effort = baisse plus forte. Garde du sucre sur toi, mesure avant/après, et demande à ton médecin de combien réduire la dose les jours de sport.")}</div>`);
    // doctor-parameter calculator
    const d = s.doctor;
    const icr = parseFloat(d.icr), isf = parseFloat(d.isf), target = parseFloat(d.target);
    if (d.enabled && d.confirmed && icr > 0 && isf > 0 && target > 0 && !(bgMg < 70)) {
      const carbPart = (carbs || 0) / icr;
      const corr = !isNaN(bgMg) && bgMg > 0 ? (bgMg - target) / isf : 0;
      const raw = carbPart + corr - iob;
      const dose = Math.max(0, Math.floor(raw * 2) / 2);
      parts.push(`<div class="alertbox good"><b>${L("حسب إعدادات طبيبك", "Selon les réglages de ton médecin")}: ${U.num(dose, 1)} ${L("وحدة", "U")}</b>
        <span class="small">${L("ماكلة", "Repas")} ${U.num(carbs || 0, 0)} ÷ ${icr} = ${U.num(carbPart, 1)} · ${L("تصحيح", "Correction")} ${U.num(corr, 1)} · ${L("أنسولين باقي يخدم", "Insuline active")} −${U.num(iob, 1)}</span>
        ${dose > 15 ? `<div class="small" style="margin-top:4px"><b>${L("رقم كبير — تثبّت في القيم وفي القياس قبل ما تزرق.", "Dose élevée — vérifie tes valeurs et ta mesure avant d'injecter.")}</b></div>` : ""}
        <div class="tiny" style="margin-top:4px">${L("هذا حساب بالقيم اللي حطيتهم من عند الطبيب، موش وصفة جديدة.", "Calcul fait avec les valeurs saisies depuis ton médecin, pas une nouvelle prescription.")}</div></div>`);
    }
    // personal history
    const hist = H.history(carbs);
    if (hist.length) {
      parts.push(`<div><b class="small">${L("تجاربك اللي فاتت مع ماكلة كيفها", "Tes expériences avec des repas similaires")}</b>
        <div class="tablewrap"><table class="table" style="margin-top:6px"><thead><tr><th>${L("النهار", "Date")}</th><th>${L("نشويات", "Gluc.")}</th><th>${L("زرقت", "Dose")}</th><th>${L("قبل", "Avant")}</th><th>${L("ساعتين بعد", "2 h après")}</th></tr></thead><tbody>
        ${hist.map(h => `<tr><td>${U.esc(U.dateShort(new Date(h.e.ts)))}</td><td>${h.e.carbs} g</td><td>${U.num(h.e.units, 1)} U${h.e.effort && h.e.effort !== "none" ? " · " + U.esc(effName(h.e.effort)) : ""}</td><td>${h.before ? `<span class="pill ${U.bgState(h.before.bg)}">${U.esc(U.bgFmt(h.before.bg))}</span>` : "–"}</td><td>${h.after ? `<span class="pill ${U.bgState(h.after.bg)}">${U.esc(U.bgFmt(h.after.bg))}</span>` : `<span class="tiny muted">${L("ما قستش", "non mesuré")}</span>`}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="tiny muted" style="margin-top:4px">${L("هذا سجلك انت باش تتذكر وتقارن — موش وصفة طبية. الأخضر بعد ساعتين معناها الدوز في ديك المرة كانت مناسبة.", "C'est ton propre historique, pour comparer — pas une prescription. Vert à 2 h = la dose de ce jour-là convenait.")}</p></div>`);
    } else {
      parts.push(`<p class="small muted">${L("ما فما حتى تجربة مسجّلة مع ماكلة كيفها. سجّل الزرقة مع النشويات، وقيس ساعتين بعد — المرة الجاية تلقى تجربتك هنا.", "Aucune expérience similaire enregistrée. Note l'injection avec les glucides et mesure 2 h après : tu la retrouveras ici.")}</p>`);
    }
    if (!(d.enabled && d.confirmed)) parts.push(`<p class="tiny muted">${L("حساب الدوز يتفتح كي تحط في الإعدادات القيم اللي يعطيهملك الطبيب.", "Le calcul de dose s'active quand tu saisis dans Réglages les valeurs données par ton médecin.")}</p>`);
    return `<div class="stack">${parts.join("")}</div>`;
  }

  App.forms.bgAdd = (fd) => {
    const mg = U.bgToMg(fd.bg);
    if (!(mg > 10 && mg < 700)) { App.toast(L("القيمة موش منطقية", "Valeur invalide"), L("تثبّت في الرقم والوحدة.", "Vérifie le chiffre et l'unité."), "warn"); return; }
    const ts = fd.ts ? U.fromInput(fd.ts).getTime() : Date.now();
    const mk = U.mkey(new Date(ts));
    const h = Store.month("health", mk);
    h.entries.push({ id: U.id(), ts, type: "bg", bg: Math.round(mg), ctx: fd.ctx, note: (fd.note || "").trim() });
    Store.save("health-" + mk);
    const g = H.guidance(mg, fd.ctx);
    App.toast(U.bgFmt(mg) + " — " + g.title, g.kind === "good" ? "" : g.body, g.kind);
    App.render();
  };
  App.forms.insAdd = (fd) => {
    const units = parseFloat(String(fd.units).replace(",", "."));
    if (!(units > 0 && units < 100)) return;
    const ts = fd.ts ? U.fromInput(fd.ts).getTime() : Date.now();
    const mk = U.mkey(new Date(ts));
    const h = Store.month("health", mk);
    h.entries.push({ id: U.id(), ts, type: "ins", units, itype: fd.itype, carbs: parseFloat(fd.carbs) || 0, effort: fd.effort, note: "" });
    Store.save("health-" + mk);
    App.uiState.pendingCarbs = undefined; App.uiState.doseOut = "";
    App.toast(L("تسجّلت الزرقة", "Injection enregistrée"), fd.itype === "rapid" ? L("ما تنساش تاكل، وقيس ساعتين بعد الماكلة.", "Pense à manger, et mesure 2 h après le repas.") : "", "good");
    App.render();
  };
  App.forms.doseCheck = (fd) => {
    const mg = fd.bg ? U.bgToMg(fd.bg) : NaN;
    App.uiState.doseOut = doseHtml(mg, parseFloat(fd.carbs) || 0, fd.effort);
    const o = document.getElementById("doseOut"); if (o) o.innerHTML = App.uiState.doseOut;
  };
  App.acts.hDel = (el) => {
    App.confirm(L("تمسح التسجيل هذا؟", "Supprimer cette entrée ?"), () => {
      const mk = U.mkey(new Date(+el.dataset.ts));
      const h = Store.month("health", mk);
      h.entries = h.entries.filter(e => e.id !== el.dataset.id);
      Store.save("health-" + mk); App.render();
    });
  };

  /* ---------- sport ---------- */
  const reduced = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
  function fig(key, dur = 1.8, opts = {}) {
    const G = window.NhariGym ? window.NhariGym.EX : {};
    const ex = G[key] || D.EX[key]; if (!ex) return "";
    const pick = (p) => { const o = { ...p }; o.m = p.m || [(p.n[0] + p.p[0]) / 2, (p.n[1] + p.p[1]) / 2]; return o; };
    let a = pick(ex.a), b = pick(ex.b);
    if (opts.pose === "b") a = b;
    const still = reduced || opts.pose;
    if (still) b = a;
    const r1 = (v) => Math.round(v * 10) / 10;
    const anim = (attr, va, vb) => (still || va === vb) ? "" : `<animate attributeName="${attr}" values="${r1(va)};${r1(vb)};${r1(va)}" keyTimes="0;0.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${dur}s" repeatCount="indefinite"/>`;
    const seg = (j1, j2, cls) => `<line class="bone ${cls || ""}" x1="${a[j1][0]}" y1="${a[j1][1]}" x2="${a[j2][0]}" y2="${a[j2][1]}">${anim("x1", a[j1][0], b[j1][0])}${anim("y1", a[j1][1], b[j1][1])}${anim("x2", a[j2][0], b[j2][0])}${anim("y2", a[j2][1], b[j2][1])}</line>`;
    const far = ex.front ? "" : "far";
    let back = "", cables = "", front = "";
    for (const pr of (ex.props || [])) {
      const dx = pr.dx || 0, dy = pr.dy || 0;
      const J = (k) => [a[pr[k]][0] + dx, a[pr[k]][1] + dy], JB = (k) => [b[pr[k]][0] + dx, b[pr[k]][1] + dy];
      if (pr.t === "rect") back += `<rect class="${pr.cls || "bench"}" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="2"/>`;
      else if (pr.t === "line") back += `<line class="${pr.cls || "frame"}" x1="${pr.x1}" y1="${pr.y1}" x2="${pr.x2}" y2="${pr.y2}"/>`;
      else if (pr.t === "cable") { const p1 = J("to"), p2 = JB("to"); cables += `<line class="cable ${pr.cls || ""}" x1="${pr.from[0]}" y1="${pr.from[1]}" x2="${p1[0]}" y2="${p1[1]}">${anim("x2", p1[0], p2[0])}${anim("y2", p1[1], p2[1])}</line>`; }
      else if (pr.t === "barj") { const p1 = J("a"), p2 = JB("a"), q1 = J("b"), q2 = JB("b"); front += `<line class="barj" x1="${p1[0]}" y1="${p1[1]}" x2="${q1[0]}" y2="${q1[1]}">${anim("x1", p1[0], p2[0])}${anim("y1", p1[1], p2[1])}${anim("x2", q1[0], q2[0])}${anim("y2", q1[1], q2[1])}</line>`; }
      else if (pr.t === "plate" || pr.t === "pad" || pr.t === "grip") {
        const p1 = J("at"), p2 = JB("at"), r = pr.r || (pr.t === "grip" ? 2.6 : 4);
        front += `<circle class="${pr.t}" cx="${p1[0]}" cy="${p1[1]}" r="${r}">${anim("cx", p1[0], p2[0])}${anim("cy", p1[1], p2[1])}</circle>`;
      } else if (pr.t === "db") {
        const p1 = J("at"), p2 = JB("at"), w = pr.vert ? 4 : 12, h = pr.vert ? 12 : 4;
        front += `<rect class="db" x="${p1[0] - w / 2}" y="${p1[1] - h / 2}" width="${w}" height="${h}" rx="1.5">${anim("x", p1[0] - w / 2, p2[0] - w / 2)}${anim("y", p1[1] - h / 2, p2[1] - h / 2)}</rect>`;
      }
    }
    return `<div class="fig"><svg viewBox="${ex.vb || "0 0 120 100"}" role="img" aria-label="${U.esc(L(ex.ar, ex.fr))}">
      <line class="ground" x1="2" y1="93" x2="118" y2="93"/>${back}
      ${seg("p", "k2", far)}${seg("k2", "f2", far)}${seg("n", "e2", far)}${seg("e2", "w2", far)}
      ${cables}${seg("n", "m")}${seg("m", "p")}
      ${seg("p", "k1")}${seg("k1", "f1")}${seg("n", "e1")}${seg("e1", "w1")}
      <circle class="head" cx="${a.h[0]}" cy="${a.h[1]}" r="7">${anim("cx", a.h[0], b.h[0])}${anim("cy", a.h[1], b.h[1])}</circle>${front}
    </svg></div>`;
  }
  App.fig = fig;
  const lvlMul = () => ({ easy: 0.7, normal: 1, hard: 1.3 }[Store.doc("settings").sport.level] || 1);
  const scaled = (it) => { const m = lvlMul(); return { key: it[0], sets: it[1], reps: it[2] ? Math.max(4, Math.round(it[2] * m)) : null, sec: it[3] ? Math.round(it[3] * (it[3] > 300 ? 1 : m) / 5) * 5 : null, rest: it[4] }; };
  const fmtSec = (s) => s >= 60 ? Math.round(s / 60) + " " + L("دقيقة", "min") : s + " " + L("ثانية", "s");
  const GYMP = () => Object.assign({}, window.NhariGym ? window.NhariGym.PROGRAM : {}, Store.doc("sport").prog || {});
  /* The week's sessions are done in programme order. A session missed on its day moves to the
     next training day (missed Monday → Wednesday does Monday's, and so on); rest days stay rest. */
  const WEEK = [1, 2, 3, 4, 5, 6, 0];
  const plans = {};
  function weekPlan(d) {
    const P = GYMP(), sp = Store.doc("sport"), dow = U.dow(d), monday = U.addDays(d, -((dow + 6) % 7));
    const days = WEEK.map((wd, i) => { const date = U.addDays(monday, i); return { wd, k: U.dkey(date), slot: !!(P[wd] && !P[wd].rest) }; });
    const today = U.dkey();
    const sig = days[0].k + "|" + today + "|" + JSON.stringify(days.map(x => sp.done[x.k] ? sp.done[x.k].w || 1 : 0)) + "|" + JSON.stringify(Object.keys(P).map(k => !!P[k].rest)) + "|" + (sp.noShift ? 1 : 0);
    if (plans[days[0].k] && plans[days[0].k].sig === sig) return plans[days[0].k].map;
    const queue = days.filter(x => x.slot).map(x => x.wd), map = {};
    const take = (wd) => { const i = queue.indexOf(wd); if (i >= 0) queue.splice(i, 1); };
    for (const x of days) {
      const done = sp.done[x.k];
      if (done) {
        const s = done.w && /^gym\d$/.test(done.w) ? +done.w.slice(3) : (x.slot ? (sp.noShift ? x.wd : queue[0]) : null);
        if (s != null) { take(s); map[x.k] = { s, done: true, moved: s !== x.wd }; }
        else map[x.k] = { s: null, done: true };
      } else if (x.k < today) {
        map[x.k] = x.slot ? { s: x.wd, missed: true } : { s: null };
      } else if (x.slot && queue.length) {
        const s = sp.noShift ? x.wd : queue[0]; take(s);
        map[x.k] = { s, moved: s !== x.wd };
      } else map[x.k] = { s: null };
    }
    map.left = queue.slice(); // sessions that no longer fit in this week
    plans[days[0].k] = { sig, map };
    return map;
  }
  App.S = {
    gym() { return Store.doc("settings").sport.mode === "gym" && !!window.NhariGym; },
    weekPlan,
    /** which programme day (0–6) is trained on date d, or null for rest */
    sessionDow(d = new Date()) { const p = weekPlan(d)[U.dkey(d)]; return p ? p.s : null; },
    dayKey(d = new Date()) {
      if (App.S.gym()) { const s = App.S.sessionDow(d); return s == null ? "rest" : "gym" + s; }
      return Store.doc("settings").sport.week[U.dow(d)] || "rest";
    },
    todayKey() { return App.S.dayKey(new Date()); },
    title(k) {
      if (k && k.startsWith("gym")) { const pd = GYMP()[+k.slice(3)]; return pd ? L(pd.ar, pd.fr) : ""; }
      const w = D.WORKOUTS[k] || D.WORKOUTS.rest; return L(w.ar, w.fr);
    },
    doneToday() { return !!Store.doc("sport").done[U.dkey()]; },
    creatineToday() { const sp = Store.doc("sport"); return !!(sp.creatine && sp.creatine[U.dkey()]); }
  };

  function viewSport() {
    const s = Store.doc("settings"), sp = Store.doc("sport");
    const order = [1, 2, 3, 4, 5, 6, 0];
    const now = new Date(), dow = U.dow(now);
    const monday = U.addDays(now, -((dow + 6) % 7));
    const wdn = [L("أحد", "Dim"), L("اثنين", "Lun"), L("ثلاثاء", "Mar"), L("أربعاء", "Mer"), L("خميس", "Jeu"), L("جمعة", "Ven"), L("سبت", "Sam")];
    const strip = order.map((d, i) => {
      const date = U.addDays(monday, i), k = U.dkey(date), w = D.WORKOUTS[s.sport.week[d]] || D.WORKOUTS.rest;
      return `<div class="d ${d === dow ? "today" : ""} ${sp.done[k] ? "done" : ""}"><b>${wdn[d]}</b>${U.esc(L(w.ar, w.fr).split(" — ")[0])}</div>`;
    }).join("");
    const wk = App.S.todayKey(), w = D.WORKOUTS[wk];
    const done = App.S.doneToday();
    const last = H.lastBg();
    const streak = (() => { let n = 0; for (let i = 0; i < 60; i++) { const d = U.addDays(now, -i); const k = U.dkey(d); const plan = s.sport.week[U.dow(d)]; if (sp.done[k]) n++; else if (plan === "rest") continue; else if (i === 0) continue; else break; } return n; })();
    return `<div class="card" style="margin-bottom:14px"><div class="row between" style="margin-bottom:10px"><h3 style="margin:0">${L("برنامج الجمعة", "Programme de la semaine")}</h3><span class="pill good">${streak} ${L("حصص متتالية", "séances d'affilée")}</span></div><div class="weekstrip">${strip}</div></div>
      <div class="grid g2">
        <div class="card stripe ${done ? "good" : "accent"}"><h3>${I.run}${L("حصة اليوم", "Séance du jour")}</h3>
          <div class="mid">${U.esc(L(w.ar, w.fr))}</div>
          ${wk === "rest" ? `<p class="small muted" style="margin-top:6px">${L("نهار راحة. مشي خفيف 15 دقيقة بعد الماكلة يعاون السكر.", "Jour de repos. 15 min de marche après un repas aide la glycémie.")}</p>` :
          `<p class="small muted">${w.items.length} ${L("تمارين", "exercices")} · ~${w.min} ${L("دقيقة", "min")} · ${L("الوقت", "heure")} ${U.esc(s.sport.time)}</p>
          <div class="alertbox ${last && Date.now() - last.ts < 3600000 ? (last.bg < 100 || last.bg > 250 ? "warn" : "good") : "info"}" style="margin-top:10px"><b>${L("قبل ما تبدا: قيس السكر", "Avant de commencer : mesure ta glycémie")}</b>${L("تحت 100: كول 15–30 غ نشويات. فوق 250: ما تعملش رياضة قوية. خلّي معاك سكر سريع وماء.", "Sous 100 : 15–30 g de glucides. Au-dessus de 250 : pas d'effort intense. Garde du sucre rapide et de l'eau.")}${last && Date.now() - last.ts < 3600000 ? `<div class="small" style="margin-top:4px">${L("آخر قياس", "Dernière mesure")}: <b>${U.esc(U.bgFmt(last.bg))}</b></div>` : ""}</div>
          <div class="row" style="margin-top:12px">${done ? `<span class="pill good">${I.check}${L("كمّلت حصة اليوم", "Séance faite")}</span><button class="btn sm ghost" data-act="sportUndo">${L("رجّع", "Annuler")}</button>` : `<button class="btn primary" data-act="coach">${I.play}${L("ابدا الحصة", "Démarrer la séance")}</button><button class="btn" data-act="sportDone">${I.check}${L("كمّلتها", "Faite")}</button>`}</div>`}
        </div>
        <div class="card"><h3>${L("نظّم البرنامج", "Organiser le programme")}</h3>
          <form data-form="sportCfg" class="form">
            ${order.map(d => `<label class="f">${wdn[d]}<select name="d${d}" id="sp-d${d}">${Object.entries(D.WORKOUTS).map(([k, v]) => `<option value="${k}" ${s.sport.week[d] === k ? "selected" : ""}>${U.esc(L(v.ar, v.fr))}</option>`).join("")}</select></label>`).join("")}
            <label class="f">${L("المستوى", "Niveau")}<select name="level" id="sp-level"><option value="easy" ${s.sport.level === "easy" ? "selected" : ""}>${L("مبتدئ", "Débutant")}</option><option value="normal" ${s.sport.level === "normal" ? "selected" : ""}>${L("متوسط", "Intermédiaire")}</option><option value="hard" ${s.sport.level === "hard" ? "selected" : ""}>${L("متقدم", "Avancé")}</option></select></label>
            <label class="f">${L("ساعة الرياضة", "Heure du sport")}<input type="time" name="time" id="sp-time" value="${U.esc(s.sport.time)}"></label>
            <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
          </form>
        </div>
      </div>
      ${wk !== "rest" ? `<h3 style="margin:18px 0 10px">${L("تمارين اليوم", "Exercices du jour")}</h3><div class="exgrid">${w.items.map(it => exCard(scaled(it))).join("")}</div>` : ""}`;
  }
  function exCard(x) {
    const ex = D.EX[x.key];
    return `<div class="card ex">${fig(x.key)}<b>${U.esc(L(ex.ar, ex.fr))}</b><div class="meta"><span class="pill accent">${x.sets} × ${x.reps ? x.reps + " " + L("مرة", "rép.") : fmtSec(x.sec)}</span>${x.rest ? `<span class="pill">${L("راحة", "repos")} ${x.rest}${L("ث", "s")}</span>` : ""}</div><p class="small muted">${U.esc(L(ex.tip.ar, ex.tip.fr))}</p></div>`;
  }
  function viewLibrary() {
    const G = window.NhariGym;
    const gymPart = G ? `<h3 style="margin:4px 0 10px">${L("تمارين الجيم متاعك", "Tes exercices en salle")}</h3><div class="exgrid" style="margin-bottom:22px">${Object.keys(G.EX).map(k => { const ex = G.EX[k]; return `<div class="card ex">${fig(k)}<b>${U.esc(L(ex.ar, ex.fr))}</b><span class="pill accent" style="align-self:flex-start">${U.esc(L(ex.mus.ar, ex.mus.fr))}</span><p class="small muted">${U.esc(L(ex.tip.ar, ex.tip.fr))}</p></div>`; }).join("")}</div><h3 style="margin:4px 0 10px">${L("تمارين في الدار (بلا آلات)", "À la maison (sans matériel)")}</h3>` : "";
    return gymPart + `<p class="small muted" style="margin-bottom:12px">${L("كل التمارين اللي في البرنامج، بالحركة متاعها. ما تحتاج حتى آلة.", "Tous les exercices du programme, avec leur mouvement. Aucun matériel nécessaire.")}</p>
      <div class="exgrid">${Object.keys(D.EX).map(k => { const ex = D.EX[k]; return `<div class="card ex">${fig(k)}<b>${U.esc(L(ex.ar, ex.fr))}</b><p class="small muted">${U.esc(L(ex.tip.ar, ex.tip.fr))}</p></div>`; }).join("")}</div>`;
  }

  /* ---------- gym programme (mode "gym") ---------- */
  const topReps = (label) => { if (/\//.test(label) || /\+/.test(label)) return null; const n = String(label).match(/\d+/g); return n ? Math.max(...n.map(Number)) : null; };
  function lastLog(ex, beforeKey) {
    const log = Store.doc("sport").log || {};
    const keys = Object.keys(log).filter(k => k < beforeKey && log[k][ex] && log[k][ex].some(x => x && x.ok)).sort().reverse();
    return keys.length ? { date: keys[0], sets: log[keys[0]][ex] } : null;
  }
  function hint(item, last) {
    if (!last) return "";
    const top = topReps(item.reps);
    const ok = last.sets.filter(x => x && x.ok);
    const all = ok.length >= item.sets;
    const w = Math.max(...ok.map(x => parseFloat(x.w) || 0));
    if (top && all && ok.every(x => (+x.r || 0) >= top)) {
      const step = /lat_raise|incline_db|hammer_db|incline_curl|bulgarian|rdl/.test(item.ex) ? 1 : 2.5;
      return `<span class="pill good">${L("زيد الوزن", "Augmente")}: ${U.num(w + step, 1)} kg</span>`;
    }
    return `<span class="pill">${L("نفس الوزن، حاول تزيد مرة", "Même charge, vise +1 rep")}</span>`;
  }
  const weekProg = (sp, d) => (sp.prog && sp.prog[d]) || window.NhariGym.PROGRAM[d];
  App.gymProgFor = (d, key) => { const sp = Store.doc("sport"); return (key && sp.custom && sp.custom[key]) || weekProg(sp, d); };
  function viewGym() {
    const G = window.NhariGym, sp = Store.doc("sport"), now = new Date(), dow = U.dow(now), tk = U.dkey(now);
    const order = [1, 2, 3, 4, 5, 6, 0];
    const monday = U.addDays(now, -((dow + 6) % 7));
    const wdn = [L("أحد", "Dim"), L("اثنين", "Lun"), L("ثلاثاء", "Mar"), L("أربعاء", "Mer"), L("خميس", "Jeu"), L("جمعة", "Ven"), L("سبت", "Sam")];
    const wp = App.S.weekPlan(now), sd = App.S.sessionDow(now);
    const strip = order.map((d, i) => {
      const k = U.dkey(U.addDays(monday, i)), p = wp[k] || {};
      const pd = k === tk && sp.custom && sp.custom[k] ? sp.custom[k] : p.s != null ? weekProg(sp, p.s) : weekProg(sp, d);
      const label = p.s == null && !pd.rest && !p.done ? L("راحة", "Repos") : L(pd.ar, pd.fr);
      return `<div class="d ${d === dow ? "today" : ""} ${sp.done[k] ? "done" : ""} ${p.missed ? "missed" : ""}"><b>${wdn[d]}</b>${p.missed ? "✗ " : p.moved ? "↪ " : ""}${U.esc(label)}</div>`;
    }).join("");
    const pick = App.uiState.gymDay != null ? +App.uiState.gymDay : (sd != null ? sd : dow);
    const pd = App.uiState.gymDay == null ? App.gymProgFor(sd != null ? sd : dow, tk) : weekProg(sp, pick);
    const moved = App.uiState.gymDay == null && sd != null && sd !== dow && !(sp.custom && sp.custom[tk]);
    const custom = pick === dow && !!(sp.custom && sp.custom[tk]);
    const done = App.S.doneToday();
    const last = H.lastBg();
    const todayLog = (sp.log || {})[tk] || {};
    const crea = sp.creatine || {};
    const creaWeek = order.map((d, i) => !!crea[U.dkey(U.addDays(monday, i))]);
    const estMin = Math.round(U.sum(pd.items, it => it.sets * (45 + it.rest)) / 60) + 8;
    const swap = `<label class="f" style="flex-direction:row;align-items:center;gap:8px">${L("حصة", "Séance")}<select data-change="gymDay" style="width:auto">${order.map(d => `<option value="${d}" ${d === pick ? "selected" : ""}>${wdn[d]} — ${U.esc(L(weekProg(sp, d).ar, weekProg(sp, d).fr))}</option>`).join("")}</select></label>`;
    let html = `<div class="card" style="margin-bottom:14px"><div class="row between" style="margin-bottom:10px"><h3 style="margin:0">${L("برنامج الجيم — New Life Fitness", "Programme salle — New Life Fitness")}</h3>${swap}</div><div class="weekstrip">${strip}</div></div>
      <div class="grid g2">
        <div class="card stripe ${done ? "good" : "accent"}"><h3>${I.run}${L("حصة اليوم", "Séance du jour")}</h3>
          <div class="mid">${U.esc(L(pd.ar, pd.fr))}</div>
          ${moved ? `<p class="small" style="margin-top:4px">↪ ${L(`حصة ${wdn[sd]} اللي ما عملتهاش — تعدّت لليوم وحدها.`, `Séance du ${wdn[sd]} manquée — reportée à aujourd'hui.`)}</p>` : ""}
          ${(wp.left || []).length && !App.uiState.gymDay ? `<p class="tiny muted" style="margin-top:4px">${L("ما عادش فما بلاصة هالأسبوع لـ", "Plus de place cette semaine pour")}: ${wp.left.map(x => U.esc(L(weekProg(sp, x).ar, weekProg(sp, x).fr))).join("، ")}</p>` : ""}
          ${custom ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><span class="pill saffron">${L("حصة اليوم مبدّلة", "Séance du jour modifiée")}</span><button class="btn sm" data-act="gymKeep">${L(`خلّيها حصة كل ${wdn[dow]}`, `La garder chaque ${wdn[dow]}`)}</button><button class="btn sm ghost" data-act="gymReset">${L("رجّع البرنامج العادي", "Revenir au programme")}</button></div>` : ""}
          ${pd.rest ? `<p class="small muted" style="margin-top:6px">${L("نهار راحة للعضلات. مشي خفيف 15–20 دقيقة بعد الماكلة يعاون السكر.", "Repos musculaire. 15–20 min de marche après un repas aide la glycémie.")}</p>` : `
          <p class="small muted">${pd.items.length} ${L("تمارين", "exercices")} · ~${estMin} ${L("دقيقة", "min")}</p>
          <div class="alertbox ${last && Date.now() - last.ts < 3600000 ? (last.bg < 100 || last.bg > 250 ? "warn" : "good") : "info"}" style="margin-top:10px"><b>${L("قبل الجيم: قيس السكر", "Avant la salle : mesure ta glycémie")}</b>${L("تحت 100: كول 15–30 غ (3 تمرات). فوق 250: ما تعملش حصة قوية. خلّي سكر سريع وماء في الساك.", "Sous 100 : 15–30 g de glucides (3 dattes). Au-dessus de 250 : pas de séance intense. Sucre rapide et eau dans le sac.")}${last && Date.now() - last.ts < 3600000 ? `<div class="small" style="margin-top:4px">${L("آخر قياس", "Dernière mesure")}: <b>${U.esc(U.bgFmt(last.bg))}</b></div>` : ""}</div>
          <div class="row" style="margin-top:12px">${done ? `<span class="pill good">${I.check}${L("كمّلت حصة اليوم", "Séance faite")}</span><button class="btn sm ghost" data-act="sportUndo">${L("رجّع", "Annuler")}</button>` : `<button class="btn primary" data-act="sportDone">${I.check}${L("كمّلت الحصة", "Séance terminée")}</button>`}</div>`}
        </div>
        <div class="card"><h3>${I.drop}${L("كرياتين 5 غ", "Créatine 5 g")}</h3>
          <div class="row between"><button class="btn ${App.S.creatineToday() ? "" : "primary"}" data-act="creatine">${App.S.creatineToday() ? I.check + L("شربتها اليوم", "Prise aujourd'hui") : L("شربت الكرياتين", "J'ai pris ma créatine")}</button>
          <div class="row" style="gap:4px">${creaWeek.map((v, i) => `<span class="pill ${v ? "good" : ""}" title="${wdn[order[i]]}">${wdn[order[i]].slice(0, 2)}</span>`).join("")}</div></div>
          <p class="tiny muted" style="margin-top:8px">${L("كل نهار، حتى نهارات الراحة، مع كاس ماء. اشرب 2,5–3 لتر في النهار.", "Chaque jour, même au repos, avec un verre d'eau. Bois 2,5–3 L par jour.")}</p>
        </div>
      </div>`;
    if (!pd.rest) {
      html += `<h3 style="margin:18px 0 10px">${L("التمارين — سجّل الوزن والمرات", "Exercices — note charges et reps")}</h3><div class="exgrid">`;
      pd.items.forEach((it) => {
        const ex = G.EX[it.ex]; const lg = todayLog[it.ex] || []; const lst = lastLog(it.ex, tk);
        const repT = String(it.reps).includes("/") ? String(it.reps).split("/").map(x => x.trim()) : null;
        const loadN = (String(it.load).match(/\d+(?:[.,]\d+)?/g) || []).map(x => x.replace(",", "."));
        const rows = Array.from({ length: it.sets }, (_, i) => { const v = lg[i] || {}; const pv0 = lst && lst.sets[i] ? lst.sets[i] : null;
          const pv = { w: (pv0 && pv0.w) || (loadN.length ? (loadN.length > 1 ? (i === 0 ? loadN[0] : i === it.sets - 1 ? loadN[loadN.length - 1] : "") : loadN[0]) : ""), r: (pv0 && pv0.r) || (repT ? (repT[i] || "") : (String(it.reps).match(/\d+/) || [""])[0]) }; return `<div class="setrow ${v.ok ? "ok" : ""}"><span class="tiny muted">${i + 1}</span><input type="number" step="0.5" min="0" inputmode="decimal" placeholder="${pv.w ? U.esc(pv.w) : "kg"}" value="${U.esc(v.w ?? "")}" data-change="setVal" data-ex="${it.ex}" data-i="${i}" data-f="w" aria-label="kg"><span class="tiny muted">kg ×</span><input type="number" min="0" inputmode="numeric" placeholder="${U.esc(pv.r || "")}" value="${U.esc(v.r ?? "")}" data-change="setVal" data-ex="${it.ex}" data-i="${i}" data-f="r" aria-label="reps"><button class="iconbtn sm ${v.ok ? "on" : ""}" data-act="setOk" data-ex="${it.ex}" data-i="${i}" data-rest="${it.rest}" aria-label="${L("كمّلت السيرية", "Série faite")}">${I.check}</button></div>`; }).join("");
        html += `<div class="card ex">${fig(it.ex)}<div class="row between"><b>${U.esc(L(ex.ar, ex.fr))}</b>${it.added ? `<span class="pill saffron">${L("مقترح", "proposé")}</span>` : ""}</div>
          <span class="tiny muted">${U.esc(L(ex.mus.ar, ex.mus.fr))}</span>
          <div class="meta"><span class="pill accent">${it.sets} × ${U.esc(it.reps)}</span><span class="pill">${U.esc(it.load)}</span><span class="pill">${L("راحة", "repos")} ${it.rest}${L("ث", "s")}</span></div>
          ${it.note ? `<p class="tiny" style="color:var(--warn)">${U.esc(L(it.note.ar, it.note.fr))}</p>` : ""}
          ${lst ? `<div class="tiny muted">${L("آخر مرة", "Dernière fois")} (${U.esc(lst.date.slice(5))}): ${lst.sets.filter(x => x && x.ok).map(x => U.esc((x.w || "?") + "×" + (x.r || "?"))).join(" · ")} ${hint(it, lst)}</div>` : ""}
          <div class="sets">${rows}</div>
          <details><summary class="tiny" style="cursor:pointer">${L("كيفاش", "Technique")}</summary><p class="small muted" style="margin-top:4px">${U.esc(L(ex.tip.ar, ex.tip.fr))}</p></details></div>`;
      });
      html += `</div>`;
    }
    html += `<div class="card" style="margin-top:14px"><h3>${I.spark}${L("نصايح باش تحسّن البرنامج", "Conseils pour améliorer le programme")}</h3><div class="list">${G.TIPS.map(t => `<div class="li"><span class="grow small">${U.esc(L(t.ar, t.fr))}</span></div>`).join("")}</div></div>`;
    return html;
  }
  App.changes.gymDay = (el) => { const sd = App.S.sessionDow(new Date()); App.uiState.gymDay = +el.value === (sd != null ? sd : U.dow()) ? null : +el.value; App.render(); };
  App.acts.gymKeep = () => {
    const sp = Store.doc("sport"), tk = U.dkey(), d = U.dow(), cu = sp.custom && sp.custom[tk]; if (!cu) return;
    sp.prog = sp.prog || {}; sp.prog[d] = { ar: cu.ar, fr: cu.fr, items: cu.items.map(it => Object.assign({}, it)) };
    Store.save("sport"); App.toast(L("تبدّل البرنامج", "Programme mis à jour"), L("الحصة هذي ولات حصة النهار هذا كل جمعة.", "Cette séance devient celle de ce jour chaque semaine."), "good"); App.render();
  };
  App.acts.gymReset = () => App.confirm(L("ترجع لحصة البرنامج العادي اليوم؟ السيريات اللي سجّلتهم يبقاو.", "Revenir à la séance du programme aujourd'hui ? Les séries notées restent."), () => {
    const sp = Store.doc("sport"); if (sp.custom) delete sp.custom[U.dkey()]; Store.save("sport"); App.render();
  });
  function setEntry(ex, i) {
    const sp = Store.doc("sport"), tk = U.dkey();
    sp.log = sp.log || {}; sp.log[tk] = sp.log[tk] || {}; sp.log[tk][ex] = sp.log[tk][ex] || [];
    const arr = sp.log[tk][ex]; while (arr.length <= i) arr.push({});
    return arr[i] || (arr[i] = {});
  }
  function pruneLog(sp) { const lim = U.dkey(U.addDays(new Date(), -120)); for (const k of Object.keys(sp.log || {})) if (k < lim) delete sp.log[k]; }
  App.changes.setVal = (el) => { const e = setEntry(el.dataset.ex, +el.dataset.i); e[el.dataset.f] = el.value; Store.save("sport"); };
  App.acts.setOk = (el) => {
    const row = el.closest(".setrow"); const e = setEntry(el.dataset.ex, +el.dataset.i);
    const inputs = row ? row.querySelectorAll("input") : [];
    if (inputs[0] && inputs[0].value === "" && inputs[0].placeholder !== "kg") e.w = inputs[0].placeholder;
    if (inputs[1] && inputs[1].value === "") e.r = inputs[1].placeholder;
    e.ok = !e.ok; pruneLog(Store.doc("sport")); Store.save("sport");
    if (e.ok) App.rest.start(+el.dataset.rest || 60);
    App.render();
  };
  App.acts.creatine = () => { const sp = Store.doc("sport"); sp.creatine = sp.creatine || {}; const k = U.dkey(); if (sp.creatine[k]) delete sp.creatine[k]; else sp.creatine[k] = true; const lim = U.dkey(U.addDays(new Date(), -60)); for (const x of Object.keys(sp.creatine)) if (x < lim) delete sp.creatine[x]; Store.save("sport"); App.render(); };

  /* floating rest timer (survives re-renders) */
  App.rest = {
    t: null,
    start(sec) {
      clearInterval(this.t);
      let el = document.getElementById("restTimer");
      if (!el) { el = document.createElement("button"); el.id = "restTimer"; el.className = "resttimer"; el.onclick = () => App.rest.stop(); document.body.appendChild(el); }
      const end = Date.now() + sec * 1000;
      const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1000)); el.textContent = L("راحة ", "Repos ") + U.dur(left * 1000) + " ✕"; if (left <= 0) { App.Notifier.beep(); App.rest.stop(); App.toast(L("السيرية الجاية!", "Série suivante !"), "", "good"); } };
      tick(); this.t = setInterval(tick, 500);
    },
    stop() { clearInterval(this.t); const el = document.getElementById("restTimer"); if (el) el.remove(); }
  };

  App.forms.sportCfg = (fd) => {
    const s = Store.doc("settings");
    for (let d = 0; d < 7; d++) if (fd["d" + d]) s.sport.week[d] = fd["d" + d];
    s.sport.level = fd.level || "normal"; s.sport.time = fd.time || "18:30";
    Store.save("settings"); App.toast(L("تسجّل البرنامج", "Programme enregistré"), "", "good"); App.render();
  };
  function markDone() {
    const sp = Store.doc("sport"); sp.done[U.dkey()] = { w: App.S.todayKey(), ts: Date.now() };
    const lim = U.dkey(U.addDays(new Date(), -120)); for (const k of Object.keys(sp.done)) if (k < lim) delete sp.done[k];
    Store.save("sport");
  }
  App.acts.sportDone = () => { markDone(); App.toast(L("يعطيك الصحة!", "Bravo !"), L("قيس السكر بعد الرياضة — ينجم يهبط حتى بعد سوايع.", "Mesure ta glycémie après le sport : elle peut baisser plusieurs heures après."), "good"); App.render(); };
  App.acts.sportUndo = () => { const sp = Store.doc("sport"); delete sp.done[U.dkey()]; Store.save("sport"); App.render(); };

  /* coach: guided session in a modal */
  App.acts.coach = () => {
    const w = D.WORKOUTS[App.S.todayKey()]; if (!w || !w.items.length) return;
    const steps = [];
    w.items.map(scaled).forEach((x, i, arr) => {
      for (let s = 1; s <= x.sets; s++) {
        steps.push({ t: "work", x, s });
        if (x.rest && !(i === arr.length - 1 && s === x.sets)) steps.push({ t: "rest", x, s, sec: x.rest });
      }
    });
    let i = 0, remain = 0, timer = null, running = false;
    const draw = (mb) => {
      const st = steps[i]; const ex = D.EX[st.x.key];
      clearInterval(timer); running = false;
      if (st.t === "rest") remain = st.sec; else remain = st.x.sec || 0;
      const nextWork = steps.slice(i + 1).find(z => z.t === "work");
      mb.innerHTML = `<div class="coach stack">
        <div class="tiny muted">${L("خطوة", "Étape")} ${i + 1} / ${steps.length}</div>
        <div class="bar"><i style="width:${(i / steps.length) * 100}%"></i></div>
        ${st.t === "rest" ? `<h3 style="justify-content:center">${L("راحة", "Repos")}</h3><div class="timer" id="cTimer">${remain}</div><p class="small muted">${nextWork ? L("الجاي: ", "Ensuite : ") + U.esc(L(D.EX[nextWork.x.key].ar, D.EX[nextWork.x.key].fr)) : ""}</p>`
        : `${fig(st.x.key, 1.4)}<h3 style="justify-content:center">${U.esc(L(ex.ar, ex.fr))}</h3><div class="small muted">${L("الجولة", "Série")} ${st.s} / ${st.x.sets}</div>
           ${st.x.reps ? `<div class="timer">${st.x.reps}</div><div class="small">${L("مرة", "répétitions")}</div>` : `<div class="timer" id="cTimer">${remain}</div><div class="small">${L("ثانية", "secondes")}</div>`}
           <p class="small muted">${U.esc(L(ex.tip.ar, ex.tip.fr))}</p>`}
        <div class="row" style="justify-content:center">
          ${st.t === "work" && st.x.sec ? `<button class="btn" id="cStart">${I.play}${L("ابدا العداد", "Lancer le chrono")}</button>` : ""}
          <button class="btn primary" id="cNext">${i === steps.length - 1 ? L("كمّلت الحصة", "Terminer") : st.t === "rest" ? L("فوت الراحة", "Passer") : L("كمّلت", "Fait")}</button>
        </div>
        <p class="tiny muted">${L("إذا حسيت بدوخة، رعشة ولا عرق بارد: وقّف وقيس السكر.", "Vertiges, tremblements ou sueurs froides : arrête-toi et mesure ta glycémie.")}</p>
      </div>`;
      const tEl = mb.querySelector("#cTimer");
      const startT = () => {
        if (running) return; running = true;
        timer = setInterval(() => {
          if (!document.getElementById("modal")) { clearInterval(timer); return; }
          remain--; if (tEl) tEl.textContent = Math.max(0, remain);
          if (remain <= 0) { clearInterval(timer); App.Notifier.beep(); next(mb); }
        }, 1000);
      };
      if (st.t === "rest") startT();
      const sb = mb.querySelector("#cStart"); if (sb) sb.onclick = () => { sb.disabled = true; startT(); };
      mb.querySelector("#cNext").onclick = () => next(mb);
    };
    const next = (mb) => {
      clearInterval(timer);
      if (i >= steps.length - 1) { markDone(); App.closeModal(); App.toast(L("يعطيك الصحة!", "Bravo !"), L("قيس السكر بعد الرياضة واشرب الماء.", "Mesure ta glycémie et bois de l'eau."), "good"); App.render(); return; }
      i++; draw(mb);
    };
    App.modal(L(w.ar, w.fr), "", (mb) => draw(mb));
  };

  // reminders for notifications
  App.eventSources.push(() => {
    if (App.R && App.R.on()) return [];
    const s = Store.doc("settings"), out = [], now = new Date();
    for (const [k, n] of [["breakfast", L("الفطور", "Petit-déj")], ["lunch", L("الغداء", "Déjeuner")], ["snack", L("اللمجة", "Collation")], ["dinner", L("العشاء", "Dîner")]]) {
      const at = U.atTime(s.meals[k], now);
      out.push({ key: "meal-" + k, at: new Date(at - 15 * 60000), title: L("قيس السكر قبل ", "Mesure ta glycémie avant le ") + n, body: L("الماكلة بعد ربع ساعة.", "Repas dans 15 min."), kind: "info" });
    }
    return out;
  });

  App.views.health = { render };
})();
