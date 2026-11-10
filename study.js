/* Nhari — Studies: planner, subjects/exams, faculty import, course simplifier, career projects */
(function () {
  "use strict";
  const ETYPES = [["exam", "امتحان", "Examen"], ["ds", "DS", "DS"], ["tp", "TP", "TP"], ["project", "مشروع", "Projet"], ["other", "أخرى", "Autre"]];
  const etName = (k) => { const e = ETYPES.find(x => x[0] === k) || ETYPES[4]; return L(e[1], e[2]); };
  const WDN = () => [L("الأحد", "Dimanche"), L("الاثنين", "Lundi"), L("الثلاثاء", "Mardi"), L("الأربعاء", "Mercredi"), L("الخميس", "Jeudi"), L("الجمعة", "Vendredi"), L("السبت", "Samedi")];
  const langName = () => (App.lang === "fr" ? "French" : "Arabic (clear Modern Standard Arabic; keep technical terms in French in parentheses, as Tunisian universities teach in French)");
  const daysUntil = (k) => Math.round((U.parseD(k) - U.parseD(U.dkey())) / 86400000);

  /* ---------- planner ---------- */
  function plan(date = new Date()) {
    const st = Store.doc("study"), s = Store.doc("settings").study;
    if (!st.subjects.length) return [];
    const sessMin = U.clamp(+s.sessionMin || 45, 15, 120), brk = U.clamp(+s.breakMin || 10, 0, 60);
    const n = Math.max(1, Math.floor((+s.dailyHours || 2) * 60 / sessMin));
    const tk = U.dkey(date);
    const w = st.subjects.map(sub => {
      let weight = (+sub.coef || 1) * (+sub.diff || 2);
      const ex = st.exams.filter(e => e.subj === sub.id && e.date >= tk).sort((a, b) => a.date.localeCompare(b.date))[0];
      const days = ex ? daysUntil(ex.date) : null;
      if (days != null && days <= 21) weight *= 1 + (22 - days) / 4;
      return { sub, weight, days, ex, n: 0 };
    });
    const picks = [];
    for (let i = 0; i < n; i++) {
      const best = w.slice().sort((a, b) => b.weight / (1 + b.n * 1.6) - a.weight / (1 + a.n * 1.6))[0];
      if (picks.length && picks[picks.length - 1] === best && w.length > 1) {
        const alt = w.filter(x => x !== best).sort((a, b) => b.weight / (1 + b.n * 1.6) - a.weight / (1 + a.n * 1.6))[0];
        alt.n++; picks.push(alt); continue;
      }
      best.n++; picks.push(best);
    }
    // blocked windows: today's classes, prayers (+20 min), meals (±20 min)
    const blocks = [];
    st.classes.filter(c => +c.day === U.dow(date)).forEach(c => blocks.push([U.atTime(c.start, date), U.atTime(c.end, date)]));
    try { const p = App.prayer.today(date); ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach(k => blocks.push([p[k], new Date(p[k].getTime() + 20 * 60000)])); } catch (e) { /* ignore */ }
    const meals = Store.doc("settings").meals;
    ["lunch", "dinner"].forEach(k => { const t = U.atTime(meals[k], date); blocks.push([new Date(t - 10 * 60000), new Date(t.getTime() + 30 * 60000)]); });
    const slots = (App.R && App.R.on()) ? App.R.day(date).filter(b => b.slot).map(b => [b.start, b.end]) : null;
    let si = 0;
    let t = slots ? (slots.length ? new Date(slots[0][0]) : null) : U.atTime(s.start || "17:30", date);
    if (!t) return [];
    const out = [], counts = {};
    for (let i = 0; i < picks.length; i++) {
      let guard = 0;
      while (guard++ < 50) {
        const end = new Date(t.getTime() + sessMin * 60000);
        if (slots) {
          if (si >= slots.length) break;
          if (end > slots[si][1]) { si++; if (si >= slots.length) break; t = new Date(slots[si][0]); continue; }
        }
        const hit = blocks.find(b => t < b[1] && end > b[0]);
        if (!hit) break;
        t = new Date(hit[1]);
      }
      if (slots && si >= slots.length) break;
      const p = picks[i];
      counts[p.sub.id] = (counts[p.sub.id] || 0) + 1;
      let kind;
      if (p.days != null && p.days <= 3) kind = L("مراجعة شاملة + امتحانات قديمة", "Révision complète + annales");
      else if (p.days != null && p.days <= 10) kind = L("مراجعة + تمارين", "Révision + exercices");
      else kind = [L("فهم الدرس الجديد", "Comprendre le nouveau cours"), L("تمارين", "Exercices"), L("مراجعة سريعة", "Révision rapide")][(counts[p.sub.id] - 1 + U.P(date).d) % 3];
      const start = new Date(t), end = new Date(t.getTime() + sessMin * 60000);
      out.push({ idx: i, sub: p.sub, start, end, kind, ex: p.ex, days: p.days });
      t = new Date(end.getTime() + brk * 60000);
    }
    return out;
  }
  App.St = { plan, nextExam() { const st = Store.doc("study"), tk = U.dkey(); return st.exams.filter(e => e.date >= tk).sort((a, b) => a.date.localeCompare(b.date))[0] || null; }, subName(id) { const s = Store.doc("study").subjects.find(x => x.id === id); return s ? s.name : "?"; } };

  /* ---------- views ---------- */
  function render() {
    const sub = App.sub.study || "plan";
    const tabs = [["plan", L("برنامج اليوم", "Plan du jour")], ["subjects", L("المواد والامتحانات", "Matières & examens")], ["fac", L("الفاك", "La fac")], ["simplify", L("بسّطلي الدرس", "Simplifier un cours")], ["projects", L("مشروعي + المدرب", "Mon projet + mentor")], ["discover", L("اكتشف", "Découvrir")], ...App.extTabs("study")];
    let html = `<div class="sectionhead"><h2>${L("القراية", "Études")}</h2></div>
      <div class="subtabs">${tabs.map(t => `<button data-act="sub" data-tab="study" data-v="${t[0]}" aria-pressed="${sub === t[0]}">${t[1]}</button>`).join("")}</div>`;
    if (sub === "plan") html += viewPlan();
    if (sub === "subjects") html += viewSubjects();
    if (sub === "fac") html += viewFac();
    if (sub === "simplify") html += viewSimplify();
    if (sub === "projects") html += App.Mentor ? App.Mentor.view() : viewProjects();
    if (sub === "discover") html += App.Disc ? App.Disc.view() : "";
    html += App.extView("study", sub);
    return html;
  }

  function viewPlan() {
    const st = Store.doc("study"), s = Store.doc("settings").study;
    if (!st.subjects.length) return `<div class="card stripe saffron"><h3>${I.study}${L("ابدا بالمواد", "Commence par tes matières")}</h3><p class="small">${L("زيد المواد متاعك (والامتحانات إذا عندك)، ولا جيبهم مالفاك بنسخ الإعلانات ولا تصويرة جدول الأوقات. وقتها التطبيق يحضرلك برنامج كل نهار: وقتاش تقرا وشنوة تقرا.", "Ajoute tes matières (et tes examens), ou importe-les depuis la fac en collant les annonces ou une photo de l'emploi du temps. L'app te prépare ensuite un plan quotidien : quand et quoi étudier.")}</p><div class="row" style="margin-top:10px"><button class="btn primary" data-act="sub" data-tab="study" data-v="subjects">${L("زيد المواد", "Ajouter des matières")}</button><button class="btn" data-act="sub" data-tab="study" data-v="fac">${L("جيب مالفاك", "Importer de la fac")}</button></div></div>`;
    const p = plan(), tk = U.dkey(), done = st.done[tk] || [], now = new Date();
    const exams = st.exams.filter(e => e.date >= tk).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const classes = st.classes.filter(c => +c.day === U.dow(now)).sort((a, b) => a.start.localeCompare(b.start));
    const s2 = Store.doc("settings").study, ab = st.absences;
    const absCard = ab && ab.items && ab.items.length ? `<div class="card stripe ${ab.items.some(a => a.rate >= 25) ? "bad" : "warn"}" style="grid-column:1/-1"><div class="row between"><h3 style="margin:0">${I.alert}${L("الغيابات", "Absences")}</h3><span class="tiny muted">${L("حسب TEK-UP في", "selon TEK-UP au")} ${U.esc(ab.date)}</span></div>
        <div class="list" style="margin-top:8px">${ab.items.map(a => `<div class="li"><span class="grow small">${U.esc(a.subj)}</span><span class="tiny muted num">${a.missed}/${a.total}</span><span class="pill ${a.rate >= 25 ? "bad" : a.rate >= 10 ? "warn" : "good"}">${a.rate}%</span></div>`).join("")}</div>
        <p class="tiny muted" style="margin-top:6px">${L("الحد: «في خطر» من 10%، «خطير» من 25%. إذا عندك مبرر ابعثو للسكولاريتي من فضاء الطالب.", "Seuils : « à risque » dès 10 %, « critique » dès 25 %. Si tu as un justificatif, envoie-le à la scolarité depuis l'espace étudiant.")}</p></div>` : "";
    return `<div class="grid g2">${absCard}
      <div class="card stripe accent"><div class="row between"><h3 style="margin:0">${I.clock}${L("وقتاش تقرا اليوم", "Quand étudier aujourd'hui")}</h3><span class="pill accent">${done.length}/${p.length}</span></div>
        <div style="margin-top:8px">${p.length ? "" : `<div class="empty">${L("اليوم ما فماش وقت فارغ للقراية برّا الفاك. الأوقات الفارغة: الخميس الصباح (ما فماش جيم) والأحد 9:00–11:30.", "Pas de créneau libre aujourd'hui en dehors des cours. Créneaux libres : jeudi matin (pas de salle) et dimanche 9:00–11:30.")}</div>`}${p.map(x => {
          const isNow = now >= x.start && now < x.end, isDone = done.includes(x.idx);
          return `<div class="session ${isDone ? "done" : ""} ${isNow && !isDone ? "now" : ""}"><span class="time">${U.range(x.start, x.end)}</span><span class="grow"><b>${U.esc(x.sub.name)}</b><div class="tiny muted">${U.esc(x.kind)}${x.days != null && x.days <= 21 ? ` · <span style="color:var(--warn)">${etName(x.ex.type)} ${L("بعد", "dans")} ${x.days} ${L("يوم", "j")}</span>` : ""}</div></span><label class="check"><input type="checkbox" data-change="sessDone" data-i="${x.idx}" ${isDone ? "checked" : ""} aria-label="${L("كمّلت", "Fait")}"></label></div>`;
        }).join("")}</div>
        <p class="tiny muted" style="margin-top:8px">${L(`${s.dailyHours} سوايع في النهار، حصص ${s.sessionMin} دقيقة و ${s.breakMin} دقيقة راحة. البرنامج يتجنب أوقات القراية في الفاك، الصلاة والماكلة، ويعطي أولوية للمواد اللي امتحانها قريب والضاربة متاعها كبيرة.`, `${s.dailyHours} h par jour, séances de ${s.sessionMin} min et ${s.breakMin} min de pause. Le plan évite cours, prières et repas, et priorise les matières à fort coefficient dont l'examen approche.`)}</p>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="pomodoro">${I.play}${L("ابدا حصة توا", "Lancer une séance")}</button></div>
      </div>
      <div class="card"><h3>${I.alert}${L("الامتحانات الجاية", "Examens à venir")}</h3>
        ${exams.length ? `<div class="list">${exams.map(e => { const d = daysUntil(e.date); return `<div class="li"><span class="pill ${d <= 3 ? "bad" : d <= 10 ? "warn" : "accent"}">${d === 0 ? L("اليوم", "Aujourd'hui") : d + " " + L("يوم", "j")}</span><span class="grow small"><b>${U.esc(App.St.subName(e.subj))}</b> · ${U.esc(etName(e.type))}${e.note ? " · <bdi>" + U.esc(e.note) + "</bdi>" : ""}</span><span class="tiny muted">${U.esc(e.date)}</span></div>`; }).join("")}</div>` : `<div class="empty">${L("ما فما حتى امتحان مسجّل.", "Aucun examen enregistré.")}</div>`}
        <h3 style="margin-top:14px">${I.book}${L("قرايتك في الفاك اليوم", "Cours à la fac aujourd'hui")}</h3>${s2.facUrl ? `<a class="btn sm" style="margin-bottom:6px" href="${U.esc(s2.facUrl)}" target="_blank" rel="noopener">${I.link}${L("فضاء الطالب", "Espace étudiant")}</a>` : ""}
        ${classes.length ? `<div class="list">${classes.map(c => `<div class="li"><span class="time small num">${U.ltr(U.esc(c.start) + "–" + U.esc(c.end))}</span><span class="grow small">${U.esc(c.subj)}${c.room ? ` <span class="tiny muted">· ${U.esc(c.room)}</span>` : ""}</span></div>`).join("")}</div>` : `<div class="empty">${L("ما عندكش قراية في الفاك اليوم (حسب الجدول).", "Pas de cours aujourd'hui (selon l'emploi du temps).")}</div>`}
      </div>
    </div>`;
  }

  function viewSubjects() {
    const st = Store.doc("study"), wd = WDN();
    return `<div class="grid g2">
      <div class="card"><h3>${I.study}${L("المواد", "Matières")}</h3>
        <div class="list">${st.subjects.length ? st.subjects.map(s => `<div class="li"><span class="grow"><b>${U.esc(s.name)}</b> <span class="tiny muted">${L("ضارب", "coef")} ${s.coef} · ${["", L("ساهلة", "facile"), L("متوسطة", "moyenne"), L("صعيبة", "difficile")][s.diff] || ""}</span></span><button class="iconbtn" style="width:30px;height:30px" data-act="subjDel" data-id="${s.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("") : `<div class="empty">${L("ما فما حتى مادة.", "Aucune matière.")}</div>`}</div>
        <form data-form="subjAdd" class="form" style="margin-top:10px">
          <label class="f full">${L("اسم المادة", "Nom de la matière")}<input id="sj-name" name="name" type="text" required maxlength="50"></label>
          <label class="f">${L("الضارب", "Coefficient")}<input id="sj-coef" name="coef" type="number" min="0.5" step="0.5" value="1"></label>
          <label class="f">${L("الصعوبة", "Difficulté")}<select id="sj-diff" name="diff"><option value="1">${L("ساهلة", "Facile")}</option><option value="2" selected>${L("متوسطة", "Moyenne")}</option><option value="3">${L("صعيبة", "Difficile")}</option></select></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
      </div>
      <div class="card"><h3>${I.alert}${L("الامتحانات والآجال", "Examens et échéances")}</h3>
        <div class="list">${st.exams.length ? st.exams.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => `<div class="li"><span class="pill">${U.esc(etName(e.type))}</span><span class="grow small"><b>${U.esc(App.St.subName(e.subj))}</b>${e.note ? " · " + U.esc(e.note) : ""}</span><span class="tiny muted">${U.esc(e.date)}</span><button class="iconbtn" style="width:30px;height:30px" data-act="examDel" data-id="${e.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("") : `<div class="empty">${L("ما فما حتى امتحان.", "Aucun examen.")}</div>`}</div>
        ${st.subjects.length ? `<form data-form="examAdd" class="form" style="margin-top:10px">
          <label class="f">${L("المادة", "Matière")}<select id="ex-subj" name="subj">${st.subjects.map(s => `<option value="${s.id}">${U.esc(s.name)}</option>`).join("")}</select></label>
          <label class="f">${L("النوع", "Type")}<select id="ex-type" name="type">${ETYPES.map(e => `<option value="${e[0]}">${L(e[1], e[2])}</option>`).join("")}</select></label>
          <label class="f">${L("النهار", "Date")}<input id="ex-date" name="date" type="date" required></label>
          <label class="f">${L("ملاحظة", "Note")}<input id="ex-note" name="note" type="text" maxlength="60"></label>
          <button class="btn primary full" type="submit">${I.plus}${L("زيد", "Ajouter")}</button></form>` : ""}
      </div>
      <div class="card" style="grid-column:1/-1"><h3>${I.clock}${L("جدول الأوقات (القراية في الفاك)", "Emploi du temps (cours à la fac)")}</h3>
        ${st.classes.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>${L("النهار", "Jour")}</th><th>${L("الوقت", "Heure")}</th><th>${L("المادة", "Matière")}</th><th>${L("القاعة", "Salle")}</th><th></th></tr></thead><tbody>${st.classes.slice().sort((a, b) => (((+a.day + 6) % 7) - ((+b.day + 6) % 7)) || a.start.localeCompare(b.start)).map(c => `<tr><td>${wd[+c.day]}</td><td>${U.ltr(U.esc(c.start) + "–" + U.esc(c.end))}</td><td>${U.esc(c.subj)}</td><td>${U.esc(c.room || "")}</td><td><button class="iconbtn" style="width:28px;height:28px" data-act="classDel" data-id="${c.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">${L("زيد الحصص ولا جيبهم من تصويرة الجدول (في «الفاك»).", "Ajoute tes cours ou importe une photo de l'emploi du temps (onglet « La fac »).")}</div>`}
        <form data-form="classAdd" class="form" style="margin-top:10px">
          <label class="f">${L("النهار", "Jour")}<select id="cl-day" name="day">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}">${wd[d]}</option>`).join("")}</select></label>
          <label class="f">${L("من", "De")}<input id="cl-start" name="start" type="time" required value="08:30"></label>
          <label class="f">${L("لـ", "À")}<input id="cl-end" name="end" type="time" required value="10:00"></label>
          <label class="f">${L("المادة", "Matière")}<input id="cl-subj" name="subj" type="text" required maxlength="50" list="subjlist"></label>
          <datalist id="subjlist">${st.subjects.map(s => `<option value="${U.esc(s.name)}"></option>`).join("")}</datalist>
          <label class="f">${L("القاعة", "Salle")}<input id="cl-room" name="room" type="text" maxlength="20"></label>
          <button class="btn primary" type="submit">${I.plus}${L("زيد", "Ajouter")}</button>
        </form>
      </div>
    </div>`;
  }

  function viewFac() {
    const s = Store.doc("settings").study, st = Store.doc("study");
    const imp = App.uiState.facImport;
    return `<div class="grid g2">
      <div class="card"><h3>${I.link}${L("موقع الفاك", "Site de la fac")}</h3>
        <form data-form="facCfg" class="form">
          <label class="f">${L("اسم الفاك", "Nom de la fac")}<input id="fc-name" name="facName" type="text" maxlength="60" value="${U.esc(s.facName)}" placeholder="FST, ISET, ENIT…"></label>
          <label class="f full">${L("رابط الموقع ولا التطبيق", "Lien du site ou de l'app")}<input id="fc-url" name="facUrl" type="url" value="${U.esc(s.facUrl)}" placeholder="https://"></label>
          <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button>
          ${s.facUrl ? `<a class="btn" href="${U.esc(s.facUrl)}" target="_blank" rel="noopener">${I.link}${L("حل الموقع", "Ouvrir le site")}</a>` : ""}
        </form>
        <p class="small muted" style="margin-top:10px">${L("التطبيق ما ينجمش يدخل وحدو لحسابك في موقع الفاك (المواقع هذي ما عندهاش ربط مفتوح). الطريقة الساهلة: كي يهبط إعلان ولا جدول، انسخ النص ولا خوذ capture وحطو هنا — والتطبيق يستخرج المواد، الامتحانات والحصص ويزيدهم للبرنامج متاعك.", "L'app ne peut pas se connecter seule à ton compte de la fac (ces sites n'ont pas d'accès ouvert). Le plus simple : quand une annonce ou un emploi du temps sort, copie le texte ou fais une capture et dépose-la ici — l'app en extrait matières, examens et cours pour ton planning.")}</p>
      </div>
      <div class="card"><h3>${I.spark}${L("جيب من الفاك", "Importer depuis la fac")}</h3>
        <form data-form="facImport" class="stack">
          <label class="f">${L("الصق الإعلانات ولا جدول الأوقات", "Colle les annonces ou l'emploi du temps")}<textarea id="fi-text" name="text" maxlength="20000" placeholder="${L("مثلا: Examen Analyse 2 le 15/01/2027 à 9h, Amphi A…", "ex : Examen Analyse 2 le 15/01/2027 à 9h, Amphi A…")}"></textarea></label>
          ${App.aiImages ? `<label class="f">${L("ولا تصاور (capture / جدول)", "Ou des captures (emploi du temps, annonce)")}<input id="fi-img" name="img" type="file" accept="image/jpeg,image/png,image/webp" multiple data-change="facImg"></label><span class="tiny muted" id="fi-count">${(App.uiState.facImgs || []).length ? (App.uiState.facImgs.length + " " + L("تصاور", "images")) : ""}</span>` : ""}
          <button class="btn primary" type="submit" id="fi-go" ${App.ai ? "" : "disabled"}>${I.spark}${L("استخرج", "Extraire")}</button>
        </form>
        ${App.ai ? "" : App.aiNote()}
        <div id="facOut" style="margin-top:12px">${imp ? importHtml(imp) : ""}</div>
      </div>
      ${(st.news || []).length ? `<div class="card" style="grid-column:1/-1"><h3>${I.bell}${L("آخر الإعلانات", "Dernières annonces")}</h3><div class="list">${st.news.slice().reverse().map(n => `<div class="li"><span class="grow small"><b>${U.esc(n.title)}</b>${n.date ? ` <span class="tiny muted">${U.esc(n.date)}</span>` : ""}<div class="muted">${U.esc(n.summary || "")}</div></span></div>`).join("")}</div></div>` : ""}
    </div>`;
  }
  function importHtml(imp) {
    const wd = WDN();
    const sec = (title, arr, row) => arr.length ? `<b class="small">${title} (${arr.length})</b><div class="list">${arr.map(row).join("")}</div>` : "";
    return `<div class="stack">
      ${sec(L("مواد", "Matières"), imp.subjects, x => `<div class="li small">${U.esc(x.name)}${x.coef ? ` <span class="tiny muted">${L("ضارب", "coef")} ${x.coef}</span>` : ""}</div>`)}
      ${sec(L("امتحانات وآجال", "Examens / échéances"), imp.exams, x => `<div class="li small"><span class="pill">${U.esc(etName(x.type))}</span><span class="grow">${U.esc(x.subject)}${x.note ? " · " + U.esc(x.note) : ""}</span><span class="tiny muted">${U.esc(x.date)}</span></div>`)}
      ${sec(L("حصص", "Cours"), imp.classes, x => `<div class="li small">${wd[+x.day] || ""} ${U.ltr(U.esc(x.start) + "–" + U.esc(x.end))} · ${U.esc(x.subject)}${x.room ? " · " + U.esc(x.room) : ""}</div>`)}
      ${sec(L("إعلانات", "Annonces"), imp.announcements, x => `<div class="li small"><span class="grow"><b>${U.esc(x.title)}</b> <span class="muted">${U.esc(x.summary || "")}</span></span></div>`)}
      ${!(imp.subjects.length + imp.exams.length + imp.classes.length + imp.announcements.length) ? `<div class="empty">${L("ما لقيت حتى معلومة واضحة.", "Rien de clair trouvé.")}</div>` : `<div class="row"><button class="btn primary" data-act="facApply">${I.check}${L("زيدهم للبرنامج", "Ajouter au planning")}</button><button class="btn ghost" data-act="facDiscard">${L("بطّل", "Annuler")}</button></div>`}
    </div>`;
  }

  function viewSimplify() {
    const st = Store.doc("study"), notes = Store.doc("notes").items;
    const cur = App.uiState.simpleOut;
    return `<div class="grid g2">
      <div class="card"><h3>${I.spark}${L("بسّطلي الدرس", "Simplifie-moi le cours")}</h3>
        <form data-form="simplify" class="stack">
          <label class="f">${L("المادة", "Matière")}<select id="sp-subj" name="subj"><option value="">—</option>${st.subjects.map(s => `<option value="${s.id}">${U.esc(s.name)}</option>`).join("")}</select></label>
          <label class="f">${L("الصق جزء مالدرس", "Colle une partie du cours")}<textarea id="sp-text" name="text" maxlength="30000" style="min-height:140px"></textarea></label>
          ${App.aiImages ? `<label class="f">${L("ولا صوّر صفحات الكراس / الدرس", "Ou photographie les pages du cours")}<input id="sp-img" type="file" accept="image/jpeg,image/png,image/webp" multiple data-change="simpleImg"></label><span class="tiny muted" id="sp-count">${(App.uiState.simpleImgs || []).length ? App.uiState.simpleImgs.length + " " + L("تصاور", "images") : ""}</span>` : ""}
          <label class="f">${L("شنوة تحب", "Ce que tu veux")}<select id="sp-mode" name="mode"><option value="explain">${L("شرح مبسط + أمثلة + أسئلة", "Explication simple + exemples + questions")}</option><option value="summary">${L("ملخص للمراجعة", "Fiche de révision")}</option><option value="exercise">${L("تمارين محلولة خطوة بخطوة", "Exercices corrigés pas à pas")}</option></select></label>
          <div class="row"><button class="btn primary" type="submit" id="sp-go" ${App.ai ? "" : "disabled"}>${I.spark}${L("بسّط", "Simplifier")}</button><button class="btn hide" type="button" id="sp-stop" data-act="simpleStop">${L("وقّف", "Arrêter")}</button></div>
        </form>
        ${App.ai ? "" : App.aiNote()}
      </div>
      <div class="card"><h3>${I.book}${L("الشرح", "Explication")}</h3>
        <div id="simpleOut" class="rich">${cur ? U.md(cur.text) : `<p class="small muted">${L("الشرح يظهر هنا.", "L'explication s'affiche ici.")}</p>`}</div>
        <div class="row ${cur && cur.done ? "" : "hide"}" id="simpleActs" style="margin-top:10px"><button class="btn primary" data-act="simpleSave">${I.check}${L("سجّل في الملاحظات", "Enregistrer dans mes fiches")}</button><button class="btn" data-act="simpleCopy">${I.copy}${L("انسخ", "Copier")}</button></div>
      </div>
      <div class="card" style="grid-column:1/-1"><h3>${I.book}${L("ملاحظاتي", "Mes fiches")}</h3>
        ${notes.length ? `<div class="list">${notes.slice().reverse().map(n => `<div class="li"><span class="grow"><b class="small">${U.esc(n.title)}</b> <span class="tiny muted">${U.esc(n.subjName || "")} · ${U.esc(U.dateShort(new Date(n.ts)))}</span></span><button class="btn sm" data-act="noteOpen" data-id="${n.id}">${L("حل", "Ouvrir")}</button><button class="iconbtn" style="width:30px;height:30px" data-act="noteDel" data-id="${n.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>`).join("")}</div>` : `<div class="empty">${L("الملخصات اللي تسجلهم يظهروا هنا.", "Tes fiches enregistrées apparaissent ici.")}</div>`}
      </div>
    </div>`;
  }

  function viewProjects() {
    const s = Store.doc("settings").study, st = Store.doc("study");
    const prop = App.uiState.projProp;
    return `<div class="grid g2">
      <div class="card"><h3>${I.target}${L("شكون انت؟", "Ton profil")}</h3>
        <form data-form="projProfile" class="form">
          <label class="f full">${L("الاختصاص", "Spécialité")}<input id="pp-field" name="field" type="text" maxlength="80" value="${U.esc(s.field)}" placeholder="${L("مثلا: إعلامية، تصرف، بيولوجيا…", "ex : informatique, gestion, biologie…")}"></label>
          <label class="f">${L("المستوى", "Niveau")}<input id="pp-level" name="level" type="text" maxlength="20" value="${U.esc(s.level)}" placeholder="L2, M1…"></label>
          <label class="f full">${L("شنوة يعجبك / شنوة تحب تخدم", "Tes intérêts / métier visé")}<input id="pp-int" name="interests" type="text" maxlength="160" value="${U.esc(s.interests)}"></label>
          <div class="row full"><button class="btn" type="submit">${L("سجّل", "Enregistrer")}</button><button class="btn primary" type="button" data-act="projSuggest" ${App.ai ? "" : "disabled"}>${I.spark}${L("اقترحلي مشاريع", "Propose-moi des projets")}</button></div>
        </form>
        ${App.ai ? "" : App.aiNote()}
        <div id="projOut" style="margin-top:12px">${prop ? propHtml(prop) : ""}</div>
      </div>
      <div class="card"><h3>${I.check}${L("مشاريعي", "Mes projets")}</h3>
        ${st.projects.length ? st.projects.map(p => { const d = p.steps.filter(x => x.done).length; return `<div class="card flat" style="padding:12px;margin-bottom:10px"><div class="row between"><b>${U.esc(p.title)}</b><button class="iconbtn" style="width:30px;height:30px" data-act="projDel" data-id="${p.id}" aria-label="${L("امسح", "Supprimer")}">${I.trash}</button></div>
          <div class="bar good" style="margin:8px 0"><i style="width:${p.steps.length ? d / p.steps.length * 100 : 0}%"></i></div>
          <div class="list steps">${p.steps.map((x, i) => `<div class="li ${x.done ? "done" : ""}"><label class="check"><input type="checkbox" data-change="projStep" data-id="${p.id}" data-i="${i}" ${x.done ? "checked" : ""}></label><span class="grow small">${U.esc(x.t)}</span></div>`).join("")}</div>
          ${p.skills && p.skills.length ? `<div class="row" style="margin-top:6px">${p.skills.map(k => `<span class="pill">${U.esc(k)}</span>`).join("")}</div>` : ""}</div>`; }).join("") : `<div class="empty">${L("اختار مشروع من الاقتراحات باش تتبع خطواتو.", "Choisis un projet proposé pour suivre ses étapes.")}</div>`}
      </div>
    </div>`;
  }
  function propHtml(list) {
    return `<div class="stack">${list.map((p, i) => `<div class="card flat" style="padding:12px"><div class="row between"><b>${U.esc(p.title)}</b><span class="pill accent">${U.esc(String(p.weeks || "?"))} ${L("جمعات", "sem.")}</span></div>
      <p class="small" style="margin-top:4px">${U.esc(p.why || "")}</p>
      ${Array.isArray(p.skills) ? `<div class="row" style="margin-top:6px">${p.skills.slice(0, 6).map(k => `<span class="pill">${U.esc(k)}</span>`).join("")}</div>` : ""}
      <button class="btn sm primary" style="margin-top:8px" data-act="projTake" data-i="${i}">${I.plus}${L("خوذ المشروع هذا", "Prendre ce projet")}</button></div>`).join("")}</div>`;
  }

  /* ---------- actions ---------- */
  App.forms.subjAdd = (fd) => { const st = Store.doc("study"); st.subjects.push({ id: U.id(), name: fd.name.trim(), coef: parseFloat(fd.coef) || 1, diff: +fd.diff || 2 }); Store.save("study"); App.render(); };
  App.acts.subjDel = (el) => App.confirm(L("تمسح المادة؟ الامتحانات متاعها زادة.", "Supprimer la matière et ses examens ?"), () => { const st = Store.doc("study"); st.subjects = st.subjects.filter(s => s.id !== el.dataset.id); st.exams = st.exams.filter(e => e.subj !== el.dataset.id); Store.save("study"); App.render(); });
  App.forms.examAdd = (fd) => { if (!fd.date) return; const st = Store.doc("study"); st.exams.push({ id: U.id(), subj: fd.subj, type: fd.type, date: fd.date, note: (fd.note || "").trim() }); Store.save("study"); App.render(); };
  App.acts.examDel = (el) => { const st = Store.doc("study"); st.exams = st.exams.filter(e => e.id !== el.dataset.id); Store.save("study"); App.render(); };
  App.forms.classAdd = (fd) => { const st = Store.doc("study"); st.classes.push({ id: U.id(), day: +fd.day, start: fd.start, end: fd.end, subj: fd.subj.trim(), room: (fd.room || "").trim() }); Store.save("study"); App.render(); };
  App.acts.classDel = (el) => { const st = Store.doc("study"); st.classes = st.classes.filter(c => c.id !== el.dataset.id); Store.save("study"); App.render(); };
  App.changes.sessDone = (el) => {
    const st = Store.doc("study"), tk = U.dkey(); const arr = st.done[tk] || [];
    const i = +el.dataset.i; st.done[tk] = el.checked ? [...new Set([...arr, i])] : arr.filter(x => x !== i);
    const lim = U.dkey(U.addDays(new Date(), -60)); for (const k of Object.keys(st.done)) if (k < lim) delete st.done[k];
    Store.save("study"); App.render();
  };
  App.acts.pomodoro = () => {
    const s = Store.doc("settings").study; let remain = (+s.sessionMin || 45) * 60, timer = null;
    App.modal(L("حصة قراية", "Séance d'étude"), `<div class="coach stack"><div class="timer" id="pTimer">${U.dur(remain * 1000)}</div><p class="small muted">${L("سكّر التلفون، كاس ماء قدامك، وابدا. رب زدني علما.", "Téléphone de côté, un verre d'eau, et c'est parti.")}</p><div class="row" style="justify-content:center"><button class="btn primary" id="pGo">${I.play}${L("ابدا", "Démarrer")}</button></div></div>`, (mb) => {
      const t = mb.querySelector("#pTimer"), go = mb.querySelector("#pGo");
      go.onclick = () => { go.disabled = true; timer = setInterval(() => { if (!document.getElementById("modal")) { clearInterval(timer); return; } remain--; t.textContent = U.dur(remain * 1000); if (remain <= 0) { clearInterval(timer); App.Notifier.beep(); App.toast(L("كمّلت الحصة!", "Séance terminée !"), L("خوذ راحة قصيرة.", "Prends une courte pause."), "good"); } }, 1000); };
    });
  };
  App.forms.facCfg = (fd) => { const s = Store.doc("settings"); s.study.facName = fd.facName.trim(); s.study.facUrl = /^https?:\/\//i.test(fd.facUrl) ? fd.facUrl.trim() : (fd.facUrl ? "https://" + fd.facUrl.trim() : ""); Store.save("settings"); App.render(); };
  App.changes.facImg = (el) => { const lim = (App.aiImgLimits && App.aiImgLimits.maxCount) || 4; App.uiState.facImgs = Array.from(el.files || []).slice(0, lim); const c = document.getElementById("fi-count"); if (c) c.textContent = App.uiState.facImgs.length + " " + L("تصاور", "images"); };
  App.forms.facImport = async (fd) => {
    if (!App.ai) return;
    const text = (fd.text || "").trim(), imgs = App.uiState.facImgs || [];
    if (!text && !imgs.length) return;
    const out = document.getElementById("facOut"), btn = document.getElementById("fi-go");
    if (btn) btn.disabled = true;
    if (out) out.innerHTML = `<p class="small"><span class="spinner"></span> ${L("نقرا…", "Lecture…")}</p>`;
    const today = U.dkey();
    const prompt = `Extract study information from this Tunisian university content (announcements, timetable, exam calendar). Today is ${today}. Content may be in French or Arabic.
${text ? "TEXT:\n" + text.slice(0, 18000) : ""}${imgs.length ? "\nAlso read the attached image(s)." : ""}
Reply with ONLY a JSON object:
{"subjects":[{"name":"","coef":null}],"exams":[{"subject":"","type":"exam|ds|tp|project|other","date":"YYYY-MM-DD","note":"time/room if any"}],"classes":[{"day":1,"start":"HH:MM","end":"HH:MM","subject":"","room":""}],"announcements":[{"title":"","date":"YYYY-MM-DD or empty","summary":"one sentence in ${App.lang === "fr" ? "French" : "Arabic"}"}]}
day: 0=Sunday,1=Monday,...,6=Saturday. Keep subject names as written. Only include what is actually present; use empty arrays otherwise.`;
    try {
      const j = await App.ai.json(prompt, imgs.length ? { images: imgs } : {});
      const arr = (x) => Array.isArray(x) ? x : [];
      App.uiState.facImport = {
        subjects: arr(j.subjects).filter(x => x && x.name).slice(0, 30),
        exams: arr(j.exams).filter(x => x && x.subject && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).slice(0, 40),
        classes: arr(j.classes).filter(x => x && x.subject && /^\d{1,2}:\d{2}$/.test(x.start || "") && /^\d{1,2}:\d{2}$/.test(x.end || "")).map(x => ({ ...x, start: x.start.padStart(5, "0"), end: x.end.padStart(5, "0") })).slice(0, 60),
        announcements: arr(j.announcements).filter(x => x && x.title).slice(0, 15)
      };
      if (out) out.innerHTML = importHtml(App.uiState.facImport);
    } catch (e) { const m = App.aiError(e); if (out) out.innerHTML = m ? `<div class="alertbox warn small">${U.esc(m)}</div>` : ""; }
    if (btn) btn.disabled = false;
  };
  App.acts.facApply = () => {
    const imp = App.uiState.facImport; if (!imp) return;
    const st = Store.doc("study");
    const findSub = (name) => {
      const n = String(name).trim().toLowerCase();
      let s = st.subjects.find(x => x.name.toLowerCase() === n);
      if (!s) { s = { id: U.id(), name: String(name).trim(), coef: 1, diff: 2 }; st.subjects.push(s); }
      return s;
    };
    imp.subjects.forEach(x => { const s = findSub(x.name); if (x.coef) s.coef = +x.coef || s.coef; });
    imp.exams.forEach(x => { const s = findSub(x.subject); if (!st.exams.some(e => e.subj === s.id && e.date === x.date && e.type === x.type)) st.exams.push({ id: U.id(), subj: s.id, type: ETYPES.some(t => t[0] === x.type) ? x.type : "exam", date: x.date, note: String(x.note || "").slice(0, 60) }); });
    imp.classes.forEach(x => { findSub(x.subject); if (!st.classes.some(c => +c.day === +x.day && c.start === x.start && c.subj === x.subject)) st.classes.push({ id: U.id(), day: +x.day, start: x.start, end: x.end, subj: x.subject, room: String(x.room || "").slice(0, 20) }); });
    st.news = [...(st.news || []), ...imp.announcements.map(a => ({ title: String(a.title).slice(0, 100), date: a.date || "", summary: String(a.summary || "").slice(0, 240) }))].slice(-20);
    Store.save("study");
    App.uiState.facImport = null; App.uiState.facImgs = [];
    App.toast(L("تزادو للبرنامج", "Ajouté au planning"), "", "good"); App.render();
  };
  App.acts.facDiscard = () => { App.uiState.facImport = null; App.render(); };

  App.changes.simpleImg = (el) => { const lim = (App.aiImgLimits && App.aiImgLimits.maxCount) || 4; App.uiState.simpleImgs = Array.from(el.files || []).slice(0, lim); const c = document.getElementById("sp-count"); if (c) c.textContent = App.uiState.simpleImgs.length + " " + L("تصاور", "images"); };
  App.forms.simplify = async (fd) => {
    if (!App.ai) return;
    const text = (fd.text || "").trim(), imgs = App.uiState.simpleImgs || [];
    if (!text && !imgs.length) return;
    const st = Store.doc("study"), s = Store.doc("settings").study;
    const subj = st.subjects.find(x => x.id === fd.subj);
    const modes = {
      explain: "Explain it simply like a patient tutor: 1) the main idea in 2 sentences, 2) step-by-step explanation with everyday analogies, 3) one or two worked examples, 4) the key points to memorise as bullets, 5) five review questions with short answers.",
      summary: "Make a compact revision sheet: definitions, formulas/rules, key points as bullets, common exam traps, and three quick self-test questions with answers.",
      exercise: "Create three exercises of increasing difficulty on this content and solve each step by step, explaining the reasoning, then give one extra exercise without solution."
    };
    const prompt = `You help a Tunisian university student${s.field ? " in " + s.field : ""}${s.level ? " (" + s.level + ")" : ""}${subj ? ", subject: " + subj.name : ""}.
${modes[fd.mode] || modes.explain}
Write in ${langName()}. Use short paragraphs, '## ' headings and '- ' bullets, and **bold** for key terms. No tables.
COURSE CONTENT:
${text ? text.slice(0, 25000) : "(see the attached photos of the course pages)"}`;
    const out = document.getElementById("simpleOut"), go = document.getElementById("sp-go"), stop = document.getElementById("sp-stop"), acts = document.getElementById("simpleActs");
    const ctl = new AbortController(); App.uiState.simpleCtl = ctl;
    if (go) go.disabled = true; if (stop) stop.classList.remove("hide"); if (acts) acts.classList.add("hide");
    if (out) out.innerHTML = `<p class="small"><span class="spinner"></span> ${L("يخمم…", "Réflexion…")}</p>`;
    App.uiState.simpleOut = { text: "", done: false, subj: subj ? subj.name : "", title: (text.split("\n")[0] || (subj ? subj.name : L("درس", "Cours"))).slice(0, 60) };
    try {
      const opts = { signal: ctl.signal, onText: ({ text: t }) => { App.uiState.simpleOut.text = t; if (out) out.innerHTML = U.md(t); } };
      if (imgs.length) opts.images = imgs;
      const r = await App.ai(prompt, opts);
      App.uiState.simpleOut.text = r.text; App.uiState.simpleOut.done = true;
      const h = r.text.match(/^#{1,4}\s+(.+)$/m); if (h) App.uiState.simpleOut.title = h[1].slice(0, 70);
      if (out) out.innerHTML = U.md(r.text) + (r.truncated ? `<p class="tiny muted">${L("الجواب تقصّ — ابعث جزء أصغر.", "Réponse coupée — envoie une partie plus courte.")}</p>` : "");
      if (acts) acts.classList.remove("hide");
    } catch (e) {
      if (e && e.text) { App.uiState.simpleOut.text = e.text; App.uiState.simpleOut.done = true; if (acts) acts.classList.remove("hide"); }
      const m = App.aiError(e); if (m && out) out.insertAdjacentHTML("beforeend", `<div class="alertbox warn small">${U.esc(m)}</div>`);
    }
    if (go) go.disabled = false; if (stop) stop.classList.add("hide");
  };
  App.acts.simpleStop = () => { try { App.uiState.simpleCtl && App.uiState.simpleCtl.abort(); } catch (e) { /* ignore */ } };
  App.acts.simpleSave = () => {
    const c = App.uiState.simpleOut; if (!c || !c.text) return;
    const n = Store.doc("notes");
    n.items.push({ id: U.id(), ts: Date.now(), title: c.title, subjName: c.subj, text: c.text.slice(0, 12000) });
    if (n.items.length > 25) n.items = n.items.slice(-25);
    Store.save("notes"); App.toast(L("تسجّلت في الملاحظات", "Fiche enregistrée"), "", "good"); App.render();
  };
  App.acts.simpleCopy = () => { const c = App.uiState.simpleOut; if (c) App.copy(c.text); };
  App.acts.noteOpen = (el) => { const n = Store.doc("notes").items.find(x => x.id === el.dataset.id); if (n) App.modal(n.title, `<div class="rich">${U.md(n.text)}</div>`); };
  App.acts.noteDel = (el) => App.confirm(L("تمسح الملاحظة؟", "Supprimer la fiche ?"), () => { const n = Store.doc("notes"); n.items = n.items.filter(x => x.id !== el.dataset.id); Store.save("notes"); App.render(); });

  App.forms.projProfile = (fd) => { const s = Store.doc("settings"); s.study.field = fd.field.trim(); s.study.level = fd.level.trim(); s.study.interests = fd.interests.trim(); Store.save("settings"); App.toast(L("تسجّل", "Enregistré"), "", "good"); };
  App.acts.projSuggest = async (el) => {
    if (!App.ai) return;
    const f = el.closest("form"); if (f) App.forms.projProfile(Object.fromEntries(new FormData(f).entries()));
    const s = Store.doc("settings").study, st = Store.doc("study");
    const out = document.getElementById("projOut");
    el.disabled = true; if (out) out.innerHTML = `<p class="small"><span class="spinner"></span> ${L("نحضّر اقتراحات…", "Je prépare des idées…")}</p>`;
    const prompt = `Propose 4 personal projects that would help a Tunisian university student build a career.
Field: ${s.field || "unknown"}; level: ${s.level || "unknown"}; interests / target job: ${s.interests || "not given"}; subjects this year: ${st.subjects.map(x => x.name).join(", ") || "unknown"}.
Projects must be doable alongside studies (5-6 hours per week), cheap (free tools), build a portfolio, and match the Tunisian and international job market (freelance, remote, internships/PFE).
Reply with ONLY a JSON array of 4 objects, text in ${App.lang === "fr" ? "French" : "Arabic"}:
[{"title":"","why":"one or two sentences: why it helps the career","skills":["",""],"weeks":6,"steps":["concrete step 1","step 2","step 3","step 4","step 5","step 6"]}]`;
    try {
      const j = await App.ai.json(prompt, { cache: false });
      App.uiState.projProp = (Array.isArray(j) ? j : []).filter(x => x && x.title).slice(0, 5);
      if (out) out.innerHTML = propHtml(App.uiState.projProp);
    } catch (e) { const m = App.aiError(e); if (out) out.innerHTML = m ? `<div class="alertbox warn small">${U.esc(m)}</div>` : ""; }
    el.disabled = false;
  };
  App.acts.projTake = (el) => {
    const p = (App.uiState.projProp || [])[+el.dataset.i]; if (!p) return;
    const st = Store.doc("study");
    st.projects.push({ id: U.id(), title: String(p.title).slice(0, 100), why: String(p.why || "").slice(0, 300), skills: (p.skills || []).slice(0, 8).map(x => String(x).slice(0, 30)), weeks: +p.weeks || 0, steps: (p.steps || []).slice(0, 12).map(t => ({ t: String(t).slice(0, 160), done: false })) });
    Store.save("study"); App.toast(L("تزاد المشروع", "Projet ajouté"), p.title, "good"); App.render();
  };
  App.changes.projStep = (el) => { const st = Store.doc("study"); const p = st.projects.find(x => x.id === el.dataset.id); if (!p) return; p.steps[+el.dataset.i].done = el.checked; Store.save("study"); App.render(); };
  App.acts.projDel = (el) => App.confirm(L("تمسح المشروع؟", "Supprimer le projet ?"), () => { const st = Store.doc("study"); st.projects = st.projects.filter(p => p.id !== el.dataset.id); Store.save("study"); App.render(); });

  App.eventSources.push(() => {
    const st = Store.doc("study"); if (!st.subjects.length) return [];
    const done = st.done[U.dkey()] || [];
    return plan().filter(x => !done.includes(x.idx)).map(x => ({ key: "study-" + x.idx, at: x.start, title: L("وقت القراية: ", "Étude : ") + x.sub.name, body: x.kind + " · " + U.range(x.start, x.end), kind: "info" }));
  });

  App.views.study = { render };
})();
