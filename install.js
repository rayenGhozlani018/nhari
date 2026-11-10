/* Nhari — help to put the app on the phone (install button, QR code on the PC) and to link the devices */
(function () {
  "use strict";
  const SITE = "https://rayenghozlani018.github.io/nhari/";
  const QR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><rect width="33" height="33" fill="#fff"/><path d="M2 2h7v1h-7zM10 2h2v1h-2zM16 2h3v1h-3zM22 2h1v1h-1zM24 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1zM13 3h1v1h-1zM15 3h2v1h-2zM20 3h3v1h-3zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-1zM11 4h2v1h-2zM14 4h1v1h-1zM19 4h2v1h-2zM24 4h1v1h-1zM26 4h3v1h-3zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h3v1h-3zM8 5h1v1h-1zM10 5h1v1h-1zM15 5h2v1h-2zM18 5h1v1h-1zM22 5h1v1h-1zM24 5h1v1h-1zM26 5h3v1h-3zM30 5h1v1h-1zM2 6h1v1h-1zM4 6h3v1h-3zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h8v1h-8zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h3v1h-3zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h2v1h-2zM15 7h2v1h-2zM18 7h1v1h-1zM20 7h2v1h-2zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h7v1h-7zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h7v1h-7zM10 9h2v1h-2zM14 9h1v1h-1zM16 9h1v1h-1zM19 9h1v1h-1zM2 10h1v1h-1zM6 10h1v1h-1zM8 10h6v1h-6zM17 10h1v1h-1zM19 10h2v1h-2zM22 10h6v1h-6zM30 10h1v1h-1zM4 11h1v1h-1zM6 11h1v1h-1zM9 11h2v1h-2zM12 11h2v1h-2zM15 11h1v1h-1zM17 11h1v1h-1zM19 11h2v1h-2zM24 11h7v1h-7zM4 12h3v1h-3zM8 12h4v1h-4zM14 12h2v1h-2zM17 12h1v1h-1zM20 12h1v1h-1zM30 12h1v1h-1zM3 13h1v1h-1zM10 13h1v1h-1zM19 13h1v1h-1zM21 13h3v1h-3zM27 13h1v1h-1zM29 13h2v1h-2zM3 14h2v1h-2zM6 14h1v1h-1zM8 14h2v1h-2zM11 14h4v1h-4zM17 14h1v1h-1zM19 14h1v1h-1zM22 14h2v1h-2zM29 14h1v1h-1zM3 15h1v1h-1zM5 15h2v1h-2zM10 15h3v1h-3zM14 15h1v1h-1zM16 15h3v1h-3zM20 15h1v1h-1zM24 15h7v1h-7zM2 16h1v1h-1zM4 16h1v1h-1zM6 16h3v1h-3zM10 16h5v1h-5zM17 16h1v1h-1zM20 16h1v1h-1zM22 16h1v1h-1zM24 16h1v1h-1zM27 16h2v1h-2zM30 16h1v1h-1zM3 17h1v1h-1zM5 17h2v1h-2zM12 17h3v1h-3zM16 17h5v1h-5zM25 17h2v1h-2zM29 17h2v1h-2zM4 18h1v1h-1zM7 18h3v1h-3zM11 18h2v1h-2zM16 18h2v1h-2zM19 18h1v1h-1zM21 18h3v1h-3zM25 18h1v1h-1zM29 18h1v1h-1zM2 19h2v1h-2zM7 19h1v1h-1zM10 19h1v1h-1zM14 19h1v1h-1zM16 19h5v1h-5zM24 19h4v1h-4zM29 19h2v1h-2zM4 20h1v1h-1zM6 20h4v1h-4zM11 20h3v1h-3zM15 20h5v1h-5zM23 20h1v1h-1zM28 20h1v1h-1zM30 20h1v1h-1zM4 21h2v1h-2zM10 21h3v1h-3zM16 21h1v1h-1zM19 21h2v1h-2zM22 21h4v1h-4zM29 21h2v1h-2zM2 22h3v1h-3zM6 22h1v1h-1zM8 22h2v1h-2zM11 22h1v1h-1zM13 22h5v1h-5zM19 22h1v1h-1zM22 22h6v1h-6zM30 22h1v1h-1zM10 23h1v1h-1zM12 23h1v1h-1zM16 23h2v1h-2zM21 23h2v1h-2zM26 23h1v1h-1zM30 23h1v1h-1zM2 24h7v1h-7zM10 24h13v1h-13zM24 24h1v1h-1zM26 24h3v1h-3zM30 24h1v1h-1zM2 25h1v1h-1zM8 25h1v1h-1zM11 25h1v1h-1zM13 25h3v1h-3zM18 25h2v1h-2zM21 25h2v1h-2zM26 25h1v1h-1zM30 25h1v1h-1zM2 26h1v1h-1zM4 26h3v1h-3zM8 26h1v1h-1zM10 26h3v1h-3zM15 26h1v1h-1zM19 26h1v1h-1zM21 26h7v1h-7zM30 26h1v1h-1zM2 27h1v1h-1zM4 27h3v1h-3zM8 27h1v1h-1zM11 27h11v1h-11zM23 27h1v1h-1zM30 27h1v1h-1zM2 28h1v1h-1zM4 28h3v1h-3zM8 28h1v1h-1zM11 28h1v1h-1zM14 28h4v1h-4zM19 28h1v1h-1zM22 28h2v1h-2zM27 28h4v1h-4zM2 29h1v1h-1zM8 29h1v1h-1zM11 29h1v1h-1zM14 29h1v1h-1zM17 29h1v1h-1zM19 29h1v1h-1zM21 29h2v1h-2zM25 29h3v1h-3zM29 29h2v1h-2zM2 30h7v1h-7zM10 30h2v1h-2zM13 30h1v1h-1zM15 30h1v1h-1zM18 30h2v1h-2zM22 30h3v1h-3zM26 30h1v1h-1zM29 30h1v1h-1z" fill="#000"/></svg>';
  const ua = navigator.userAgent;
  const isElectron = /Electron/i.test(ua);
  const mobile = /Android|iPhone|iPad/i.test(ua);
  const standalone = () => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } };
  const linked = () => !!(window.NhariSync && window.NhariSync.status().user);
  let deferred = null, justInstalled = false;

  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; if (App.render) App.render(); });
  window.addEventListener("appinstalled", () => {
    deferred = null; justInstalled = true;
    App.toast(L("التطبيق تنصّب", "Application installée"), L("تلقاه في الشاشة متاع التلفون: Nhari.", "Tu la trouves sur l'écran d'accueil : Nhari."), "good");
    if (App.render) App.render();
  });

  function howTo() {
    if (/FBAN|FBAV|Instagram|Messenger|; wv\)/i.test(ua)) return L("الرابط تحلّ داخل تطبيق آخر (مسنجر، فيسبوك…). انزل على ⋮ ولا … الفوق ← «Ouvrir dans Chrome» / «Ouvrir dans le navigateur»، وبعد ارجع هنا.", "Le lien s'est ouvert dans une autre appli (Messenger, Facebook…). Touche ⋮ ou … en haut → « Ouvrir dans Chrome / le navigateur », puis reviens ici.");
    if (/SamsungBrowser/i.test(ua)) return L("انزل على ≡ (اللوطة) ← «Ajouter page à» ← «Écran d'accueil».", "Touche ≡ (en bas) → « Ajouter page à » → « Écran d'accueil ».");
    if (/iPhone|iPad/i.test(ua)) return L("في Safari: انزل على زر المشاركة ⬆️ ← «Sur l'écran d'accueil».", "Dans Safari : bouton Partager ⬆️ → « Sur l'écran d'accueil ».");
    return L("في Chrome: انزل على ⋮ (الفوق على اليمين) ← «Installer l'application» ولا «Ajouter à l'écran d'accueil» ← «Installer».", "Dans Chrome : touche ⋮ (en haut à droite) → « Installer l'application » ou « Ajouter à l'écran d'accueil » → « Installer ».");
  }

  const qrBlock = () => `<div class="row" style="gap:14px;align-items:center;flex-wrap:wrap;margin-top:8px">
      <div style="width:150px;height:150px;flex:none;background:#fff;padding:6px;border-radius:10px" aria-label="QR code">${QR}</div>
      <ol class="small" style="margin:0;padding-inline-start:20px;line-height:1.9;flex:1;min-width:200px">
        <li>${L("حلّ الكاميرا متاع التلفون وصوّر الكود هذا (ولا اكتب الرابط في Chrome).", "Ouvre l'appareil photo du téléphone et vise ce code (ou tape le lien dans Chrome).")}</li>
        <li>${L("يتحلّ Nhari في Chrome: انزل على الزر الكبير «نصّب التطبيق».", "Nhari s'ouvre dans Chrome : touche le gros bouton « Installer l'application ».")}</li>
        <li>${L("في التلفون: الإعدادات ← «ربط الـPC والتلفون» ← نفس الإيميل وكلمة السر ← «دخول».", "Sur le téléphone : Réglages → « Relier le PC et le téléphone » → même e-mail et mot de passe → « Se connecter ».")}</li>
      </ol></div>
      <p class="tiny muted" style="margin-top:6px" dir="ltr"><bdi>${SITE}</bdi></p>`;

  // Réglages on the PC: the QR code for the phone, right under the sync card
  App.PhoneQR = () => isElectron ? `<div class="card stripe accent" style="grid-column:1/-1"><h3>${I.link}${L("التطبيق في التلفون", "L'app sur le téléphone")}</h3>
      ${linked() ? "" : `<div class="alertbox warn small">${L("قبل كل شي: اعمل «حساب جديد» في الكارطة اللي الفوق، باش بيانات الـPC تطلع للحساب.", "D'abord : « Nouveau compte » dans la carte au-dessus, pour envoyer les données du PC dans le compte.")}</div>`}
      ${qrBlock()}</div>` : "";

  App.acts.pwaInstall = async () => {
    if (!deferred) { App.toast(L("كيفاش تنصّبو", "Comment l'installer"), howTo(), "info"); return; }
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) { /* ignore */ }
    deferred = null; App.render();
  };
  App.acts.syncGo = () => {
    App.go("prefs");
    setTimeout(() => { const el = document.getElementById("sync-card"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
  };

  // top of Today: install (phone in the browser), then link the devices (until the account is connected)
  App.SetupBanner = (fresh) => {
    let html = "";
    if (!isElectron && mobile && !standalone() && !justInstalled) html += `<div class="card stripe accent" style="margin-bottom:14px"><h3>📲 ${L("نصّب Nhari على التلفون", "Installer Nhari sur le téléphone")}</h3>
      ${deferred ? `<button class="btn primary full" style="width:100%;font-size:1.15rem;padding:16px" data-act="pwaInstall">${L("نصّب التطبيق", "Installer l'application")}</button>
        <p class="tiny muted" style="margin-top:6px">${L("يولّي عندك icône Nhari في الشاشة، ويخدم حتى بلا انترنت.", "Une icône Nhari apparaît sur l'écran d'accueil ; ça marche même sans internet.")}</p>`
        : `<p class="small">${howTo()}</p>`}</div>`;
    if (window.NhariSync && window.NhariSync.status().ready && !linked()) html += `<div class="card stripe saffron" style="margin-bottom:14px"><h3>${I.link}${L("اربط الـPC والتلفون", "Relier le PC et le téléphone")}</h3>
      <p class="small">${isElectron ? L("اعمل حساب Nhari (إيميل + كلمة سر) هنا في الـPC، وبعد ادخل بيه في التلفون: كل تبديل في جهاز يوصل للآخر وحدو.", "Crée un compte Nhari (e-mail + mot de passe) ici sur le PC, puis connecte-toi avec sur le téléphone : chaque modification passe seule à l'autre appareil.") : L("ادخل بنفس الإيميل وكلمة السر اللي عملتهم في الـPC، وتوصلك البيانات الكل.", "Connecte-toi avec l'e-mail et le mot de passe créés sur le PC : toutes tes données arrivent.")}</p>
      <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px"><button class="btn primary" data-act="syncGo">${isElectron ? L("اعمل الحساب", "Créer le compte") : L("ادخل", "Se connecter")}</button>
      ${fresh ? `<label class="btn ghost" for="restore-first2">${L("ولا رجّع من ملف", "ou restaurer un fichier")}</label><input id="restore-first2" class="hide" type="file" accept="application/json,.json" data-change="restoreFile">` : ""}</div></div>`;
    return html;
  };
})();
