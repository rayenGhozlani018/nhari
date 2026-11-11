/* Nhari — Today: the day at a glance, built automatically from the routine */
(function () {
  "use strict";
  const TILE = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="#ffffff" stroke-width="1.4"><path d="M32 6l7.5 18.5L58 32l-18.5 7.5L32 58l-7.5-18.5L6 32l18.5-7.5z"/><rect x="18" y="18" width="28" height="28" transform="rotate(45 32 32)"/><rect x="18" y="18" width="28" height="28"/><circle cx="32" cy="32" r="5"/><path d="M0 0l10 10M64 0L54 10M0 64l10-10M64 64L54 54"/></g></svg>`);

  function greeting() {
    const h = U.hour(), name = Store.doc("settings").name;
    const g = h < 5 ? L("ليلتك زينة", "Bonne nuit") : h < 12 ? L("صباح الخير", "Bonjour") : h < 18 ? L("نهارك زين", "Bon après-midi") : L("مساء الخير", "Bonsoir");
    const p = Store.doc("settings").profile, n = U.P(new Date());
    const bday = p.birth && +p.birth.slice(5, 7) === n.m && +p.birth.slice(8, 10) === n.d;
    return g + (name ? (App.lang === "fr" ? ", " : "، ") + name.split(" ")[0] : "") + (bday ? " — " + L("عيد ميلاد سعيد!", "joyeux anniversaire !") : "");
  }

  function reminders() {
    const out = [], now = new Date();
    const last = App.H.lastBg();
    if (last && last.bg < 70 && now - last.ts < 3600000) out.push({ k: "bad", ic: I.drop, t: L("السكر هابط", "Glycémie basse"), d: L("كول 15 غ سكر سريع وعاود قيس بعد 15 دقيقة.", "Prends 15 g de sucre rapide et recontrôle dans 15 min."), href: "#health" });
    else if (last && last.bg > 250 && now - last.ts < 3 * 3600000) out.push({ k: "bad", ic: I.drop, t: L("السكر عالي برشا", "Glycémie très haute"), d: L("اشرب الماء وعاود قيس. إذا عندك تقيؤ ولا نفس سريع: طوارئ.", "Bois de l'eau et recontrôle. Vomissements ou respiration rapide : urgences."), href: "#health" });
    const todayBg = App.H.entries(1).filter(e => e.type === "bg" && U.dkey(new Date(e.ts)) === U.dkey());
    if (!todayBg.length && U.hour(now) >= 8) out.push({ k: "warn", ic: I.drop, t: L("ما قستش السكر اليوم", "Pas encore de glycémie aujourd'hui"), d: L("قيس وسجّل باش تتبع حالتك.", "Mesure et note-la pour suivre ton état."), href: "#health" });
    const rr = App.H.lastRapid(), meals = App.F.todayMeals();
    if (rr && now - rr.ts < 45 * 60000 && !meals.some(m => m.ts > rr.ts - 20 * 60000)) out.push({ k: "warn", ic: I.syringe, t: L("زرقت السريع — كول", "Insuline rapide faite — mange"), d: L("ما سجلتش ماكلة من بعد الزرقة.", "Aucun repas noté depuis l'injection."), href: "#food" });
    // exams today / soon
    const st = Store.doc("study"), tk = U.dkey();
    st.exams.filter(e => e.date >= tk).forEach(e => {
      const dd = Math.round((U.parseD(e.date) - U.parseD(tk)) / 86400000);
      if (dd <= 3) out.push({ k: dd === 0 ? "bad" : "warn", ic: I.study, t: (dd === 0 ? L("اليوم: ", "Aujourd'hui : ") : L(`بعد ${dd} أيام: `, `Dans ${dd} j : `)) + App.St.subName(e.subj), d: (e.note || "") + (e.type ? " · " + e.type.toUpperCase() : ""), href: "#study" });
    });
    // absences at critical level
    const crit = (st.absences && st.absences.items || []).filter(a => a.rate >= 25);
    if (crit.length) out.push({ k: "bad", ic: I.alert, t: L("غيابات في الحد الخطير", "Absences au seuil critique"), d: crit.map(a => a.subj + " " + a.rate + "%").join(" · "), href: "#study" });
    // creatine
    if (App.S.gym() && !App.S.creatineToday() && U.hour(now) >= 8) out.push({ k: "", ic: I.drop, t: L("الكرياتين 5 غ", "Créatine 5 g"), d: L("ما شربتهاش اليوم.", "Pas encore prise aujourd'hui."), href: "#health", sub: ["health", "sport"] });
    // tickets
    try { const open = App.W.ticketsOn(tk).filter(t => t.status === "todo").length; if (open) out.push({ k: "", ic: I.work, t: L(`${open} تيكيات اليوم`, `${open} tickets aujourd'hui`), d: L("مرتبين بالأقرب.", "Triés par proximité."), href: "#work" }); } catch (e) { /* ignore */ }
    let pr = null; try { pr = App.prayer.status(now); } catch (e) { /* ignore */ }
    if (pr) {
      const am = App.adhkarProgress("morning"), pm = App.adhkarProgress("evening");
      if (now > pr.t.fajr && now < pr.t.dhuhr && am.done < am.total) out.push({ k: "", ic: I.moon, t: L("أذكار الصباح", "Adhkar du matin"), d: `${am.done}/${am.total}`, href: "#deen", sub: ["deen", "adhkar"] });
      if (now > pr.t.asr && now < pr.t.isha && pm.done < pm.total) out.push({ k: "", ic: I.moon, t: L("أذكار المساء", "Adhkar du soir"), d: `${pm.done}/${pm.total}`, href: "#deen", sub: ["deen", "adhkar"] });
    }
    return out;
  }

  function timeline() {
    const now = Date.now();
    const blocks = App.R ? App.R.day(new Date()) : [];
    const curIdx = blocks.findIndex(b => now >= b.start && now < b.end);
    return `<div class="list tl">${blocks.map((b, i) => {
      const past = b.end < now && i !== curIdx, cur = i === curIdx;
      const ic = I[App.R.kindIcon[b.kind]] || I.clock;
      return `<div class="li k-${b.kind} ${past ? "past" : ""} ${cur ? "now" : ""}"><span class="k-ico">${ic}</span><span class="num small" style="min-width:${b.end - b.start > 20 * 60000 ? 92 : 44}px;font-weight:600">${b.end - b.start > 20 * 60000 ? U.range(b.start, b.end) : U.hm(b.start)}</span><span class="grow small">${U.esc(b.title)}${b.note ? `<span class="tiny muted"> · ${U.esc(b.note)}</span>` : ""}</span>${cur ? `<span class="pill accent">${L("توا", "maintenant")}</span>` : ""}</div>`;
    }).join("")}</div>`;
  }

  function render() {
    const s = Store.doc("settings"), now = new Date();
    let pr = null; try { pr = App.prayer.status(now); } catch (e) { /* ignore */ }
    const log = (Store.doc("deen").prayers[U.dkey()] || {});
    const c = App.moneyCalc();
    const last = App.H.lastBg();
    const ft = App.F.totals(App.F.todayMeals()), tg = App.F.targets();
    const sk = App.S.todayKey();
    const cls = App.R.classesFor(now);
    const nextCls = cls.find(x => x.e > now);
    const ht = App.Q.halaqaToday ? App.Q.halaqaToday() : null, wird = App.Q.wirdDone();
    const tk = U.dkey(), tickets = App.W.ticketsOn(tk), open = tickets.filter(t => t.status === "todo").length, doneT = tickets.filter(t => t.status === "done").length;
    const price = (App.W.price("orange") + App.W.price("ooredoo")) / 2 || 20;
    const need = c.workToday ? Math.ceil(c.todayObj / price) : 0;
    const rem = reminders();
    const lastBgState = last ? U.bgState(last.bg) : "";

    return `${App.LocalBanner ? App.LocalBanner() : ""}
    <section class="hero" style="--tile:url('${TILE}')">
      <div class="greet">${U.esc(greeting())}</div>
      <h1>${U.esc(U.dateLong(now))}</h1>
      <div class="hijri">${U.esc(U.hijri(now, +s.hijriAdj || 0))} · ${U.hmNow()} ${L("بتوقيت تونس", "heure de Tunis")}</div>
      ${pr ? `<div class="next"><div><div class="lbl">${L("الصلاة الجاية", "Prochaine prière")}: <b>${App.prName(pr.next.k)}</b> · ${App.prayer.hm(pr.next.at)}</div><div class="cd" data-cd="${pr.next.at.getTime()}">${U.dur(pr.next.at - now)}</div></div></div>
      <div class="prayrow">${["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map(k => `<div class="p ${pr.cur && pr.cur.k === k ? "now" : ""} ${log[k] ? "done" : ""}">${App.prName(k)}<b>${App.prayer.hm(pr.t[k])}</b></div>`).join("")}</div>` : ""}
    </section>
    ${App.Quick ? App.Quick.topCard() : ""}

    <div class="tiles">
      <a class="tile" href="#work"><span class="k">${I.work}${L("الخدمة", "Travail")}</span><span class="v">${c.workToday ? `${doneT}/${Math.max(need, doneT + open)}` : L("راحة", "Repos")}</span><span class="s">${c.workToday ? L(`لازمك ${need} تدخلات · ${U.money(c.todayObj)}`, `${need} interventions · ${U.money(c.todayObj)}`) : L("ما فماش خدمة اليوم", "pas de travail aujourd'hui")}</span></a>
      <a class="tile" href="#health"><span class="k">${I.drop}${L("السكر", "Glycémie")}</span><span class="v" style="color:${last ? `var(--${lastBgState === "good" ? "good" : lastBgState === "warn" ? "warn" : "bad"})` : "inherit"}">${last ? U.esc(U.bgFmt(last.bg)) : "–"}</span><span class="s">${last ? U.hm(new Date(last.ts)) + " · " + U.esc(U.dateShort(new Date(last.ts))) : L("سجّل قياس", "Note une mesure")}</span></a>
      <a class="tile" href="#health" data-act="goSub" data-tab="health" data-v="sport"><span class="k">${I.run}${L("الجيم", "Salle")}</span><span class="v" style="font-size:1.05rem">${U.esc(App.S.title(sk) || L("راحة", "Repos"))}</span><span class="s">${sk === "rest" ? L("نهار راحة", "jour de repos") : App.S.doneToday() ? L("كمّلت ✓", "faite ✓") : ""}${App.S.gym() ? " · " + (App.S.creatineToday() ? L("كرياتين ✓", "créatine ✓") : L("كرياتين ✗", "créatine ✗")) : ""}</span></a>
      <a class="tile" href="#study"><span class="k">${I.study}${U.esc(((Store.doc("settings").study || {}).facName || "").split(" — ")[0] || L("القراية", "Cours"))}</span><span class="v" style="font-size:1.05rem">${nextCls ? U.esc(nextCls.subj) : cls.length ? L("كمّلت ✓", "fini ✓") : L("ما فماش", "aucun cours")}</span><span class="s">${nextCls ? U.range(nextCls.s, nextCls.e) + (nextCls.room ? " · " + U.esc(nextCls.room) : "") : ""}</span></a>
      <a class="tile" href="#deen" data-act="goSub" data-tab="deen" data-v="quran"><span class="k">${I.book}${L("الحفظ", "Mémorisation")}</span><span class="v" style="font-size:1.05rem">${ht ? U.esc(ht.today) : "–"}</span><span class="s">${wird ? L("كمل اليوم ✓", "fait aujourd'hui ✓") : ht ? U.esc(ht.label) : L("حط الثمن", "indique le thumun")}</span></a>
      ${App.Mentor ? (() => { const pr = App.Mentor.progress(), nt = App.Mentor.nextTask(); return `<a class="tile" href="#study" data-act="goSub" data-tab="study" data-v="projects"><span class="k">${I.target}${L("المشروع", "Projet")}</span><span class="v" style="font-size:1.05rem">${U.esc(App.Mentor.plan().title)} · ${Math.round(pr.done / pr.total * 100)}%</span><span class="s">${nt ? U.esc(L(nt.ar, nt.fr).slice(0, 48)) + "…" : L("كمّل ✓", "terminé ✓")}</span></a>`; })() : ""}
      <a class="tile" href="#food"><span class="k">${I.food}${L("الماكلة", "Nutrition")}</span><span class="v">${Math.round(ft.kcal)} <small class="tiny muted">/ ${tg.kcal}</small></span><span class="s">kcal · ${Math.round(ft.carbs)} ${L("غ نشويات", "g glucides")}</span></a>
      ${App.extCards("tiles")}
    </div>

    <div class="grid g2" style="margin-top:14px;align-items:start">
      <details class="fold" data-fold="tl" ${App.Quick ? App.Quick.open("tl") : "open"}><summary>${I.clock}${L("برنامج النهار كامل", "Tout le programme du jour")}</summary>
      <div class="card"><h3>${I.clock}${L("برنامج النهار (أوتوماتيك)", "Programme du jour (automatique)")}</h3>
        ${timeline()}
        <div class="row" style="margin-top:10px">${s.notify.enabled ? `<span class="pill good">${I.bell}${L("التنبيهات مفعّلة", "Rappels activés")}</span><button class="btn sm ghost" data-act="disableNotify">${L("وقّف", "Désactiver")}</button>` : `<button class="btn primary sm" data-act="enableNotify">${I.bell}${L("فعّل التنبيهات", "Activer les rappels")}</button>`}<a class="btn sm ghost" href="#prefs">${L("بدّل الأوقات", "Modifier les horaires")}</a></div>
        <p class="tiny muted" style="margin-top:6px">${L("البرنامج يتبنى وحدو كل نهار من أوقات الصلاة، الجيم، الخدمة والقراية. التنبيهات تخدم كي يكون التطبيق محلول.", "Le programme se construit chaque jour à partir des prières, de la salle, du travail et des cours. Les rappels fonctionnent quand l'app est ouverte.")}</p>
        ${App.Quick ? App.Quick.modeChips() : ""}
      </div></details>
      <details class="fold" data-fold="more" ${App.Quick ? App.Quick.open("more") : "open"}><summary>${I.bell}${L("تذكيرات، اقتراحات وحديث اليوم", "Rappels, idées et hadith du jour")}</summary>
      <div class="stack">
        ${App.extCards("today")}
        ${App.Review ? App.Review.cards() : ""}
        <div class="card"><h3>${I.bell}${L("شنوة لازم توا", "À faire maintenant")}</h3>
          ${rem.length ? rem.map(r => `<a class="rem ${r.k}" href="${r.href}" ${r.sub ? `data-act="goSub" data-tab="${r.sub[0]}" data-v="${r.sub[1]}"` : ""} style="text-decoration:none;color:inherit"><span class="ico">${r.ic}</span><span><div class="t">${U.esc(r.t)}</div><div class="d"><bdi>${U.esc(r.d || "")}</bdi></div></span></a>`).join("") : `<div class="empty">${L("كل شي ماشي — بارك الله فيك.", "Tout roule — qu'Allah te bénisse.")}</div>`}
        </div>
        ${App.Disc ? `<div><div class="tiny muted" style="margin:0 4px 6px">${L("اقتراح ليك", "Une idée pour toi")}</div>${App.Disc.card(true)}</div>` : ""}
        ${App.hadithCard()}
      </div></details>
    </div>`;
  }
  App.acts.goSub = (el) => { App.sub[el.dataset.tab] = el.dataset.v; if (location.hash === "#" + el.dataset.tab) App.go(el.dataset.tab); else location.hash = "#" + el.dataset.tab; };

  App.views.today = { render, minute() { if (!document.getElementById("modal")) App.render(); } };
})();
