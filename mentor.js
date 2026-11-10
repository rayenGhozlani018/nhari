/* Nhari — Project mentor (encadrement) + "Discover" suggestions (podcasts, series, skills) */
(function () {
  "use strict";
  const R = (t, u) => ({ t, u });
  const T = (id, min, ar, fr, okAr, okFr, res) => ({ id, min, ar, fr, ok: { ar: okAr, fr: okFr }, res: res || [] });
  const RES = {
    fastapi: R("FastAPI — Tutorial", "https://fastapi.tiangolo.com/tutorial/"),
    top10: R("OWASP Top 10", "https://owasp.org/Top10/"),
    asvs: R("OWASP ASVS", "https://owasp.org/www-project-application-security-verification-standard/"),
    dragon: R("OWASP Threat Dragon", "https://owasp.org/www-project-threat-dragon/"),
    stride: R("STRIDE (Microsoft)", "https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats"),
    cheat: R("OWASP Cheat Sheet Series", "https://cheatsheetseries.owasp.org/"),
    pwd: R("Password Storage Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html"),
    jwt: R("PortSwigger — JWT attacks", "https://portswigger.net/web-security/jwt"),
    access: R("PortSwigger — Access control", "https://portswigger.net/web-security/access-control"),
    aead: R("cryptography.io — AEAD (AES-GCM)", "https://cryptography.io/en/latest/hazmat/primitives/aead/"),
    pytest: R("pytest", "https://docs.pytest.org/"),
    headers: R("OWASP Secure Headers", "https://owasp.org/www-project-secure-headers/"),
    slowapi: R("slowapi (rate limiting)", "https://github.com/laurentS/slowapi"),
    gha: R("GitHub Actions", "https://docs.github.com/en/actions"),
    semgrep: R("Semgrep", "https://semgrep.dev/docs/"),
    pipaudit: R("pip-audit", "https://github.com/pypa/pip-audit"),
    gitleaks: R("gitleaks", "https://github.com/gitleaks/gitleaks"),
    trivy: R("Trivy", "https://github.com/aquasecurity/trivy"),
    docker: R("Docker docs", "https://docs.docker.com/"),
    awsfree: R("AWS Free Tier", "https://aws.amazon.com/free/"),
    certbot: R("Certbot (Let's Encrypt)", "https://certbot.eff.org/"),
    zap: R("OWASP ZAP", "https://www.zaproxy.org/docs/"),
    academy: R("PortSwigger Web Security Academy", "https://portswigger.net/web-security"),
    cvss: R("CVSS 3.1 calculator", "https://www.first.org/cvss/calculator/3.1")
  };

  const PROJECT = {
    id: "ticketguard",
    title: "TicketGuard",
    sub: { ar: "API آمنة لتسيير تدخلات التقنيين في الميدان، مع pipeline DevSecOps ونشر محمي على AWS، وفي الآخر تهاجمها بروحك وتكتب تقرير pentest.", fr: "Une API sécurisée de gestion des interventions terrain, avec un pipeline DevSecOps, un déploiement durci sur AWS, puis ton propre pentest et son rapport." },
    why: [
      { ar: "تجمع كل مواد السداسي: OWASP، DevSec، Crypto، Python، AWS، أمن الشبكات.", fr: "Elle réunit tous tes modules du semestre : OWASP, DevSec, Crypto, Python, AWS, sécurité réseau." },
      { ar: "مبنية على خدمتك انت: تيكيات فيها أسامي وتلفونات وعناوين الحرفاء = بيانات شخصية لازمها حماية. تفهم المستعمل خير من أي واحد.", fr: "Elle part de ton vrai métier : des tickets avec noms, téléphones et adresses = données personnelles à protéger. Tu connais l'utilisateur mieux que personne." },
      { ar: "تولّي portfolio على GitHub + مقال + فيديو، وتنجم تكون قاعدة لمشروع التخرج (PFE) العام الجاي.", fr: "Elle devient un portfolio GitHub + article + vidéo, et peut servir de base à ton PFE l'an prochain." },
      { ar: "AppSec وDevSecOps مطلوبين في تونس (البنوك، شركات الخدمات) وفي الخدمة عن بعد.", fr: "AppSec et DevSecOps sont recherchés en Tunisie (banques, ESN, MSSP) et en remote." }
    ],
    weeks: [
      { ar: "التحضير", fr: "Cadrage", tasks: [
        T("w1a", 45, "اعمل repo على GitHub اسمو ticketguard واكتب README: المشكل، 3 أدوار (تقني، مشرف، أدمين) و6 user stories.", "Crée le repo GitHub « ticketguard » et un README : problème, 3 rôles (technicien, superviseur, admin), 6 user stories.", "README متاعك في GitHub.", "README poussé sur GitHub."),
        T("w1b", 45, "ركّب Python 3.12 وvenv وFastAPI، واعمل endpoint /health.", "Installe Python 3.12, un venv et FastAPI ; crée un endpoint /health.", "GET /health يرجّع ok.", "GET /health renvoie ok.", [RES.fastapi]),
        T("w1c", 30, "اقرا OWASP Top 10 واكتب 5 سطور: أما مخاطر تمس TicketGuard.", "Lis l'OWASP Top 10 et écris 5 lignes : quels risques touchent TicketGuard.", "ملف NOTES.md فيه الـ5 سطور.", "NOTES.md avec ces 5 lignes.", [RES.top10])
      ] },
      { ar: "نموذج التهديدات", fr: "Modélisation des menaces", tasks: [
        T("w2a", 60, "ارسم Data Flow Diagram (تطبيق ← API ← قاعدة بيانات) واكتب الأصول: بيانات الحرفاء، كلمات السر، GPS، tokens.", "Dessine le DFD (app → API → base) et liste les actifs : données clients, mots de passe, GPS, tokens.", "صورة الـDFD في الـrepo.", "Image du DFD dans le repo.", [RES.dragon]),
        T("w2b", 60, "جدول STRIDE: تهديد ولا زوز لكل عنصر، مع الحماية.", "Tableau STRIDE : 1–2 menaces par élément, avec la contre-mesure.", "THREAT_MODEL.md.", "THREAT_MODEL.md.", [RES.stride]),
        T("w2c", 45, "اختار 15 متطلب من ASVS level 1 وحطهم checklist.", "Choisis 15 exigences ASVS niveau 1 et fais-en une checklist.", "SECURITY_REQUIREMENTS.md.", "SECURITY_REQUIREMENTS.md.", [RES.asvs])
      ] },
      { ar: "هيكل الـAPI", fr: "Squelette de l'API", tasks: [
        T("w3a", 60, "Model Ticket (حريف، تلفون، عنوان، GPS، حالة، تقني) بـPydantic وSQLite.", "Modèle Ticket (client, téléphone, adresse, GPS, statut, technicien) avec Pydantic et SQLite.", "الجدول يتعمل وحدو كي تخدّم.", "La table se crée au démarrage.", [RES.fastapi]),
        T("w3b", 60, "CRUD على /tickets مع رسائل خطأ واضحة كي يكون الـinput غالط.", "CRUD sur /tickets avec erreurs claires si l'entrée est invalide.", "تجربهم الكل من /docs.", "Tout testable depuis /docs."),
        T("w3c", 45, "5 tests بـpytest (create، list، update، input غالط...).", "5 tests pytest (création, liste, mise à jour, entrée invalide…).", "pytest أخضر.", "pytest au vert.", [RES.pytest])
      ] },
      { ar: "التعريف والصلاحيات", fr: "Authentification et contrôle d'accès", tasks: [
        T("w4a", 60, "جدول users وكلمات سر بـArgon2، register/login.", "Table users, mots de passe en Argon2, register/login.", "كلمة السر ما تتسجلش بالواضح.", "Aucun mot de passe en clair.", [RES.pwd]),
        T("w4b", 60, "JWT قصير (15 دقيقة) + refresh. ارفض alg=none وثبّت exp.", "JWT court (15 min) + refresh. Refuse alg=none, vérifie exp.", "test يثبت إلي token منتهي يترفض.", "Un test prouve qu'un token expiré est refusé.", [RES.jwt]),
        T("w4c", 60, "RBAC + تثبّت في كل تيكي: التقني يشوف كان تيكياتو. tests ضد IDOR.", "RBAC + contrôle par objet : un technicien ne voit que ses tickets. Tests anti-IDOR.", "test: تقني ما ينجمش يقرا تيكي متاع غيرو.", "Test : un technicien ne lit pas le ticket d'un autre.", [RES.access])
      ] },
      { ar: "التشفير", fr: "Chiffrement au repos", tasks: [
        T("w5a", 45, "اقرا AES-GCM وقرّر: شنوة يتشفر، وين المفتاح، كيفاش الـnonce.", "Lis AES-GCM et décide : quels champs chiffrer, où est la clé, gestion du nonce.", "ملاحظات في CRYPTO.md.", "Notes dans CRYPTO.md.", [RES.aead]),
        T("w5b", 60, "شفّر التلفون والعنوان في القاعدة (AES-GCM) + tests.", "Chiffre téléphone et adresse en base (AES-GCM) + tests.", "في القاعدة تلقى ciphertext برك.", "La base ne contient que du chiffré.", [RES.aead]),
        T("w5c", 30, "كمّل CRYPTO.md: علاش GCM، nonce فريد، كيفاش تبدّل المفتاح.", "Complète CRYPTO.md : pourquoi GCM, nonce unique, rotation de clé.", "CRYPTO.md كامل.", "CRYPTO.md complet.")
      ] },
      { ar: "التقوية", fr: "Durcissement", tasks: [
        T("w6a", 45, "Rate limiting على login + تبطيء بعد محاولات فاشلة.", "Rate limiting sur le login + ralentissement après échecs.", "test: المحاولة 6 تترفض.", "Test : la 6e tentative est bloquée.", [RES.slowapi]),
        T("w6b", 45, "Security headers + CORS مضبوط + أخطاء بلا stack trace.", "En-têtes de sécurité + CORS strict + erreurs sans stack trace.", "الـheaders ظاهرين في الـresponse.", "En-têtes visibles dans les réponses.", [RES.headers]),
        T("w6c", 45, "Audit log: شكون عمل شنوة ووقتاش، بلا بيانات شخصية.", "Journal d'audit : qui a fait quoi et quand, sans données personnelles.", "مثال log في README.", "Exemple de log dans le README.", [RES.cheat])
      ] },
      { ar: "DevSecOps في الـCI", fr: "CI DevSecOps", tasks: [
        T("w7a", 45, "GitHub Actions: tests في كل push.", "GitHub Actions : tests à chaque push.", "badge أخضر.", "Badge vert.", [RES.gha]),
        T("w7b", 60, "زيد Semgrep (SAST) وpip-audit، وصلّح اللي يطلع.", "Ajoute Semgrep (SAST) et pip-audit, corrige les résultats.", "الـpipeline يفشل كي فما مشكل خطير.", "Le pipeline échoue sur un problème grave.", [RES.semgrep, RES.pipaudit]),
        T("w7c", 30, "زيد gitleaks. جرّب secret مزيف في branch وشوفو يتحبس، ومن بعد امسحو.", "Ajoute gitleaks. Teste un faux secret sur une branche, vérifie le blocage, puis supprime-le.", "capture للـpipeline اللي حبس.", "Capture du pipeline bloqué.", [RES.gitleaks])
      ] },
      { ar: "Containers", fr: "Conteneurs", tasks: [
        T("w8a", 60, "Dockerfile: image صغيرة، user موش root، بلا أسرار في الـimage.", "Dockerfile : image slim, utilisateur non-root, aucun secret dans l'image.", "docker run يخدم.", "docker run fonctionne.", [RES.docker]),
        T("w8b", 45, "Trivy في الـCI، يفشل على HIGH/CRITICAL.", "Trivy en CI, échec sur HIGH/CRITICAL.", "تقرير Trivy في الـpipeline.", "Rapport Trivy dans le pipeline.", [RES.trivy]),
        T("w8c", 30, "اكتب في README كيفاش تخدّم المشروع.", "Documente le lancement dans le README.", "واحد آخر ينجم يخدّمو.", "Quelqu'un d'autre peut le lancer.")
      ] },
      { ar: "النشر على AWS", fr: "Déploiement AWS", tasks: [
        T("w9a", 60, "حساب AWS free tier + MFA على root + alarme فلوس + IAM user بأقل صلاحيات.", "Compte AWS free tier + MFA sur root + alerte de facturation + utilisateur IAM à privilèges minimaux.", "capture للـbilling alarm.", "Capture de l'alerte de facturation.", [RES.awsfree]),
        T("w9b", 60, "EC2 micro: port 22 من IP متاعك برك، SSH بالمفتاح، وخدّم الـcontainer.", "EC2 micro : port 22 depuis ton IP seulement, SSH par clé, lance le conteneur.", "الـAPI تجاوب من برّا.", "L'API répond depuis l'extérieur."),
        T("w9c", 45, "Nginx + HTTPS (Let's Encrypt) + تحويل 80 ← 443.", "Nginx + HTTPS (Let's Encrypt) + redirection 80 → 443.", "القفل الأخضر في المتصفح.", "Cadenas valide dans le navigateur.", [RES.certbot])
      ] },
      { ar: "هاجم التطبيق متاعك", fr: "Attaque ta propre app", tasks: [
        T("w10a", 45, "OWASP ZAP baseline على التطبيق متاعك برك.", "OWASP ZAP baseline sur TON application uniquement.", "تقرير ZAP محفوظ.", "Rapport ZAP sauvegardé.", [RES.zap]),
        T("w10b", 60, "2 labs access control + 1 lab JWT في PortSwigger، ومن بعد جرّب نفس الحاجة على TicketGuard.", "2 labs contrôle d'accès + 1 lab JWT sur PortSwigger, puis la même chose sur TicketGuard.", "3 labs solved.", "3 labs résolus.", [RES.academy]),
        T("w10c", 45, "سجّل اللي لقيتو في FINDINGS.md مع الخطورة.", "Note tes trouvailles dans FINDINGS.md avec leur gravité.", "FINDINGS.md.", "FINDINGS.md.")
      ] },
      { ar: "التصليح والتقرير", fr: "Correctifs et rapport", tasks: [
        T("w11a", 60, "صلّح الثغرات وزيد tests تمنع رجوعها.", "Corrige les failles et ajoute des tests de non-régression.", "الـtests الجداد خضر.", "Nouveaux tests au vert."),
        T("w11b", 60, "تقرير pentest (4–6 صفحات): scope، منهجية، ثغرات بـCVSS، حلول.", "Rapport de pentest (4–6 pages) : périmètre, méthode, failles avec CVSS, remédiations.", "PDF في الـrepo.", "PDF dans le repo.", [RES.cvss]),
        T("w11c", 30, "عاود CI وZAP: الكل أخضر.", "Relance CI et ZAP : tout au vert.", "capture.", "Capture.")
      ] },
      { ar: "العرض", fr: "Valorisation", tasks: [
        T("w12a", 45, "مقال على Medium ولا dev.to: «كيفاش بنيت API آمنة لتيكيات الميدان».", "Article Medium ou dev.to : « Construire une API sécurisée pour des tickets terrain ».", "رابط المقال.", "Lien de l'article."),
        T("w12b", 30, "بوست LinkedIn + فيديو demo دقيقتين.", "Post LinkedIn + démo vidéo de 2 min.", "البوست منشور.", "Post publié."),
        T("w12c", 45, "صفحة وحدة PFE: المشكل، الإضافة، التقنيات، التطوير (تطبيق موبايل، SIEM).", "Une page « pitch PFE » : problème, apport, technos, suites (app mobile, SIEM).", "تبعثها لأستاذ ولا شركة.", "Envoyée à un prof ou une entreprise.")
      ] }
    ]
  };
  const ALTS = [
    { id: "soclab", title: "SOC Home Lab", ar: "مختبر SOC: Wazuh كـSIEM + honeypot على AWS + 10 قواعد كشف + تقارير حوادث. للي يحب يخدم analyst SOC.", fr: "Lab SOC : Wazuh (SIEM) + honeypot sur AWS + 10 règles de détection + rapports d'incident. Pour viser analyste SOC." },
    { id: "wifiaudit", title: "CPE Wi-Fi Hardening Toolkit", ar: "أداة Python تفحص إعدادات راوتر/CPE wifi في مختبر متاعك (WPA3، WPS، كلمات سر افتراضية، ports مفتوحة) وتعطي تقرير تقوية. قريبة لخدمتك — على أجهزتك برك.", fr: "Outil Python qui audite la configuration d'un routeur/CPE Wi-Fi dans ton lab (WPA3, WPS, mots de passe par défaut, ports ouverts) et produit un rapport de durcissement. Proche de ton métier — uniquement sur ton matériel." }
  ];

  /* ---------- state ---------- */
  const st = () => { const s = Store.doc("study"); s.mentor = s.mentor || { start: U.dkey(), tasks: {}, chat: [] }; return s.mentor; };
  const plan = () => { const m = st(); return m.plan && m.plan.weeks ? m.plan : PROJECT; };
  const allTasks = () => plan().weeks.flatMap((w, wi) => w.tasks.map(t => ({ ...t, wi })));
  const isDone = (id) => !!(st().tasks[id] && st().tasks[id].done);
  const M = App.Mentor = {
    plan, st,
    currentWeek() { const p = plan(); const i = p.weeks.findIndex(w => w.tasks.some(t => !isDone(t.id))); return i < 0 ? p.weeks.length : i; },
    nextTask() { return allTasks().find(t => !isDone(t.id)) || null; },
    doneToday(dk = U.dkey()) { return Object.values(st().tasks).some(x => x.done && x.date === dk); },
    progress() { const a = allTasks(); return { done: a.filter(t => isDone(t.id)).length, total: a.length }; },
    calWeek() { const s = st().start || U.dkey(); return Math.floor((U.parseD(U.dkey()) - U.parseD(s)) / (7 * 86400000)); }
  };
  const tx = (o) => (o && typeof o === "object" ? L(o.ar, o.fr) : String(o || ""));

  /* ---------- mentor view ---------- */
  function viewMentor() {
    const p = plan(), m = st(), cw = M.currentWeek(), pr = M.progress(), cal = M.calWeek();
    const week = p.weeks[Math.min(cw, p.weeks.length - 1)];
    const late = cw < cal;
    const chat = (m.chat || []).slice(-12);
    const nextSlots = (() => { const out = []; for (let i = 0; i < 8 && out.length < 2; i++) { const d = U.addDays(new Date(), i); (App.R ? App.R.day(d) : []).filter(b => b.kind === "project").forEach(b => { if (b.end > Date.now()) out.push(b); }); } return out.slice(0, 2); })();
    return `<div class="grid g2">
      <div class="card stripe accent" style="grid-column:1/-1">
        <div class="row between"><div><div class="tiny muted">${L("المشروع اللي اخترتهولك", "Le projet que je te propose")}</div><h2 style="font-size:1.7rem">${U.esc(p.title)}</h2></div>
          <div style="text-align:end"><div class="big">${Math.round(pr.done / pr.total * 100)}%</div><div class="tiny muted">${pr.done}/${pr.total} ${L("مهمة", "tâches")}</div></div></div>
        <p style="margin-top:6px">${U.esc(tx(p.sub))}</p>
        <div class="bar" style="margin:10px 0"><i style="width:${pr.done / pr.total * 100}%"></i></div>
        <details ${pr.done ? "" : "open"}><summary class="small" style="cursor:pointer">${L("علاش المشروع هذا ليك", "Pourquoi ce projet pour toi")}</summary><ul class="small" style="margin:8px 0 0;padding-inline-start:18px">${(p.why || []).map(w => `<li>${U.esc(tx(w))}</li>`).join("")}</ul></details>
        <div class="row small muted" style="margin-top:8px;gap:14px"><span>${L("الوقت: ~3 سوايع في الجمعة", "Rythme : ~3 h par semaine")}</span><span>${L("الخميس الصباح + الأحد 11:30", "jeudi matin + dimanche 11:30")}</span>${nextSlots.length ? `<span>${L("الحصة الجاية: ", "Prochaine séance : ")}<b>${U.esc(U.dateShort(nextSlots[0].start))} ${U.hm(nextSlots[0].start)}</b></span>` : ""}</div>
      </div>
      <div class="card ${late ? "stripe warn" : ""}"><div class="row between"><h3 style="margin:0">${L("الجمعة", "Semaine")} ${Math.min(cw + 1, p.weeks.length)} — ${U.esc(tx(week))}</h3>${late ? `<span class="pill warn">${L("متأخر", "en retard")} ${cal - cw} ${L("جمعة", "sem.")}</span>` : `<span class="pill good">${L("في الوقت", "dans les temps")}</span>`}</div>
        <div class="list steps" style="margin-top:8px">${week.tasks.map(t => { const d = isDone(t.id), note = (m.tasks[t.id] || {}).note || ""; return `<div class="li ${d ? "done" : ""}" style="align-items:flex-start"><label class="check" style="margin-top:3px"><input type="checkbox" data-change="mTask" data-id="${t.id}" ${d ? "checked" : ""} aria-label="${L("كمّلت", "Fait")}"></label>
          <div class="grow"><div class="small"><b>${U.esc(tx(t))}</b></div><div class="tiny muted">~${t.min} ${L("دقيقة", "min")} · ${L("كمّلت كي:", "Fini quand :")} ${U.esc(tx(t.ok))}</div>
          ${(t.res || []).length ? `<div class="row" style="gap:6px;margin-top:4px">${t.res.map(r => `<a class="pill accent" href="${U.esc(r.u)}" target="_blank" rel="noopener">${U.esc(r.t)}</a>`).join("")}</div>` : ""}
          ${d ? (note ? `<div class="tiny" style="margin-top:4px">${L("تعلمت:", "Appris :")} ${U.esc(note)}</div>` : "") : `<button class="btn sm ghost" style="margin-top:4px" data-act="mAsk" data-id="${t.id}">${I.spark}${L("ساعدني نبدا", "Aide-moi à démarrer")}</button>`}</div></div>`; }).join("")}</div>
        <p class="tiny muted" style="margin-top:8px">${L("كي تعلّم مهمة، اكتب سطر شنوة تعلمت — المدرب يقراه.", "Quand tu coches une tâche, note en une ligne ce que tu as appris : le mentor le lira.")}</p>
      </div>
      <div class="card"><h3>${I.spark}${L("المدرب", "Mentor")}</h3>
        <div class="chat" id="mChat">${chat.length ? chat.map(c => `<div class="msg ${c.role}">${c.role === "assistant" ? `<div class="rich">${U.md(c.content)}</div>` : U.esc(c.content)}</div>`).join("") : `<p class="small muted">${L("اسألني أي حاجة على المهمة: من وين نبدا، شنوة ما فهمتش، راجعلي حاجة… نعطيك تلميحات موش الحل الكل، باش تتعلم بروحك.", "Pose-moi tes questions : par où commencer, ce que tu ne comprends pas, une relecture… Je donne des pistes, pas la solution complète, pour que tu apprennes.")}</p>`}</div>
        <form data-form="mChat" class="row" style="margin-top:8px;flex-wrap:nowrap"><input type="text" name="q" id="m-q" maxlength="1500" placeholder="${L("اكتب سؤالك…", "Écris ta question…")}" ${App.ai ? "" : "disabled"}><button class="btn primary" type="submit" id="m-go" ${App.ai ? "" : "disabled"}>${L("ابعث", "Envoyer")}</button></form>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="mWeekly" ${App.ai ? "" : "disabled"}>${L("مراجعة الجمعة مع المدرب", "Bilan hebdo avec le mentor")}</button>${chat.length ? `<button class="btn sm ghost" data-act="mClear">${L("امسح المحادثة", "Effacer la conversation")}</button>` : ""}</div>
        ${App.ai ? "" : App.aiNote()}
      </div>
      <div class="card" style="grid-column:1/-1"><h3>${L("البرنامج الكامل (12 جمعة)", "Le plan complet (12 semaines)")}</h3>
        <div class="weekgrid">${p.weeks.map((w, i) => { const dn = w.tasks.filter(t => isDone(t.id)).length; return `<div class="wk ${dn === w.tasks.length ? "done" : i === cw ? "cur" : ""}"><b>${i + 1}</b><span>${U.esc(tx(w))}</span><i>${dn}/${w.tasks.length}</i></div>`; }).join("")}</div>
        <details style="margin-top:12px"><summary class="small" style="cursor:pointer">${L("تحب مشروع آخر؟", "Envie d'un autre projet ?")}</summary>
          <div class="stack" style="margin-top:8px">${ALTS.map(a => `<div class="card flat" style="padding:12px"><b>${U.esc(a.title)}</b><p class="small" style="margin-top:4px">${U.esc(L(a.ar, a.fr))}</p><button class="btn sm" style="margin-top:6px" data-act="mSwitch" data-id="${a.id}" ${App.ai ? "" : "disabled"}>${L("بدّل لهذا (المدرب يحضّر البرنامج)", "Basculer (le mentor prépare le plan)")}</button></div>`).join("")}
          ${m.plan ? `<button class="btn sm ghost" data-act="mReset">${L("رجّع TicketGuard", "Revenir à TicketGuard")}</button>` : ""}</div></details>
      </div>
    </div>`;
  }
  App.Mentor.view = viewMentor;

  function mentorContext() {
    const p = plan(), m = st(), cw = M.currentWeek(), week = p.weeks[Math.min(cw, p.weeks.length - 1)], s = Store.doc("settings");
    const done = allTasks().filter(t => isDone(t.id)).map(t => `- ${t.fr}${(m.tasks[t.id] || {}).note ? " (note: " + m.tasks[t.id].note + ")" : ""}`).slice(-8).join("\n");
    return `You are the personal project mentor ("encadrant") of ${App.who()}. He works full-time as an outdoor-wifi field technician (Orange/Ooredoo), studies in the evening, is diabetic on insulin, trains at the gym and memorises Quran: his time is very limited (about 3 hours per week for the project: Thursday morning and Sunday 11:30).
Project: ${p.title} — ${p.sub ? p.sub.fr : ""}
Current week ${Math.min(cw + 1, p.weeks.length)}/${p.weeks.length}: ${week.fr}. Tasks this week: ${week.tasks.map(t => (isDone(t.id) ? "[x] " : "[ ] ") + t.fr).join(" | ")}.
Recently completed:\n${done || "- nothing yet"}
Interests: ${s.study.interests || ""}.
Mentoring rules: reply in Tunisian derja written the way he writes (Latin letters with numbers like 3, 7, 9 if he writes that way; Arabic script if he writes in Arabic), with technical terms in French/English. Be warm but demanding. Give hints, steps and questions, not full solutions; at most a short code snippet if he is stuck. Keep him on this week's tasks and on small, finishable steps (30–60 minutes). Only ever test systems he owns or has written permission to test. Keep answers under 180 words unless he asks for more.`;
  }

  App.changes.mTask = (el) => {
    const m = st(); const id = el.dataset.id;
    if (el.checked) {
      App.modal(L("برافو! شنوة تعلمت؟", "Bravo ! Qu'as-tu appris ?"), `<form data-form="mNote" class="stack"><input type="hidden" name="id" value="${id}"><label class="f">${L("سطر واحد (ولا رابط commit)", "Une ligne (ou un lien de commit)")}<input type="text" name="note" id="m-note" maxlength="240"></label><button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
      m.tasks[id] = { done: true, date: U.dkey(), ts: Date.now() };
    } else delete m.tasks[id];
    Store.save("study"); App.render();
  };
  App.forms.mNote = (fd) => { const m = st(); if (m.tasks[fd.id]) m.tasks[fd.id].note = (fd.note || "").trim().slice(0, 240); Store.save("study"); App.closeModal(); App.render(); };
  async function ask(q, opts = {}) {
    if (!App.ai) return;
    const m = st(); m.chat = m.chat || [];
    m.chat.push({ role: "user", content: q.slice(0, 1500) });
    const box = document.getElementById("mChat"), go = document.getElementById("m-go");
    if (box) { box.insertAdjacentHTML("beforeend", `<div class="msg user">${U.esc(q)}</div><div class="msg assistant" id="mLive"><span class="spinner"></span></div>`); box.scrollTop = box.scrollHeight; }
    if (go) go.disabled = true;
    const turns = [{ role: "user", content: mentorContext() }, ...m.chat.slice(-10)];
    try {
      const r = await App.ai(turns, { cache: false, onText: ({ text }) => { const el = document.getElementById("mLive"); if (el) el.innerHTML = `<div class="rich">${U.md(text)}</div>`; } });
      m.chat.push({ role: "assistant", content: r.text.slice(0, 3000) });
    } catch (e) {
      m.chat.pop();
      const msg = App.aiError(e); const el = document.getElementById("mLive"); if (el) el.innerHTML = msg ? `<span class="small" style="color:var(--bad)">${U.esc(msg)}</span>` : "";
      if (go) go.disabled = false; return;
    }
    m.chat = m.chat.slice(-16);
    Store.save("study"); if (go) go.disabled = false;
    App.render(); const b2 = document.getElementById("mChat"); if (b2) b2.scrollTop = b2.scrollHeight;
  }
  App.forms.mChat = (fd) => { const q = (fd.q || "").trim(); if (q) ask(q); };
  App.acts.mAsk = (el) => { const t = allTasks().find(x => x.id === el.dataset.id); if (t) ask(L("عاوني نبدا في المهمة هذي، بخطوات صغار: ", "Aide-moi à démarrer cette tâche, en petites étapes : ") + tx(t)); };
  App.acts.mWeekly = () => ask(L("اعملي مراجعة الجمعة: شنوة كمّلت، وين متأخر، وشنوة نعمل الجمعة الجاية في 3 سوايع. كان لازم بدّل البرنامج قللي.", "Fais mon bilan de la semaine : ce que j'ai fini, où je suis en retard, et quoi faire la semaine prochaine en 3 h. Ajuste le plan si besoin."));
  App.acts.mClear = () => App.confirm(L("تمسح المحادثة مع المدرب؟", "Effacer la conversation avec le mentor ?"), () => { st().chat = []; Store.save("study"); App.render(); });
  App.acts.mReset = () => App.confirm(L("ترجع لـTicketGuard؟", "Revenir à TicketGuard ?"), () => { delete st().plan; Store.save("study"); App.render(); });
  App.acts.mSwitch = async (el) => {
    if (!App.ai) return;
    const a = ALTS.find(x => x.id === el.dataset.id); if (!a) return;
    el.disabled = true; el.innerHTML = `<span class="spinner"></span> ${L("المدرب يحضّر البرنامج…", "Le mentor prépare le plan…")}`;
    const prompt = `Create a 12-week plan for this student project: "${a.title}" — ${a.fr}
The student is a 4th-year cybersecurity engineering student in Tunisia with about 3 hours per week (Thursday morning + Sunday late morning). Each week has exactly 3 tasks of 30–60 minutes, concrete and finishable, with a clear "done when" criterion. Legal and ethical: only the student's own lab or equipment.
Reply with ONLY JSON: {"title":"","sub":{"ar":"","fr":""},"why":[{"ar":"","fr":""}],"weeks":[{"ar":"week title in Arabic","fr":"titre en français","tasks":[{"id":"w1a","min":45,"ar":"","fr":"","ok":{"ar":"","fr":""},"res":[{"t":"resource name","u":"https://..."}]}]}]}
Arabic text in simple Modern Standard Arabic understood in Tunisia. Only include resource URLs you are sure exist (official docs); otherwise leave res empty.`;
    try {
      const j = await App.ai.json(prompt, { cache: false, modelTier: "complex" });
      if (!j || !Array.isArray(j.weeks) || j.weeks.length < 4) throw { code: "invalid_json" };
      j.weeks = j.weeks.slice(0, 16).map((w, wi) => ({ ar: String(w.ar || ""), fr: String(w.fr || ""), tasks: (w.tasks || []).slice(0, 4).map((t, ti) => ({ id: "x" + (wi + 1) + "abcd"[ti], min: +t.min || 45, ar: String(t.ar || ""), fr: String(t.fr || ""), ok: { ar: String((t.ok || {}).ar || ""), fr: String((t.ok || {}).fr || "") }, res: (t.res || []).filter(r => /^https:\/\//.test(r.u || "")).slice(0, 3) })) }));
      const m = st(); m.plan = { title: a.title, sub: j.sub, why: j.why, weeks: j.weeks }; m.tasks = {}; m.start = U.dkey();
      Store.save("study"); App.toast(L("تبدّل المشروع", "Projet changé"), a.title, "good"); App.render();
    } catch (e) { const msg = App.aiError(e); App.toast(L("ما نجمتش نحضّر البرنامج", "Plan non généré"), msg, "warn"); App.render(); }
  };

  /* ---------- Discover: podcasts, series, skills ---------- */
  const DISC = [
    { id: "darknet", type: "podcast", title: "Darknet Diaries", by: "Jack Rhysider · EN", u: "https://darknetdiaries.com/", ar: "قصص حقيقية على الاختراقات والهاكرز، محكية كي الفيلم. ممتاز في الكرهبة بين التدخلات وينفعك في الأنجليزية.", fr: "Des histoires vraies de piratages, racontées comme un film. Parfait en voiture entre deux interventions, et bon pour ton anglais." },
    { id: "nolimitsecu", type: "podcast", title: "NoLimitSecu", by: "FR · hebdo", u: "https://www.nolimitsecu.fr/", ar: "بودكاست فرنسي أسبوعي على الأمن السيبراني مع خبراء: SOC، ثغرات، أدوات. يخدم قرايتك في TEK-UP.", fr: "Le podcast cyber francophone hebdomadaire, avec des experts : SOC, vulnérabilités, outils. Colle à tes cours." },
    { id: "secarabi", type: "podcast", title: "سكيوريتي بالعربي", by: "Osama Kamal · AR", u: "https://podcasts.apple.com/podcast/id1662298463", ar: "بودكاست بالعربي على أمن المعلومات، حوارات مع مختصين عرب على الخدمة والمسار المهني.", fr: "Podcast en arabe sur la sécurité de l'information : entretiens avec des pros arabophones sur le métier et la carrière." },
    { id: "grandmere", type: "podcast", title: "La cybersécurité expliquée à ma grand-mère", by: "FR", u: "https://podcast.ausha.co/la-cyber-securite-expliquee-a-ma-grand-mere", ar: "يشرح مفاهيم الأمن ببساطة: ينفعك باش تتعلم تشرح للحرفاء وللجنة الـPFE.", fr: "Explique la cyber simplement : utile pour apprendre à vulgariser, devant tes clients ou le jury de PFE." },
    { id: "comptoir", type: "podcast", title: "Le Comptoir Sécu", by: "FR", u: "https://www.comptoirsecu.fr/", ar: "نقاشات تقنية بالفرنسي على الهجوم والدفاع.", fr: "Discussions techniques en français sur l'attaque et la défense." },
    { id: "malicious", type: "podcast", title: "Malicious Life", by: "Cybereason · EN", u: "https://malicious.life/", ar: "تاريخ الأمن السيبراني: الفيروسات والهجمات اللي بدّلت العالم.", fr: "L'histoire de la cybersécurité : les virus et attaques qui ont changé le monde." },
    { id: "smashing", type: "podcast", title: "Smashing Security", by: "EN", u: "https://www.smashingsecurity.com/", ar: "أخبار الأمن بطريقة مضحكة، خفيف للكرهبة.", fr: "L'actu sécurité avec humour, léger pour la voiture." },
    { id: "zerodays", type: "doc", title: "Zero Days (2016)", by: "Alex Gibney", ar: "وثائقي على Stuxnet: أول سلاح سيبراني ضرب منشآت حقيقية. يوريك قداش الأمن الصناعي خطير.", fr: "Documentaire sur Stuxnet, la première cyberarme contre des installations réelles." },
    { id: "citizenfour", type: "doc", title: "Citizenfour (2014)", by: "Laura Poitras", ar: "وثائقي على Snowden والمراقبة الجماعية — يحل عينيك على الخصوصية والتشفير.", fr: "Documentaire sur Snowden et la surveillance de masse : chiffrement et vie privée." },
    { id: "greathack", type: "doc", title: "The Great Hack (2019)", by: "Netflix", ar: "وثائقي على Cambridge Analytica: كيفاش البيانات الشخصية تتستعمل.", fr: "Documentaire sur Cambridge Analytica : l'exploitation des données personnelles." },
    { id: "mrrobot", type: "series", title: "Mr. Robot", by: "2015–2019", ar: "مسلسل فيه تقنيات هاك قريبة للواقع (social engineering، Kali...). فيه مشاهد للكبار.", fr: "Série aux techniques de hacking réalistes (ingénierie sociale, Kali…). Contient des scènes pour adultes." },
    { id: "omar", type: "series", title: "مسلسل عمر (2012)", by: "MBC", ar: "سيرة عمر بن الخطاب رضي الله عنه، مسلسل تاريخي كبير. للأحد العشية.", fr: "La vie de Omar ibn al-Khattab, grande série historique. Pour le dimanche soir." },
    { id: "thm", type: "skill", title: "TryHackMe — SOC Level 1", by: "tryhackme.com", u: "https://tryhackme.com/", ar: "مسار تطبيقي خطوة بخطوة للـblue team. 20 دقيقة في اليوم تكفي.", fr: "Parcours pratique blue team, pas à pas. 20 min par jour suffisent." },
    { id: "portswigger", type: "skill", title: "PortSwigger Web Security Academy", by: "gratuit", u: "https://portswigger.net/web-security", ar: "أحسن مكان باش تتعلم ثغرات الويب (OWASP) بلابات مجانية. مربوط بمادة OWASP.", fr: "La meilleure ressource gratuite pour les failles web (OWASP), avec labs. Colle à ton cours OWASP." },
    { id: "cryptohack", type: "skill", title: "CryptoHack", by: "gratuit", u: "https://cryptohack.org/", ar: "تحديات تشفير بـPython: تفهم RSA وAES بالتطبيق. يعاونك في مادة Crypto.", fr: "Défis de cryptographie en Python : RSA et AES par la pratique. Parfait pour ton cours de Crypto." },
    { id: "bandit", type: "skill", title: "OverTheWire — Bandit", by: "gratuit", u: "https://overthewire.org/wargames/bandit/", ar: "تتعلم Linux والـterminal بالألعاب، مستوى بمستوى.", fr: "Apprendre Linux et le terminal par le jeu, niveau par niveau." },
    { id: "awsskill", type: "skill", title: "AWS Skill Builder — Cloud Practitioner", by: "AWS", u: "https://skillbuilder.aws/", ar: "أساسيات AWS للمادة متاع السبت، وتنجم تمشي للشهادة من بعد.", fr: "Les bases AWS pour ton cours du samedi, avec la certification en ligne de mire." },
    { id: "atomic", type: "book", title: "Atomic Habits — العادات الذرية", by: "James Clear", ar: "كتاب على العادات الصغيرة اللي تبدّل حياتك — يمشي مع المحاسبة كل ليلة.", fr: "Sur les petites habitudes qui changent tout : va de pair avec ton bilan du soir." },
    { id: "deepwork", type: "book", title: "Deep Work", by: "Cal Newport", ar: "كيفاش تركّز في وقت قصير — مهم ليك خاطر وقتك قليل.", fr: "Se concentrer profondément sur peu de temps : essentiel avec ton emploi du temps." },
    { id: "ibnashur", type: "deen", title: "التحرير والتنوير — سورة التوبة", by: "الشيخ محمد الطاهر ابن عاشور", ar: "تفسير العلامة التونسي شيخ الزيتونة. اقرا تفسير الآيات اللي تحفظ فيها: الحفظ يولّي أسهل كي تفهم المعنى.", fr: "Le tafsir du savant tunisien de la Zitouna. Lis l'explication des versets que tu mémorises : on retient mieux ce qu'on comprend." }
  ];
  const TYPE = { podcast: ["بودكاست", "Podcast"], doc: ["وثائقي", "Documentaire"], series: ["مسلسل", "Série"], skill: ["مهارة", "Compétence"], book: ["كتاب", "Livre"], deen: ["دين", "Dine"] };
  const disc = () => Store.doc("discover");
  const D2 = App.Disc = {
    list: DISC,
    status(id) { return (disc().st || {})[id] || ""; },
    today(d = new Date()) {
      const dow = U.dow(d), pref = dow === 0 ? ["series", "doc", "book", "deen"] : dow === 4 ? ["skill"] : ["podcast"];
      const avail = DISC.filter(x => !["done", "skip"].includes(D2.status(x.id)));
      const pool = avail.filter(x => pref.includes(x.type)); const arr = pool.length ? pool : avail;
      if (!arr.length) return null;
      const n = Math.floor(Date.UTC(U.P(d).y, U.P(d).m - 1, U.P(d).d) / 86400000 / 2) + (disc().bump || 0);
      return arr[((n % arr.length) + arr.length) % arr.length];
    },
    podcastNow() { const p = DISC.filter(x => x.type === "podcast" && D2.status(x.id) !== "skip"); const t = D2.today(); return t && t.type === "podcast" ? t : p[0]; }
  };
  function discCard(x, compact) {
    if (!x) return "";
    const s = D2.status(x.id);
    return `<div class="card ${compact ? "" : "flat"} disc"><div class="row between"><span class="pill saffron">${U.esc(L(...TYPE[x.type]))}</span>${s === "done" ? `<span class="pill good">${I.check}</span>` : ""}</div>
      <b style="margin-top:6px;display:block">${U.esc(x.title)}</b><span class="tiny muted">${U.esc(x.by || "")}</span>
      <p class="small" style="margin-top:4px">${U.esc(L(x.ar, x.fr))}</p>
      <div class="row" style="margin-top:8px;gap:6px">${x.u ? `<a class="btn sm" href="${U.esc(x.u)}" target="_blank" rel="noopener">${L("حل", "Ouvrir")}</a>` : `<span class="tiny muted">${L("لوّج عليه في YouTube ولا Netflix", "À chercher sur YouTube ou Netflix")}</span>`}
      <button class="btn sm ${s === "done" ? "" : "primary"}" data-act="discSet" data-id="${x.id}" data-v="done">${L("شفتها / سمعتها", "Vu / écouté")}</button>
      <button class="btn sm ghost" data-act="discSet" data-id="${x.id}" data-v="skip">${L("موش ليا", "Pas pour moi")}</button>
      ${compact ? `<button class="btn sm ghost" data-act="discNext">${L("اقتراح آخر", "Autre idée")}</button>` : ""}</div></div>`;
  }
  App.Disc.card = (compact) => discCard(D2.today(), compact);
  App.Disc.view = () => {
    const groups = ["podcast", "skill", "doc", "series", "book", "deen"];
    return `<p class="small muted" style="margin-bottom:12px">${L("كل يومين نقترح عليك حاجة في «اليوم»: بودكاست في نهارات الخدمة (للكرهبة)، مهارة نهار الخميس، وثائقي ولا كتاب نهار الأحد.", "Tous les deux jours, une idée apparaît dans « Aujourd'hui » : un podcast les jours de travail (pour la voiture), une compétence le jeudi, un documentaire ou un livre le dimanche.")}</p>
      ${groups.map(g => `<h3 style="margin:14px 0 8px">${U.esc(L(...TYPE[g]))}</h3><div class="grid g3">${DISC.filter(x => x.type === g).map(x => discCard(x, false)).join("")}</div>`).join("")}`;
  };
  App.acts.discSet = (el) => { const d = disc(); d.st = d.st || {}; d.st[el.dataset.id] = d.st[el.dataset.id] === el.dataset.v ? "" : el.dataset.v; Store.save("discover"); App.render(); };
  App.acts.discNext = () => { const d = disc(); d.bump = (d.bump || 0) + 1; Store.save("discover"); App.render(); };
})();
