/* Довідники, базовий набір вправ, пресети програм і демо-дані */
(function () {
  'use strict';

  var PL = window.PL;

  PL.MUSCLES = {
    chest: 'Груди', back: 'Спина', shoulders: 'Плечі', biceps: 'Біцепс', triceps: 'Трицепс',
    quads: 'Квадрицепс', hamstrings: 'Задня поверхня стегна', glutes: 'Сідниці', calves: 'Литки', core: 'Прес / кор'
  };

  PL.EQUIPMENT = {
    barbell: 'Штанга', dumbbell: 'Гантелі', machine: 'Тренажер',
    cable: 'Блок / кросовер', bodyweight: 'Власна вага', kettlebell: 'Гиря'
  };

  // Суглоби під навантаженням: одна позначка травми виключає всі відповідні вправи
  PL.JOINTS = {
    knees: 'Коліна', lower_back: 'Поперек', shoulder_joint: 'Плечовий суглоб',
    elbows: 'Лікті', wrists: 'Зап’ястя'
  };

  PL.SEX = { male: 'Чоловік', female: 'Жінка' };
  PL.GOALS = { lose: 'Схуднення', maintain: 'Підтримка', gain: 'Набір маси' };
  PL.ACTIVITY = {
    '1.2': 'Мінімальна (сидяча робота)',
    '1.375': 'Низька (1–3 тренування на тиждень)',
    '1.55': 'Середня (3–5 тренувань)',
    '1.725': 'Висока (6–7 тренувань)',
    '1.9': 'Дуже висока (фізична праця + спорт)'
  };

  /* ── База вправ ────────────────────────────────────────────── */

  var EX = [
    ['bench-press', 'Жим штанги лежачи', 'chest', 'barbell', ['shoulder_joint', 'elbows', 'wrists']],
    ['incline-db-press', 'Жим гантелей на похилій лаві', 'chest', 'dumbbell', ['shoulder_joint']],
    ['push-up', 'Віджимання від підлоги', 'chest', 'bodyweight', ['shoulder_joint', 'wrists']],
    ['chest-press-machine', 'Жим у тренажері сидячи', 'chest', 'machine', []],
    ['cable-fly', 'Зведення рук у кросовері', 'chest', 'cable', ['shoulder_joint']],

    ['pull-up', 'Підтягування', 'back', 'bodyweight', ['shoulder_joint', 'elbows']],
    ['lat-pulldown', 'Тяга верхнього блоку', 'back', 'cable', []],
    ['barbell-row', 'Тяга штанги в нахилі', 'back', 'barbell', ['lower_back']],
    ['db-row', 'Тяга гантелі однією рукою', 'back', 'dumbbell', []],
    ['seated-cable-row', 'Тяга горизонтального блоку', 'back', 'cable', []],
    ['deadlift', 'Станова тяга', 'back', 'barbell', ['lower_back', 'knees']],

    ['ohp', 'Жим штанги стоячи', 'shoulders', 'barbell', ['shoulder_joint', 'lower_back']],
    ['db-shoulder-press', 'Жим гантелей сидячи', 'shoulders', 'dumbbell', ['shoulder_joint']],
    ['lateral-raise', 'Махи гантелями в сторони', 'shoulders', 'dumbbell', []],
    ['face-pull', 'Тяга канату до обличчя', 'shoulders', 'cable', []],

    ['barbell-curl', 'Підйом штанги на біцепс', 'biceps', 'barbell', ['elbows', 'wrists']],
    ['hammer-curl', 'Молотки з гантелями', 'biceps', 'dumbbell', []],
    ['cable-curl', 'Підйом на біцепс на блоці', 'biceps', 'cable', []],

    ['skull-crusher', 'Французький жим лежачи', 'triceps', 'barbell', ['elbows']],
    ['triceps-pushdown', 'Розгинання рук на блоці', 'triceps', 'cable', []],
    ['dips', 'Віджимання на брусах', 'triceps', 'bodyweight', ['shoulder_joint', 'elbows']],

    ['back-squat', 'Присідання зі штангою', 'quads', 'barbell', ['knees', 'lower_back']],
    ['leg-press', 'Жим ногами', 'quads', 'machine', ['knees']],
    ['goblet-squat', 'Гоблет-присідання з гирею', 'quads', 'kettlebell', ['knees']],
    ['db-lunge', 'Випади з гантелями', 'quads', 'dumbbell', ['knees']],
    ['leg-extension', 'Розгинання ніг у тренажері', 'quads', 'machine', ['knees']],

    ['rdl', 'Румунська тяга', 'hamstrings', 'barbell', ['lower_back']],
    ['leg-curl', 'Згинання ніг у тренажері', 'hamstrings', 'machine', []],

    ['hip-thrust', 'Сідничний міст зі штангою', 'glutes', 'barbell', []],
    ['kb-swing', 'Махи гирею', 'glutes', 'kettlebell', ['lower_back']],
    ['cable-kickback', 'Відведення ноги назад у кросовері', 'glutes', 'cable', []],

    ['standing-calf-raise', 'Підйом на носки стоячи', 'calves', 'machine', []],
    ['seated-calf-raise', 'Підйом на носки сидячи', 'calves', 'machine', []],

    ['plank', 'Планка', 'core', 'bodyweight', []],
    ['crunch', 'Скручування', 'core', 'bodyweight', ['lower_back']],
    ['hanging-leg-raise', 'Підйом ніг у висі', 'core', 'bodyweight', ['shoulder_joint']]
  ];

  PL.seedExercises = function () {
    return EX.map(function (e) {
      return { id: e[0], name: e[1], muscle: e[2], equipment: e[3], joints: e[4].slice(), custom: false };
    });
  };

  /* ── Пресети програм ───────────────────────────────────────── */

  // Рядок пресету: { ex, sets, reps } для культуризму; + { load, pct, rest } для пауерліфтингу
  var bb = function (ex, sets, reps) { return { ex: ex, sets: sets, reps: reps }; };
  var pw = function (ex, load, pct, reps, sets, rest) {
    return { ex: ex, load: load, pct: pct, reps: reps, sets: sets, rest: rest };
  };

  PL.PRESETS = [
    {
      id: 'fullbody',
      kind: 'bodybuilding',
      name: 'Фулбаді A / Б',
      note: 'Два чергованих тренування на все тіло, 3 рази на тиждень. Для початківців.',
      days: [
        { name: 'Тренування A', items: [bb('back-squat', 3, '6-8'), bb('bench-press', 3, '6-8'), bb('barbell-row', 3, '8-10'), bb('lateral-raise', 3, '12-15'), bb('plank', 3, '30-45 с')] },
        { name: 'Тренування Б', items: [bb('rdl', 3, '8-10'), bb('ohp', 3, '6-8'), bb('lat-pulldown', 3, '10-12'), bb('db-lunge', 3, '10-12'), bb('crunch', 3, '12-15')] }
      ]
    },
    {
      id: 'upper-lower',
      kind: 'bodybuilding',
      name: 'Верх / Низ',
      note: 'Два тренування, 4 рази на тиждень. Для середнього рівня.',
      days: [
        { name: 'Верх', items: [bb('bench-press', 4, '6-8'), bb('barbell-row', 4, '6-8'), bb('db-shoulder-press', 3, '8-10'), bb('lat-pulldown', 3, '10-12'), bb('barbell-curl', 3, '10-12'), bb('triceps-pushdown', 3, '10-12')] },
        { name: 'Низ', items: [bb('back-squat', 4, '6-8'), bb('rdl', 3, '8-10'), bb('leg-press', 3, '10-12'), bb('leg-curl', 3, '10-12'), bb('standing-calf-raise', 4, '12-15'), bb('hanging-leg-raise', 3, '10-12')] }
      ]
    },
    {
      id: 'ppl',
      kind: 'bodybuilding',
      name: 'Push / Pull / Legs',
      note: 'Три тренування: жими, тяги, ноги. 3–6 разів на тиждень.',
      days: [
        { name: 'Push — жими', items: [bb('bench-press', 4, '6-8'), bb('incline-db-press', 3, '8-10'), bb('ohp', 3, '6-8'), bb('lateral-raise', 3, '12-15'), bb('triceps-pushdown', 3, '10-12')] },
        { name: 'Pull — тяги', items: [bb('pull-up', 4, '6-10'), bb('barbell-row', 3, '8-10'), bb('seated-cable-row', 3, '10-12'), bb('face-pull', 3, '12-15'), bb('hammer-curl', 3, '10-12')] },
        { name: 'Legs — ноги', items: [bb('back-squat', 4, '6-8'), bb('rdl', 3, '8-10'), bb('leg-press', 3, '10-12'), bb('leg-curl', 3, '10-12'), bb('standing-calf-raise', 4, '12-15')] }
      ]
    },
    {
      id: 'pl-base',
      kind: 'powerlifting',
      name: 'Пауерліфтинг: база',
      note: 'Присід / жим / тяга у % від ПМ, три тренування з різним навантаженням.',
      days: [
        { name: 'Пн — присід важкий', items: [pw('back-squat', 'heavy', 70, 6, 4, 240), pw('bench-press', 'light', 45, 6, 3, 120), pw('skull-crusher', 'medium', 55, 6, 3, 180)] },
        { name: 'Ср — тяга', items: [pw('deadlift', 'medium', 60, 5, 5, 180), pw('bench-press', 'light', 50, 6, 3, 120), pw('rdl', 'medium', 65, 4, 4, 180), pw('ohp', 'light', 40, 6, 3, 120)] },
        { name: 'Пт — жим важкий', items: [pw('bench-press', 'heavy', 70, 6, 2, 240), pw('back-squat', 'light', 40, 6, 3, 120), pw('barbell-curl', 'light', 70, 6, 3, 180)] }
      ]
    }
  ];

  /* ── Демо-дані ─────────────────────────────────────────────── */

  var weekly = function (from, to, weeks) {
    var out = [];
    for (var i = 0; i < weeks; i++) {
      var v = from + (to - from) * (i / (weeks - 1)) + (i && i < weeks - 1 ? (i % 2 ? 0.3 : -0.2) : 0);
      out.push({ id: PL.uid(), date: PL.daysAgo((weeks - 1 - i) * 7), weight: Math.round(v * 10) / 10 });
    }
    return out;
  };

  var liftSeries = function (exId, from, step, reps, weeks) {
    var ex = PL.exById(exId);
    var out = [];
    for (var i = 0; i < weeks; i++) {
      out.push({
        id: PL.uid(), exId: exId, name: ex ? ex.name : '',
        date: PL.daysAgo((weeks - 1 - i) * 7 + 1),
        weight: from + step * i, reps: reps, sets: 3
      });
    }
    return out;
  };

  PL.seed = function () {
    var S = PL.normalize({ exercises: PL.seedExercises() });
    PL.S = S; // пресети й демо-записи читають базу вправ із PL.S

    var olena = PL.normalizeProfile({
      name: 'Олена Коваленко', phone: '+380 67 123 45 67', telegram: '@olena_k', instagram: '@olena.fit',
      sex: 'female', age: 29, height: 168, activity: 1.55, goal: 'lose',
      goals: 'Мінус 5 кг до літа, підтягнути сідниці та ноги',
      injuries: 'Хондромаляція надколінка: біль у колінах на глибоких присіданнях і випадах',
      notes: 'Тренування пн / ср / пт о 8:00. Кардіо на доріжці не любить.',
      exclusions: { exercises: ['db-lunge'], muscles: [], equipment: [], joints: ['knees'] }
    });
    olena.bodyWeight = weekly(69.2, 66.4, 8);
    olena.weight = olena.bodyWeight[olena.bodyWeight.length - 1].weight;
    olena.lifts = liftSeries('hip-thrust', 40, 5, 10, 6).concat(liftSeries('rdl', 30, 2.5, 8, 6));
    olena.program = PL.buildFromPreset('fullbody', olena).program;
    olena.program.days[0].items.push(PL.programItem(PL.exById('hip-thrust'), 4, '10-12'));
    olena.program.days[1].items.push(PL.programItem(PL.exById('leg-curl'), 3, '12-15'));
    olena.nutrition = Object.assign(PL.calcNutrition(olena), { date: PL.daysAgo(14), manual: false });
    olena.plan = [
      { id: PL.uid(), day: 0, name: 'Сніданок: вівсянка з бананом і горіхами', kcal: 450, protein: 14, fat: 15, carbs: 64 },
      { id: PL.uid(), day: 0, name: 'Обід: курка з рисом і овочами', kcal: 580, protein: 42, fat: 14, carbs: 68 },
      { id: PL.uid(), day: 0, name: 'Вечеря: сир з ягодами', kcal: 320, protein: 36, fat: 8, carbs: 24 },
      { id: PL.uid(), day: 1, name: 'Сніданок: омлет з овочами', kcal: 380, protein: 26, fat: 22, carbs: 14 },
      { id: PL.uid(), day: 1, name: 'Обід: індичка з гречкою', kcal: 610, protein: 45, fat: 16, carbs: 66 }
    ];

    var andrii = PL.normalizeProfile({
      name: 'Андрій Мельник', phone: '+380 50 987 65 43', telegram: '@andrii_m',
      sex: 'male', age: 34, height: 182, activity: 1.55, goal: 'gain',
      goals: 'Набрати 4–5 кг мʼязів, жим лежачи 100 кг на 5 разів',
      injuries: 'Протрузія L5–S1: без осьового навантаження на хребет',
      notes: 'Працює з дому, тренування можна переносити.',
      exclusions: { exercises: [], muscles: [], equipment: [], joints: ['lower_back'] }
    });
    andrii.bodyWeight = weekly(84.1, 87.6, 10);
    andrii.weight = andrii.bodyWeight[andrii.bodyWeight.length - 1].weight;
    andrii.lifts = liftSeries('bench-press', 80, 2.5, 6, 6).concat(liftSeries('lat-pulldown', 65, 2.5, 10, 4));
    andrii.program = PL.buildFromPreset('ppl', andrii).program;
    andrii.nutrition = Object.assign(PL.calcNutrition(andrii), { date: PL.daysAgo(30), manual: false });

    var taras = PL.normalizeProfile({
      name: 'Тарас Бондар', phone: '+380 66 222 33 44', telegram: '@taras_pl',
      sex: 'male', age: 28, height: 180, activity: 1.725, goal: 'maintain',
      goals: 'Чемпіонат області: присід 200, жим 140, тяга 230',
      notes: 'Тренування пн / ср / пт. Веде щоденник тоннажу сам.',
      maxes: { 'back-squat': 185, 'bench-press': 130, 'deadlift': 215, 'ohp': 70, 'rdl': 150, 'barbell-curl': 50, 'skull-crusher': 60 }
    });
    taras.bodyWeight = weekly(91.2, 92.4, 6);
    taras.weight = taras.bodyWeight[taras.bodyWeight.length - 1].weight;
    taras.lifts = liftSeries('bench-press', 110, 2.5, 5, 6).concat(liftSeries('back-squat', 160, 5, 5, 5));
    taras.program = PL.buildFromPreset('pl-base', taras).program;

    var maria = PL.normalizeProfile({
      name: 'Марія Шевчук', phone: '+380 93 555 12 34', instagram: '@maria.shev',
      sex: 'female', age: 31, height: 164, goal: 'maintain', activity: 1.375,
      goals: 'Повернутись у форму після пологів',
      notes: 'Перше заняття ще не проводили.'
    });

    andrii.maxes = { 'bench-press': 105, 'lat-pulldown': 80, 'db-shoulder-press': 30 };
    olena.maxes = { 'hip-thrust': 80, 'rdl': 55 };

    S.clients = [olena, andrii, taras, maria];

    S.self = PL.normalizeProfile({
      sex: 'male', age: 27, height: 178, activity: 1.375, goal: 'maintain',
      goals: 'Тримати вагу, додати підтягувань'
    });
    S.self.bodyWeight = weekly(76.2, 75.1, 5);
    S.self.weight = S.self.bodyWeight[S.self.bodyWeight.length - 1].weight;
    S.self.lifts = liftSeries('pull-up', 0, 2.5, 8, 4);

    return S;
  };
})();
