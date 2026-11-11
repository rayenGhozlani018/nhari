/* Nhari — local build UI: API key, backup file, first-run restore, offline install */
(function () {
  "use strict";
  const NL = window.NhariLocal;
  App.aiPdf = true; // the local build sends PDF files to Gemini / Claude directly
  const isElectron = /Electron/i.test(navigator.userAgent);

  const GEM_NAMES = { "gemini-3.8-flash": "Gemini 3.8 Flash", "gemini-3.6-flash": "Gemini 3.6 Flash", "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite" };
  function aiCard() {
    const prov = NL.provider(), gem = prov === "gemini", has = NL.hasKeyFor(prov);
    const seg = `<div class="seg" role="group" style="margin-top:8px">
      <button type="button" data-act="localProv" data-p="gemini" aria-pressed="${gem}"><bdi>Gemini (Google)</bdi><br><span class="tiny">${L("بلاش", "gratuit")}</span></button>
      <button type="button" data-act="localProv" data-p="anthropic" aria-pressed="${!gem}"><bdi>Claude (Anthropic)</bdi><br><span class="tiny">${L("بالفلوس", "payant")}</span></button></div>`;
    const gemHelp = `<ol class="small" style="margin:10px 0 0;padding-inline-start:20px;line-height:1.9">
        <li>${L("حل", "Ouvre")} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> ${L("وادخل بحساب Gmail متاعك.", "et connecte-toi avec ton compte Gmail.")}</li>
        <li>${L("انزل «Create API key» (ما يطلبش كارطة بنكية).", "Clique « Create API key » (aucune carte bancaire demandée).")}</li>
        <li>${L("كوبي الـclé (تبدا بـ AIza) وحطها هنا، وبعد «جرّب».", "Copie la clé (elle commence par AIza), colle-la ici, puis « Tester ».")}</li></ol>
      <div class="alertbox warn small" style="margin-top:10px">${L("في النسخة المجانية، Google تنجم تستعمل اللي تبعثو (تصاور الماكلة، الأسئلة للمدرب) باش تحسّن خدماتها، وينجم يقراه موظف. ما تبعثش passwords ولا أرقام سرية.", "Version gratuite : Google peut utiliser ce que tu envoies (photos de repas, questions au mentor) pour améliorer ses services, et une personne peut le relire. N'envoie ni mot de passe ni numéro confidentiel.")}</div>
      <p class="tiny muted" style="margin-top:6px">${L("الحصة المجانية محدودة في النهار. كي تكمل في موديل، التطبيق يجرب موديل آخر وحدو؛ وكي يكملو الكل، ترجع الصباح (حوالي 9:00).", "Le quota gratuit est limité par jour. Quand un modèle est épuisé, l'app passe seule au suivant ; quand tous le sont, ça revient le matin (vers 9:00).")}</p>`;
    const claudeHelp = `<p class="small" style="margin-top:10px">${L("الـclé من console.anthropic.com. تخلّص على قد ما تستعمل.", "Clé sur console.anthropic.com. Tu paies à l'usage.")}</p>`;
    const models = gem
      ? [["", L("أوتوماتيك", "Automatique")], ...Object.entries(GEM_NAMES)]
      : [["claude-sonnet-5-5", "Claude Sonnet 5.5 — " + L("متوازن", "équilibré")], ["claude-haiku-5-5", "Claude Haiku 5.5 — " + L("أرخص وأسرع", "moins cher, plus rapide")], ["claude-opus-5-5", "Claude Opus 5.5 — " + L("الأقوى", "le plus puissant")]];
    const cur = NL.model(prov);
    return `<div class="card stripe accent" style="grid-column:1/-1"><h3>${I.spark}${L("الذكاء الاصطناعي", "Intelligence artificielle")}</h3>
    <p class="small">${L("صورة الماكلة، المدرب، «بسّطلي» والتيكيات من capture يستحقو clé API. الـclé تبقى في الجهاز هذا برك، وما تتحطش في النسخة الاحتياطية.", "Photo des repas, mentor, « simplifier » et import de tickets ont besoin d'une clé API. Elle reste sur cet appareil et n'est jamais incluse dans les sauvegardes.")}</p>
    ${seg}
    ${gem ? gemHelp : claudeHelp}
    <form data-form="localKey" class="form" style="margin-top:10px">
      <input type="hidden" name="prov" value="${prov}">
      <label class="f full">${L("الـclé API", "Clé API")}<input type="password" name="key" id="lk-key" autocomplete="off" placeholder="${has ? "•••••••• " + L("(محطوطة)", "(enregistrée)") : gem ? "AIza…" : "sk-ant-…"}"></label>
      <label class="f">${L("الموديل", "Modèle")}<select name="model" id="lk-model">${models.map(([v, t]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${U.esc(t)}</option>`).join("")}</select></label>
      <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button>
      <button class="btn" type="button" data-act="localTest" ${has ? "" : "disabled"}>${L("جرّب", "Tester")}</button>
      ${has ? `<button class="btn danger" type="button" data-act="localKeyDel">${L("امسح الـclé", "Supprimer la clé")}</button>` : ""}
    </form>
    <div id="lk-out" class="small" style="margin-top:8px"></div>
    ${(() => { let li = null; try { li = JSON.parse(localStorage.getItem("nhari:ailast") || "null"); } catch (e) { /* ignore */ } return li ? `<p class="tiny muted" style="margin-top:6px">${L("آخر طلب:", "Dernière demande :")} <bdi>${li.ok ? U.esc(li.model || "") : U.esc(li.code || "erreur")}</bdi> · ${li.s} ${L("ثانية", "s")}</p>` : ""; })()}
  </div>`;
  }

  App.LocalPrefs = () => `${App.NativePrefs ? App.NativePrefs() : ""}${App.SyncPrefs ? App.SyncPrefs() : ""}${App.PhoneQR ? App.PhoneQR() : ""}${aiCard()}
  <div class="card" style="grid-column:1/-1"><h3>${I.copy}${L("نسخة احتياطية (ملف)", "Sauvegarde (fichier)")}</h3>
    <p class="small muted">${L("كي تربط الـPC والتلفون (الفوق)، البيانات تتعدّى وحدها. الملف هذا نسخة زيادة للأمان: نزّل واحد كل أحد.", "Une fois le PC et le téléphone reliés (au-dessus), les données passent toutes seules. Ce fichier est une copie de sécurité en plus : télécharges-en une chaque dimanche.")}</p>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-act="backupFile">${L("نزّل ملف النسخة", "Télécharger la sauvegarde")}</button>
      <label class="btn" for="restore-file">${L("رجّع من ملف", "Restaurer depuis un fichier")}</label><input id="restore-file" class="hide" type="file" accept="application/json,.json" data-change="restoreFile"></div>
    ${!isElectron ? `<p class="tiny muted" style="margin-top:8px">${L("في التلفون: التنبيهات تخدم كي يكون التطبيق محلول.", "Sur le téléphone : les rappels fonctionnent quand l'app est ouverte.")}</p>` : `<p class="tiny muted" style="margin-top:8px">${L("في الـPC: كي تسكّر النافذة، التطبيق يبقى يخدم في الخلفية (حذا الساعة) باش يبعثلك التنبيهات.", "Sur PC : en fermant la fenêtre, l'app reste active près de l'horloge pour envoyer les rappels.")}</p>`}
  </div>`;

  App.forms.localKey = (fd) => {
    let prov = fd.prov === "anthropic" ? "anthropic" : "gemini";
    const k = (fd.key || "").trim();
    if (k) {
      if (/^sk-ant-/.test(k)) prov = "anthropic";
      else if (/^AIza/.test(k)) prov = "gemini";
      else if (prov === "anthropic") { App.toast(L("الـclé ما تشبهش لـclé Claude", "Ce n'est pas une clé Claude"), L("لازم تبدا بـ sk-ant-", "Elle doit commencer par sk-ant-"), "warn"); return; }
      else if (k.length < 30) { App.toast(L("الـclé قصيرة برشا", "Clé trop courte"), L("ثبّت إلي كوبيت الـclé كاملة.", "Vérifie que tu as copié la clé entière."), "warn"); return; }
    }
    if (fd.model !== undefined && prov === fd.prov) NL.setModel(fd.model, prov);
    if (k) NL.setKey(k, prov); else NL.setProvider(prov);
    App.toast(L("تسجّل", "Enregistré"), k ? L("انزل «جرّب» باش تثبّت.", "Clique « Tester » pour vérifier.") : "", "good"); App.render();
  };
  App.acts.localProv = (el) => { NL.setProvider(el.dataset.p); App.render(); };
  App.acts.localKeyDel = () => App.confirm(L("تمسح الـclé API من الجهاز هذا؟", "Supprimer la clé API de cet appareil ?"), () => { NL.setKey("", NL.provider()); App.render(); });
  App.acts.localTest = async (el) => {
    const out = document.getElementById("lk-out"); el.disabled = true;
    if (out) out.innerHTML = `<span class="spinner"></span>`;
    try { const t = await NL.test(); if (out) out.innerHTML = `<span class="pill good">${I.check}${L("تخدم", "Ça marche")}</span> <span class="tiny muted">${U.esc(t.slice(0, 40))}</span>`; }
    catch (e) { if (out) out.innerHTML = `<span class="pill bad">${U.esc(App.aiError(e) || e.message || "")}</span>`; }
    el.disabled = false;
  };

  // never exported: API keys and per-device AI choices
  const SECRET = new Set(["apikey", "gemkey", "model", "gemmodel", "provider", "lastbackup", "lastBackup", "ailast"]);
  function allDocs() {
    const names = new Set(["settings", "moneycfg", "workcfg", "sport", "study", "notes", "deen", "review", "discover"]);
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^nhari:[a-z]+(-\d{4}-\d{2})?$/.test(k) && !SECRET.has(k.slice(6))) names.add(k.slice(6)); } } catch (e) { /* ignore */ }
    const out = {}; names.forEach(n => { const v = Store.lsGet(n) || Store.peek(n); if (v) out[n] = v; }); return out;
  }
  App.acts.backupFile = () => {
    const blob = new Blob([JSON.stringify({ app: "nhari", v: 1, at: new Date().toISOString(), docs: allDocs() })], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nhari-backup-" + U.dkey() + ".json";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    try { localStorage.setItem("nhari:lastBackup", U.dkey()); } catch (e) { /* ignore */ }
  };
  App.changes.restoreFile = (el) => {
    const f = el.files && el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => App.confirm(L("ترجّع النسخة هذي؟ البيانات اللي في الجهاز توا تتبدّل.", "Restaurer cette sauvegarde ? Les données actuelles de cet appareil seront remplacées."), () => App.forms.importData({ json: String(r.result || "") }));
    r.readAsText(f);
  };

  App.LocalBanner = () => {
    let fresh = false; try { fresh = !localStorage.getItem("nhari:settings") || !JSON.parse(localStorage.getItem("nhari:settings")).name; } catch (e) { fresh = true; }
    let lastB = ""; try { lastB = localStorage.getItem("nhari:lastBackup") || ""; } catch (e) { /* ignore */ }
    const setup = App.SetupBanner ? App.SetupBanner(fresh) : "";
    if (setup) return setup;
    if (fresh) return `<div class="card stripe saffron" style="margin-bottom:14px"><h3>${I.copy}${L("مرحبا بيك في Nhari", "Bienvenue dans Nhari")}</h3><p class="small">${L("باش تلقى البيانات متاعك (البرنامج، القراية، الجيم…): رجّع ملف النسخة nhari-backup.json.", "Pour retrouver tes données (programme, cours, salle…) : restaure le fichier nhari-backup.json.")}</p>
      <div class="row" style="margin-top:8px"><label class="btn primary" for="restore-first">${L("رجّع من ملف", "Restaurer depuis un fichier")}</label><input id="restore-first" class="hide" type="file" accept="application/json,.json" data-change="restoreFile"></div></div>`;
    if (U.dow() === 0 && lastB !== U.dkey()) return `<div class="card" style="margin-bottom:14px"><div class="row between"><span class="small">${L("نهار الأحد: نزّل نسخة احتياطية.", "Dimanche : fais ta sauvegarde.")}</span><button class="btn sm" data-act="backupFile">${L("نزّل", "Télécharger")}</button></div></div>`;
    return "";
  };

  // One-time data updates prepared by Claude for this device (patch.js, shipped only in the desktop
  // updates folder). Each patch runs once; its id is remembered (and kept in backups).
  function applyPatches() {
    const list = window.NhariPatches || []; if (!list.length) return;
    let done = {}; try { done = JSON.parse(localStorage.getItem("nhari:patches") || "{}") || {}; } catch (e) { done = {}; }
    let changed = false;
    for (const p of list) {
      if (!p || !p.id || done[p.id]) continue;
      try {
        const msg = p.apply({ Store, U, App, L });
        done[p.id] = new Date().toISOString(); changed = true;
        try { localStorage.setItem("nhari:patches", JSON.stringify(done)); } catch (e) { /* ignore */ }
        App.toast(L("تزادت بياناتك", "Données ajoutées"), msg || "", "good");
      } catch (e) { console.error("patch failed", p.id, e); }
    }
    if (changed) App.render();
  }
  if (isElectron) window.addEventListener("load", () => setTimeout(() => {
    const sc = document.createElement("script"); sc.src = "patch.js"; sc.onload = applyPatches; sc.onerror = () => {}; document.body.appendChild(sc);
  }, 600));

  // screenshots shared to the installed app (Android "Partager → Nhari") become tickets
  async function readShared() {
    if (!/[?&]share=1/.test(location.search) || !("caches" in window)) return;
    try { history.replaceState(null, "", location.pathname + "#work"); } catch (e) { /* ignore */ }
    const c = await caches.open("share-nhari"), keys = await c.keys();
    const imgs = [], texts = [];
    for (const k of keys) { const r = await c.match(k); if (!r) continue; if (/\/text$/.test(k.url)) texts.push(await r.text()); else { const b = await r.blob(); imgs.push(new File([b], "capture.jpg", { type: b.type || "image/jpeg" })); } await c.delete(k); }
    if (!imgs.length && !texts.length) return;
    for (let i = 0; i < 25 && !App.ai; i++) await new Promise(r => setTimeout(r, 200));
    App.go("work");
    if (!App.ai) { App.toast(L("زيد clé API باش يقرا التيكيات", "Ajoute une clé API pour lire les tickets"), "", "warn"); return; }
    App.importTickets(imgs.length ? { imgs } : { text: texts.join("\n") });
  }
  window.addEventListener("load", () => setTimeout(readShared, 300));

  // installable + offline (web version), and ask the browser to keep the data
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  window.addEventListener("online", () => App.render && App.render());
})();
