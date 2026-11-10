/* Nhari — automatic daily routine (built from prayers, gym programme, work days, classes) */
(function () {
  "use strict";
  const DEF = { on: true, workStart: "08:30", lunch: "12:45", lunchEnd: "13:30", workEnd: "17:00", gymMinStart: "06:00", gymDur: 75, satGym: "17:00", halaqaMin: 30, sleep: "22:45", commute: 40 };
  const cfg = () => Object.assign({}, DEF, Store.doc("settings").routine || {});
  const kindIcon = { deen: "moon", quran: "book", sport: "run", food: "food", work: "work", study: "study", travel: "link", health: "drop", rest: "clock", project: "target", review: "check" };

  function classesFor(d) {
    const st = Store.doc("study"), dow = U.dow(d);
    return st.classes.filter(c => +c.day === dow).map(c => ({ ...c, s: U.atTime(c.start, d), e: U.atTime(c.end, d) })).sort((a, b) => a.s - b.s);
  }

  function day(d = new Date()) {
    const c = cfg(), s = Store.doc("settings"), dow = U.dow(d), out = [];
    let P; try { P = App.prayer.today(d); } catch (e) { return out; }
    const add = (start, end, title, kind, extra) => { if (!(start instanceof Date) || isNaN(start)) return; out.push(Object.assign({ id: kind + "-" + U.hm(start).replace(":", ""), start, end: end instanceof Date ? end : U.plusMin(start, end || 10), title, kind }, extra || {})); };
    const at = (hhmm) => U.atTime(hhmm, d);
    const sk = App.S ? App.S.dayKey(d) : "rest";
    const gymDay = sk !== "rest", gymTitle = gymDay ? App.S.title(sk) : "";
    const mcfg = Store.doc("moneycfg");
    const isWork = mcfg.workDays.includes(dow) && !mcfg.offDays[U.dkey(d)];
    const cls = classesFor(d);
    const first = cls[0], last = cls[cls.length - 1];
    const subj = [...new Set(cls.map(x => x.subj))].join(" + ");
    const hal = (App.Q && App.Q.halaqaToday) ? App.Q.halaqaToday(d) : null;
    const schP = App.place && App.place("tekup"), tekup = (schP && schP.name) || ((Store.doc("settings").study || {}).facName || "").split(" — ")[0] || L("الفاك", "la fac");
    const sunP = App.place && App.place("zitouna"), sunName = L("حلقة الأحد", "Halaqa du dimanche") + (sunP ? " — " + sunP.name : "");
    const dk = U.dkey(d), soon = U.dkey(U.addDays(d, 7));
    const examSoon = Store.doc("study").exams.some(e => e.date >= dk && e.date <= soon);
    const nt = App.Mentor ? App.Mentor.nextTask() : null;
    const projTitle = L("المشروع TicketGuard", "Projet TicketGuard") + (nt ? " — " + L(nt.ar, nt.fr).slice(0, 70) : "");
    const projOrStudy = (s, e) => examSoon ? add(s, e, L("قراية (امتحان قريب — المشروع يستنى)", "Révisions (examen proche — le projet attend)"), "study", { slot: true }) : add(s, e, projTitle, "project");
    const pod = App.Disc ? App.Disc.podcastNow() : null;
    const hifzTitle = L("حفظ الثمن (15 دقيقة)", "Mémoriser le thumun (15 min)") + (hal && hal.today ? " — " + hal.today : "");

    // dawn
    add(P.fajr, 15, L("صلاة الصبح في الجامع", "Sobh à la mosquée"), "deen", { prayer: "fajr" });
    const halStart = U.plusMin(P.fajr, 15), afterHal = U.plusMin(halStart, c.halaqaMin);
    if (dow === 6) add(halStart, afterHal, L("العرض في الحلقة", "Récitation ('ard) à la halaqa") + (hal && hal.label ? " — " + hal.label : ""), "quran");
    else add(halStart, afterHal, dow === 0 ? L("مراجعة مع الجماعة + السور القديمة", "Révision avec le groupe + anciennes sourates") : L("حفظ مع الجماعة", "Mémorisation avec le groupe") + (hal && hal.today ? " — " + hal.today : ""), "quran");

    if (dow === 6) {
      add(U.plusMin(afterHal, 15), 25, L("فطور الصباح + كرياتين", "Petit-déj + créatine"), "food");
      if (first) {
        add(U.plusMin(first.s, -c.commute), first.s, L("تمشي لـ ", "Départ pour ") + tekup, "travel");
        for (let i = 0; i < cls.length; i++) {
          const x = cls[i], nx = cls[i + 1];
          if (i === 0 || x.s - cls[i - 1].e > 20 * 60000) add(x.s, x.e, L("قراية: ", "Cours : ") + x.subj, "study", { cls: true });
          else out[out.length - 1].end = x.e;
          if (nx && nx.s - x.e >= 30 * 60000) add(x.e, nx.s, L("استراحة الغداء + قيس السكر", "Pause déjeuner + glycémie"), "food");
        }
        if (gymDay) { const g = new Date(Math.max(U.plusMin(last.e, 35), at(c.satGym))); add(U.plusMin(g, -10), 5, L("قيس السكر قبل الجيم", "Glycémie avant la salle"), "health"); add(g, U.plusMin(g, c.gymDur), L("الجيم: ", "Salle : ") + gymTitle, "sport"); }
      } else if (gymDay) add(U.plusMin(afterHal, 50), c.gymDur, L("الجيم: ", "Salle : ") + gymTitle, "sport");
      add(at("20:00"), 30, L("العشاء + قيس السكر", "Dîner + glycémie"), "food");
      add(at("21:00"), 10, L("مراجعة الحفظ (10 دقايق)", "Révision de la mémorisation (10 min)"), "quran");
    } else if (dow === 0) {
      add(U.plusMin(afterHal, 30), 30, L("فطور الصباح + كرياتين", "Petit-déj + créatine"), "food");
      add(at("09:00"), at("11:30"), L("قراية / تحضير الامتحانات", "Révisions / préparation des examens"), "study", { slot: true });
      projOrStudy(at("11:30"), at("12:45"));
      add(at("13:00"), 45, L("الغداء + قيس السكر", "Déjeuner + glycémie"), "food");
      add(at("14:00"), at("15:30"), L("راحة / العائلة", "Repos / famille"), "rest");
      add(at("15:45"), at("16:30"), L("تحضير ", "Préparer : ") + sunName, "quran");
      const leave = U.plusMin(P.maghrib, -35);
      add(leave, U.plusMin(P.maghrib, -5), L("تمشي للحلقة", "Départ pour la halaqa") + (sunP ? " — " + sunP.name : ""), "travel");
      add(P.maghrib, P.isha, sunName, "quran");
      add(U.plusMin(P.isha, 45), 30, L("العشاء + قيس السكر", "Dîner + glycémie"), "food");
      add(at("21:30"), 15, L("حضّر الجمعة: تيكيات، قراية، جيم", "Prépare la semaine : tickets, cours, salle"), "rest");
    } else {
      let breakfastAt;
      if (gymDay) {
        const g = new Date(Math.max(U.plusMin(afterHal, 20), at(c.gymMinStart)));
        add(U.plusMin(g, -10), 5, L("قيس السكر قبل الجيم", "Glycémie avant la salle"), "health");
        add(g, U.plusMin(g, c.gymDur), L("الجيم: ", "Salle : ") + gymTitle, "sport");
        breakfastAt = U.plusMin(g, c.gymDur + 15);
      } else {
        projOrStudy(U.plusMin(afterHal, 10), at("07:40"));
        breakfastAt = at("07:45");
      }
      add(breakfastAt, 25, L("فطور الصباح + كرياتين + قيس السكر", "Petit-déj + créatine + glycémie"), "food");
      const classLeave = first ? U.plusMin(first.s, -c.commute) : null;
      if (isWork) {
        const ws = new Date(Math.max(at(c.workStart), U.plusMin(breakfastAt, 30)));
        const podNote = pod ? L("في الكرهبة: ", "En voiture : ") + pod.title : "";
        add(ws, at(c.lunch), L("خدمة: التدخلات", "Travail : interventions"), "work", { note: podNote });
        add(at(c.lunch), U.plusMin(at(c.lunchEnd), -20), L("الغداء في الدار + قيس السكر", "Déjeuner à la maison + glycémie"), "food");
        add(U.plusMin(at(c.lunchEnd), -20), U.plusMin(at(c.lunchEnd), -5), hifzTitle, "quran", { hifz: true });
        const we = classLeave ? new Date(Math.min(at(c.workEnd), U.plusMin(classLeave, -20))) : at(c.workEnd);
        add(at(c.lunchEnd), we, L("خدمة: التدخلات", "Travail : interventions"), "work", { note: podNote });
      }
      if (!isWork) add(at("13:10"), at("13:25"), hifzTitle, "quran", { hifz: true });
      if (first) {
        add(U.plusMin(classLeave, -15), 10, L("لمجة + قيس السكر", "Collation + glycémie"), "food");
        add(classLeave, first.s, L("تمشي لـ ", "Départ pour ") + tekup, "travel");
        add(first.s, last.e, L("قراية: ", "Cours : ") + subj, "study", { cls: true, note: L("صلّي العشاء في الاستراحة", "Prie Icha pendant la pause") });
        const home = U.plusMin(last.e, 45);
        add(last.e, home, L("روحة للدار", "Retour à la maison"), "travel");
        add(home, 25, L("العشاء + قيس السكر", "Dîner + glycémie"), "food");
        add(U.plusMin(home, 30), 10, L("مراجعة الحفظ (10 دقايق)", "Révision de la mémorisation (10 min)"), "quran");
      } else {
        add(at("18:00"), at("20:00"), L("وقت فارغ: قراية", "Créneau libre : révisions"), "study", { slot: true });
        add(at("20:30"), 30, L("العشاء + قيس السكر", "Dîner + glycémie"), "food");
        add(at("21:15"), 10, L("مراجعة الحفظ (10 دقايق)", "Révision de la mémorisation (10 min)"), "quran");
      }
    }
    // prayers of the day (fajr already)
    for (const k of ["dhuhr", "asr", "maghrib", "isha"]) {
      if (dow === 0 && (k === "maghrib" || k === "isha")) continue; // inside the Sunday halaqa
      const t = P[k], inClass = out.some(b => b.cls && t >= b.start && t < b.end);
      add(t, 10, (inClass ? L("صلّي ", "Prie ") + App.prName(k) + L(" في الاستراحة", " pendant la pause") : L("صلاة ", "Prière : ") + App.prName(k)), "deen", { prayer: k });
    }
    // sleep
    const lastEnd = out.reduce((mx, b) => b.end > mx ? b.end : mx, at("21:00"));
    const sl = new Date(Math.max(at(c.sleep), U.plusMin(lastEnd, 20)));
    add(U.plusMin(sl, -15), 10, L("محاسبة النهار (5 دقايق)", "Bilan du jour (5 min)"), "review");
    add(sl, 10, L("النوم — قيس السكر وأذكار النوم", "Coucher — glycémie et adhkar du sommeil"), "rest");
    out.sort((a, b) => a.start - b.start);
    const seen = {}; out.forEach(b => { seen[b.id] = (seen[b.id] || 0) + 1; if (seen[b.id] > 1) b.id += "-" + seen[b.id]; });
    return out;
  }

  App.R = { day, cfg, on: () => cfg().on, classesFor, kindIcon };

  App.eventSources.push(() => {
    if (!cfg().on) return [];
    return day(new Date()).filter(b => !b.prayer && !b.slot).map(b => ({ key: "r-" + b.id, at: b.start, title: b.title, body: U.range(b.start, b.end), kind: "info" }));
  });
})();
