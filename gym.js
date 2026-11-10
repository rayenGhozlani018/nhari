/* Nhari — gym programme + illustrated exercises.
   Figures: side view facing right unless front:true. viewBox defaults to 0 0 120 100, ground y=93.
   Props: rect/line (static), cable {from:[x,y], to:joint}, barj {a,b} (bar between joints),
   plate {at,r}, db {at}, pad {at,r}, grip {at}. */
(function (global) {
  "use strict";
  const SEAT = { t: "rect", x: 34, y: 66, w: 26, h: 6, cls: "bench" };
  const LEGS_SEAT = { k1: [68, 66], f1: [70, 88], k2: [67, 67], f2: [69, 89] };
  const STAND = { h: [60, 15], n: [60, 25], p: [60, 52], k1: [61, 72], f1: [60, 92], k2: [59, 72], f2: [58, 92] };
  const ARMS_DOWN = { e1: [61, 39], w1: [62, 53], e2: [59, 39], w2: [58, 53] };
  const FRONT_LEGS = { p: [60, 53], k1: [55, 72], f1: [53, 92], k2: [65, 72], f2: [67, 92] };
  const FRONT_SEAT = { p: [60, 60], k1: [52, 70], f1: [50, 90], k2: [68, 70], f2: [70, 90] };
  const m = (...o) => Object.assign({}, ...o);

  const EX = {
    incline_mpress: {
      ar: "Incline Machine Press", fr: "Incline Machine Press", mus: { ar: "أعلى الصدر، كتف أمامي، ترايسبس", fr: "Haut des pecs, épaule avant, triceps" },
      tip: { ar: "الظهر لاصق في الكرسي، الكتفين لتالي ولتحت. ادفع لفوق ولقدام، وما تقفلش الكوع لآخر.", fr: "Dos collé au dossier, omoplates serrées. Pousse vers le haut et l'avant, sans verrouiller les coudes." },
      props: [SEAT, { t: "line", x1: 40, y1: 66, x2: 28, y2: 30, cls: "frame" }, { t: "grip", at: "w1" }],
      a: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [30, 47], w1: [42, 39], e2: [31, 48], w2: [43, 40] }, LEGS_SEAT),
      b: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [47, 29], w1: [58, 20], e2: [48, 30], w2: [59, 21] }, LEGS_SEAT)
    },
    seated_row: {
      ar: "Row (تيراج قاعد)", fr: "Rowing assis", mus: { ar: "وسط الظهر، lats، biceps", fr: "Milieu du dos, grand dorsal, biceps" },
      tip: { ar: "صدرك محلول، جيب المرافق لتالي ولزّ الكتفين لبعضهم. ما تتحركش بالظهر.", fr: "Poitrine sortie, tire les coudes en arrière et serre les omoplates. Ne balance pas le dos." },
      props: [{ t: "rect", x: 28, y: 68, w: 24, h: 6, cls: "bench" }, { t: "rect", x: 80, y: 60, w: 4, h: 30, cls: "bench" }, { t: "cable", from: [104, 58], to: "w1" }, { t: "grip", at: "w1" }],
      a: { h: [46, 30], n: [43, 40], p: [40, 67], k1: [58, 60], f1: [78, 70], k2: [57, 61], f2: [77, 71], e1: [56, 45], w1: [70, 50], e2: [55, 46], w2: [69, 51] },
      b: { h: [43, 29], n: [40, 39], p: [40, 67], k1: [58, 60], f1: [78, 70], k2: [57, 61], f2: [77, 71], e1: [27, 47], w1: [40, 52], e2: [28, 48], w2: [41, 53] }
    },
    dips_mach: {
      ar: "Dips machine", fr: "Dips machine", mus: { ar: "ترايسبس، أسفل الصدر", fr: "Triceps, bas des pecs" },
      tip: { ar: "اقعد مستقيم، ادفع المقابض لتحت حتى تتمد يديك، وارجع بشوية.", fr: "Assis droit, pousse les poignées vers le bas jusqu'à l'extension, remonte lentement." },
      props: [SEAT, { t: "line", x1: 36, y1: 66, x2: 34, y2: 32, cls: "frame" }, { t: "grip", at: "w1" }],
      a: m({ h: [50, 25], n: [50, 35], p: [48, 64], e1: [38, 44], w1: [46, 56], e2: [39, 45], w2: [47, 57] }, LEGS_SEAT),
      b: m({ h: [50, 25], n: [50, 35], p: [48, 64], e1: [50, 49], w1: [52, 62], e2: [51, 50], w2: [53, 63] }, LEGS_SEAT)
    },
    sa_pulldown: {
      ar: "Straight-Arm Pulldown", fr: "Pull-over poulie bras tendus", mus: { ar: "Lats (الجنب متاع الظهر)", fr: "Grand dorsal" },
      tip: { ar: "اليدين شبه مستقيمين، اهبط بالبار لحد الفخذين بالظهر موش بالترايسبس.", fr: "Bras presque tendus, descends la barre jusqu'aux cuisses en tirant avec le dos." },
      vb: "0 -8 120 108",
      props: [{ t: "cable", from: [100, -4], to: "w1" }, { t: "grip", at: "w1" }],
      a: { h: [66, 17], n: [63, 26], p: [55, 52], k1: [57, 72], f1: [55, 92], k2: [56, 72], f2: [53, 92], e1: [72, 17], w1: [81, 8], e2: [71, 18], w2: [80, 9] },
      b: { h: [66, 17], n: [63, 26], p: [55, 52], k1: [57, 72], f1: [55, 92], k2: [56, 72], f2: [53, 92], e1: [66, 40], w1: [68, 54], e2: [65, 41], w2: [67, 55] }
    },
    pec_fly: {
      ar: "Fly Machine (Pec Deck)", fr: "Pec deck (fly machine)", mus: { ar: "الصدر", fr: "Pectoraux" }, front: true,
      tip: { ar: "الكوع مطوي شوية وثابت، سكّر اليدين قدامك وعصر الصدر ثانية.", fr: "Coudes légèrement fléchis et fixes, ferme devant toi et contracte 1 s." },
      props: [{ t: "rect", x: 50, y: 22, w: 20, h: 40, cls: "bench" }, { t: "grip", at: "w1" }, { t: "grip", at: "w2" }],
      a: m({ h: [60, 18], n: [60, 28], e1: [44, 31], w1: [31, 29], e2: [76, 31], w2: [89, 29] }, FRONT_SEAT),
      b: m({ h: [60, 18], n: [60, 28], e1: [49, 35], w1: [58, 37], e2: [71, 35], w2: [62, 37] }, FRONT_SEAT)
    },
    mil_press: {
      ar: "Military Press", fr: "Développé militaire", mus: { ar: "الكتف (الأمامي والجانبي)، ترايسبس", fr: "Épaules, triceps" },
      tip: { ar: "اشد الكرش والأرداف، ادفع البار لفوق راسك، وما تقوّسش الظهر.", fr: "Gaine abdos et fessiers, pousse la barre au-dessus de la tête sans cambrer." },
      vb: "0 -16 120 112",
      props: [{ t: "plate", at: "w1", r: 7 }],
      a: m(STAND, { e1: [66, 37], w1: [68, 25], e2: [65, 37], w2: [67, 25] }),
      b: m(STAND, { e1: [61, 11], w1: [61, -2], e2: [60, 11], w2: [60, -2] })
    },
    jm_press: {
      ar: "JM Press", fr: "JM Press", mus: { ar: "ترايسبس", fr: "Triceps" },
      tip: { ar: "مستلقي، مسكة ضيقة. هبّط البار نحو الذقن والمرافق لقدام، وادفع بالترايسبس.", fr: "Allongé, prise serrée. Descends la barre vers le menton, coudes vers l'avant, pousse avec les triceps." },
      props: [{ t: "rect", x: 22, y: 66, w: 66, h: 6, cls: "bench" }, { t: "plate", at: "w1", r: 6 }],
      a: { h: [84, 59], n: [75, 62], p: [45, 64], k1: [30, 70], f1: [26, 91], k2: [31, 71], f2: [27, 92], e1: [75, 48], w1: [75, 34], e2: [74, 48], w2: [74, 34] },
      b: { h: [84, 59], n: [75, 62], p: [45, 64], k1: [30, 70], f1: [26, 91], k2: [31, 71], f2: [27, 92], e1: [70, 49], w1: [80, 55], e2: [69, 50], w2: [79, 56] }
    },
    lat_raise: {
      ar: "Lateral Raise", fr: "Élévations latérales", mus: { ar: "الكتف الجانبي", fr: "Deltoïde latéral" }, front: true,
      tip: { ar: "ارفع الدمبل للجنب لحد الكتف، المرفق مطوي شوية، وهبّط بشوية. ما تستعملش الدفعة.", fr: "Monte sur les côtés jusqu'aux épaules, coudes un peu fléchis, descends lentement, sans élan." },
      props: [{ t: "db", at: "w1" }, { t: "db", at: "w2" }],
      a: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [53, 39], w1: [51, 52], e2: [67, 39], w2: [69, 52] }),
      b: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [47, 28], w1: [34, 29], e2: [73, 28], w2: [86, 29] })
    },
    rev_fly: {
      ar: "Reverse Pec Deck", fr: "Reverse pec deck", mus: { ar: "الكتف الخلفي، أعلى الظهر", fr: "Deltoïde arrière, haut du dos" }, front: true,
      tip: { ar: "وجهك للماكينة، حل اليدين للجنب واعصر الكتف الخلفي. خفيف ونظيف.", fr: "Face à la machine, ouvre les bras sur les côtés et serre l'arrière d'épaule. Léger et propre." },
      props: [{ t: "rect", x: 52, y: 30, w: 16, h: 28, cls: "bench" }, { t: "grip", at: "w1" }, { t: "grip", at: "w2" }],
      a: m({ h: [60, 18], n: [60, 28], e1: [49, 33], w1: [58, 35], e2: [71, 33], w2: [62, 35] }, FRONT_SEAT),
      b: m({ h: [60, 18], n: [60, 28], e1: [46, 30], w1: [32, 30], e2: [74, 30], w2: [88, 30] }, FRONT_SEAT)
    },
    tri_pushdown: {
      ar: "Triceps Pushdown", fr: "Extension triceps poulie (pushdown)", mus: { ar: "ترايسبس", fr: "Triceps" },
      tip: { ar: "المرافق لاصقين في الجنب، ادفع لتحت حتى تتمد يديك، واطلع بشوية.", fr: "Coudes collés au corps, pousse jusqu'à l'extension complète, remonte lentement." },
      vb: "0 -8 120 108",
      props: [{ t: "cable", from: [76, -4], to: "w1" }, { t: "grip", at: "w1" }],
      a: m(STAND, { e1: [62, 40], w1: [72, 33], e2: [61, 40], w2: [71, 33] }),
      b: m(STAND, { e1: [62, 40], w1: [65, 54], e2: [61, 40], w2: [64, 54] })
    },
    hammer_db: {
      ar: "Hammer Curl (dumbbell)", fr: "Curl marteau haltères", mus: { ar: "Biceps، الساعد (brachial)", fr: "Biceps, brachial, avant-bras" },
      tip: { ar: "الإبهام لفوق، المرفق ثابت في الجنب. اطلع ونزل بلا ما تهز الجسم.", fr: "Pouces vers le haut, coude fixe. Monte et descends sans balancer." },
      props: [{ t: "db", at: "w1", vert: true }],
      a: m(STAND, { e1: [62, 40], w1: [64, 54], e2: [61, 40], w2: [63, 54] }),
      b: m(STAND, { e1: [62, 40], w1: [72, 30], e2: [61, 40], w2: [71, 30] })
    },
    incline_curl: {
      ar: "Incline Dumbbell Curl", fr: "Curl incliné haltères", mus: { ar: "Biceps (الرأس الطويل)", fr: "Biceps (longue portion)" },
      tip: { ar: "على كرسي مايل، اليدين متدليين لتالي. اطلع بالدمبل بلا ما تحرك المرفق.", fr: "Sur banc incliné, bras pendants vers l'arrière. Monte sans avancer le coude." },
      props: [SEAT, { t: "line", x1: 40, y1: 66, x2: 28, y2: 30, cls: "frame" }, { t: "db", at: "w1" }],
      a: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [34, 52], w1: [33, 66], e2: [35, 52], w2: [34, 66] }, LEGS_SEAT),
      b: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [34, 52], w1: [45, 45], e2: [35, 52], w2: [46, 45] }, LEGS_SEAT)
    },
    back_squat: {
      ar: "Squat libre", fr: "Squat barre", mus: { ar: "الفخذ الأمامي، الأرداف", fr: "Quadriceps, fessiers" },
      tip: { ar: "البار فوق الكتفين، الساقين بعرض الكتفين. اهبط والظهر مستقيم والركبتين في اتجاه الصوابع.", fr: "Barre sur les trapèzes, pieds largeur d'épaules. Descends dos neutre, genoux dans l'axe des pieds." },
      props: [{ t: "plate", at: "w1", r: 6 }],
      a: m(STAND, { e1: [50, 36], w1: [55, 28], e2: [49, 37], w2: [54, 29] }),
      b: { h: [65, 33], n: [62, 41], p: [46, 66], k1: [66, 70], f1: [60, 92], k2: [65, 71], f2: [58, 92], e1: [52, 52], w1: [57, 44], e2: [51, 53], w2: [56, 45] }
    },
    leg_ext: {
      ar: "Leg Extension", fr: "Leg extension", mus: { ar: "الفخذ الأمامي", fr: "Quadriceps" },
      tip: { ar: "مد الساقين لآخر وعصر ثانية، وهبّط بشوية. ما تقفزش بالوزن.", fr: "Tends complètement, contracte 1 s, redescends lentement." },
      props: [SEAT, { t: "line", x1: 36, y1: 66, x2: 34, y2: 32, cls: "frame" }, { t: "pad", at: "f1", r: 4 }],
      a: { h: [46, 25], n: [46, 35], p: [46, 63], k1: [66, 64], f1: [68, 85], k2: [65, 65], f2: [67, 86], e1: [48, 49], w1: [54, 62], e2: [47, 50], w2: [53, 62] },
      b: { h: [46, 25], n: [46, 35], p: [46, 63], k1: [66, 64], f1: [86, 61], k2: [65, 65], f2: [85, 62], e1: [48, 49], w1: [54, 62], e2: [47, 50], w2: [53, 62] }
    },
    hip_ext: {
      ar: "Hip Extension (kickback)", fr: "Hip extension (kickback)", mus: { ar: "الأرداف", fr: "Fessiers" },
      tip: { ar: "اشد الكرش، ادفع الساق لتالي بالأرداف موش بالظهر، وما تقوّسش.", fr: "Gaine le ventre, pousse la jambe en arrière avec le fessier, sans cambrer." },
      props: [{ t: "rect", x: 86, y: 30, w: 5, h: 62, cls: "bench" }, { t: "cable", from: [28, 90], to: "f1" }, { t: "grip", at: "w1" }],
      a: { h: [72, 21], n: [68, 30], p: [58, 53], k2: [59, 73], f2: [58, 92], k1: [60, 72], f1: [58, 90], e1: [77, 40], w1: [86, 46], e2: [76, 41], w2: [85, 47] },
      b: { h: [72, 21], n: [68, 30], p: [58, 53], k2: [59, 73], f2: [58, 92], k1: [41, 64], f1: [29, 76], e1: [77, 40], w1: [86, 46], e2: [76, 41], w2: [85, 47] }
    },
    leg_curl: {
      ar: "Leg Curl", fr: "Leg curl", mus: { ar: "الفخذ الخلفي", fr: "Ischio-jambiers" },
      tip: { ar: "الحوض لاصق في الكرسي، اطوي الساق لحد الأرداف وهبّط بشوية.", fr: "Bassin collé au banc, ramène les talons vers les fessiers, redescends lentement." },
      props: [{ t: "rect", x: 20, y: 70, w: 76, h: 6, cls: "bench" }, { t: "pad", at: "f1", r: 4 }],
      a: { h: [92, 63], n: [82, 67], p: [52, 67], k1: [36, 68], f1: [17, 67], k2: [36, 69], f2: [17, 68], e1: [90, 75], w1: [100, 75], e2: [89, 76], w2: [99, 76] },
      b: { h: [92, 63], n: [82, 67], p: [52, 67], k1: [36, 68], f1: [42, 49], k2: [36, 69], f2: [42, 50], e1: [90, 75], w1: [100, 75], e2: [89, 76], w2: [99, 76] }
    },
    calf_stand: {
      ar: "Calf Raises واقف", fr: "Mollets debout", mus: { ar: "بطة الساق", fr: "Mollets" },
      tip: { ar: "اطلع على صوابعك لآخر، اقعد ثانية فوق، وهبّط الكعب لتحت مالحافة.", fr: "Monte au maximum sur la pointe, tiens 1 s, descends le talon sous la marche." },
      props: [{ t: "rect", x: 52, y: 92, w: 18, h: 2, cls: "bench" }, { t: "plate", at: "w1", r: 6 }],
      a: m(STAND, { e1: [50, 36], w1: [55, 28], e2: [49, 37], w2: [54, 29] }),
      b: { h: [60, 9], n: [60, 19], p: [60, 46], k1: [61, 66], f1: [61, 86], k2: [59, 66], f2: [59, 86], e1: [50, 30], w1: [55, 22], e2: [49, 31], w2: [54, 23] }
    },
    incline_db: {
      ar: "Développé incliné haltères", fr: "Développé incliné haltères", mus: { ar: "أعلى الصدر، كتف أمامي", fr: "Haut des pecs, épaule avant" },
      tip: { ar: "الكرسي 30°، هبّط الدمبل لجنب الصدر، وادفع لفوق بلا ما يتلاقاو.", fr: "Banc à 30°, descends les haltères au niveau de la poitrine, pousse sans les cogner." },
      props: [SEAT, { t: "line", x1: 40, y1: 66, x2: 28, y2: 30, cls: "frame" }, { t: "db", at: "w1" }],
      a: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [29, 48], w1: [38, 38], e2: [30, 49], w2: [39, 39] }, LEGS_SEAT),
      b: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [44, 27], w1: [52, 16], e2: [45, 28], w2: [53, 17] }, LEGS_SEAT)
    },
    lat_pulldown: {
      ar: "Tirage prise large", fr: "Tirage vertical prise large", mus: { ar: "Lats، أعلى الظهر", fr: "Grand dorsal, haut du dos" }, front: true,
      tip: { ar: "صدرك لفوق، جيب البار للصدر الأعلى والمرافق لتحت. ما تمشيش لتالي برشا.", fr: "Poitrine haute, tire la barre vers le haut des pecs, coudes vers le bas, sans trop te pencher." },
      vb: "0 -16 120 112",
      props: [{ t: "cable", from: [60, -14], to: "w1" }, { t: "barj", a: "w1", b: "w2" }],
      a: m({ h: [60, 18], n: [60, 28], e1: [46, 11], w1: [38, -1], e2: [74, 11], w2: [82, -1] }, FRONT_SEAT),
      b: m({ h: [60, 18], n: [60, 28], e1: [43, 38], w1: [40, 24], e2: [77, 38], w2: [80, 24] }, FRONT_SEAT)
    },
    tbar_row: {
      ar: "T-bar Row", fr: "Rowing T-bar", mus: { ar: "وسط الظهر، lats", fr: "Milieu du dos, grand dorsal" },
      tip: { ar: "ظهرك مستقيم ومايل 45°، جيب المقبض للكرش وزّ الكتفين.", fr: "Dos plat incliné à 45°, tire la poignée vers le ventre en serrant les omoplates." },
      props: [{ t: "cable", from: [14, 92], to: "w1", cls: "bar" }, { t: "plate", at: "w1", r: 7, dx: 6 }],
      a: { h: [82, 31], n: [74, 37], p: [50, 52], k1: [56, 70], f1: [52, 92], k2: [55, 71], f2: [50, 92], e1: [75, 51], w1: [76, 65], e2: [74, 52], w2: [75, 66] },
      b: { h: [82, 31], n: [74, 37], p: [50, 52], k1: [56, 70], f1: [52, 92], k2: [55, 71], f2: [50, 92], e1: [62, 43], w1: [70, 53], e2: [61, 44], w2: [69, 54] }
    },
    tri_overhead: {
      ar: "Extension triceps poulie haute", fr: "Extension triceps poulie haute (au-dessus de la tête)", mus: { ar: "ترايسبس (الرأس الطويل)", fr: "Triceps (longue portion)" },
      tip: { ar: "ظهرك للماكينة، المرافق حذا راسك ثابتين، مد اليدين لقدام. إذا تعملها لتحت (pushdown) هي نفس حركة الثلاثاء.", fr: "Dos à la poulie, coudes fixes près de la tête, tends vers l'avant. En version pushdown, c'est le mouvement du mardi." },
      vb: "0 -10 120 110",
      props: [{ t: "cable", from: [26, -6], to: "w1" }, { t: "grip", at: "w1" }],
      a: { h: [67, 18], n: [64, 27], p: [58, 52], k1: [64, 72], f1: [68, 92], k2: [52, 72], f2: [46, 92], e1: [71, 15], w1: [60, 9], e2: [70, 16], w2: [59, 10] },
      b: { h: [67, 18], n: [64, 27], p: [58, 52], k1: [64, 72], f1: [68, 92], k2: [52, 72], f2: [46, 92], e1: [71, 15], w1: [84, 9], e2: [70, 16], w2: [83, 10] }
    },
    hammer_cable: {
      ar: "Hammer curl câble (drop set)", fr: "Curl marteau poulie basse (drop set)", mus: { ar: "Biceps، brachial", fr: "Biceps, brachial" },
      tip: { ar: "Drop set: 7 مرات، نقص الوزن مباشرة وعاود 7، ونقص مرة أخرى. بلا راحة بيناتهم.", fr: "Drop set : 7 reps, baisse la charge tout de suite, 7 reps, baisse encore. Sans pause entre les paliers." },
      props: [{ t: "cable", from: [80, 92], to: "w1" }, { t: "grip", at: "w1" }],
      a: m(STAND, { e1: [62, 40], w1: [64, 54], e2: [61, 40], w2: [63, 54] }),
      b: m(STAND, { e1: [62, 40], w1: [72, 30], e2: [61, 40], w2: [71, 30] })
    },
    rdl: {
      ar: "Romanian Deadlift", fr: "Soulevé de terre roumain", mus: { ar: "الفخذ الخلفي، الأرداف، أسفل الظهر", fr: "Ischios, fessiers, lombaires" },
      tip: { ar: "الركبة مطوية شوية، ادفع الحوض لتالي والوزن لاصق في الساقين. اهبط لتحت الركبة بشوية والظهر مستقيم.", fr: "Genoux légèrement fléchis, pousse les hanches en arrière, charge collée aux jambes, descends sous le genou dos plat." },
      props: [{ t: "db", at: "w1" }],
      a: m(STAND, ARMS_DOWN),
      b: { h: [84, 37], n: [75, 41], p: [49, 52], k1: [57, 71], f1: [58, 92], k2: [56, 72], f2: [56, 92], e1: [75, 55], w1: [75, 69], e2: [74, 56], w2: [74, 70] }
    },
    bulgarian: {
      ar: "Fentes bulgares", fr: "Fentes bulgares", mus: { ar: "الفخذ الأمامي، الأرداف", fr: "Quadriceps, fessiers" },
      tip: { ar: "الساق اللورانية فوق كرسي، اهبط بالركبة اللورانية للأرض والجسم مستقيم.", fr: "Pied arrière sur un banc, descends le genou arrière vers le sol, buste droit." },
      props: [{ t: "rect", x: 14, y: 74, w: 22, h: 6, cls: "bench" }, { t: "db", at: "w1" }],
      a: { h: [56, 13], n: [56, 23], p: [56, 50], k1: [66, 70], f1: [72, 92], k2: [46, 68], f2: [30, 74], e1: [57, 37], w1: [58, 50], e2: [56, 37], w2: [57, 50] },
      b: { h: [55, 27], n: [55, 37], p: [54, 64], k1: [74, 70], f1: [72, 92], k2: [44, 84], f2: [30, 74], e1: [56, 51], w1: [57, 64], e2: [55, 51], w2: [56, 64] }
    },
    back_ext: {
      ar: "Extension lombaire", fr: "Extension lombaire (45°)", mus: { ar: "أسفل الظهر، الأرداف", fr: "Lombaires, fessiers" },
      tip: { ar: "اهبط بشوية، واطلع حتى يولي الجسم خط مستقيم مع الساقين — ما تفوتش لتالي.", fr: "Descends lentement, remonte jusqu'à l'alignement avec les jambes, sans hyper-extension." },
      props: [{ t: "line", x1: 14, y1: 90, x2: 40, y2: 62, cls: "frame" }, { t: "rect", x: 40, y: 56, w: 8, h: 6, cls: "bench" }, { t: "plate", at: "w1", r: 5 }],
      a: { h: [63, 86], n: [60, 78], m: [52, 67], p: [44, 56], k1: [31, 70], f1: [18, 84], k2: [32, 71], f2: [19, 85], e1: [55, 72], w1: [60, 74], e2: [56, 73], w2: [61, 75] },
      b: { h: [67, 29], n: [62, 36], m: [53, 46], p: [44, 56], k1: [31, 70], f1: [18, 84], k2: [32, 71], f2: [19, 85], e1: [55, 44], w1: [60, 42], e2: [56, 45], w2: [61, 43] }
    },
    calf_seated: {
      ar: "Seated Calf Raises", fr: "Mollets assis", mus: { ar: "بطة الساق (soléaire)", fr: "Mollets (soléaire)" },
      tip: { ar: "الركبتين تحت الـpad، اطلع بالكعبين لآخر وهبّط بشوية لتحت.", fr: "Genoux sous le pad, monte les talons au maximum, descends lentement." },
      props: [SEAT, { t: "rect", x: 64, y: 88, w: 14, h: 4, cls: "bench" }, { t: "pad", at: "k1", r: 4, dy: -5 }],
      a: { h: [46, 26], n: [46, 36], p: [44, 64], k1: [64, 64], f1: [66, 87], k2: [63, 65], f2: [65, 88], e1: [52, 50], w1: [60, 60], e2: [51, 51], w2: [59, 61] },
      b: { h: [46, 26], n: [46, 36], p: [44, 64], k1: [64, 59], f1: [66, 82], k2: [63, 60], f2: [65, 83], e1: [52, 48], w1: [60, 56], e2: [51, 49], w2: [59, 57] }
    },
    woodchop: {
      ar: "Woodchopper poulie", fr: "Woodchopper à la poulie", mus: { ar: "الجناب (obliques)، الكرش", fr: "Obliques, abdos" }, front: true,
      tip: { ar: "اليدين شبه مستقيمين، دور بالجسم من فوق لتحت للجنب الآخر. بدّل الجنب.", fr: "Bras presque tendus, pivote le buste du haut vers le bas en diagonale. Change de côté." },
      vb: "0 -8 120 108",
      props: [{ t: "cable", from: [108, -4], to: "w1" }, { t: "grip", at: "w1" }],
      a: { h: [61, 15], n: [60, 25], p: [60, 52], k1: [52, 72], f1: [48, 92], k2: [68, 72], f2: [72, 92], e1: [71, 17], w1: [82, 9], e2: [70, 18], w2: [81, 10] },
      b: { h: [58, 17], n: [59, 27], p: [60, 53], k1: [52, 72], f1: [48, 92], k2: [68, 72], f2: [72, 92], e1: [51, 38], w1: [43, 49], e2: [52, 39], w2: [44, 50] }
    },
    plank_g: {
      ar: "Gainage (planche)", fr: "Gainage (planche)", mus: { ar: "الكرش والظهر", fr: "Sangle abdominale" },
      tip: { ar: "على الذراعين، الجسم خط مستقيم، تنفس عادي.", fr: "Sur les avant-bras, corps aligné, respire normalement." },
      props: [],
      a: { h: [89, 66], n: [80, 70], p: [52, 79], k1: [36, 84], f1: [20, 90], k2: [36, 85], f2: [20, 91], e1: [80, 90], w1: [95, 90], e2: [79, 90], w2: [94, 90] },
      b: { h: [89, 65], n: [80, 69], p: [52, 77], k1: [36, 83], f1: [20, 90], k2: [36, 84], f2: [20, 91], e1: [80, 90], w1: [95, 90], e2: [79, 90], w2: [94, 90] }
    },
    lat_raise_cable: {
      ar: "Lateral Raise (كابل)", fr: "Élévation latérale à la poulie", mus: { ar: "الكتف الجانبي", fr: "Deltoïde latéral" }, front: true,
      tip: { ar: "الكابل من الجنب الآخر، ارفع يدك للجنب لحد الكتف، المرفق مطوي شوية، وهبّط بشوية. الكابل يخلي الشد من الأول للآخر.", fr: "Câble venant du côté opposé : monte le bras sur le côté jusqu'à l'épaule, coude un peu fléchi, descends lentement. Tension continue." },
      props: [{ t: "cable", from: [40, 90], to: "w2" }, { t: "grip", at: "w2" }],
      a: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [53, 39], w1: [52, 52], e2: [66, 39], w2: [64, 52] }),
      b: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [53, 39], w1: [52, 52], e2: [73, 28], w2: [86, 29] })
    },
    seated_db_press: {
      ar: "Shoulder Press (قاعد، دمبل)", fr: "Développé épaules assis haltères", mus: { ar: "الكتف (الأمامي والجانبي)، ترايسبس", fr: "Épaules, triceps" }, front: true,
      tip: { ar: "ظهرك لاصق في الكرسي، الدمبل في مستوى الأذنين. ادفع لفوق بلا ما تلصق الدمبلات، وهبّط بشوية.", fr: "Dos collé au dossier, haltères à hauteur des oreilles. Pousse vers le haut sans les cogner, redescends lentement." },
      vb: "0 -10 120 110",
      props: [{ t: "rect", x: 52, y: 20, w: 16, h: 40, cls: "bench" }, { t: "db", at: "w1" }, { t: "db", at: "w2" }],
      a: m({ h: [60, 18], n: [60, 28], e1: [45, 32], w1: [45, 19], e2: [75, 32], w2: [75, 19] }, FRONT_SEAT),
      b: m({ h: [60, 18], n: [60, 28], e1: [50, 15], w1: [53, 2], e2: [70, 15], w2: [67, 2] }, FRONT_SEAT)
    },
    rev_cable: {
      ar: "Reverse Cable Fly", fr: "Oiseau à la poulie (reverse fly)", mus: { ar: "الكتف الخلفي، أعلى الظهر", fr: "Deltoïde arrière, haut du dos" }, front: true,
      tip: { ar: "الكابلات مقاطعين قدامك في مستوى الكتف. حل اليدين للجنب والمرفق مطوي شوية، اعصر الكتف الخلفي وارجع بشوية.", fr: "Câbles croisés devant toi à hauteur d'épaule. Ouvre les bras sur les côtés, coudes un peu fléchis, serre l'arrière d'épaule, reviens lentement." },
      props: [{ t: "cable", from: [100, 30], to: "w1" }, { t: "cable", from: [20, 30], to: "w2" }, { t: "grip", at: "w1" }, { t: "grip", at: "w2" }],
      a: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [52, 33], w1: [62, 34], e2: [68, 33], w2: [58, 34] }),
      b: m(FRONT_LEGS, { h: [60, 15], n: [60, 26], e1: [46, 29], w1: [32, 29], e2: [74, 29], w2: [88, 29] })
    },
    incline_hammer: {
      ar: "Hammer Curl مايل (دمبل)", fr: "Curl marteau incliné haltères", mus: { ar: "Brachial، Biceps، الساعد", fr: "Brachial, biceps, avant-bras" },
      tip: { ar: "على كرسي مايل، الإبهام لفوق، اليدين متدليين. اطلع بلا ما تقدّم المرفق.", fr: "Sur banc incliné, pouces vers le haut, bras pendants. Monte sans avancer le coude." },
      props: [SEAT, { t: "line", x1: 40, y1: 66, x2: 28, y2: 30, cls: "frame" }, { t: "db", at: "w1", vert: true }],
      a: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [34, 52], w1: [33, 66], e2: [35, 52], w2: [34, 66] }, LEGS_SEAT),
      b: m({ h: [31, 29], n: [36, 38], p: [46, 64], e1: [34, 52], w1: [45, 45], e2: [35, 52], w2: [46, 45] }, LEGS_SEAT)
    }
  };

  // item: [exKey, sets, reps label, load label, rest s, extra]
  const I = (ex, sets, reps, load, rest, extra) => Object.assign({ ex, sets, reps, load, rest }, extra || {});
  const PROGRAM = {
    1: { ar: "صدر + ظهر", fr: "Pecs + Dos", items: [
      I("incline_mpress", 4, "12 / 10 / 7 / 5", "10 → 17 kg", 120, { note: { ar: "السيرية الرابعة: ثبّتها كي تعمل 5 نظاف.", fr: "4e série à confirmer : 5 reps propres." } }),
      I("seated_row", 3, "8–10", "45 kg", 90),
      I("dips_mach", 3, "10–12", "25 kg", 90),
      I("sa_pulldown", 3, "12–15", "35 → 45 kg", 60),
      I("pec_fly", 2, "8–12", "45 kg", 60)] },
    2: { ar: "أكتاف + ذراعين", fr: "Épaules + Bras", items: [
      I("mil_press", 3, "15 / 12 / 10", "15 → 20 kg", 120),
      I("jm_press", 3, "10–12", "?", 90),
      I("lat_raise", 3, "12–15", "10 kg", 60),
      I("rev_fly", 3, "15–20", "?", 60),
      I("tri_pushdown", 3, "12–15", "?", 60),
      I("hammer_db", 3, "10–15", "?", 60),
      I("incline_curl", 2, "10–12", "?", 60, { added: true, note: { ar: "زيادة مقترحة: عندك hammer برك، هذا يخدم الـbiceps من زاوية أخرى.", fr: "Ajout proposé : tu n'as que des curls marteau, celui-ci cible le biceps autrement." } })] },
    3: { ar: "رجلين", fr: "Jambes", items: [
      I("back_squat", 4, "12 / 10 / 8 / 7", "?", 150, { note: { ar: "ابدا بوزن تنجم تعمل بيه 12 نظاف، وزيد في كل سيرية.", fr: "Commence avec une charge pour 12 reps propres, augmente à chaque série." } }),
      I("leg_ext", 3, "12–15", "42 kg", 60),
      I("hip_ext", 3, "12–15", "?", 60),
      I("leg_curl", 3, "10–12", "42 kg", 75),
      I("calf_stand", 3, "10–15", "50 kg", 60),
      I("plank_g", 3, "40 s", "—", 45, { added: true, note: { ar: "زيادة مقترحة: شوية كرش يحمي الظهر في السكوات.", fr: "Ajout proposé : un peu de gainage protège le dos au squat." } })] },
    4: { ar: "راحة", fr: "Repos", rest: true, items: [] },
    5: { ar: "Upper (الجزء العلوي)", fr: "Upper", items: [
      I("incline_db", 3, "8–10", "17 kg", 120, { note: { ar: "السيرية 3: drop لـ 15 كغ.", fr: "3e série en drop à 15 kg." } }),
      I("lat_pulldown", 3, "10–12", "50 kg", 90),
      I("tbar_row", 3, "8–12", "35 kg", 90),
      I("lat_raise", 3, "12–15", "5 → 7 kg", 60),
      I("tri_overhead", 3, "12–15", "30 kg", 60),
      I("hammer_cable", 3, "7 + 7 + 7", "50 → 35 → 20 kg", 90)] },
    6: { ar: "Lower (الجزء السفلي)", fr: "Lower", items: [
      I("rdl", 3, "8–10", "22,5 kg", 120),
      I("bulgarian", 3, "8–10 / ساق", "?", 90),
      I("leg_curl", 3, "12–15", "42 kg", 60),
      I("back_ext", 2, "12–15", "10 kg", 60),
      I("calf_seated", 4, "12–20", "?", 45),
      I("woodchop", 3, "12–15 / جنب", "?", 45)] },
    0: { ar: "راحة", fr: "Repos", rest: true, items: [] }
  };

  const TIPS = [
    { ar: "تسخين: 5 دقايق vélo ولا tapis، وزوز سيريات خفاف قبل أول تمرين (خاصة السكوات والـpress).", fr: "Échauffement : 5 min de vélo ou tapis, puis 2 séries légères avant le 1er exercice (surtout squat et développés)." },
    { ar: "الزيادة: كي تعمل أعلى عدد مكتوب في كل السيريات بتقنية نظيفة، زيد 2,5 كغ (بار ولا ماكينة) ولا 1 كغ (دمبل وlatéral).", fr: "Progression : quand tu atteins le haut de la fourchette sur toutes les séries proprement, ajoute 2,5 kg (barre/machine) ou 1 kg (haltères, latérales)." },
    { ar: "الراحة: 2–3 دقايق في التمارين الكبار، 60–90 ثانية في الصغار.", fr: "Repos : 2–3 min sur les gros mouvements, 60–90 s en isolation." },
    { ar: "النوم متاعك قريب 6 سوايع: خلّي 1–2 مرات في الخزنة (ما توصلش للعجز في كل سيرية) باش تسترجع.", fr: "Tu dors ~6 h : garde 1–2 reps en réserve (pas d'échec à chaque série) pour récupérer." },
    { ar: "السكر: تتمرن الصباح قبل الماكلة. قيس قبل: تحت 100 كول 15–30 غ (3 تمرات). خلّي سكر سريع في الساك. قيس بعد، وقيس قبل النوم نهارات الرجلين — السكر ينجم يهبط بعد سوايع.", fr: "Glycémie : tu t'entraînes le matin à jeun. Mesure avant : sous 100, prends 15–30 g (3 dattes). Garde du sucre rapide dans ton sac. Mesure après, et au coucher les jours de jambes : la glycémie peut baisser des heures plus tard." },
    { ar: "الكرياتين: 5 غ كل نهار حتى نهارات الراحة، مع الماء. اشرب 2,5–3 لتر ماء. مع السكري، اعمل تحليل الكلى (créatinine/DFG) عند الطبيب، وقلّو إلي تاخذ كرياتين خاطر تبدّل نتيجة التحليل.", fr: "Créatine : 5 g par jour, même les jours de repos, avec de l'eau. Bois 2,5–3 L. Avec le diabète, fais contrôler les reins (créatinine/DFG) et signale la créatine : elle fausse ce dosage." },
    { ar: "السبت: القراية على 9:00 وما تنجمش تغيب — حصة Lower نهار السبت تتعدى بعد القراية (17:00).", fr: "Samedi : cours à 9:00, pas d'absence possible — la séance Lower passe après les cours (17:00)." }
  ];

  global.NhariGym = { EX, PROGRAM, TIPS };
})(typeof window !== "undefined" ? window : globalThis);
