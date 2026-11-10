/* Nhari — sync between the PC and the phone through the user's own Firebase project.
   - Account: email + password (Firebase Authentication), typed by the user in the app.
   - Data: one Firestore document per app document, under data/users/{uid}/{name}, stored as JSON text
     (Firestore rejects nested arrays). Only the signed-in user can read or write their documents (rules).
   - First connection on a device: if the cloud is empty, this device's data is uploaded; if the cloud
     already has data and this device too, the user chooses which one to keep.
   - API keys (Gemini/Claude), the chosen AI and the device's backup date never leave the device. */
(function () {
  "use strict";
  const CFG = "nhari:fbconfig", INIT = "nhari:syncinit:";
  const LOCAL_ONLY = new Set(["apikey", "gemkey", "model", "gemmodel", "provider", "lastbackup", "lastBackup", "ailast", "fbconfig"]);
  const DEVICE = /Electron/i.test(navigator.userAgent) ? "pc" : /Android/i.test(navigator.userAgent) ? "android" : "web";
  let ready = false, auth = null, fdb = null, user = null, busy = false, lastErr = "";

  /* ---------- configuration (embedded, or pasted once in Réglages) ---------- */
  function parseConfig(text) {
    const s = String(text || "");
    try { const j = JSON.parse(s); if (j && j.apiKey && j.projectId) return j; } catch (e) { /* not JSON: read "key: value" pairs */ }
    const out = {};
    for (const k of ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]) {
      const m = s.match(new RegExp(k + "\\s*:\\s*[\"']([^\"']+)[\"']")); if (m) out[k] = m[1];
    }
    return out.apiKey && out.projectId ? out : null;
  }
  function config() {
    if (window.NHARI_FIREBASE && window.NHARI_FIREBASE.apiKey) return window.NHARI_FIREBASE;
    try { return JSON.parse(localStorage.getItem(CFG) || "null"); } catch (e) { return null; }
  }

  /* ---------- Firestore adapter with the API the Store expects ---------- */
  const wrapSnap = (s) => ({ exists: s.exists, metadata: s.metadata, data() { const x = s.data() || {}; if (typeof x.j === "string") { try { return JSON.parse(x.j); } catch (e) { return {}; } } return x; } });
  const errCode = (e) => { const c = (e && e.code) || ""; return c === "permission-denied" || c === "unauthenticated" ? "revoked" : c === "resource-exhausted" ? "quota_exceeded" : c === "invalid-argument" ? "invalid_argument" : c; };
  const wrapDb = (db) => ({
    collection(path) {
      const col = db.collection(path);
      return {
        doc(name) {
          const d = col.doc(name);
          return {
            set(body) { return d.set({ j: JSON.stringify(body), t: Date.now(), dev: DEVICE }).catch(e => { lastErr = String(e && (e.code || e.message)); throw { code: errCode(e) }; }); },
            get() { return d.get().then(wrapSnap); },
            onSnapshot(cb, err) { return d.onSnapshot((s) => cb(wrapSnap(s)), (e) => { lastErr = String(e && (e.code || e.message)); if (err) err({ code: errCode(e) }); }); }
          };
        }
      };
    }
  });

  function localNames() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const m = /^nhari:([a-z]+(?:-\d{4}-\d{2})?)$/.exec(localStorage.key(i) || "");
        if (m && !LOCAL_ONLY.has(m[1])) out.push(m[1]);
      }
    } catch (e) { /* ignore */ }
    return out;
  }

  function ask(title, body, a, b) {
    return new Promise((res) => {
      App.modal(title, `<div class="stack"><p class="small">${body}</p><button class="btn primary" id="syA">${a}</button><button class="btn" id="syB">${b}</button></div>`, (mb) => {
        mb.querySelector("#syA").onclick = () => { App.closeModal(); res("a"); };
        mb.querySelector("#syB").onclick = () => { App.closeModal(); res("b"); };
      });
    });
  }

  async function attach(u) {
    if (busy) return; busy = true;
    try {
      const col = fdb.collection("data/users/" + u.uid);
      const initKey = INIT + u.uid;
      if (!localStorage.getItem(initKey)) {
        Store.setStatus("loading");
        const snap = await col.doc("settings").get();
        const cloudHas = snap.exists && (() => { try { return !!JSON.parse(snap.data().j || "{}").name; } catch (e) { return false; } })();
        const localHas = !!Store.doc("settings").name;
        let dir = "push";
        if (cloudHas && !localHas) dir = "pull";
        else if (cloudHas && localHas) dir = (await ask(L("عندك بيانات في الزوز", "Données des deux côtés"),
          L("فما بيانات في السحاب (من جهاز آخر) وفي الجهاز هذا زادة. شنوة نخليو؟", "Il y a des données dans le cloud (autre appareil) et sur cet appareil. Lesquelles garder ?"),
          L("اللي في السحاب (تعوّض الجهاز هذا)", "Celles du cloud (remplacent cet appareil)"),
          L("اللي في الجهاز هذا (تعوّض السحاب)", "Celles de cet appareil (remplacent le cloud)"))) === "a" ? "pull" : "push";
        if (dir === "push") {
          const names = localNames();
          for (const n of names) { Store.doc(n); await col.doc(n).set({ j: Store.json[n] || JSON.stringify(Store.doc(n)), t: Date.now(), dev: DEVICE }); }
        } else {
          for (const n of localNames()) { try { localStorage.removeItem("nhari:" + n); } catch (e) { /* ignore */ } }
          Store.docs = {}; Store.json = {}; Store.localHad = {}; Store.dirty = {};
        }
        localStorage.setItem(initKey, dir + " " + new Date().toISOString());
        App.toast(L("الأجهزة مربوطة", "Appareils reliés"), dir === "push" ? L("بياناتك تبعثت للسحاب.", "Tes données ont été envoyées dans le cloud.") : L("جبت البيانات من السحاب.", "Données récupérées depuis le cloud."), "good");
      }
      Store.db = wrapDb(fdb); Store.uid = u.uid; Store.mode = "cloud"; Store.readOnly = false; Store.subs = {}; Store.fetched = {};
      Store.setStatus("loading");
      clearTimeout(Store.loadTimer); Store.loadTimer = setTimeout(() => { if (Store.status === "loading") Store.setStatus("slow"); }, 12000);
      Object.keys(Store.docs).forEach(n => Store.ensure(n));
      App.render();
    } catch (e) {
      lastErr = String(e && (e.code || e.message || e)); Store.setStatus("err");
      App.toast(L("المزامنة ما خدمتش", "Synchronisation impossible"), lastErr.slice(0, 120), "warn");
    } finally { busy = false; }
  }
  function detach() {
    Object.values(Store.subs || {}).forEach(f => { try { if (typeof f === "function") f(); } catch (e) { /* ignore */ } });
    Store.subs = {}; Store.fetched = {}; Store.mode = "local"; Store.db = null; Store.uid = null; Store.setStatus("local");
  }

  function init() {
    if (ready) return true;
    const c = config(); if (!c || !window.firebase) return false;
    try {
      const appf = firebase.apps.length ? firebase.app() : firebase.initializeApp(c);
      auth = appf.auth(); fdb = appf.firestore();
      auth.onAuthStateChanged((u) => { user = u; if (u) attach(u); else detach(); App.render(); });
      ready = true;
    } catch (e) { lastErr = String(e && e.message); }
    return ready;
  }

  /* ---------- Réglages card ---------- */
  const authErr = (e) => {
    const c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return L("الإيميل ولا كلمة السر غالطين.", "E-mail ou mot de passe incorrect.");
    if (/email-already-in-use/.test(c)) return L("الإيميل هذا عندو حساب: اعمل «دخول».", "Cet e-mail a déjà un compte : utilise « Se connecter ».");
    if (/weak-password/.test(c)) return L("كلمة السر لازمها 6 حروف على الأقل.", "Mot de passe : 6 caractères minimum.");
    if (/invalid-email/.test(c)) return L("الإيميل موش صحيح.", "E-mail invalide.");
    if (/network/.test(c)) return L("ما فماش انترنت.", "Pas de connexion internet.");
    if (/operation-not-allowed/.test(c)) return L("فعّل «E-mail/Mot de passe» في Firebase ← Authentication.", "Active « E-mail/Mot de passe » dans Firebase → Authentication.");
    if (/api-key|invalid-api-key/.test(c)) return L("الـconfig متاع Firebase غالطة.", "La config Firebase est incorrecte.");
    return c || String(e && e.message || e);
  };
  App.SyncPrefs = () => {
    const c = config();
    const head = `<h3>${I.link}${L("ربط الـPC والتلفون", "Relier le PC et le téléphone")}</h3>`;
    if (!c) return `<div class="card stripe saffron" style="grid-column:1/-1">${head}
      <p class="small muted">${L("الصق هنا الـconfig متاع مشروع Firebase (const firebaseConfig = {…}).", "Colle ici la config de ton projet Firebase (const firebaseConfig = {…}).")}</p>
      <form data-form="syncCfg" class="stack" style="margin-top:8px"><textarea id="sy-cfg" name="cfg" style="min-height:110px" dir="ltr" placeholder="const firebaseConfig = { apiKey: ..., projectId: ... }"></textarea><button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button></form></div>`;
    if (!init()) return `<div class="card" style="grid-column:1/-1">${head}<div class="alertbox warn small">${U.esc(lastErr || "Firebase")}</div></div>`;
    if (!user) return `<div class="card stripe accent" style="grid-column:1/-1">${head}
      <p class="small muted">${L("نفس الحساب في الـPC والتلفون. أول مرة: «حساب جديد» في الجهاز اللي فيه البيانات (الـPC)، وبعد «دخول» في التلفون.", "Même compte sur le PC et le téléphone. La 1re fois : « Nouveau compte » sur l'appareil qui a les données (le PC), puis « Se connecter » sur le téléphone.")}</p>
      <form data-form="syncIn" class="form" style="margin-top:8px">
        <label class="f">${L("الإيميل", "E-mail")}<input id="sy-mail" name="email" type="email" autocomplete="username" required dir="ltr"></label>
        <label class="f">${L("كلمة السر (6 حروف ولا أكثر)", "Mot de passe (6+ caractères)")}<input id="sy-pass" name="pass" type="password" autocomplete="current-password" required minlength="6" dir="ltr"></label>
        <button class="btn primary" type="submit" name="mode" value="in">${L("دخول", "Se connecter")}</button>
        <button class="btn" type="submit" name="mode" value="new">${L("حساب جديد", "Nouveau compte")}</button>
        <button class="btn ghost" type="button" data-act="syncReset">${L("نسيت كلمة السر", "Mot de passe oublié")}</button>
      </form><div id="sy-out" class="small" style="margin-top:6px"></div>
      <p class="tiny muted" style="margin-top:6px">${L("كلمة السر هذي خاصة بـNhari: ما تستعملش نفس كلمة السر متاع Gmail.", "Ce mot de passe est propre à Nhari : n'utilise pas celui de ton Gmail.")}</p></div>`;
    const init0 = localStorage.getItem(INIT + user.uid) || "";
    return `<div class="card stripe good" style="grid-column:1/-1">${head}
      <div class="row between" style="flex-wrap:wrap;gap:8px"><span class="small"><bdi>${U.esc(user.email || "")}</bdi> · ${App.syncChip()}</span><button class="btn sm" data-act="syncOut">${L("خروج", "Se déconnecter")}</button></div>
      <p class="tiny muted" style="margin-top:6px">${L("كل تبديل يتبعث للأجهزة الأخرى وحدو (يستحق انترنت؛ بلا انترنت يتسجّل في الجهاز ويتبعث بعد). الـclé API ما تتبعثش.", "Chaque modification part vers les autres appareils (internet requis ; sinon elle est gardée et envoyée plus tard). Les clés API ne sont jamais envoyées.")}${init0 ? " · " + U.esc(init0.split(" ")[0] === "push" ? L("الجهاز هذا بعث بياناتو", "cet appareil a envoyé ses données") : L("الجهاز هذا جاب البيانات من السحاب", "cet appareil a récupéré les données")) : ""}</p></div>`;
  };
  App.forms.syncCfg = (fd) => {
    const c = parseConfig(fd.cfg);
    if (!c) { App.toast(L("ما فهمتش الـconfig", "Config illisible"), L("كوبي البلوك كامل متاع firebaseConfig.", "Copie le bloc firebaseConfig en entier."), "warn"); return; }
    localStorage.setItem(CFG, JSON.stringify(c)); App.toast(L("تسجّل", "Enregistré"), c.projectId, "good"); App.render();
  };
  App.forms.syncIn = async (fd, form, ev) => {
    if (!init()) return;
    const mode = (ev && ev.submitter && ev.submitter.value) || fd.mode || "in";
    const out = document.getElementById("sy-out"); if (out) out.innerHTML = `<span class="spinner"></span>`;
    try {
      if (mode === "new") await auth.createUserWithEmailAndPassword(fd.email.trim(), fd.pass);
      else await auth.signInWithEmailAndPassword(fd.email.trim(), fd.pass);
    } catch (e) { if (out) out.innerHTML = `<div class="alertbox warn small">${U.esc(authErr(e))}</div>`; }
  };
  App.acts.syncReset = async () => {
    const m = document.getElementById("sy-mail"); const email = m && m.value.trim();
    if (!email || !init()) { App.toast(L("اكتب الإيميل قبل", "Écris d'abord ton e-mail"), "", "warn"); return; }
    try { await auth.sendPasswordResetEmail(email); App.toast(L("بعثنالك إيميل", "E-mail envoyé"), L("حل الإيميل باش تبدّل كلمة السر.", "Ouvre l'e-mail pour changer le mot de passe."), "good"); }
    catch (e) { App.toast(authErr(e), "", "warn"); }
  };
  App.acts.syncOut = () => App.confirm(L("تخرج من الحساب؟ البيانات تبقى في الجهاز هذا، أما ما عادش تتبعث.", "Se déconnecter ? Les données restent sur cet appareil mais ne sont plus synchronisées."), () => { auth.signOut(); });

  window.NhariSync = { parseConfig, config, init, localNames, status: () => ({ ready, user: user && user.email, err: lastErr }) };
  window.addEventListener("load", () => setTimeout(init, 200));
})();
