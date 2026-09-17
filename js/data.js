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

  PL.PRESETS = [
    {
      id: 'fullbody',
      name: 'Фулбаді A / Б',
      note: 'Два чергованих тренування на все тіло, 3 рази на тиждень. Для початківців.',
      days: [
        { name: 'Тренування A', items: [['back-squat', 3, '6-8'], ['bench-press', 3, '6-8'], ['barbell-row', 3, '8-10'], ['lateral-raise', 3, '12-15'], ['plank', 3, '30-45 с']] },
        { name: 'Тренування Б', items: [['rdl', 3, '8-10'], ['ohp', 3, '6-8'], ['lat-pulldown', 3, '10-12'], ['db-lunge', 3, '10-12'], ['crunch', 3, '12-15']] }
      ]
    },
    {
      id: 'upper-lower',
      name: 'Верх / Низ',
      note: 'Два тренування, 4 рази на тиждень. Для середнього рівня.',
      days: [
        { name: 'Верх', items: [['bench-press', 4, '6-8'], ['barbell-row', 4, '6-8'], ['db-shoulder-press', 3, '8-10'], ['lat-pulldown', 3, '10-12'], ['barbell-curl', 3, '10-12'], ['triceps-pushdown', 3, '10-12']] },
        { name: 'Низ', items: [['back-squat', 4, '6-8'], ['rdl', 3, '8-10'], ['leg-press', 3, '10-12'], ['leg-curl', 3, '10-12'], ['standing-calf-raise', 4, '12-15'], ['hanging-leg-raise', 3, '10-12']] }
      ]
    },
    {
      id: 'ppl',
      name: 'Push / Pull / Legs',
      note: 'Три тренування: жими, тяги, ноги. 3–6 разів на тиждень.',
      days: [
        { name: 'Push — жими', items: [['bench-press', 4, '6-8'], ['incline-db-press', 3, '8-10'], ['ohp', 3, '6-8'], ['lateral-raise', 3, '12-15'], ['triceps-pushdown', 3, '10-12']] },
        { name: 'Pull — тяги', items: [['pull-up', 4, '6-10'], ['barbell-row', 3, '8-10'], ['seated-cable-row', 3, '10-12'], ['face-pull', 3, '12-15'], ['hammer-curl', 3, '10-12']] },
        { name: 'Legs — ноги', items: [['back-squat', 4, '6-8'], ['rdl', 3, '8-10'], ['leg-press', 3, '10-12'], ['leg-curl', 3, '10-12'], ['standing-calf-raise', 4, '12-15']] }
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
      name: 'Олена Коваленко', phone: '+380 67 123 45 67', email: 'olena.k@example.com',
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
    olena.meals = [
      { id: PL.uid(), date: PL.today(), name: 'Сніданок: вівсянка з бананом і горіхами', kcal: 450, protein: 14, fat: 15, carbs: 64 },
      { id: PL.uid(), date: PL.today(), name: 'Обід: курка з рисом і овочами', kcal: 580, protein: 42, fat: 14, carbs: 68 },
      { id: PL.uid(), date: PL.daysAgo(1), name: 'Сніданок: сирники', kcal: 520, protein: 32, fat: 18, carbs: 50 }
    ];

    var andrii = PL.normalizeProfile({
      name: 'Андрій Мельник', phone: '+380 50 987 65 43', email: 'andrii.m@example.com',
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

    var maria = PL.normalizeProfile({
      name: 'Марія Шевчук', phone: '+380 93 555 12 34',
      sex: 'female', age: 31, height: 164, goal: 'maintain', activity: 1.375,
      goals: 'Повернутись у форму після пологів',
      notes: 'Перше заняття ще не проводили.'
    });

    S.clients = [olena, andrii, maria];

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
