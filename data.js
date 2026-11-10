/* Nhari — static content: surahs, adhkar, hadiths, foods, exercises. */
(function (global) {
  "use strict";

  // [arabic name, latin name, ayat (Hafs), juz where it starts]
  const SURAHS_RAW = `الفاتحة|Al-Fatiha|7|1
البقرة|Al-Baqara|286|1
آل عمران|Al-Imran|200|3
النساء|An-Nisa|176|4
المائدة|Al-Ma'ida|120|6
الأنعام|Al-An'am|165|7
الأعراف|Al-A'raf|206|8
الأنفال|Al-Anfal|75|9
التوبة|At-Tawba|129|10
يونس|Yunus|109|11
هود|Hud|123|11
يوسف|Yusuf|111|12
الرعد|Ar-Ra'd|43|13
إبراهيم|Ibrahim|52|13
الحجر|Al-Hijr|99|14
النحل|An-Nahl|128|14
الإسراء|Al-Isra|111|15
الكهف|Al-Kahf|110|15
مريم|Maryam|98|16
طه|Ta-Ha|135|16
الأنبياء|Al-Anbiya|112|17
الحج|Al-Hajj|78|17
المؤمنون|Al-Mu'minun|118|18
النور|An-Nur|64|18
الفرقان|Al-Furqan|77|18
الشعراء|Ash-Shu'ara|227|19
النمل|An-Naml|93|19
القصص|Al-Qasas|88|20
العنكبوت|Al-Ankabut|69|20
الروم|Ar-Rum|60|21
لقمان|Luqman|34|21
السجدة|As-Sajda|30|21
الأحزاب|Al-Ahzab|73|21
سبأ|Saba|54|22
فاطر|Fatir|45|22
يس|Ya-Sin|83|22
الصافات|As-Saffat|182|23
ص|Sad|88|23
الزمر|Az-Zumar|75|23
غافر|Ghafir|85|24
فصلت|Fussilat|54|24
الشورى|Ash-Shura|53|25
الزخرف|Az-Zukhruf|89|25
الدخان|Ad-Dukhan|59|25
الجاثية|Al-Jathiya|37|25
الأحقاف|Al-Ahqaf|35|26
محمد|Muhammad|38|26
الفتح|Al-Fath|29|26
الحجرات|Al-Hujurat|18|26
ق|Qaf|45|26
الذاريات|Adh-Dhariyat|60|26
الطور|At-Tur|49|27
النجم|An-Najm|62|27
القمر|Al-Qamar|55|27
الرحمن|Ar-Rahman|78|27
الواقعة|Al-Waqi'a|96|27
الحديد|Al-Hadid|29|27
المجادلة|Al-Mujadila|22|28
الحشر|Al-Hashr|24|28
الممتحنة|Al-Mumtahana|13|28
الصف|As-Saff|14|28
الجمعة|Al-Jumu'a|11|28
المنافقون|Al-Munafiqun|11|28
التغابن|At-Taghabun|18|28
الطلاق|At-Talaq|12|28
التحريم|At-Tahrim|12|28
الملك|Al-Mulk|30|29
القلم|Al-Qalam|52|29
الحاقة|Al-Haqqa|52|29
المعارج|Al-Ma'arij|44|29
نوح|Nuh|28|29
الجن|Al-Jinn|28|29
المزمل|Al-Muzzammil|20|29
المدثر|Al-Muddaththir|56|29
القيامة|Al-Qiyama|40|29
الإنسان|Al-Insan|31|29
المرسلات|Al-Mursalat|50|29
النبأ|An-Naba|40|30
النازعات|An-Nazi'at|46|30
عبس|Abasa|42|30
التكوير|At-Takwir|29|30
الانفطار|Al-Infitar|19|30
المطففين|Al-Mutaffifin|36|30
الانشقاق|Al-Inshiqaq|25|30
البروج|Al-Buruj|22|30
الطارق|At-Tariq|17|30
الأعلى|Al-A'la|19|30
الغاشية|Al-Ghashiya|26|30
الفجر|Al-Fajr|30|30
البلد|Al-Balad|20|30
الشمس|Ash-Shams|15|30
الليل|Al-Layl|21|30
الضحى|Ad-Duha|11|30
الشرح|Ash-Sharh|8|30
التين|At-Tin|8|30
العلق|Al-Alaq|19|30
القدر|Al-Qadr|5|30
البينة|Al-Bayyina|8|30
الزلزلة|Az-Zalzala|8|30
العاديات|Al-Adiyat|11|30
القارعة|Al-Qari'a|11|30
التكاثر|At-Takathur|8|30
العصر|Al-Asr|3|30
الهمزة|Al-Humaza|9|30
الفيل|Al-Fil|5|30
قريش|Quraysh|4|30
الماعون|Al-Ma'un|7|30
الكوثر|Al-Kawthar|3|30
الكافرون|Al-Kafirun|6|30
النصر|An-Nasr|3|30
المسد|Al-Masad|5|30
الإخلاص|Al-Ikhlas|4|30
الفلق|Al-Falaq|5|30
الناس|An-Nas|6|30`;
  const SURAHS = SURAHS_RAW.split("\n").map((l, i) => {
    const [ar, fr, ayat, juz] = l.split("|");
    return { n: i + 1, ar, fr, ayat: +ayat, juz: +juz };
  });

  const KURSI = "الله لا إله إلا هو الحي القيوم، لا تأخذه سنة ولا نوم، له ما في السماوات وما في الأرض، من ذا الذي يشفع عنده إلا بإذنه، يعلم ما بين أيديهم وما خلفهم، ولا يحيطون بشيء من علمه إلا بما شاء، وسع كرسيه السماوات والأرض، ولا يئوده حفظهما، وهو العلي العظيم";
  const IKHLAS = "قل هو الله أحد (١) الله الصمد (٢) لم يلد ولم يولد (٣) ولم يكن له كفوا أحد (٤)";
  const FALAQ = "قل أعوذ برب الفلق (١) من شر ما خلق (٢) ومن شر غاسق إذا وقب (٣) ومن شر النفاثات في العقد (٤) ومن شر حاسد إذا حسد (٥)";
  const NAS = "قل أعوذ برب الناس (١) ملك الناس (٢) إله الناس (٣) من شر الوسواس الخناس (٤) الذي يوسوس في صدور الناس (٥) من الجنة والناس (٦)";
  const MUAWWIDHAT = "سورة الإخلاص:\n" + IKHLAS + "\n\nسورة الفلق:\n" + FALAQ + "\n\nسورة الناس:\n" + NAS;
  const SAYYID = "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت";
  const TAHLIL = "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير";

  const ADHKAR = {
    morning: [
      { t: "آية الكرسي:\n" + KURSI, n: 1, src: "البقرة 255 — رواه الحاكم" },
      { t: MUAWWIDHAT, n: 3, src: "رواه أبو داود والترمذي" },
      { t: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، رب أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر", n: 1, src: "رواه مسلم" },
      { t: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور", n: 1, src: "رواه الترمذي" },
      { t: SAYYID, n: 1, src: "سيد الاستغفار — رواه البخاري" },
      { t: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت. اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت", n: 3, src: "رواه أبو داود" },
      { t: "حسبي الله لا إله إلا هو، عليه توكلت، وهو رب العرش العظيم", n: 7, src: "رواه أبو داود" },
      { t: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم", n: 3, src: "رواه أبو داود والترمذي" },
      { t: "رضيت بالله ربا، وبالإسلام دينا، وبمحمد صلى الله عليه وسلم نبيا", n: 3, src: "رواه أبو داود والترمذي" },
      { t: "يا حي يا قيوم، برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين", n: 1, src: "رواه النسائي في الكبرى والحاكم" },
      { t: "اللهم إني أسألك علما نافعا، ورزقا طيبا، وعملا متقبلا", n: 1, src: "رواه ابن ماجه — بعد صلاة الصبح" },
      { t: TAHLIL, n: 10, src: "رواه أحمد والنسائي" },
      { t: "سبحان الله وبحمده", n: 100, src: "رواه مسلم" },
      { t: "أستغفر الله وأتوب إليه", n: 100, src: "رواه مسلم" },
      { t: "اللهم صل وسلم على نبينا محمد", n: 10, src: "رواه الطبراني" }
    ],
    evening: [
      { t: "آية الكرسي:\n" + KURSI, n: 1, src: "البقرة 255 — رواه الحاكم" },
      { t: MUAWWIDHAT, n: 3, src: "رواه أبو داود والترمذي" },
      { t: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، رب أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر", n: 1, src: "رواه مسلم" },
      { t: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير", n: 1, src: "رواه الترمذي" },
      { t: SAYYID, n: 1, src: "سيد الاستغفار — رواه البخاري" },
      { t: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت. اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت", n: 3, src: "رواه أبو داود" },
      { t: "حسبي الله لا إله إلا هو، عليه توكلت، وهو رب العرش العظيم", n: 7, src: "رواه أبو داود" },
      { t: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم", n: 3, src: "رواه أبو داود والترمذي" },
      { t: "أعوذ بكلمات الله التامات من شر ما خلق", n: 3, src: "رواه مسلم" },
      { t: "رضيت بالله ربا، وبالإسلام دينا، وبمحمد صلى الله عليه وسلم نبيا", n: 3, src: "رواه أبو داود والترمذي" },
      { t: "يا حي يا قيوم، برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين", n: 1, src: "رواه النسائي في الكبرى والحاكم" },
      { t: TAHLIL, n: 10, src: "رواه أحمد والنسائي" },
      { t: "سبحان الله وبحمده", n: 100, src: "رواه مسلم" },
      { t: "اللهم صل وسلم على نبينا محمد", n: 10, src: "رواه الطبراني" }
    ],
    prayer: [
      { t: "أستغفر الله (3 مرات)، اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام", n: 1, src: "رواه مسلم" },
      { t: TAHLIL + "، اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد", n: 1, src: "رواه البخاري ومسلم" },
      { t: "سبحان الله", n: 33, src: "رواه مسلم" },
      { t: "الحمد لله", n: 33, src: "رواه مسلم" },
      { t: "الله أكبر", n: 33, src: "رواه مسلم" },
      { t: TAHLIL + " (تمام المائة)", n: 1, src: "رواه مسلم" },
      { t: "آية الكرسي:\n" + KURSI, n: 1, src: "رواه النسائي في الكبرى" },
      { t: MUAWWIDHAT, n: 1, src: "رواه أبو داود — بعد كل صلاة" }
    ],
    sleep: [
      { t: "باسمك اللهم أموت وأحيا", n: 1, src: "رواه البخاري" },
      { t: "آية الكرسي:\n" + KURSI, n: 1, src: "رواه البخاري" },
      { t: MUAWWIDHAT + "\n\n(يجمع كفيه وينفث فيهما ويمسح بهما ما استطاع من جسده)", n: 3, src: "رواه البخاري" },
      { t: "سبحان الله (33)، الحمد لله (33)، الله أكبر (34)", n: 1, src: "رواه البخاري ومسلم" },
      { t: "اللهم قني عذابك يوم تبعث عبادك", n: 3, src: "رواه أبو داود" }
    ],
    duas: [
      { t: "رب زدني علما", n: 1, src: "طه 114 — قبل المراجعة" },
      { t: "اللهم انفعني بما علمتني، وعلمني ما ينفعني، وزدني علما", n: 1, src: "رواه الترمذي وابن ماجه" },
      { t: "أذهب البأس رب الناس، اشف وأنت الشافي، لا شفاء إلا شفاؤك، شفاء لا يغادر سقما", n: 1, src: "رواه البخاري ومسلم" },
      { t: "اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك", n: 1, src: "رواه الترمذي" },
      { t: "بسم الله (قبل الأكل)، وإن نسي: بسم الله أوله وآخره", n: 1, src: "رواه أبو داود والترمذي" },
      { t: "الحمد لله الذي أطعمني هذا ورزقنيه من غير حول مني ولا قوة", n: 1, src: "رواه أبو داود والترمذي — بعد الأكل" }
    ]
  };

  // Daily hadiths live in hadith.js (with explanations)
  const HADITHS = (global.NhariHadith && global.NhariHadith.LIST) || [];

  // Quick-add foods: approximate values per typical portion
  // [ar, fr, portion label, kcal, carbs g, protein g, fat g]
  const FOODS = [
    ["خبز باقات (نص)", "Baguette (demi)", "125 g", 340, 69, 11, 2],
    ["خبز طابونة", "Pain tabouna", "100 g", 260, 52, 8, 2],
    ["كسكسي بالدجاج", "Couscous au poulet", "1 assiette ~350 g", 520, 70, 28, 14],
    ["لبلابي بالخبز", "Lablabi avec pain", "1 bol ~400 g", 450, 65, 18, 13],
    ["عجة بالمرقاز", "Ojja merguez", "250 g", 380, 15, 20, 26],
    ["بريك بالعظم", "Brik à l'œuf", "1 pièce", 250, 18, 9, 16],
    ["سلاطة مشوية", "Salade mechouia", "150 g", 110, 10, 2, 7],
    ["مقرونة صلصة", "Makrouna sauce", "1 assiette ~300 g", 450, 70, 14, 12],
    ["شربة فريك", "Chorba frik", "1 bol 300 ml", 200, 25, 9, 7],
    ["ملوخية", "Mloukhia", "1 assiette ~300 g", 420, 10, 28, 30],
    ["كفتاجي", "Kafteji", "1 assiette ~250 g", 400, 30, 10, 27],
    ["فريكاسي", "Fricassé", "1 pièce", 300, 30, 9, 16],
    ["سندويتش تن", "Sandwich thon", "1/2 baguette", 550, 65, 22, 22],
    ["بسيسة", "Bsissa", "50 g", 210, 30, 7, 7],
    ["روز أبيض مطبوخ", "Riz blanc cuit", "150 g", 195, 42, 4, 0.5],
    ["عدس مطبوخ", "Lentilles cuites", "200 g", 230, 40, 18, 1],
    ["حمص مطبوخ", "Pois chiches cuits", "150 g", 245, 40, 13, 4],
    ["عظمة مسلوقة", "Œuf dur", "1", 78, 0.6, 6, 5],
    ["دجاج مشوي", "Poulet grillé", "150 g", 250, 0, 38, 10],
    ["حوت مشوي", "Poisson grillé", "150 g", 200, 0, 34, 6],
    ["سلاطة خضراء", "Salade verte", "1 bol", 40, 6, 2, 0.5],
    ["تمر (3 حبات)", "Dattes (3)", "~24 g", 70, 18, 0.5, 0],
    ["برتقالة", "Orange", "1 moyenne", 62, 15, 1, 0],
    ["تفاحة", "Pomme", "1 moyenne", 95, 25, 0.5, 0.3],
    ["بنانة", "Banane", "1 moyenne", 105, 27, 1.3, 0.4],
    ["حليب نص دسم", "Lait demi-écrémé", "250 ml", 115, 12, 8, 4],
    ["ياغورت طبيعي", "Yaourt nature", "125 g", 70, 6, 5, 3],
    ["زيت زيتونة", "Huile d'olive", "1 c. à soupe", 117, 0, 0, 13],
    ["تاي بالنعناع بالسكر", "Thé menthe sucré", "1 verre", 40, 10, 0, 0],
    ["قهوة بالحليب بالسكر", "Café au lait sucré", "1 tasse", 80, 12, 3, 2],
    ["عصير برتقال", "Jus d'orange", "250 ml", 110, 26, 2, 0.5]
  ].map(([ar, fr, portion, kcal, carbs, prot, fat]) => ({ ar, fr, portion, kcal, carbs, prot, fat }));

  /* Exercises — stick figure poses for an animated SVG.
     Joints: h head, n neck, m mid-spine (optional), p hip, k1 f1 / k2 f2 legs, e1 w1 / e2 w2 arms. */
  const P = (o) => o;
  const STAND_SIDE = P({ h: [60, 15], n: [60, 25], p: [60, 52], k1: [61, 72], f1: [60, 92], k2: [59, 72], f2: [58, 92], e1: [62, 38], w1: [63, 52], e2: [58, 38], w2: [57, 52] });
  const EX = {
    squat: { ar: "سكوات", fr: "Squat", tip: { ar: "ظهرك مستقيم، الركبة ما تفوتش صوابع الساق، انزل كأنك تقعد على كرسي.", fr: "Dos droit, genoux alignés avec les pieds, descends comme pour t'asseoir." },
      a: { h: [60, 15], n: [60, 25], p: [60, 52], k1: [61, 72], f1: [60, 92], k2: [59, 72], f2: [58, 92], e1: [71, 27], w1: [83, 27], e2: [70, 28], w2: [82, 28] },
      b: { h: [64, 32], n: [61, 40], p: [46, 66], k1: [66, 70], f1: [60, 92], k2: [64, 71], f2: [58, 92], e1: [73, 40], w1: [85, 40], e2: [72, 41], w2: [84, 41] } },
    pushup: { ar: "بومب (Pompes)", fr: "Pompes", tip: { ar: "الجسم خط مستقيم من الراس للساقين. تنجم تبدا على الركب.", fr: "Corps gainé en ligne droite. Débutant : sur les genoux." },
      a: { h: [89, 59], n: [80, 64], p: [50, 77], k1: [35, 83], f1: [20, 90], k2: [35, 84], f2: [20, 91], e1: [80, 78], w1: [80, 92], e2: [79, 78], w2: [79, 92] },
      b: { h: [89, 77], n: [80, 80], p: [50, 85], k1: [35, 87], f1: [20, 90], k2: [35, 88], f2: [20, 91], e1: [70, 84], w1: [80, 92], e2: [69, 85], w2: [79, 92] } },
    lunge: { ar: "فونت (Fentes)", fr: "Fentes", tip: { ar: "خطوة لقدام، الركبتين في 90°، بدّل الساق.", fr: "Grand pas en avant, genoux à 90°, alterne les jambes." },
      a: { h: [58, 15], n: [58, 25], p: [58, 52], k1: [68, 72], f1: [76, 92], k2: [49, 72], f2: [40, 92], e1: [51, 40], w1: [57, 52], e2: [52, 40], w2: [58, 52] },
      b: { h: [58, 29], n: [58, 39], p: [58, 66], k1: [76, 68], f1: [76, 92], k2: [50, 88], f2: [36, 91], e1: [51, 54], w1: [57, 66], e2: [52, 54], w2: [58, 66] } },
    plank: { ar: "بلانش (Gainage)", fr: "Planche", tip: { ar: "على الذراعين، الكرش مشدود، ما تهبطش الوسط.", fr: "Sur les avant-bras, ventre serré, bassin aligné." },
      a: { h: [89, 66], n: [80, 70], p: [52, 79], k1: [36, 84], f1: [20, 90], k2: [36, 85], f2: [20, 91], e1: [80, 90], w1: [95, 90], e2: [79, 90], w2: [94, 90] },
      b: { h: [89, 65], n: [80, 69], p: [52, 77], k1: [36, 83], f1: [20, 90], k2: [36, 84], f2: [20, 91], e1: [80, 90], w1: [95, 90], e2: [79, 90], w2: [94, 90] } },
    bridge: { ar: "جسر (Pont fessier)", fr: "Pont fessier", tip: { ar: "مستلقي على ظهرك، ارفع الحوض واشدّ الأرداف ثانيتين.", fr: "Sur le dos, monte le bassin et serre les fessiers 2 s." },
      a: { h: [20, 85], n: [30, 88], p: [55, 88], k1: [72, 72], f1: [82, 92], k2: [71, 73], f2: [81, 92], e1: [40, 91], w1: [50, 91], e2: [41, 91], w2: [51, 91] },
      b: { h: [20, 85], n: [30, 87], p: [55, 72], k1: [74, 68], f1: [82, 92], k2: [73, 69], f2: [81, 92], e1: [40, 91], w1: [50, 91], e2: [41, 91], w2: [51, 91] } },
    jacks: { ar: "جامبينغ جاك", fr: "Jumping jacks", tip: { ar: "اقفز وافتح الساقين والذراعين مع بعضهم.", fr: "Saute en ouvrant bras et jambes en même temps." },
      a: { h: [60, 15], n: [60, 25], p: [60, 53], k1: [57, 73], f1: [56, 92], k2: [63, 73], f2: [64, 92], e1: [54, 38], w1: [52, 52], e2: [66, 38], w2: [68, 52] },
      b: { h: [60, 14], n: [60, 24], p: [60, 51], k1: [51, 71], f1: [43, 90], k2: [69, 71], f2: [77, 90], e1: [49, 14], w1: [44, 3], e2: [71, 14], w2: [76, 3] } },
    climbers: { ar: "ماونتن كلايمبر", fr: "Mountain climbers", tip: { ar: "وضعية البومب، جيب الركبة للصدر وبدّل بسرعة.", fr: "Position pompe, ramène un genou vers la poitrine, alterne." },
      a: { h: [89, 58], n: [80, 63], p: [52, 74], k1: [37, 82], f1: [22, 90], k2: [66, 76], f2: [55, 87], e1: [81, 77], w1: [82, 92], e2: [80, 77], w2: [81, 92] },
      b: { h: [89, 58], n: [80, 63], p: [52, 74], k1: [66, 76], f1: [55, 87], k2: [37, 82], f2: [22, 90], e1: [81, 77], w1: [82, 92], e2: [80, 77], w2: [81, 92] } },
    crunch: { ar: "كرانش", fr: "Crunch", tip: { ar: "ارفع الكتفين بالكرش موش بالرقبة، وانزل بشوية.", fr: "Monte les épaules avec les abdos, pas avec la nuque." },
      a: { h: [20, 85], n: [30, 88], p: [55, 88], k1: [70, 72], f1: [82, 92], k2: [69, 73], f2: [81, 92], e1: [40, 84], w1: [45, 80], e2: [41, 85], w2: [46, 81] },
      b: { h: [30, 70], n: [38, 78], p: [55, 88], k1: [70, 72], f1: [82, 92], k2: [69, 73], f2: [81, 92], e1: [46, 76], w1: [50, 72], e2: [47, 77], w2: [51, 73] } },
    superman: { ar: "سوبرمان", fr: "Superman", tip: { ar: "على كرشك، ارفع الذراعين والساقين مع بعضهم ثانيتين.", fr: "À plat ventre, lève bras et jambes 2 secondes." },
      a: { h: [90, 85], n: [80, 88], p: [52, 88], k1: [36, 89], f1: [20, 89], k2: [36, 90], f2: [20, 90], e1: [92, 87], w1: [104, 87], e2: [92, 88], w2: [104, 88] },
      b: { h: [90, 79], n: [80, 84], p: [52, 88], k1: [36, 86], f1: [20, 81], k2: [36, 87], f2: [20, 82], e1: [93, 81], w1: [105, 76], e2: [93, 82], w2: [105, 77] } },
    walk: { ar: "مشي سريع", fr: "Marche rapide", tip: { ar: "خطوات سريعة، تتنفس ومازلت تنجم تحكي. بعد الماكلة ب 30 دقيقة ممتاز للسكر.", fr: "Rythme soutenu mais tu peux parler. 30 min après un repas : top pour la glycémie." },
      a: { h: [60, 15], n: [60, 25], p: [60, 52], k1: [66, 71], f1: [72, 91], k2: [55, 72], f2: [48, 91], e1: [54, 38], w1: [50, 50], e2: [66, 38], w2: [70, 50] },
      b: { h: [60, 15], n: [60, 25], p: [60, 52], k1: [55, 72], f1: [48, 91], k2: [66, 71], f2: [72, 91], e1: [66, 38], w1: [70, 50], e2: [54, 38], w2: [50, 50] } },
    knees: { ar: "رفع الركب", fr: "Montées de genoux", tip: { ar: "اجري في بلاصتك وارفع الركب للحوض.", fr: "Cours sur place en montant les genoux à hauteur de hanche." },
      a: { h: [60, 14], n: [60, 24], p: [60, 51], k1: [72, 54], f1: [68, 72], k2: [59, 71], f2: [58, 91], e1: [53, 36], w1: [56, 26], e2: [66, 38], w2: [70, 49] },
      b: { h: [60, 14], n: [60, 24], p: [60, 51], k1: [61, 71], f1: [60, 91], k2: [72, 54], f2: [68, 72], e1: [66, 36], w1: [69, 26], e2: [53, 38], w2: [50, 49] } },
    sumo: { ar: "سكوات سومو", fr: "Squat sumo", tip: { ar: "الساقين محلولين، الصوابع للبرّا، انزل بالحوض.", fr: "Pieds écartés, pointes vers l'extérieur, descends le bassin." },
      a: { h: [60, 15], n: [60, 25], p: [60, 52], k1: [50, 72], f1: [44, 92], k2: [70, 72], f2: [76, 92], e1: [52, 38], w1: [60, 42], e2: [68, 38], w2: [60, 42] },
      b: { h: [60, 29], n: [60, 39], p: [60, 66], k1: [44, 72], f1: [42, 92], k2: [76, 72], f2: [78, 92], e1: [52, 52], w1: [60, 56], e2: [68, 52], w2: [60, 56] } },
    incline: { ar: "بومب مايل", fr: "Pompes inclinées", tip: { ar: "اليدين على كرسي ولا طاولة، أسهل من البومب العادي.", fr: "Mains sur une chaise ou un banc : plus facile que les pompes." },
      bench: true,
      a: { h: [87, 46], n: [80, 52], p: [52, 72], k1: [36, 82], f1: [20, 92], k2: [36, 83], f2: [20, 92], e1: [83, 62], w1: [86, 72], e2: [82, 62], w2: [85, 72] },
      b: { h: [91, 58], n: [83, 62], p: [53, 77], k1: [36, 85], f1: [20, 92], k2: [36, 86], f2: [20, 92], e1: [74, 66], w1: [86, 72], e2: [73, 67], w2: [85, 72] } },
    sideplank: { ar: "بلانش جانبي", fr: "Gainage latéral", tip: { ar: "على جنب، الحوض مرفوع، بدّل الجنب.", fr: "Sur le côté, bassin levé, change de côté." },
      a: { h: [86, 56], n: [80, 63], p: [52, 77], k1: [36, 84], f1: [20, 90], k2: [36, 83], f2: [20, 89], e1: [80, 90], w1: [94, 90], e2: [82, 49], w2: [84, 35] },
      b: { h: [86, 58], n: [80, 65], p: [52, 80], k1: [36, 86], f1: [20, 90], k2: [36, 85], f2: [20, 89], e1: [80, 90], w1: [94, 90], e2: [82, 51], w2: [84, 37] } },
    fold: { ar: "تمطيط لوطا", fr: "Étirement avant", tip: { ar: "انحني لقدام بشوية، تنفس، ما تجبدش بالقوة.", fr: "Penche-toi doucement, respire, sans forcer." },
      a: STAND_SIDE,
      b: { h: [80, 56], n: [74, 46], p: [58, 52], k1: [60, 72], f1: [60, 92], k2: [59, 72], f2: [58, 92], e1: [76, 62], w1: [74, 80], e2: [75, 62], w2: [73, 80] } },
    quad: { ar: "تمطيط الفخذ", fr: "Étirement quadriceps", tip: { ar: "شد الساق من التالي نحو الأرداف، 30 ثانية لكل ساق.", fr: "Attrape ton pied derrière, 30 s par jambe." },
      a: STAND_SIDE,
      b: { h: [60, 15], n: [60, 25], p: [60, 52], k1: [61, 72], f1: [60, 92], k2: [58, 73], f2: [48, 58], e1: [56, 40], w1: [49, 57], e2: [64, 38], w2: [70, 30] } },
    catcow: { ar: "قط وبقرة", fr: "Chat-vache", tip: { ar: "على ركبك ويديك، قوّس ظهرك لفوق ومن بعد لتحت مع النفس.", fr: "À quatre pattes, arrondis puis creuse le dos en respirant." },
      a: { h: [90, 66], n: [80, 70], m: [62, 60], p: [45, 70], k1: [45, 92], f1: [28, 92], k2: [46, 92], f2: [29, 92], e1: [80, 81], w1: [80, 92], e2: [79, 81], w2: [79, 92] },
      b: { h: [91, 60], n: [80, 70], m: [62, 78], p: [45, 70], k1: [45, 92], f1: [28, 92], k2: [46, 92], f2: [29, 92], e1: [80, 81], w1: [80, 92], e2: [79, 81], w2: [79, 92] } }
  };

  // Workouts: items are [exerciseKey, sets, reps|null, seconds|null, rest seconds]
  const WORKOUTS = {
    force1: { ar: "قوة 1 — الجسم الكل", fr: "Force 1 — corps entier", min: 30, items: [["squat", 3, 12, null, 45], ["pushup", 3, 8, null, 60], ["lunge", 3, 10, null, 45], ["bridge", 3, 15, null, 40], ["plank", 3, null, 30, 40], ["superman", 3, 12, null, 40]] },
    walk: { ar: "مشي سريع", fr: "Marche rapide", min: 30, items: [["walk", 1, null, 1800, 0]] },
    force2: { ar: "قوة 2 — الجسم الكل", fr: "Force 2 — corps entier", min: 30, items: [["jacks", 3, null, 30, 30], ["sumo", 3, 15, null, 45], ["incline", 3, 10, null, 60], ["climbers", 3, null, 20, 40], ["sideplank", 2, null, 20, 30], ["crunch", 3, 15, null, 40]] },
    cardio: { ar: "كارديو خفيف", fr: "Cardio doux", min: 20, items: [["knees", 4, null, 30, 30], ["jacks", 4, null, 30, 30], ["climbers", 3, null, 20, 40], ["walk", 1, null, 600, 0]] },
    stretch: { ar: "تمطيط واسترخاء", fr: "Étirements", min: 15, items: [["catcow", 2, null, 40, 15], ["fold", 3, null, 30, 15], ["quad", 2, null, 60, 15], ["bridge", 2, 12, null, 20]] },
    rest: { ar: "راحة", fr: "Repos", min: 0, items: [] }
  };
  // Week schedule: 0=Sunday ... 6=Saturday
  const DEFAULT_WEEK = { 0: "rest", 1: "force1", 2: "walk", 3: "force2", 4: "walk", 5: "stretch", 6: "cardio" };

  const CITIES = [
    { id: "tunis", ar: "تونس العاصمة", fr: "Tunis", lat: 36.8065, lng: 10.1815, tz: "Africa/Tunis", method: "tunisia" },
    { id: "ariana", ar: "أريانة", fr: "Ariana", lat: 36.8625, lng: 10.1956, tz: "Africa/Tunis", method: "tunisia" },
    { id: "benarous", ar: "بن عروس", fr: "Ben Arous", lat: 36.7531, lng: 10.2189, tz: "Africa/Tunis", method: "tunisia" },
    { id: "bizerte", ar: "بنزرت", fr: "Bizerte", lat: 37.2744, lng: 9.8739, tz: "Africa/Tunis", method: "tunisia" },
    { id: "nabeul", ar: "نابل", fr: "Nabeul", lat: 36.4561, lng: 10.7376, tz: "Africa/Tunis", method: "tunisia" },
    { id: "sousse", ar: "سوسة", fr: "Sousse", lat: 35.8256, lng: 10.6411, tz: "Africa/Tunis", method: "tunisia" },
    { id: "monastir", ar: "المنستير", fr: "Monastir", lat: 35.7643, lng: 10.8113, tz: "Africa/Tunis", method: "tunisia" },
    { id: "mahdia", ar: "المهدية", fr: "Mahdia", lat: 35.5047, lng: 11.0622, tz: "Africa/Tunis", method: "tunisia" },
    { id: "kairouan", ar: "القيروان", fr: "Kairouan", lat: 35.6781, lng: 10.0963, tz: "Africa/Tunis", method: "tunisia" },
    { id: "sfax", ar: "صفاقس", fr: "Sfax", lat: 34.7406, lng: 10.7603, tz: "Africa/Tunis", method: "tunisia" },
    { id: "gabes", ar: "قابس", fr: "Gabès", lat: 33.8815, lng: 10.0982, tz: "Africa/Tunis", method: "tunisia" },
    { id: "medenine", ar: "مدنين", fr: "Médenine", lat: 33.3549, lng: 10.5055, tz: "Africa/Tunis", method: "tunisia" },
    { id: "djerba", ar: "جربة", fr: "Djerba (Houmt Souk)", lat: 33.8758, lng: 10.8575, tz: "Africa/Tunis", method: "tunisia" },
    { id: "gafsa", ar: "قفصة", fr: "Gafsa", lat: 34.425, lng: 8.7842, tz: "Africa/Tunis", method: "tunisia" },
    { id: "beja", ar: "باجة", fr: "Béja", lat: 36.7256, lng: 9.1817, tz: "Africa/Tunis", method: "tunisia" },
    { id: "jendouba", ar: "جندوبة", fr: "Jendouba", lat: 36.5011, lng: 8.7802, tz: "Africa/Tunis", method: "tunisia" },
    { id: "kasserine", ar: "القصرين", fr: "Kasserine", lat: 35.1676, lng: 8.8365, tz: "Africa/Tunis", method: "tunisia" },
    { id: "sidibouzid", ar: "سيدي بوزيد", fr: "Sidi Bouzid", lat: 35.0382, lng: 9.4849, tz: "Africa/Tunis", method: "tunisia" },
    { id: "tozeur", ar: "توزر", fr: "Tozeur", lat: 33.9197, lng: 8.1335, tz: "Africa/Tunis", method: "tunisia" },
    { id: "paris", ar: "باريس", fr: "Paris", lat: 48.8566, lng: 2.3522, tz: "Europe/Paris", method: "uoif" },
    { id: "lyon", ar: "ليون", fr: "Lyon", lat: 45.764, lng: 4.8357, tz: "Europe/Paris", method: "uoif" },
    { id: "marseille", ar: "مرسيليا", fr: "Marseille", lat: 43.2965, lng: 5.3698, tz: "Europe/Paris", method: "uoif" },
    { id: "toulouse", ar: "تولوز", fr: "Toulouse", lat: 43.6047, lng: 1.4442, tz: "Europe/Paris", method: "uoif" },
    { id: "nice", ar: "نيس", fr: "Nice", lat: 43.7102, lng: 7.262, tz: "Europe/Paris", method: "uoif" },
    { id: "lille", ar: "ليل", fr: "Lille", lat: 50.6292, lng: 3.0573, tz: "Europe/Paris", method: "uoif" }
  ];

  global.NhariData = { SURAHS, ADHKAR, HADITHS, FOODS, EX, WORKOUTS, DEFAULT_WEEK, CITIES };
})(typeof window !== "undefined" ? window : globalThis);
