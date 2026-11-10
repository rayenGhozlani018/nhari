/* Nhari — Settings */
(function () {
  "use strict";
  const D = window.NhariData;
  const METHODS = window.NhariPrayer.METHODS;

  function render() {
    const s = Store.doc("settings"), p = s.profile, g = s.glucose, d = s.doctor, st = s.study;
    const u = U.bgUnitLabel();
    const val = (mg) => (mg === "" || mg == null || isNaN(+mg)) ? "" : U.bgFromMg(+mg);
    return `<div class="sectionhead"><h2>${L("الإعدادات", "Réglages")}</h2></div>
    <div class="grid g2">
      <div class="card"><h3>${L("انت", "Toi")}</h3>
        <form data-form="prefProfile" class="form">
          <label class="f full">${L("اسمك", "Ton prénom")}<input id="pf-name" name="name" type="text" maxlength="30" value="${U.esc(s.name)}"></label>
          <label class="f">${L("الجنس", "Sexe")}<select id="pf-sex" name="sex"><option value="m" ${p.sex === "m" ? "selected" : ""}>${L("ذكر", "Homme")}</option><option value="f" ${p.sex === "f" ? "selected" : ""}>${L("أنثى", "Femme")}</option></select></label>
          <label class="f">${L("تاريخ الولادة", "Date de naissance")}<input id="pf-birth" name="birth" type="date" value="${U.esc(p.birth || "")}"></label>
          <label class="f">${L("العمر", "Âge")}<input id="pf-age" name="age" type="number" min="10" max="99" value="${App.age()}" ${p.birth ? "readonly" : ""}></label>
          <label class="f">${L("الوزن (كغ)", "Poids (kg)")}<input id="pf-w" name="weight" type="number" min="30" max="250" step="0.1" value="${p.weight}"></label>
          <label class="f">${L("الطول (صم)", "Taille (cm)")}<input id="pf-h" name="height" type="number" min="120" max="230" value="${p.height}"></label>
          <label class="f">${L("الحركة", "Activité")}<select id="pf-act" name="activity">${[["sedentary", "قليلة (قاعد برشا)", "Sédentaire"], ["light", "خفيفة", "Légère"], ["moderate", "متوسطة", "Modérée"], ["active", "برشا", "Élevée"]].map(o => `<option value="${o[0]}" ${p.activity === o[0] ? "selected" : ""}>${L(o[1], o[2])}</option>`).join("")}</select></label>
          <label class="f">${L("الهدف", "Objectif")}<select id="pf-goal" name="goal">${[["lose", "نقص الوزن", "Perdre du poids"], ["keep", "نحافظ", "Maintenir"], ["gain", "نزيد", "Prendre du poids"]].map(o => `<option value="${o[0]}" ${p.goal === o[0] ? "selected" : ""}>${L(o[1], o[2])}</option>`).join("")}</select></label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
      </div>

      <div class="card"><h3>${I.drop}${L("السكر", "Glycémie")}</h3>
        <form data-form="prefGlucose" class="form">
          <label class="f">${L("الوحدة", "Unité")}<select id="pg-unit" name="unit"><option value="gL" ${g.unit === "gL" ? "selected" : ""}>g/L</option><option value="mg" ${g.unit === "mg" ? "selected" : ""}>mg/dL</option><option value="mmol" ${g.unit === "mmol" ? "selected" : ""}>mmol/L</option></select></label>
          <label class="f">${L("الحد الأدنى", "Cible basse")} (${u})<input id="pg-low" name="low" type="number" step="any" value="${val(g.low)}"></label>
          <label class="f">${L("الحد الأعلى", "Cible haute")} (${u})<input id="pg-high" name="high" type="number" step="any" value="${val(g.high)}"></label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <h3 style="margin-top:16px">${I.clock}${L("أوقات الماكلة", "Horaires des repas")}</h3>
        <form data-form="prefMeals" class="form">
          ${[["breakfast", "الفطور", "Petit-déj"], ["lunch", "الغداء", "Déjeuner"], ["snack", "اللمجة", "Collation"], ["dinner", "العشاء", "Dîner"]].map(m => `<label class="f">${L(m[1], m[2])}<input id="pm-${m[0]}" name="${m[0]}" type="time" value="${U.esc(s.meals[m[0]])}"></label>`).join("")}
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
      </div>

      <div class="card stripe saffron" style="grid-column:1/-1"><h3>${I.syringe}${L("قيم الطبيب لحساب الدوز", "Valeurs du médecin pour le calcul de dose")}</h3>
        <p class="small">${L("حط هنا كان القيم اللي عطاهملك طبيبك. القيم هذي تختلف من شخص لشخص، وقيمة غالطة تنجم تعمل هبوط خطير — ما تخمنهاش.", "Saisis uniquement les valeurs données par ton médecin. Elles sont propres à chacun ; une valeur fausse peut provoquer une hypo grave — ne les devine pas.")}</p>
        <form data-form="prefDoctor" class="form" style="margin-top:10px">
          <label class="f">${L("Ratio: غرامات نشويات لكل وحدة", "Ratio : g de glucides par unité")}<input id="pd-icr" name="icr" type="number" step="any" min="1" value="${U.esc(d.icr)}" placeholder="10"></label>
          <label class="f">${L("Facteur de correction: الوحدة تهبّط قداش", "Facteur de correction : baisse par unité")} (${u})<input id="pd-isf" name="isf" type="number" step="any" min="0" value="${val(d.isf)}"></label>
          <label class="f">${L("السكر المستهدف", "Glycémie cible")} (${u})<input id="pd-target" name="target" type="number" step="any" min="0" value="${val(d.target)}"></label>
          <label class="f">${L("مدة خدمة الأنسولين السريع (ساعات)", "Durée d'action de la rapide (h)")}<input id="pd-dia" name="dia" type="number" step="0.5" min="2" max="8" value="${d.dia}"></label>
          <label class="check full"><input type="checkbox" name="confirmed" id="pd-conf" ${d.confirmed ? "checked" : ""}>${L("القيم هذي عطاهملي الطبيب متاعي", "Ces valeurs m'ont été données par mon médecin")}</label>
          <label class="check full"><input type="checkbox" name="enabled" id="pd-en" ${d.enabled ? "checked" : ""}>${L("فعّل حساب الدوز في «قبل ما تزرق»", "Activer le calcul dans « Avant d'injecter »")}</label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
      </div>

      <div class="card" style="grid-column:1/-1"><h3>${I.clock}${L("البرنامج اليومي (أوتوماتيك)", "Programme quotidien (automatique)")}</h3>
        <form data-form="prefRoutine" class="form">
          ${[["workStart", "تبدا الخدمة", "Début du travail"], ["lunch", "الغداء", "Déjeuner"], ["lunchEnd", "ترجع للخدمة", "Reprise"], ["workEnd", "توفى الخدمة", "Fin du travail"], ["gymMinStart", "الجيم ما قبلش", "Salle pas avant"], ["satGym", "جيم السبت", "Salle le samedi"], ["sleep", "النوم", "Coucher"]].map(([k, a, f]) => `<label class="f">${L(a, f)}<input type="time" name="${k}" id="rt-${k}" value="${U.esc(App.R.cfg()[k])}"></label>`).join("")}
          <label class="f">${L("مدة الجيم (دقيقة)", "Durée salle (min)")}<input type="number" min="30" max="150" name="gymDur" id="rt-gymDur" value="${App.R.cfg().gymDur}"></label>
          <label class="f">${L("الحلقة بعد الصبح (دقيقة)", "Halaqa après Sobh (min)")}<input type="number" min="10" max="90" name="halaqaMin" id="rt-hal" value="${App.R.cfg().halaqaMin}"></label>
          <label class="f">${L("الطريق للفاك (دقيقة)", "Trajet vers la fac (min)")}<input type="number" min="10" max="120" name="commute" id="rt-com" value="${App.R.cfg().commute}"></label>
          <label class="f">${L("الرياضة", "Sport")}<select name="mode" id="rt-mode"><option value="gym" ${s.sport.mode === "gym" ? "selected" : ""}>${L("برنامج الجيم متاعي", "Mon programme salle")}</option><option value="home" ${s.sport.mode !== "gym" ? "selected" : ""}>${L("تمارين في الدار", "Exercices maison")}</option></select></label>
          <label class="check full"><input type="checkbox" name="on" id="rt-on" ${App.R.cfg().on ? "checked" : ""}>${L("البرنامج الأوتوماتيك مفعّل", "Programme automatique activé")}</label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <p class="tiny muted" style="margin-top:6px">${L("أيام الخدمة تتبدّل من «الفلوس ← الميزانية». قرايتك من «القراية ← المواد».", "Les jours de travail se règlent dans Finances → Budget, les cours dans Études → Matières.")}</p>
      </div>

      <div class="card"><h3>${I.moon}${L("مواقيت الصلاة", "Horaires de prière")}</h3>
        <form data-form="prefPrayer" class="form">
          <label class="f full">${L("المدينة", "Ville")}<select id="pp-city" name="city">${D.CITIES.map(c => `<option value="${c.id}" ${s.city === c.id ? "selected" : ""}>${U.esc(L(c.ar, c.fr))}</option>`).join("")}<option value="custom" ${s.city === "custom" ? "selected" : ""}>${L("موقع آخر (إحداثيات)", "Autre (coordonnées)")}</option></select></label>
          <label class="f">${L("خط العرض", "Latitude")}<input id="pp-lat" name="lat" type="number" step="any" value="${s.lat}"></label>
          <label class="f">${L("خط الطول", "Longitude")}<input id="pp-lng" name="lng" type="number" step="any" value="${s.lng}"></label>
          <label class="f full">${L("طريقة الحساب", "Méthode")}<select id="pp-method" name="method">${Object.entries(METHODS).map(([k, m]) => `<option value="${k}" ${s.method === k ? "selected" : ""}>${U.esc(L(m.label.ar, m.label.fr))}</option>`).join("")}</select></label>
          <label class="f">${L("العصر", "Asr")}<select id="pp-asr" name="asr"><option value="1" ${+s.asr === 1 ? "selected" : ""}>${L("مالكي / شافعي", "Maliki / Chafi'i")}</option><option value="2" ${+s.asr === 2 ? "selected" : ""}>${L("حنفي", "Hanafi")}</option></select></label>
          <label class="f">${L("تعديل التاريخ الهجري", "Ajustement hégirien")}<select id="pp-hj" name="hijriAdj">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}" ${+s.hijriAdj === v ? "selected" : ""}>${v > 0 ? "+" + v : v}</option>`).join("")}</select></label>
          <fieldset class="full" style="border:0;padding:0;margin:0"><legend class="small muted" style="margin-bottom:6px">${L("تعديل بالدقايق (باش يتطابق مع جامعك)", "Ajustement en minutes (pour coller à ta mosquée)")}</legend>
            <div class="form">${["fajr", "dhuhr", "asr", "maghrib", "isha"].map(k => `<label class="f">${App.prName(k)}<input id="pp-adj-${k}" name="adj_${k}" type="number" min="-30" max="30" value="${s.adj[k] || 0}"></label>`).join("")}</div></fieldset>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
      </div>

      <div class="card"><h3>${I.study}${L("القراية", "Études")}</h3>
        <form data-form="prefStudy" class="form">
          <label class="f">${L("سوايع قراية في النهار", "Heures d'étude / jour")}<input id="ps-h" name="dailyHours" type="number" min="0.5" max="12" step="0.5" value="${st.dailyHours}"></label>
          <label class="f">${L("نبدا القراية على", "Je commence à")}<input id="ps-start" name="start" type="time" value="${U.esc(st.start)}"></label>
          <label class="f">${L("طول الحصة (دقايق)", "Durée d'une séance (min)")}<input id="ps-sess" name="sessionMin" type="number" min="15" max="120" step="5" value="${st.sessionMin}"></label>
          <label class="f">${L("الراحة (دقايق)", "Pause (min)")}<input id="ps-brk" name="breakMin" type="number" min="0" max="60" step="5" value="${st.breakMin}"></label>
          <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <h3 style="margin-top:16px">${I.bell}${L("التنبيهات", "Rappels")}</h3>
        <div class="row">${s.notify.enabled ? `<span class="pill good">${L("مفعّلة", "Activés")}</span><button class="btn sm" data-act="disableNotify">${L("وقّف", "Désactiver")}</button>` : `<button class="btn primary sm" data-act="enableNotify">${I.bell}${L("فعّل", "Activer")}</button>`}
          <label class="check"><input type="checkbox" data-change="prefSound" ${s.notify.sound ? "checked" : ""}>${L("صوت", "Son")}</label></div>
      </div>

      ${App.LocalPrefs ? App.LocalPrefs() : ""}
      <div class="card" style="grid-column:1/-1"><h3>${L("البيانات", "Données")}</h3>
        <p class="small muted">${window.NHARI_LOCAL ? (window.NhariSync && window.NhariSync.status().user ? L("البيانات محفوظة في الجهاز ومربوطة بحسابك — كل تبديل يوصل للتلفون والـPC وحدو.", "Données gardées sur l'appareil et liées à ton compte : chaque modification arrive seule sur le téléphone et le PC.") : L("النسخة هذي تخبي البيانات في الجهاز هذا برك. اربطها بالتلفون من «ربط الـPC والتلفون» الفوق، ولا استعمل «نسخة احتياطية».", "Cette version garde les données sur cet appareil. Relie-la au téléphone avec « Lier PC et téléphone » ci-dessus, ou utilise une sauvegarde.")) : Store.mode === "cloud" ? L("البيانات محفوظة في حسابك ومتزامنة بين التلفون والـPC — حل نفس الرابط من الزوز.", "Tes données sont enregistrées dans ton compte et synchronisées entre téléphone et PC : ouvre le même lien sur les deux.") : L("البيانات محفوظة في هذا الجهاز برك. حل التطبيق من حسابك في Claude باش تتزامن.", "Données enregistrées sur cet appareil uniquement. Ouvre l'app depuis ton compte Claude pour synchroniser.")}</p>
        <div class="row" style="margin-top:10px"><button class="btn" data-act="exportData">${I.copy}${L("انسخ نسخة احتياطية", "Copier une sauvegarde")}</button><button class="btn" data-act="importData">${L("رجّع نسخة", "Restaurer")}</button><button class="btn danger" data-act="resetData">${I.trash}${L("امسح كل شي", "Tout effacer")}</button></div>
        <p class="tiny muted" style="margin-top:12px">${L("التطبيق يعاونك تنظم نهارك، أما ما يعوضش الطبيب. أي تغيير في الأنسولين ولا الدواء لازم يكون مع طبيب.", "L'app t'aide à organiser ta journée mais ne remplace pas un médecin. Tout changement d'insuline ou de traitement se fait avec un médecin.")}</p>
      </div>
    </div>`;
  }

  const n = (v, def) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(x) ? def : x; };
  const saved = () => App.toast(L("تسجّل", "Enregistré"), "", "good");
  App.forms.prefProfile = (fd) => {
    const s = Store.doc("settings"); s.name = (fd.name || "").trim();
    Object.assign(s.profile, { sex: fd.sex, birth: fd.birth || "", age: n(fd.age, 23), weight: n(fd.weight, 70), height: n(fd.height, 175), activity: fd.activity, goal: fd.goal });
    Store.save("settings"); saved(); App.render();
  };
  App.forms.prefGlucose = (fd) => {
    const s = Store.doc("settings"); const prevUnit = s.glucose.unit;
    // read the targets in the unit they were typed in, then switch unit
    const low = U.bgToMg(fd.low), high = U.bgToMg(fd.high);
    if (low > 40 && low < 150) s.glucose.low = Math.round(low);
    if (high > 100 && high < 300) s.glucose.high = Math.round(high);
    s.glucose.unit = fd.unit || prevUnit;
    Store.save("settings"); saved(); App.render();
  };
  App.forms.prefMeals = (fd) => { const s = Store.doc("settings"); for (const k of ["breakfast", "lunch", "snack", "dinner"]) if (fd[k]) s.meals[k] = fd[k]; Store.save("settings"); saved(); App.render(); };
  App.forms.prefDoctor = (fd) => {
    const s = Store.doc("settings"), d = s.doctor;
    d.icr = fd.icr === "" ? "" : n(fd.icr, "");
    d.isf = fd.isf === "" ? "" : Math.round(U.bgToMg(fd.isf));
    d.target = fd.target === "" ? "" : Math.round(U.bgToMg(fd.target));
    d.dia = U.clamp(n(fd.dia, 4), 2, 8);
    d.confirmed = !!fd.confirmed;
    d.enabled = !!fd.enabled && d.confirmed && d.icr > 0 && d.isf > 0 && d.target > 0;
    if (fd.enabled && !d.enabled) App.toast(L("الحساب ما تفعّلش", "Calcul non activé"), L("لازم القيم الثلاثة، وتأكد إنها من عند طبيبك.", "Il faut les trois valeurs et confirmer qu'elles viennent de ton médecin."), "warn");
    else saved();
    Store.save("settings"); App.render();
  };
  App.forms.prefPrayer = (fd) => {
    const s = Store.doc("settings");
    const city = D.CITIES.find(c => c.id === fd.city);
    if (city && city.id !== s.city) { s.city = city.id; s.lat = city.lat; s.lng = city.lng; s.tz = city.tz; s.method = city.method; s.adj = city.method === "tunisia" ? { fajr: 0, sunrise: 0, dhuhr: 5, asr: 0, maghrib: 2, isha: 0 } : { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }; }
    else {
      if (fd.city === "custom") { s.city = "custom"; s.tz = s.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Tunis"; }
      s.lat = U.clamp(n(fd.lat, s.lat), -66, 66); s.lng = U.clamp(n(fd.lng, s.lng), -180, 180);
      s.method = fd.method in METHODS ? fd.method : s.method;
      for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) s.adj[k] = U.clamp(parseInt(fd["adj_" + k]) || 0, -30, 30);
    }
    s.asr = +fd.asr === 2 ? 2 : 1; s.hijriAdj = U.clamp(parseInt(fd.hijriAdj) || 0, -2, 2);
    Store.save("settings"); saved(); App.render();
  };
  App.forms.prefRoutine = (fd) => {
    const s = Store.doc("settings"); const r = Object.assign({}, s.routine || {});
    for (const k of ["workStart", "lunch", "lunchEnd", "workEnd", "gymMinStart", "satGym", "sleep"]) if (/^\d{2}:\d{2}$/.test(fd[k] || "")) r[k] = fd[k];
    r.gymDur = U.clamp(n(fd.gymDur, 75), 30, 150); r.halaqaMin = U.clamp(n(fd.halaqaMin, 30), 10, 90); r.commute = U.clamp(n(fd.commute, 40), 10, 120); r.on = !!fd.on;
    s.routine = r; s.sport.mode = fd.mode === "home" ? "home" : "gym";
    Store.save("settings"); saved(); App.render();
  };
  App.forms.prefStudy = (fd) => {
    const s = Store.doc("settings"); Object.assign(s.study, { dailyHours: U.clamp(n(fd.dailyHours, 3), 0.5, 12), start: fd.start || "17:30", sessionMin: U.clamp(n(fd.sessionMin, 45), 15, 120), breakMin: U.clamp(n(fd.breakMin, 10), 0, 60) });
    Store.save("settings"); saved(); App.render();
  };
  App.changes.prefSound = (el) => { const s = Store.doc("settings"); s.notify.sound = el.checked; Store.save("settings"); };

  function allNames() {
    const names = new Set(["settings", "moneycfg", "sport", "study", "notes", "deen"]);
    Object.keys(Store.docs).forEach(k => names.add(k));
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("nhari:") && !k.startsWith("nhari:fired")) names.add(k.slice(6)); } } catch (e) { /* ignore */ }
    return [...names];
  }
  App.acts.exportData = () => {
    const out = {}; allNames().forEach(nm => { out[nm] = Store.doc(nm); });
    App.copy(JSON.stringify({ app: "nhari", v: 1, at: new Date().toISOString(), docs: out }));
  };
  App.acts.importData = () => {
    App.modal(L("رجّع نسخة احتياطية", "Restaurer une sauvegarde"), `<form data-form="importData" class="stack"><label class="f">${L("الصق النسخة هنا", "Colle la sauvegarde ici")}<textarea name="json" id="imp-json" style="min-height:160px"></textarea></label><button class="btn primary" type="submit">${L("رجّع", "Restaurer")}</button></form>`);
  };
  App.forms.importData = (fd) => {
    try {
      const j = JSON.parse(fd.json);
      if (!j || j.app !== "nhari" || typeof j.docs !== "object") throw new Error("format");
      for (const [nm, body] of Object.entries(j.docs)) {
        if (!/^[a-z]+(-\d{4}-\d{2})?$/.test(nm) || typeof body !== "object") continue;
        Store.doc(nm); Store.docs[nm] = body; Store.save(nm);
      }
      App.closeModal(); App.toast(L("ترجعت البيانات", "Données restaurées"), "", "good");
      App.lang = Store.doc("settings").lang || App.lang; App.applyLang(); App.renderShell(); App.render();
    } catch (e) { App.toast(L("النسخة موش صحيحة", "Sauvegarde invalide"), "", "bad"); }
  };
  App.acts.resetData = () => App.confirm(L("تمسح كل البيانات من هذا الجهاز ومن حسابك؟ ما يرجعوش.", "Effacer toutes les données (appareil et compte) ? C'est définitif."), async () => {
    const names = allNames();
    for (const nm of names) {
      try { localStorage.removeItem("nhari:" + nm); } catch (e) { /* ignore */ }
      if (Store.mode === "cloud") { try { await Store.ref(nm).delete(); } catch (e) { /* ignore */ } }
      delete Store.docs[nm]; delete Store.json[nm];
    }
    App.toast(L("تمسح كل شي", "Tout est effacé"), "", "good"); App.go("today");
  });

  App.views.prefs = { render };
})();
