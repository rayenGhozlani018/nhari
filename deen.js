/* Nhari — Dine: prayer times + log, Quran memorisation, adhkar, daily hadith */
(function () {
  "use strict";
  const D = window.NhariData;
  const PR = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const prName = (k) => ({ fajr: L("الصبح", "Sobh"), sunrise: L("الشروق", "Chourouk"), dhuhr: L("الظهر", "Dhohr"), asr: L("العصر", "Asr"), maghrib: L("المغرب", "Maghreb"), isha: L("العشاء", "Icha") }[k]);
  App.prName = prName;

  /* ---------- prayer times ---------- */
  const P = App.prayer = {
    cfg() { const s = Store.doc("settings"); return { lat: +s.lat, lng: +s.lng, method: s.method, asr: +s.asr || 1, adj: s.adj, tz: s.tz || undefined }; },
    cityDate(date, tz) {
      try { const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date).split("-").map(Number); return { y: p[0], m: p[1], d: p[2] }; }
      catch (e) { return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }; }
    },
    today(date = new Date()) { const c = P.cfg(); return window.NhariPrayer.prayerTimes(P.cityDate(date, c.tz), c); },
    status(now = new Date()) {
      const t = P.today(now);
      let next = PR.map(k => ({ k, at: t[k] })).find(x => x.at > now);
      if (!next) { const tm = P.today(U.addDays(now, 1)); next = { k: "fajr", at: tm.fajr, tomorrow: true }; }
      const cur = PR.slice().reverse().map(k => ({ k, at: t[k] })).find(x => x.at <= now) || null;
      return { t, next, cur };
    },
    hm(d) { return U.hm(d, P.cfg().tz); }
  };
  /* ---------- hadith of the day ---------- */
  const HD = window.NhariHadith;
  const dayNum = (d) => { const p = U.P(d); return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000); };
  const mod = (a, n) => ((a % n) + n) % n;
  // a new hadith every day (Tunis calendar), in a fixed shuffled order; Fridays get a Friday hadith
  App.hadithOfDay = (d = new Date()) => {
    const n = dayNum(d);
    if (U.dow(d) === 5 && HD.FRIDAY.length) return HD.FRIDAY[mod(Math.floor(n / 7), HD.FRIDAY.length)];
    return HD.LIST[HD.ORDER[mod(n, HD.LIST.length)]];
  };

  /* ---------- quran ---------- */
  const INTERVALS = [1, 3, 7, 14, 30, 60];
  const Q = App.Q = {
    st(n) { return Store.doc("deen").quran[n] || { st: "none", upto: 0 }; },
    order() { const dir = Store.doc("settings").quran.direction; const a = D.SURAHS.map(s => s.n); return dir === "back" ? a.reverse() : a; },
    current() { return Q.order().map(n => D.SURAHS[n - 1]).find(s => Q.st(s.n).st !== "done") || null; },
    memorised() { return U.sum(D.SURAHS, s => { const q = Q.st(s.n); return q.st === "done" || q.st === "weak" ? s.ayat : q.st === "learning" ? (q.upto || 0) : 0; }); },
    due() {
      const tk = U.dkey();
      const weak = D.SURAHS.filter(s => Q.st(s.n).st === "weak").map(s => ({ s, due: "0000", q: Q.st(s.n), weak: true }));
      const done = D.SURAHS.filter(s => Q.st(s.n).st === "done").map(s => { const q = Q.st(s.n); const due = U.dkey(U.addDays(U.parseD(q.last || tk), INTERVALS[U.clamp(q.str || 0, 0, 5)])); return { s, due, q }; })
        .filter(x => x.due <= tk).sort((a, b) => a.due.localeCompare(b.due));
      return [...weak.slice(0, 2), ...done, ...weak.slice(2)];
    },
    wirdDone() { const d = Store.doc("deen"); return !!(d.wird && d.wird[U.dkey()]); },
    halaqa() { const h = Store.doc("settings").quran.halaqa || {}; return h.label ? h : null; },
    halaqaToday(d = new Date()) {
      const h = Q.halaqa(); if (!h) return null;
      const dow = U.dow(d), from = parseInt(h.from), to = parseInt(h.to);
      let today;
      if (dow === 6) today = L("العرض", "Récitation");
      else if (dow === 0) today = L("مراجعة الثمن كامل", "Révision de tout le thumun");
      else if (from > 0 && to >= from) {
        const per = Math.ceil((to - from + 1) / 5), a = from + (dow - 1) * per, b = Math.min(to, a + per - 1);
        today = a <= to ? L(`الآيات ${a}–${b}`, `versets ${a}–${b}`) : L("مراجعة الثمن", "Révision du thumun");
      } else today = L("جزء من الثمن", "une partie du thumun");
      return { label: h.label, today, from, to, surah: +h.surah || 9 };
    }
  };

  function adhkarDay() { const d = Store.doc("deen"); return d.adhkar[U.dkey()] || {}; }
  function adhkarProgress(cat) {
    const day = adhkarDay()[cat] || {}; const list = D.ADHKAR[cat];
    const done = list.filter((x, i) => (day[i] || 0) >= x.n).length; return { done, total: list.length };
  }
  App.adhkarProgress = adhkarProgress;

  /* ---------- views ---------- */
  function render() {
    const sub = App.sub.deen || "prayer";
    const tabs = [["prayer", L("الصلاة", "Prière")], ["quran", L("حفظ القرآن", "Mémorisation du Coran")], ["adhkar", L("الأذكار", "Adhkar")], ...App.extTabs("deen")];
    let html = `<div class="sectionhead"><h2>${L("الدين", "Dine")}</h2><span class="muted small">${U.esc(U.hijri(new Date(), +Store.doc("settings").hijriAdj || 0))}</span></div>
      <div class="subtabs">${tabs.map(t => `<button data-act="sub" data-tab="deen" data-v="${t[0]}" aria-pressed="${sub === t[0]}">${t[1]}</button>`).join("")}</div>`;
    if (sub === "prayer") html += viewPrayer();
    if (sub === "quran") html += viewQuran();
    if (sub === "adhkar") html += viewAdhkar();
    html += App.extView("deen", sub);
    return html;
  }

  const hDoc = () => { const d = Store.doc("deen"); d.hadith = d.hadith || { mem: {}, ai: {} }; d.hadith.mem = d.hadith.mem || {}; d.hadith.ai = d.hadith.ai || {}; return d.hadith; };
  const hIntro = (h) => h.pre ? U.esc(h.pre) : "قال رسول الله ﷺ:";
  function hadithCard() {
    const h = App.hadithOfDay(), mem = !!hDoc().mem[h.id];
    return `<div class="card hadith stripe saffron tap" data-act="hadithOpen" role="button" tabindex="0" aria-label="${L("حديث اليوم — شرح", "Hadith du jour — explication")}">
      <div class="row between" style="margin-bottom:6px"><span class="tiny muted">${L("حديث اليوم", "Hadith du jour")}${U.dow() === 5 ? " · " + L("الجمعة", "vendredi") : ""}</span>${mem ? `<span class="pill good tiny">${I.check}${L("حافظو", "Mémorisé")}</span>` : ""}</div>
      <div class="q ar-text">${hIntro(h)} «${U.esc(h.t)}»</div>
      <div class="row between" style="margin-top:8px"><span class="src ar-text" style="margin-top:0">${U.esc(h.src)}</span><span class="tiny accent-text">${L("انزل للشرح ←", "Toucher pour l'explication →")}</span></div>
    </div>`;
  }
  let hOffset = 0;
  function hadithBody(h, off) {
    const st = hDoc(), mem = !!st.mem[h.id], ai = st.ai[h.id];
    const day = U.addDays(new Date(), off);
    const when = off === 0 ? L("اليوم", "Aujourd'hui") : off === -1 ? L("البارح", "Hier") : off === 1 ? L("غدوة", "Demain") : off > 0 ? L(`بعد ${off} أيام`, `Dans ${off} jours`) : L(`قبل ${-off} أيام`, `Il y a ${-off} jours`);
    return `<div class="hx">
      <div class="row between" style="margin-bottom:10px">
        <button class="btn sm" data-act="hadithNav" data-d="-1" aria-label="${L("اللي قبل", "Précédent")}">${App.lang === "ar" ? "→" : "←"}</button>
        <span class="small muted">${U.esc(when)} · ${U.ltr ? U.ltr(U.dkey(day)) : U.dkey(day)}</span>
        <button class="btn sm" data-act="hadithNav" data-d="1" aria-label="${L("اللي بعد", "Suivant")}">${App.lang === "ar" ? "←" : "→"}</button>
      </div>
      <div class="card hadith" style="margin:0 0 12px">
        <div class="tiny muted hx-p" dir="rtl">عن ${U.esc(h.r)} رضي الله ${U.esc(h.rd)}${h.pre ? "" : " قال: قال رسول الله ﷺ:"}</div>
        <div class="q ar-text">${h.pre ? U.esc(h.pre) + " " : ""}«${U.esc(h.t)}»${h.post ? " " + U.esc(h.post) : ""}</div>
        <div class="src ar-text">${U.esc(h.src)}</div>
      </div>
      ${App.lang === "fr" ? `<p class="small" style="margin:0 0 10px"><b>Sens :</b> ${U.esc(h.fr)}</p>` : ""}
      <h4 style="margin:12px 0 4px">${L("المعنى", "Explication")}</h4>
      <p class="hx-p" dir="rtl" style="margin:0;line-height:1.9">${U.esc(h.m)}</p>
      <h4 style="margin:12px 0 4px">${L("فوائد", "Enseignements")}</h4>
      <ul class="hx-p" dir="rtl" style="margin:0;padding-inline-start:20px;line-height:1.9">${h.f.map(x => `<li>${U.esc(x)}</li>`).join("")}</ul>
      <div class="alertbox good small hx-p" dir="rtl" style="margin-top:12px"><b>${L("طبّقها اليوم:", "À appliquer aujourd'hui :")}</b> ${U.esc(h.d)}</div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap;gap:8px">
        <button class="btn ${mem ? "good" : ""}" data-act="hadithMem">${mem ? I.check + L("حافظو", "Mémorisé") : L("حفظتو", "Je l'ai mémorisé")}</button>
        <button class="btn" data-act="hadithCopy">${I.copy}${L("انسخ", "Copier")}</button>
        <button class="btn primary" data-act="hadithAI" ${App.ai ? "" : "disabled"}>${I.spark}${ai ? L("الشرح المفصّل", "Explication détaillée") : L("اشرحلي أكثر", "Explique-moi plus")}</button>
      </div>
      ${App.ai ? "" : `<div style="margin-top:8px">${App.aiNote()}</div>`}
      <div id="hxAi" style="margin-top:12px">${ai ? aiBlock(ai) : ""}</div>
      <p class="tiny muted" style="margin-top:12px">${L("الشرح مختصر من كلام أهل العلم (النووي، ابن حجر، ابن رجب). للتعمّق ارجع لشيخ ولا لكتاب شرح.", "Explication résumée des commentaires classiques (an-Nawawi, Ibn Hajar, Ibn Rajab). Pour approfondir, consulte un savant ou un livre de commentaire.")} · ${L("حفظت", "Mémorisés")} ${Object.keys(st.mem).length}/${HD.ALL.length}</p>
    </div>`;
  }
  const aiBlock = (text) => `<div class="card aiblk" style="margin:0"><div class="tiny muted" style="margin-bottom:6px">${I.spark}${L("شرح مفصّل بالذكاء الاصطناعي — ينجم يغلط، ثبّت مع شيخ", "Explication détaillée par l'IA — elle peut se tromper, vérifie auprès d'un savant")}</div><div class="rich hx-p" dir="${App.lang === "fr" ? "ltr" : "rtl"}">${U.md(text)}</div></div>`;
  const curHadith = () => App.hadithOfDay(U.addDays(new Date(), hOffset));
  const renderHadithModal = () => { const mb = document.querySelector("#modal .mb"); if (mb) mb.innerHTML = hadithBody(curHadith(), hOffset); };
  App.acts.hadithOpen = () => { hOffset = 0; App.modal(L("حديث اليوم", "Hadith du jour"), hadithBody(curHadith(), 0)); };
  App.acts.hadithNav = (el) => { hOffset = Math.max(-60, Math.min(60, hOffset + (+el.dataset.d || 0))); renderHadithModal(); };
  App.acts.hadithMem = () => { const st = hDoc(), h = curHadith(); if (st.mem[h.id]) delete st.mem[h.id]; else st.mem[h.id] = U.dkey(); Store.save("deen"); renderHadithModal(); App.render(); };
  App.acts.hadithCopy = () => { const h = curHadith(); App.copy(`قال رسول الله ﷺ: «${h.t}»\n${h.src}\n\n${h.m}`.replace(/^قال رسول الله ﷺ: /, h.pre ? h.pre + " " : "قال رسول الله ﷺ: ")); };
  App.acts.hadithAI = async (el) => {
    if (!App.ai) return;
    const h = curHadith(), st = hDoc(), out = document.getElementById("hxAi");
    if (st.ai[h.id]) { if (out) out.innerHTML = aiBlock(st.ai[h.id]); return; }
    el.disabled = true; if (out) out.innerHTML = `<div class="row" style="gap:8px"><span class="spinner"></span><span class="small muted">${L("الذكاء الاصطناعي يحضّر في الشرح…", "L'IA prépare l'explication…")}</span></div>`;
    const fr = App.lang === "fr";
    const prompt = `${fr ? "Explique en français" : "اشرح بالعربية الفصحى البسيطة"} ce hadith pour un jeune musulman de 24 ans, étudiant ingénieur qui travaille aussi comme technicien. / الحديث:
«${h.pre ? h.pre + " " : ""}${h.t}${h.post ? " " + h.post : ""}»
الراوي: ${h.r} — المصدر: ${h.src}

${fr ? "Structure (titres courts en markdown)" : "الهيكل (عناوين قصيرة بالـmarkdown)"}:
1. ${fr ? "Mots difficiles" : "معاني الكلمات الصعبة"}
2. ${fr ? "Sens général" : "المعنى الإجمالي"}
3. ${fr ? "Contexte (seulement s'il est connu et établi)" : "سبب الورود أو السياق (فقط إن كان معروفا وثابتا)"}
4. ${fr ? "Enseignements (3 à 5)" : "الفوائد (من 3 إلى 5)"}
5. ${fr ? "Application concrète aujourd'hui (travail, études, sport, famille)" : "تطبيق عملي اليوم (في الخدمة والقراية والرياضة والعائلة) — هذه الفقرة فقط بالدارجة التونسية"}

${fr ? "Règles" : "قواعد"}: ${fr ? "n'invente aucun hadith, aucune référence, aucun chiffre ; n'attribue une parole à un savant que si tu en es sûr ; si un point est discuté entre savants, dis-le sans trancher ; pas de fatwa ; 300 mots maximum." : "لا تخترع أحاديث ولا مراجع ولا أرقاما، ولا تنسب قولا لعالم إلا إذا كنت متأكدا، وإذا كانت المسألة خلافية فاذكر ذلك دون ترجيح، ولا تُفتِ، وفي حدود 300 كلمة."}`;
    try {
      const r = await App.ai(prompt, { modelTier: "quick", onText: ({ text }) => { const o = document.getElementById("hxAi"); if (o) o.innerHTML = aiBlock(text); } });
      st.ai[h.id] = r.text;
      const ids = Object.keys(st.ai); if (ids.length > 40) delete st.ai[ids[0]];
      Store.save("deen");
      renderHadithModal();
    } catch (e) { const m = App.aiError(e); const o = document.getElementById("hxAi"); if (o) o.innerHTML = m ? `<div class="alertbox warn small">${U.esc(m)}</div>` : ""; }
    el.disabled = false;
  };
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target && e.target.matches && e.target.matches(".hadith.tap")) { e.preventDefault(); App.acts.hadithOpen(); } });
  App.hadithCard = hadithCard;

  function viewPrayer() {
    const s = Store.doc("settings"), d = Store.doc("deen"), tk = U.dkey();
    const { t, next } = P.status();
    const log = d.prayers[tk] || {};
    const city = D.CITIES.find(c => c.id === s.city);
    const week = [];
    for (let i = 6; i >= 0; i--) { const k = U.dkey(U.addDays(new Date(), -i)); week.push({ k, n: PR.filter(p => (d.prayers[k] || {})[p]).length }); }
    return `<div class="grid g2">
      <div class="card stripe accent"><div class="row between"><h3 style="margin:0">${I.moon}${L("مواقيت اليوم", "Horaires du jour")}</h3><span class="tiny muted">${U.esc(city ? L(city.ar, city.fr) : L("موقع خاص", "Position perso"))}</span></div>
        <div class="row between" style="margin:10px 0"><div><div class="tiny muted">${L("الصلاة الجاية", "Prochaine prière")}</div><div class="mid">${prName(next.k)} · ${P.hm(next.at)}</div></div><div class="big" data-cd="${next.at.getTime()}"></div></div>
        <div class="list">${["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(k => `<div class="li"><span class="grow">${prName(k)}</span><span class="amt">${P.hm(t[k])}</span></div>`).join("")}</div>
        <p class="tiny muted" style="margin-top:6px">${L("الأوقات محسوبة فلكيا. إذا تختلف دقيقة ولا زوز على جامع حومتك، صلّحها في الإعدادات.", "Horaires calculés astronomiquement. S'ils diffèrent d'une minute ou deux de ta mosquée, ajuste-les dans Réglages.")}</p>
      </div>
      <div class="card"><h3>${I.check}${L("صليت؟", "As-tu prié ?")}</h3>
        <div class="praygrid">${PR.map(k => `<button class="praybtn ${log[k] ? "on" : ""}" data-act="prayToggle" data-k="${k}" aria-pressed="${!!log[k]}">${log[k] ? I.check : ""}<b>${prName(k)}</b><span class="tiny num">${P.hm(t[k])}</span></button>`).join("")}</div>
        <h3 style="margin-top:16px">${L("الجمعة هذي", "Cette semaine")}</h3>
        <div class="weekstrip">${week.map(w => `<div class="d ${w.n === 5 ? "done" : ""} ${w.k === tk ? "today" : ""}"><b>${U.esc(U.weekday(U.parseD(w.k)))}</b>${w.n}/5</div>`).join("")}</div>
        <p class="small muted" style="margin-top:10px">${L("كي تفعّل التنبيهات، التطبيق يفكرك بالأذان وبأذكار الصباح والمساء.", "Active les rappels pour être prévenu à l'adhan et pour les adhkar du matin et du soir.")}</p>
      </div>
      <div style="grid-column:1/-1">${hadithCard()}</div>
    </div>`;
  }

  function viewQuran() {
    const s = Store.doc("settings"), d = Store.doc("deen");
    const mem = Q.memorised(), pct = mem / 6236 * 100;
    const doneN = D.SURAHS.filter(x => Q.st(x.n).st === "done").length;
    const cur = Q.current();
    const due = Q.due();
    const juz = App.uiState.juzFilter || "all";
    const cq = cur ? Q.st(cur.n) : null;
    const from = cq ? (cq.upto || 0) + 1 : 0, to = cur ? Math.min(cur.ayat, (cq.upto || 0) + (+s.quran.dailyNew || 5)) : 0;
    const wird = Q.wirdDone();
    const list = D.SURAHS.filter(x => juz === "all" || x.juz === +juz);
    const dueSet = new Set(due.map(x => x.s.n));
    const hal = Q.halaqa(), ht = Q.halaqaToday();
    const sat = (() => { let x = new Date(); for (let i = 0; i < 7 && U.dow(x) !== 6; i++) x = U.addDays(x, 1); return x; })();
    const sun = (() => { let x = new Date(); for (let i = 0; i < 7 && U.dow(x) !== 0; i++) x = U.addDays(x, 1); return x; })();
    let sunMaghrib = null; try { sunMaghrib = P.today(sun).maghrib; } catch (e) { /* ignore */ }
    const hs = s.quran.halaqa || {};
    const halCard = `<div class="card stripe ${wird ? "good" : "accent"}"><h3>${I.target}${L("حلقة الحومة (بعد الصبح)", "Halaqa du quartier (après Sobh)")}</h3>
        ${hal ? `<div class="mid">${U.esc(hal.label)}</div><p class="small">${L("اليوم", "Aujourd'hui")}: <b>${U.esc(ht.today)}</b> · ${L("العرض نهار السبت", "Récitation le samedi")} ${U.esc(U.dateShort(sat))}</p>
          <div class="row" style="margin-top:8px">${wird ? `<span class="pill good">${I.check}${L("كمّلت حفظ اليوم — بارك الله فيك", "Fait aujourd'hui — qu'Allah te bénisse")}</span>` : `<button class="btn primary" data-act="halaqaDone">${I.check}${L("حفظت جزء اليوم", "J'ai mémorisé la part du jour")}</button>`}</div>` : `<p class="small muted">${L("حط الثمن اللي تحفظو مع الجماعة.", "Indique le thumun mémorisé avec le groupe.")}</p>`}
        <details style="margin-top:10px" ${hal && hs.from ? "" : "open"}><summary class="small" style="cursor:pointer">${L("بدّل الثمن", "Modifier le thumun")}</summary>
        <form data-form="halaqaCfg" class="form" style="margin-top:8px">
          <label class="f full">${L("الاسم", "Libellé")}<input type="text" name="label" id="hq-label" maxlength="60" value="${U.esc(hs.label || "")}" placeholder="${L("الثمن 4 من سورة التوبة", "4e thumun de At-Tawba")}"></label>
          <label class="f">${L("السورة", "Sourate")}<select name="surah" id="hq-surah">${D.SURAHS.map(x => `<option value="${x.n}" ${+hs.surah === x.n ? "selected" : ""}>${x.n}. ${U.esc(L(x.ar, x.fr))}</option>`).join("")}</select></label>
          <label class="f">${L("من الآية", "Du verset")}<input type="number" min="1" name="from" id="hq-from" value="${U.esc(hs.from || "")}"></label>
          <label class="f">${L("للآية", "Au verset")}<input type="number" min="1" name="to" id="hq-to" value="${U.esc(hs.to || "")}"></label>
          <button class="btn primary" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form><p class="tiny muted" style="margin-top:6px">${L("كي تحط بداية ونهاية الثمن، التطبيق يقسمو على الاثنين→الجمعة باش توصل للعرض نهار السبت حافظو.", "Avec le début et la fin du thumun, l'app le répartit du lundi au vendredi pour la récitation du samedi.")}</p></details>
      </div>
      <div class="card stripe saffron"><h3>${I.moon}${L("حلقة الأحد", "Halaqa du dimanche")}${App.place && App.place("zitouna") ? " — " + U.esc(App.place("zitouna").name) : ""}</h3>
        <p class="small">${L("كل أحد بين المغرب والعشاء.", "Chaque dimanche entre Maghreb et Icha.")}</p>
        <div class="row between" style="margin-top:6px"><span class="mid">${U.esc(U.dateShort(sun))}</span>${sunMaghrib ? `<span class="pill accent">${L("المغرب", "Maghreb")} ${P.hm(sunMaghrib)}</span>` : ""}</div>
        <p class="tiny muted" style="margin-top:6px">${L("تحضير: الأحد 15:45–16:30 · تخرج من الدار قبل المغرب بنص ساعة.", "Préparation : dimanche 15:45–16:30 · départ 30 min avant Maghreb.")}</p>
        ${App.place && App.place("zitouna") ? `<a class="btn sm" style="margin-top:8px" href="${App.Geo.dir(App.place("home"), App.place("zitouna"))}" target="_blank" rel="noopener">${L("الطريق", "Itinéraire")}</a>` : ""}
      </div>`;
    return `<div class="grid g2">${halCard}
      <div class="card stripe saffron"><h3>${I.book}${L("رحلة الحفظ", "Ton parcours")}</h3>
        <div class="row between"><div class="big">${U.num(pct, 1)}%</div><div style="text-align:end" class="small"><div><b class="num">${mem}</b> / 6236 ${L("آية", "versets")}</div><div class="muted">${doneN} ${L("سورة محفوظة", "sourates mémorisées")}</div></div></div>
        <div class="bar saffron" style="margin:10px 0"><i style="width:${pct}%"></i></div>
        <form data-form="quranCfg" class="form" style="margin-top:6px">
          <label class="f">${L("الحفظ الجديد كل نهار", "Nouveaux versets / jour")}<input id="qc-n" name="dailyNew" type="number" min="1" max="50" value="${s.quran.dailyNew}"></label>
          <label class="f">${L("الترتيب", "Ordre")}<select id="qc-dir" name="direction"><option value="back" ${s.quran.direction === "back" ? "selected" : ""}>${L("من الناس للفاتحة (جزء عمّ لول)", "De An-Nas vers Al-Fatiha (Juz 'Amma d'abord)")}</option><option value="fwd" ${s.quran.direction === "fwd" ? "selected" : ""}>${L("من الفاتحة للناس", "De Al-Fatiha vers An-Nas")}</option></select></label>
          <button class="btn" type="submit">${L("سجّل", "Enregistrer")}</button>
        </form>
        <p class="tiny muted" style="margin-top:6px">${L("عدد الآيات حسب رواية حفص.", "Nombre de versets selon la lecture Hafs.")}</p>
      </div>
      <div class="card stripe ${wird ? "good" : "accent"}"><h3>${I.target}${hal ? L("المراجعة والحفظ الشخصي", "Révision et mémorisation perso") : L("ورد اليوم", "Wird du jour")}</h3>
        ${hal ? "" : cur ? `<div class="mid ar-text" style="text-align:start">${L("سورة ", "Sourate ")}${U.esc(L(cur.ar, cur.fr))}</div>
          <p class="small">${L(`حفظ جديد: من الآية ${from} للآية ${to} (من ${cur.ayat}).`, `Nouveau : versets ${from} à ${to} (sur ${cur.ayat}).`)}</p>
          <div class="row" style="margin-top:8px">${wird ? `<span class="pill good">${I.check}${L("ورد اليوم كمل — بارك الله فيك", "Wird fait — qu'Allah te bénisse")}</span>` : `<button class="btn primary" data-act="wirdDone">${I.check}${L("حفظتهم", "Mémorisés")}</button>`}<button class="btn sm" data-act="surahOpen" data-n="${cur.n}">${L("بدّل", "Modifier")}</button></div>`
        : `<div class="mid">${L("ختمت الحفظ — ما شاء الله!", "Coran mémorisé — Machallah !")}</div>`}
        ${hal ? `<p class="small muted">${L("السور اللي حفظتهم قبل ونسيتهم: علّمهم «نسيتها» في القائمة، ويرجعولك هنا واحدة واحدة.", "Les sourates apprises autrefois et oubliées : marque-les « oubliée » dans la liste, elles reviendront ici une à une.")}</p>` : ""}
        <h3 style="margin-top:16px">${L("المراجعة", "Révision")} ${due.length ? `<span class="pill warn">${due.length}</span>` : ""}</h3>
        ${due.length ? `<div class="list">${due.slice(0, 5).map(x => `<div class="li"><span class="grow">${U.esc(L(x.s.ar, x.s.fr))} <span class="tiny muted">${x.s.ayat} ${L("آية", "v.")}</span>${x.weak ? ` <span class="pill warn">${L("نسيتها", "oubliée")}</span>` : ""}</span><button class="btn sm" data-act="revDone" data-n="${x.s.n}">${I.check}${L("راجعتها", "Révisée")}</button><button class="btn sm ghost" data-act="revWeak" data-n="${x.s.n}">${L("نسيت شوية", "Hésitante")}</button></div>`).join("")}</div>` : `<div class="empty">${L("ما فما حتى مراجعة اليوم. السور المحفوظة ترجع للمراجعة بعد 1، 3، 7، 14، 30 يوم.", "Pas de révision aujourd'hui. Les sourates reviennent après 1, 3, 7, 14, 30 jours.")}</div>`}
      </div>
      <div class="card" style="grid-column:1/-1"><div class="row between" style="margin-bottom:10px"><h3 style="margin:0">${L("السور", "Sourates")}</h3>
        <label class="f" style="flex-direction:row;align-items:center;gap:8px">${L("الجزء", "Juz")}<select id="juz" data-change="juzFilter" style="width:auto"><option value="all">${L("الكل", "Tous")}</option>${Array.from({ length: 30 }, (_, i) => 30 - i).map(j => `<option value="${j}" ${String(j) === String(juz) ? "selected" : ""}>${j}</option>`).join("")}</select></label></div>
        <div class="row small muted" style="margin-bottom:10px;gap:14px"><span><span class="pill bad">■</span> ${L("نسيتها", "Oubliée")}</span><span><span class="pill good">■</span> ${L("محفوظة", "Mémorisée")}</span><span><span class="pill saffron">■</span> ${L("نحفظ فيها", "En cours")}</span><span><span class="pill warn">■</span> ${L("لازمها مراجعة", "À réviser")}</span></div>
        <div class="surahs">${list.map(x => { const q = Q.st(x.n); return `<button class="surah ${q.st === "done" ? "done" : q.st === "learning" ? "learning" : q.st === "weak" ? "weak" : ""} ${dueSet.has(x.n) ? "due" : ""}" data-act="surahOpen" data-n="${x.n}"><span class="nm">${U.esc(L(x.ar, x.fr))}<span>${x.n}</span></span><span class="tiny muted">${q.st === "learning" ? `${q.upto || 0}/${x.ayat}` : x.ayat + " " + L("آية", "v.")} · ${L("ج", "J")}${x.juz}</span></button>`; }).join("")}</div>
      </div>
    </div>`;
  }

  function viewAdhkar() {
    const cat = App.uiState.adhkarCat || (U.hour() < 14 ? "morning" : "evening");
    const cats = [["morning", L("الصباح", "Matin")], ["evening", L("المساء", "Soir")], ["prayer", L("بعد الصلاة", "Après la prière")], ["sleep", L("النوم", "Coucher")], ["duas", L("أدعية", "Invocations")]];
    const day = adhkarDay()[cat] || {};
    const pr = adhkarProgress(cat);
    return `<div class="subtabs">${cats.map(c => { const p = adhkarProgress(c[0]); return `<button data-act="adhkarCat" data-v="${c[0]}" aria-pressed="${cat === c[0]}">${c[1]} ${p.done === p.total ? "✓" : ""}</button>`; }).join("")}</div>
      <div class="card" style="margin-bottom:14px"><div class="row between"><b>${cats.find(c => c[0] === cat)[1]}</b><span class="pill ${pr.done === pr.total ? "good" : "accent"}">${pr.done}/${pr.total}</span></div><div class="bar ${pr.done === pr.total ? "good" : ""}" style="margin-top:8px"><i style="width:${pr.done / pr.total * 100}%"></i></div></div>
      <div class="stack">${D.ADHKAR[cat].map((x, i) => { const c = day[i] || 0, left = Math.max(0, x.n - c); return `<div class="card dhikr ${left === 0 ? "stripe good" : ""}"><div class="txt">${U.esc(x.t)}</div><div class="row between"><span class="tiny muted ar-text">${U.esc(x.src)}</span><button class="counter ${left === 0 ? "done" : ""}" data-act="dhikrTap" data-cat="${cat}" data-i="${i}" aria-label="${L("عدّ", "Compter")}">${left === 0 ? "✓" : left}</button></div></div>`; }).join("")}</div>`;
  }

  /* ---------- actions ---------- */
  App.acts.prayToggle = (el) => {
    const d = Store.doc("deen"), tk = U.dkey(); d.prayers[tk] = d.prayers[tk] || {};
    d.prayers[tk][el.dataset.k] = !d.prayers[tk][el.dataset.k];
    const lim = U.dkey(U.addDays(new Date(), -90)); for (const k of Object.keys(d.prayers)) if (k < lim) delete d.prayers[k];
    Store.save("deen"); App.render();
  };
  App.acts.adhkarCat = (el) => { App.uiState.adhkarCat = el.dataset.v; App.render(); };
  App.acts.dhikrTap = (el) => {
    const d = Store.doc("deen"), tk = U.dkey(), cat = el.dataset.cat, i = +el.dataset.i;
    d.adhkar[tk] = d.adhkar[tk] || {}; d.adhkar[tk][cat] = d.adhkar[tk][cat] || {};
    const x = D.ADHKAR[cat][i]; const c = (d.adhkar[tk][cat][i] || 0);
    if (c >= x.n) return;
    d.adhkar[tk][cat][i] = c + 1;
    const lim = U.dkey(U.addDays(new Date(), -14)); for (const k of Object.keys(d.adhkar)) if (k < lim) delete d.adhkar[k];
    Store.save("deen");
    const left = x.n - c - 1;
    el.textContent = left === 0 ? "✓" : left;
    if (left === 0) { el.classList.add("done"); try { navigator.vibrate && navigator.vibrate(30); } catch (e) { /* ignore */ } App.render(); }
  };
  App.changes.juzFilter = (el) => { App.uiState.juzFilter = el.value; App.render(); };
  App.forms.halaqaCfg = (fd) => { const s = Store.doc("settings"); s.quran.halaqa = { label: (fd.label || "").trim(), surah: +fd.surah || 9, from: fd.from ? parseInt(fd.from) : "", to: fd.to ? parseInt(fd.to) : "" }; Store.save("settings"); App.toast(L("تسجّل", "Enregistré"), "", "good"); App.render(); };
  App.acts.halaqaDone = () => { const d = Store.doc("deen"); d.wird = d.wird || {}; d.wird[U.dkey()] = true; const lim = U.dkey(U.addDays(new Date(), -30)); for (const k of Object.keys(d.wird)) if (k < lim) delete d.wird[k]; Store.save("deen"); App.render(); };
  App.forms.quranCfg = (fd) => { const s = Store.doc("settings"); s.quran.dailyNew = U.clamp(parseInt(fd.dailyNew) || 5, 1, 50); s.quran.direction = fd.direction; Store.save("settings"); App.render(); };
  App.acts.wirdDone = () => {
    const cur = Q.current(); if (!cur) return;
    const d = Store.doc("deen"), s = Store.doc("settings"), q = { ...Q.st(cur.n) };
    q.upto = Math.min(cur.ayat, (q.upto || 0) + (+s.quran.dailyNew || 5));
    if (q.upto >= cur.ayat) { q.st = "done"; q.last = U.dkey(); q.str = 0; App.toast(L("ما شاء الله!", "Machallah !"), L("كمّلت سورة ", "Sourate terminée : ") + L(cur.ar, cur.fr), "good"); }
    else q.st = "learning";
    d.quran[cur.n] = q; d.wird = d.wird || {}; d.wird[U.dkey()] = true;
    const lim = U.dkey(U.addDays(new Date(), -30)); for (const k of Object.keys(d.wird)) if (k < lim) delete d.wird[k];
    Store.save("deen"); App.render();
  };
  App.acts.revDone = (el) => { const d = Store.doc("deen"), n = +el.dataset.n, q = { ...Q.st(n) }; if (q.st === "weak") { q.st = "done"; q.str = 0; } q.last = U.dkey(); q.str = Math.min(5, (q.str || 0) + 1); d.quran[n] = q; Store.save("deen"); App.render(); };
  App.acts.revWeak = (el) => { const d = Store.doc("deen"), n = +el.dataset.n, q = { ...Q.st(n) }; q.last = U.dkey(); q.str = Math.max(0, (q.str || 0) - 2); d.quran[n] = q; Store.save("deen"); App.render(); };
  App.acts.surahOpen = (el) => {
    const n = +el.dataset.n, s = D.SURAHS[n - 1], q = Q.st(n);
    App.modal(L("سورة ", "Sourate ") + L(s.ar, s.fr), `<form data-form="surahSet" class="form"><input type="hidden" name="n" value="${n}">
      <label class="f">${L("الحالة", "État")}<select name="st" id="ss-st"><option value="none" ${q.st === "none" ? "selected" : ""}>${L("ما بديتش", "Pas commencée")}</option><option value="learning" ${q.st === "learning" ? "selected" : ""}>${L("نحفظ فيها", "En cours")}</option><option value="done" ${q.st === "done" ? "selected" : ""}>${L("محفوظة", "Mémorisée")}</option><option value="weak" ${q.st === "weak" ? "selected" : ""}>${L("حفظتها قبل ونسيتها", "Apprise autrefois, oubliée")}</option></select></label>
      <label class="f">${L("وصلت للآية", "Arrivé au verset")}<input name="upto" id="ss-upto" type="number" min="0" max="${s.ayat}" value="${q.upto || 0}"></label>
      <p class="tiny muted full">${s.ayat} ${L("آية · الجزء", "versets · Juz")} ${s.juz}</p>
      <button class="btn primary full" type="submit">${L("سجّل", "Enregistrer")}</button></form>`);
  };
  App.forms.surahSet = (fd) => {
    const d = Store.doc("deen"), n = +fd.n, s = D.SURAHS[n - 1];
    if (fd.st === "none") delete d.quran[n];
    else d.quran[n] = { ...Q.st(n), st: fd.st, upto: fd.st === "done" || fd.st === "weak" ? s.ayat : U.clamp(parseInt(fd.upto) || 0, 0, s.ayat), last: Q.st(n).last || U.dkey(), str: Q.st(n).str || 0 };
    Store.save("deen"); App.closeModal(); App.render();
  };

  App.eventSources.push(() => {
    const out = [];
    let st; try { st = P.today(); } catch (e) { return out; }
    PR.forEach(k => out.push({ key: "adhan-" + k, at: st[k], title: L("حان وقت صلاة ", "C'est l'heure de ") + prName(k), body: L("الله أكبر", "Allahou akbar"), kind: "info" }));
    const am = adhkarProgress("morning"), pm = adhkarProgress("evening");
    if (am.done < am.total) out.push({ key: "adhkar-am", at: new Date(st.fajr.getTime() + 30 * 60000), title: L("أذكار الصباح", "Adhkar du matin"), body: L("بضع دقايق تبدا بيهم نهارك.", "Quelques minutes pour bien commencer la journée."), kind: "info" });
    if (pm.done < pm.total) out.push({ key: "adhkar-pm", at: new Date(st.asr.getTime() + 30 * 60000), title: L("أذكار المساء", "Adhkar du soir"), body: "", kind: "info" });
    if (!Q.wirdDone() && !Q.halaqa() && Q.current()) out.push({ key: "wird", at: new Date(st.maghrib.getTime() + 25 * 60000), title: L("ورد الحفظ", "Wird de mémorisation"), body: L("سورة ", "Sourate ") + L(Q.current().ar, Q.current().fr), kind: "info" });
    if (U.dow() === 5) out.push({ key: "kahf", at: U.atTime("10:00"), title: L("نهار الجمعة: سورة الكهف", "Vendredi : sourate Al-Kahf"), body: L("وأكثر من الصلاة على النبي ﷺ", "Et multiplie les prières sur le Prophète ﷺ"), kind: "info" });
    return out;
  });

  App.views.deen = { render };
})();
