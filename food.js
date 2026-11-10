/* Nhari — Nutrition: plate photo analysis, daily totals, meal suggestions */
(function () {
  "use strict";
  const D = window.NhariData;
  const MTYPES = [["breakfast", "فطور", "Petit-déj"], ["lunch", "غداء", "Déjeuner"], ["snack", "لمجة", "Collation"], ["dinner", "عشاء", "Dîner"]];
  const mtName = (k) => { const m = MTYPES.find(x => x[0] === k) || MTYPES[1]; return L(m[1], m[2]); };
  const guessType = () => { const h = U.hour(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snack" : "dinner"; };

  const F = App.F = {
    meals(days = 1) {
      const from = U.parseD(U.dkey(U.addDays(new Date(), -(days - 1))));
      const cur = Store.month("food").meals, prev = U.mkey(from) !== U.mkey() ? Store.month("food", U.mkey(from)).meals : [];
      return [...prev, ...cur].filter(m => m.ts >= from.getTime()).sort((a, b) => a.ts - b.ts);
    },
    todayMeals() { return F.meals(1); },
    recentCarbs() { const m = F.todayMeals().filter(x => Date.now() - x.ts < 60 * 60000); return m.length ? Math.round(U.sum(m, x => x.carbs)) : null; },
    totals(list) { return { kcal: U.sum(list, m => m.kcal), carbs: U.sum(list, m => m.carbs), prot: U.sum(list, m => m.prot), fat: U.sum(list, m => m.fat) }; },
    targets() {
      const p = Store.doc("settings").profile;
      const w = +p.weight || 70, h = +p.height || 175, a = App.age ? App.age() : (+p.age || 25);
      const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === "f" ? -161 : 5);
      const mul = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity] || 1.55;
      const kcal = Math.round((bmr * mul + ({ lose: -400, keep: 0, gain: 300 }[p.goal] || 0)) / 10) * 10;
      return { kcal, carbs: Math.round(kcal * 0.45 / 4), prot: Math.round(w * 1.2), fat: Math.round(kcal * 0.3 / 9) };
    }
  };

  function langName() { return App.lang === "fr" ? "French" : "Arabic (simple Modern Standard Arabic that a Tunisian understands)"; }

  function render() {
    const meals = F.todayMeals(), tot = F.totals(meals), tg = F.targets();
    const pct = U.clamp(tot.kcal / tg.kcal * 100, 0, 100);
    const over = tot.kcal > tg.kcal;
    const r = App.uiState.foodResult;
    const sugg = App.uiState.foodSugg;
    const img = App.uiState.foodImgUrl;
    const aiOk = !!App.ai;
    return `<div class="sectionhead"><h2>${L("الماكلة", "Nutrition")}</h2><span class="muted small">${L("الهدف اليومي", "Objectif du jour")} ≈ ${tg.kcal} kcal</span></div>
    <div class="grid g2">
      <div class="card"><h3>${I.food}${L("اليوم", "Aujourd'hui")}</h3>
        <div class="row" style="gap:16px;align-items:center">
          <div class="ring ${over ? "over" : ""}" style="--p:${pct}"><div><div><b>${Math.round(tot.kcal)}</b><div class="tiny muted">/ ${tg.kcal} kcal</div></div></div></div>
          <div class="stack" style="flex:1;min-width:150px;gap:8px">
            ${macro(L("نشويات", "Glucides"), tot.carbs, tg.carbs, "saffron")}
            ${macro(L("بروتين", "Protéines"), tot.prot, tg.prot, "good")}
            ${macro(L("دهون", "Lipides"), tot.fat, tg.fat, "")}
          </div>
        </div>
        <p class="tiny muted" style="margin-top:8px">${L("الأرقام تقديرية. للسكري: وزّع النشويات على الماكلات، وزيد الخضرة والبروتين.", "Valeurs estimées. Diabète : répartis les glucides sur les repas, ajoute légumes et protéines.")}</p>
        <div class="list" style="margin-top:8px">${meals.length ? meals.slice().reverse().map(m => `<div class="li"><span class="pill ${m.gi === "high" ? "bad" : m.gi === "medium" ? "warn" : m.gi === "low" ? "good" : ""}">${U.esc(mtName(m.mtype))}</span><span class="grow small">${U.esc(m.name)}<span class="tiny muted"> · ${Math.round(m.kcal)} kcal · ${Math.round(m.carbs)} ${L("غ نشويات", "g gluc.")}</span></span><span class="tiny muted num">${U.hm(new Date(m.ts))}</span><button class="iconbtn" style="width:30px;height:30px" data-act="mealDel" data-id="${m.id}" data-ts="${m.ts}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("") : `<div class="empty">${L("ما سجلت حتى ماكلة اليوم.", "Aucun repas aujourd'hui.")}</div>`}</div>
      </div>

      <div class="card"><h3>${I.camera}${L("صوّر الصحن", "Photo de l'assiette")}</h3>
        ${aiOk && App.aiImages ? `
          <div class="drop">
            ${img ? `<img src="${img}" alt="${L("صورة الصحن", "Photo de l'assiette")}">` : `<p class="small muted">${L("صوّر الصحن من فوق، والتطبيق يحسبلك الكالوري والنشويات.", "Prends l'assiette en photo d'en haut : l'app estime calories et glucides.")}</p>`}
            <div class="row" style="justify-content:center">
              <label class="btn primary" for="food-cam">${I.camera}${L("صوّر", "Photo")}</label>
              <input id="food-cam" class="hide" type="file" accept="image/*" capture="environment" data-change="foodImg">
              <label class="btn" for="food-pick">${L("اختار تصويرة", "Choisir une image")}</label>
              <input id="food-pick" class="hide" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-change="foodImg">
            </div>
          </div>` : ""}
        <form data-form="foodAnalyze" class="form" style="margin-top:10px">
          <label class="f">${L("الماكلة", "Repas")}<select name="mtype" id="fa-type">${MTYPES.map(m => `<option value="${m[0]}" ${guessType() === m[0] ? "selected" : ""}>${L(m[1], m[2])}</option>`).join("")}</select></label>
          <label class="f full">${img ? L("زيد تفاصيل (اختياري)", "Précisions (optionnel)") : L("ولا اكتب شنوة كليت", "Ou décris ce que tu as mangé")}<input id="fa-desc" name="desc" type="text" maxlength="200" placeholder="${L("مثلا: صحن كسكسي بالعلوش، طرف خبز، برتقالة", "ex : assiette de couscous agneau, un morceau de pain, une orange")}"></label>
          <button class="btn primary full" type="submit" ${aiOk ? "" : "disabled"} id="fa-go">${I.spark}${L("احسب", "Analyser")}</button>
        </form>
        ${aiOk ? "" : App.aiNote()}
        <div id="foodOut" style="margin-top:12px">${r ? resultHtml(r) : ""}</div>
      </div>

      <div class="card"><h3>${I.spark}${L("شنوة ناكل؟", "Que manger ?")}</h3>
        <p class="small muted">${L("اقتراحات للماكلة الجاية حسب اللي كليتو اليوم، السكر، والميزانية متاعك.", "Idées pour le prochain repas selon ce que tu as mangé, ta glycémie et ton budget.")}</p>
        <button class="btn primary" style="margin-top:10px" data-act="foodSuggest" ${aiOk ? "" : "disabled"}>${I.spark}${L("اقترحلي", "Propose-moi")}</button>
        <div id="foodSugg" style="margin-top:12px">${sugg ? suggHtml(sugg) : ""}</div>
      </div>

      <div class="card"><h3>${I.plus}${L("زيد بسرعة", "Ajout rapide")}</h3>
        <form data-form="foodQuick" class="form">
          <label class="f full">${L("الماكلة", "Aliment")}<select name="i" id="fq-i">${D.FOODS.map((f, i) => `<option value="${i}">${U.esc(L(f.ar, f.fr))} — ${U.esc(f.portion)} · ${f.kcal} kcal</option>`).join("")}</select></label>
          <label class="f">${L("الكمية (×)", "Quantité (×)")}<input name="q" id="fq-q" type="number" step="0.25" min="0.25" value="1"></label>
          <label class="f">${L("الماكلة", "Repas")}<select name="mtype" id="fq-type">${MTYPES.map(m => `<option value="${m[0]}" ${guessType() === m[0] ? "selected" : ""}>${L(m[1], m[2])}</option>`).join("")}</select></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
        <details style="margin-top:12px"><summary class="small" style="cursor:pointer">${L("دخّل بيدك", "Saisie manuelle")}</summary>
          <form data-form="foodManual" class="form" style="margin-top:10px">
            <label class="f full">${L("الاسم", "Nom")}<input name="name" id="fm-name" type="text" required maxlength="60"></label>
            <label class="f">kcal<input name="kcal" id="fm-kcal" type="number" min="0" required></label>
            <label class="f">${L("نشويات غ", "Glucides g")}<input name="carbs" id="fm-carbs" type="number" min="0" required></label>
            <label class="f">${L("بروتين غ", "Protéines g")}<input name="prot" id="fm-prot" type="number" min="0" value="0"></label>
            <label class="f">${L("دهون غ", "Lipides g")}<input name="fat" id="fm-fat" type="number" min="0" value="0"></label>
            <button class="btn" type="submit">${L("زيد", "Ajouter")}</button>
          </form></details>
      </div>
    </div>`;
  }
  function macro(name, v, t, cls) {
    const p = t ? U.clamp(v / t * 100, 0, 100) : 0;
    return `<div><div class="row between small"><span>${name}</span><span class="num">${Math.round(v)} / ${t} g</span></div><div class="bar ${v > t ? "bad" : cls}" style="height:8px"><i style="width:${p}%"></i></div></div>`;
  }

  function normalize(j) {
    const items = Array.isArray(j.items) ? j.items.slice(0, 12).map(x => ({
      name: String(x.name || "").slice(0, 60), grams: +x.grams || 0, kcal: +x.kcal || 0, carbs: +x.carbs || 0, prot: +x.protein || +x.prot || 0, fat: +x.fat || 0, fiber: +x.fiber || 0
    })) : [];
    const t = { kcal: U.sum(items, x => x.kcal), carbs: U.sum(items, x => x.carbs), prot: U.sum(items, x => x.prot), fat: U.sum(items, x => x.fat), fiber: U.sum(items, x => x.fiber) };
    return { name: String(j.name || items.map(i => i.name).join(", ") || L("ماكلة", "Repas")).slice(0, 80), items, ...t, gi: ["low", "medium", "high"].includes(j.gi) ? j.gi : "", confidence: j.confidence || "", advice: String(j.advice || "").slice(0, 600), swap: String(j.swap || "").slice(0, 300) };
  }
  const giName = (g) => ({ low: L("تأثير خفيف على السكر", "Impact faible sur la glycémie"), medium: L("تأثير متوسط", "Impact moyen"), high: L("يطلّع السكر بسرعة", "Fait monter vite la glycémie") }[g] || "");

  function resultHtml(r) {
    return `<div class="stack">
      <div class="row between"><b>${U.esc(r.name)}</b>${r.gi ? `<span class="pill ${r.gi === "high" ? "bad" : r.gi === "medium" ? "warn" : "good"}">${giName(r.gi)}</span>` : ""}</div>
      <div class="tiles" style="margin-top:0;grid-template-columns:repeat(4,1fr)">
        <div class="tile"><span class="k">kcal</span><span class="v">${Math.round(r.kcal)}</span></div>
        <div class="tile"><span class="k">${L("نشويات", "Glucides")}</span><span class="v">${Math.round(r.carbs)}g</span></div>
        <div class="tile"><span class="k">${L("بروتين", "Protéines")}</span><span class="v">${Math.round(r.prot)}g</span></div>
        <div class="tile"><span class="k">${L("دهون", "Lipides")}</span><span class="v">${Math.round(r.fat)}g</span></div>
      </div>
      <div class="tablewrap"><table class="table"><thead><tr><th>${L("المكوّن", "Aliment")}</th><th>g</th><th>kcal</th><th>${L("نشويات", "Gluc.")}</th></tr></thead><tbody>${r.items.map(x => `<tr><td>${U.esc(x.name)}</td><td>${Math.round(x.grams)}</td><td>${Math.round(x.kcal)}</td><td>${Math.round(x.carbs)}</td></tr>`).join("")}</tbody></table></div>
      ${r.advice ? `<div class="alertbox info small"><b>${L("نصيحة", "Conseil")}</b>${U.esc(r.advice)}${r.swap ? `<div style="margin-top:4px"><b style="display:inline">${L("بدّل:", "Alternative :")}</b> ${U.esc(r.swap)}</div>` : ""}</div>` : ""}
      <p class="tiny muted">${L("تقدير بالعين من التصويرة — الكميات الحقيقية تنجم تختلف.", "Estimation visuelle — les quantités réelles peuvent varier.")}${r.confidence === "low" ? " " + L("الثقة ضعيفة: زيد تفاصيل.", "Confiance faible : ajoute des précisions.") : ""}</p>
      <div class="row"><button class="btn primary" data-act="foodSave">${I.check}${L("سجّلها", "Enregistrer")}</button><button class="btn" data-act="foodToDose">${I.syringe}${L("استعمل النشويات في «قبل ما تزرق»", "Utiliser les glucides dans « Avant d'injecter »")}</button><button class="btn ghost" data-act="foodClear">${L("امسح", "Effacer")}</button></div>
    </div>`;
  }
  function suggHtml(list) {
    return `<div class="stack">${list.map((s, i) => `<div class="card flat" style="padding:12px"><div class="row between"><b>${U.esc(s.title)}</b><span class="pill saffron">${Math.round(+s.kcal || 0)} kcal · ${Math.round(+s.carbs || 0)}g</span></div>
      <p class="small" style="margin-top:4px">${U.esc(s.why || "")}</p>
      ${Array.isArray(s.ingredients) ? `<p class="tiny muted" style="margin-top:4px">${s.ingredients.map(U.esc).join(" · ")}</p>` : ""}
      <div class="row small muted" style="margin-top:6px">${s.cost ? `<span>≈ ${U.esc(s.cost)}</span>` : ""}${s.prep ? `<span>${U.esc(String(s.prep))} ${L("دقيقة", "min")}</span>` : ""}<button class="btn sm" style="margin-inline-start:auto" data-act="suggEat" data-i="${i}">${L("كليتها", "Je l'ai mangé")}</button></div></div>`).join("")}</div>`;
  }

  /* ---------- actions ---------- */
  App.changes.foodImg = (el) => {
    const f = el.files && el.files[0]; if (!f) return;
    if (App.uiState.foodImgUrl) try { URL.revokeObjectURL(App.uiState.foodImgUrl); } catch (e) { /* ignore */ }
    App.uiState.foodImg = f; App.uiState.foodImgUrl = URL.createObjectURL(f); App.uiState.foodResult = null;
    App.render();
  };
  App.forms.foodAnalyze = async (fd) => {
    if (!App.ai) return;
    const img = App.uiState.foodImg;
    const desc = (fd.desc || "").trim();
    if (!img && !desc) { App.toast(L("صوّر الصحن ولا اكتب شنوة كليت", "Ajoute une photo ou une description"), "", "warn"); return; }
    App.uiState.foodMtype = fd.mtype;
    const out = document.getElementById("foodOut"), btn = document.getElementById("fa-go");
    if (btn) btn.disabled = true;
    if (out) out.innerHTML = `<p class="small"><span class="spinner"></span> ${L("نحسب… (تنجم تاخذ شوية ثواني)", "Analyse en cours… (quelques secondes)")}</p>`;
    const prompt = `You are a careful nutrition assistant for a young adult with diabetes who injects insulin and lives in Tunisia.
${img ? "Look at the photo of the plate." : "There is no photo; use the description."} ${desc ? "User's description: " + desc : ""}
Identify each food item, estimate the portion in grams, and estimate calories, carbohydrates (g), protein (g), fat (g) and fiber (g) for that portion.
Know Tunisian dishes (couscous, lablabi, ojja, chakchouka, brik, kafteji, mloukhia, makrouna, salade mechouia, tajine tunisien, chorba frik, bsissa, fricassé, mlawi, tabouna bread, baguette). Count bread if visible. Be realistic, not optimistic, about portion sizes.
Never suggest an insulin dose.
Reply with ONLY one JSON object, all text values in ${langName()}:
{"name":"short meal name","items":[{"name":"...","grams":0,"kcal":0,"carbs":0,"protein":0,"fat":0,"fiber":0}],"gi":"low|medium|high","confidence":"low|medium|high","advice":"2-3 short practical sentences for a diabetic about this meal's effect on blood sugar and how to balance it","swap":"one healthier, affordable Tunisian swap"}`;
    try {
      const j = await App.ai.json(prompt, img ? { images: [img] } : {});
      App.uiState.foodResult = normalize(j || {});
      App.uiState.foodResult.src = img ? "photo" : "text";
    } catch (e) {
      const msg = App.aiError(e);
      if (out) out.innerHTML = msg ? `<div class="alertbox warn small">${U.esc(msg)}</div>` : "";
      if (btn) btn.disabled = false;
      return;
    }
    App.render();
  };
  function addMeal(r, mtype, src) {
    const ts = Date.now(), mk = U.mkey();
    const doc = Store.month("food", mk);
    doc.meals.push({ id: U.id(), ts, mtype: mtype || guessType(), name: r.name, items: (r.items || []).slice(0, 12), kcal: Math.round(r.kcal), carbs: Math.round(r.carbs), prot: Math.round(r.prot), fat: Math.round(r.fat), gi: r.gi || "", src });
    Store.save("food-" + mk);
  }
  App.acts.foodSave = () => {
    const r = App.uiState.foodResult; if (!r) return;
    addMeal(r, App.uiState.foodMtype, r.src);
    App.toast(L("تسجّلت الماكلة", "Repas enregistré"), `${Math.round(r.kcal)} kcal · ${Math.round(r.carbs)} ${L("غ نشويات", "g glucides")}`, "good");
    App.uiState.foodResult = null; App.uiState.foodImg = null; App.uiState.foodImgUrl = null;
    App.render();
  };
  App.acts.foodClear = () => { App.uiState.foodResult = null; App.uiState.foodImg = null; App.uiState.foodImgUrl = null; App.render(); };
  App.acts.foodToDose = () => {
    const r = App.uiState.foodResult; if (!r) return;
    addMeal(r, App.uiState.foodMtype, r.src);
    App.uiState.pendingCarbs = Math.round(r.carbs);
    App.uiState.foodResult = null; App.uiState.foodImg = null; App.uiState.foodImgUrl = null;
    App.sub.health = "sugar"; location.hash = "#health";
  };
  App.acts.mealDel = (el) => {
    App.confirm(L("تمسح الماكلة هذي؟", "Supprimer ce repas ?"), () => {
      const mk = U.mkey(new Date(+el.dataset.ts)); const doc = Store.month("food", mk);
      doc.meals = doc.meals.filter(m => m.id !== el.dataset.id); Store.save("food-" + mk); App.render();
    });
  };
  App.forms.foodQuick = (fd) => {
    const f = D.FOODS[+fd.i]; const q = parseFloat(fd.q) || 1; if (!f) return;
    addMeal({ name: (q !== 1 ? q + " × " : "") + L(f.ar, f.fr), items: [{ name: L(f.ar, f.fr), grams: 0, kcal: f.kcal * q, carbs: f.carbs * q, prot: f.prot * q, fat: f.fat * q }], kcal: f.kcal * q, carbs: f.carbs * q, prot: f.prot * q, fat: f.fat * q }, fd.mtype, "quick");
    App.toast(L("تزادت", "Ajouté"), L(f.ar, f.fr), "good"); App.render();
  };
  App.forms.foodManual = (fd) => {
    const n = (v) => parseFloat(v) || 0;
    addMeal({ name: fd.name, items: [], kcal: n(fd.kcal), carbs: n(fd.carbs), prot: n(fd.prot), fat: n(fd.fat) }, guessType(), "manual");
    App.render();
  };
  App.acts.foodSuggest = async (el) => {
    if (!App.ai) return;
    const box = document.getElementById("foodSugg");
    el.disabled = true;
    if (box) box.innerHTML = `<p class="small"><span class="spinner"></span> ${L("نحضّر اقتراحات…", "Je prépare des idées…")}</p>`;
    const meals = F.todayMeals(), tot = F.totals(meals), tg = F.targets();
    const nm = App.H ? App.H.nextMeal() : null;
    const last = App.H ? App.H.lastBg() : null;
    let budget = "";
    try { const c = App.moneyCalc(); if (c.personal > 0) budget = `Daily personal budget left today: about ${Math.max(0, c.perDay).toFixed(1)} ${c.cfg.currency}.`; } catch (e) { /* ignore */ }
    const prompt = `Suggest 3 options for my next meal${nm ? " (" + nm.k + ")" : ""}. I have diabetes and inject insulin; I live in Tunisia.
Already eaten today: ${meals.length ? meals.map(m => `${m.name} (${Math.round(m.kcal)} kcal, ${Math.round(m.carbs)} g carbs)`).join("; ") : "nothing yet"}.
Remaining for today: about ${Math.max(0, tg.kcal - tot.kcal)} kcal and ${Math.max(0, tg.carbs - tot.carbs)} g carbohydrates.
${last && Date.now() - last.ts < 3 * 3600000 ? `Last blood glucose: ${Math.round(last.bg)} mg/dL.` : ""} ${budget}
Prefer simple, cheap, local Tunisian ingredients, low to medium glycemic index, vegetables and enough protein, realistic portions. Never suggest insulin doses.
Reply with ONLY a JSON array of 3 objects, text in ${langName()}:
[{"title":"...","why":"one sentence on why it suits me now","ingredients":["...","..."],"kcal":0,"carbs":0,"protein":0,"fat":0,"cost":"approx price like '6 DT'","prep":15}]`;
    try {
      const j = await App.ai.json(prompt, { cache: false });
      App.uiState.foodSugg = Array.isArray(j) ? j.slice(0, 4) : [];
      if (box) box.innerHTML = suggHtml(App.uiState.foodSugg);
    } catch (e) { const msg = App.aiError(e); if (box) box.innerHTML = msg ? `<div class="alertbox warn small">${U.esc(msg)}</div>` : ""; }
    el.disabled = false;
  };
  App.acts.suggEat = (el) => {
    const s = (App.uiState.foodSugg || [])[+el.dataset.i]; if (!s) return;
    addMeal({ name: s.title, items: [], kcal: +s.kcal || 0, carbs: +s.carbs || 0, prot: +s.protein || 0, fat: +s.fat || 0, gi: "" }, guessType(), "suggestion");
    App.toast(L("تسجّلت الماكلة", "Repas enregistré"), s.title, "good"); App.render();
  };

  App.views.food = { render };
})();
