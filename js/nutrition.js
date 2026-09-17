/* Раціон: денна норма (Міффлін — Сан-Жеор) і план харчування на тиждень */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  var GOAL_FACTOR = { lose: 0.85, maintain: 1, gain: 1.1 };
  var PROTEIN_PER_KG = { lose: 2, maintain: 1.8, gain: 1.8 };
  var FAT_PER_KG = 0.9;

  PL.calcNutrition = function (p) {
    if (!p.weight || !p.height || !p.age) return null;
    var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'female' ? -161 : 5);
    var tdee = bmr * (p.activity || 1.2);
    var kcal = Math.round(tdee * (GOAL_FACTOR[p.goal] || 1));
    var protein = Math.round(p.weight * (PROTEIN_PER_KG[p.goal] || 1.8));
    var fat = Math.round(p.weight * FAT_PER_KG);
    var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: kcal, protein: protein, fat: fat, carbs: carbs };
  };

  var MACROS = [['kcal', 'Калорії', 'ккал'], ['protein', 'Білки', 'г'], ['fat', 'Жири', 'г'], ['carbs', 'Вуглеводи', 'г']];

  var DAYS = [
    ['Пн', 'Понеділок'], ['Вт', 'Вівторок'], ['Ср', 'Середа'], ['Чт', 'Четвер'],
    ['Пт', 'Пʼятниця'], ['Сб', 'Субота'], ['Нд', 'Неділя']
  ];

  PL.views.nutrition = function (el, p) {
    var day = 0;

    // Тренеру важливо бачити не тільки грами, а й скільки це на кілограм ваги клієнта
    var perKg = function (grams) {
      if (!p.weight || grams == null) return '';
      return ' <span class="small muted">(' + PL.fmt(grams / p.weight, 2) + ' г/кг)</span>';
    };
    var kcalPerKg = function (kcal) {
      if (!p.weight || kcal == null) return '';
      return ' <span class="small muted">(' + PL.fmt(kcal / p.weight, 1) + ' ккал/кг)</span>';
    };

    el.innerHTML =
      '<div class="two">' +
        '<div class="panel"><h2>Розрахунок норми</h2>' +
          '<div class="grid-2">' +
            '<label class="field"><span>Стать</span><select class="inp" data-n="sex">' + PL.opts(PL.SEX, p.sex) + '</select></label>' +
            '<label class="field"><span>Вік, років</span><input class="inp" data-n="age" value="' + esc(p.age == null ? '' : p.age) + '" autocomplete="off"></label>' +
            '<label class="field"><span>Зріст, см</span><input class="inp" data-n="height" value="' + esc(p.height == null ? '' : p.height) + '" autocomplete="off"></label>' +
            '<label class="field"><span>Вага, кг</span><input class="inp" data-n="weight" value="' + esc(p.weight == null ? '' : p.weight) + '" autocomplete="off"></label>' +
            '<label class="field full"><span>Активність</span><select class="inp" data-n="activity">' + PL.opts(PL.ACTIVITY, p.activity) + '</select></label>' +
            '<label class="field full"><span>Ціль</span><select class="inp" data-n="goal">' + PL.opts(PL.GOALS, p.goal) + '</select></label>' +
          '</div>' +
          '<div data-preview style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="panel" data-target></div>' +
      '</div>' +
      '<div class="panel" data-week></div>';

    var $preview = el.querySelector('[data-preview]');
    var $target = el.querySelector('[data-target]');
    var $week = el.querySelector('[data-week]');

    var paintPreview = function () {
      var r = PL.calcNutrition(p);
      $preview.innerHTML = r
        ? '<div class="small muted">Базовий обмін ' + PL.fmt(r.bmr, 0) + ' ккал · з активністю ' + PL.fmt(r.tdee, 0) + ' ккал</div>' +
          '<div style="margin:8px 0 4px"><b>' + PL.fmt(r.kcal, 0) + ' ккал</b>' + kcalPerKg(r.kcal) + '</div>' +
          '<div style="margin-bottom:12px">Б ' + r.protein + ' г' + perKg(r.protein) +
            ' · Ж ' + r.fat + ' г' + perKg(r.fat) + ' · В ' + r.carbs + ' г' + perKg(r.carbs) + '</div>' +
          '<button class="btn primary" data-a="apply">Встановити як денну норму</button>'
        : '<div class="small muted">Заповніть вік, зріст і вагу — і норма розрахується.</div>';
    };

    var paintTarget = function () {
      var t = p.nutrition;
      $target.innerHTML = '<h2>Денна норма</h2>' + (t
        ? '<div class="grid-2">' + MACROS.map(function (m) {
            return '<label class="field"><span>' + m[1] + ', ' + m[2] + '</span>' +
              '<input class="inp" data-t="' + m[0] + '" value="' + esc(t[m[0]] == null ? '' : t[m[0]]) + '" autocomplete="off"></label>';
          }).join('') + '</div>' +
          '<div style="margin-top:12px">' +
            'На кілограм ваги: <b>' + (p.weight ? PL.fmt(PL.num(t.kcal) / p.weight, 1) + ' ккал' : '—') + '</b>' +
            (p.weight
              ? ' · Б ' + PL.fmt(PL.num(t.protein) / p.weight, 2) + ' · Ж ' + PL.fmt(PL.num(t.fat) / p.weight, 2) +
                ' · В ' + PL.fmt(PL.num(t.carbs) / p.weight, 2) + ' <span class="small muted">г/кг</span>'
              : ' <span class="small muted">— вкажіть вагу</span>') +
          '</div>' +
          '<div class="small muted" style="margin-top:10px">' + (t.manual ? 'Змінено вручну' : 'Розраховано') + ' ' + PL.fmtDate(t.date) + '. Значення можна підправити руками.</div>' +
          '<button class="btn danger sm" data-a="clear-target" style="margin-top:12px">Скинути норму</button>'
        : '<p class="muted">Норму ще не встановлено. Розрахуйте її в блоці ліворуч.</p>');
    };

    var dayMeals = function (i) {
      return p.plan.filter(function (m) { return m.day === i; });
    };

    var sumDay = function (i, key) {
      return dayMeals(i).reduce(function (s, m) { return s + (PL.num(m[key]) || 0); }, 0);
    };

    var paintWeek = function () {
      var t = p.nutrition;
      var meals = dayMeals(day);

      var tabs = DAYS.map(function (d, i) {
        var kcal = sumDay(i, 'kcal');
        var goal = t ? PL.num(t.kcal) : null;
        var diff = goal ? kcal - goal : null;
        return '<button class="day-tab' + (i === day ? ' on' : '') + '" data-day="' + i + '">' +
          '<b>' + d[0] + '</b>' +
          '<span>' + (kcal ? PL.fmt(kcal, 0) + ' ккал' : '—') + '</span>' +
          (diff != null && kcal
            ? '<span class="' + (Math.abs(diff) / goal > 0.1 ? 'off' : 'ok') + '">' + (diff > 0 ? '+' : '') + PL.fmt(diff, 0) + '</span>'
            : '<span>&nbsp;</span>') +
          '</button>';
      }).join('');

      var stat = function (key, label, unit) {
        var v = sumDay(day, key);
        var goal = t ? PL.num(t[key]) : null;
        var left = goal ? goal - v : null;
        return '<div class="stat"><span>' + label + '</span>' +
          '<b>' + PL.fmt(v, 0) + (goal ? ' <span class="small muted">/ ' + PL.fmt(goal, 0) + ' ' + unit + '</span>' : ' <span class="small muted">' + unit + '</span>') + '</b>' +
          (goal
            ? '<div class="bar"><i class="' + (v > goal ? 'over' : '') + '" style="width:' + Math.min(100, v / goal * 100).toFixed(1) + '%"></i></div>' +
              '<span>' + (left >= 0 ? 'Залишилось ' + PL.fmt(left, 0) : 'Перебір ' + PL.fmt(-left, 0)) + ' ' + unit + '</span>'
            : '') +
          '</div>';
      };

      $week.innerHTML =
        '<div class="row" style="margin-bottom:14px"><h2 style="margin:0">Раціон на тиждень</h2>' +
          '<span class="small muted">Приймання їжі вписуються вручну — облік по факту зручніше вести у FatSecret</span></div>' +
        '<div class="day-tabs">' + tabs + '</div>' +
        '<div class="row" style="margin:16px 0 14px"><h3 style="margin:0">' + DAYS[day][1] + '</h3><span class="spacer"></span>' +
          (meals.length
            ? '<button class="btn sm" data-a="copy-all">Скопіювати на всі дні</button>' +
              '<button class="btn sm danger" data-a="clear-day">Очистити день</button>'
            : '') +
        '</div>' +
        '<div class="stats" style="margin-bottom:18px">' + MACROS.map(function (m) { return stat(m[0], m[1], m[2]); }).join('') + '</div>' +
        '<table class="tbl"><thead><tr><th>Приймання їжі</th><th style="width:100px">Ккал</th>' +
          '<th style="width:90px">Б, г</th><th style="width:90px">Ж, г</th><th style="width:90px">В, г</th><th style="width:40px"></th></tr></thead><tbody>' +
        meals.map(function (m) {
          return '<tr data-meal="' + esc(m.id) + '"><td>' + esc(m.name) + '</td>' +
            '<td>' + PL.fmt(m.kcal, 0) + '</td><td>' + PL.fmt(m.protein) + '</td>' +
            '<td>' + PL.fmt(m.fat) + '</td><td>' + PL.fmt(m.carbs) + '</td>' +
            '<td><button class="icon-btn danger" data-a="meal-del" title="Видалити">✕</button></td></tr>';
        }).join('') +
        '<tr>' +
          '<td><input class="inp wide" data-mf="name" placeholder="Напр., Сніданок: вівсянка з бананом" autocomplete="off"></td>' +
          '<td><input class="inp wide" data-mf="kcal" autocomplete="off"></td>' +
          '<td><input class="inp wide" data-mf="protein" autocomplete="off"></td>' +
          '<td><input class="inp wide" data-mf="fat" autocomplete="off"></td>' +
          '<td><input class="inp wide" data-mf="carbs" autocomplete="off"></td>' +
          '<td><button class="btn primary sm" data-a="meal-add" title="Додати">+</button></td>' +
        '</tr></tbody></table>' +
        (meals.length ? '' : '<div class="small muted" style="margin-top:10px">На цей день нічого не заплановано.</div>');
    };

    var addMeal = function () {
      var field = function (k) { return $week.querySelector('[data-mf="' + k + '"]'); };
      var name = field('name').value.trim();
      if (!name) {
        PL.toast('Вкажіть назву приймання їжі');
        field('name').focus();
        return;
      }
      p.plan.push({
        id: PL.uid(), day: day, name: name,
        kcal: PL.num(field('kcal').value), protein: PL.num(field('protein').value),
        fat: PL.num(field('fat').value), carbs: PL.num(field('carbs').value)
      });
      PL.save();
      paintWeek();
      $week.querySelector('[data-mf="name"]').focus();
    };

    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.n) {
        var k = t.dataset.n;
        p[k] = (k === 'sex' || k === 'goal') ? t.value : (k === 'activity' ? parseFloat(t.value) : PL.num(t.value));
        PL.save();
        paintPreview();
        if (k === 'weight') { paintTarget(); }
      } else if (t.dataset.t && p.nutrition) {
        p.nutrition[t.dataset.t] = PL.num(t.value);
        p.nutrition.manual = true;
        p.nutrition.date = PL.today();
        PL.save();
        paintWeek();
      }
    });

    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.dataset.mf) { e.preventDefault(); addMeal(); }
    });

    el.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-day]');
      if (tab) { day = Number(tab.dataset.day); paintWeek(); return; }

      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.dataset.a;

      if (a === 'apply') {
        var r = PL.calcNutrition(p);
        if (!r) return;
        p.nutrition = Object.assign(r, { date: PL.today(), manual: false });
        PL.save(); paintTarget(); paintWeek();
        PL.toast('Денну норму встановлено');
      } else if (a === 'clear-target') {
        p.nutrition = null;
        PL.save(); paintTarget(); paintWeek();
      } else if (a === 'meal-add') {
        addMeal();
      } else if (a === 'meal-del') {
        var id = b.closest('[data-meal]').dataset.meal;
        p.plan = p.plan.filter(function (m) { return m.id !== id; });
        PL.save(); paintWeek();
      } else if (a === 'clear-day') {
        PL.confirm('Очистити ' + DAYS[day][1].toLowerCase() + '?', '', 'Очистити', function () {
          p.plan = p.plan.filter(function (m) { return m.day !== day; });
          PL.save(); paintWeek();
        });
      } else if (a === 'copy-all') {
        PL.confirm('Скопіювати цей день на всі?', 'Заплановане на інші дні тижня буде замінено.', 'Скопіювати', function () {
          var source = dayMeals(day);
          p.plan = source.slice();
          DAYS.forEach(function (d, i) {
            if (i === day) return;
            source.forEach(function (m) {
              p.plan.push(Object.assign({}, m, { id: PL.uid(), day: i }));
            });
          });
          PL.save(); paintWeek();
          PL.toast('Раціон скопійовано на тиждень');
        });
      }
    });

    paintPreview();
    paintTarget();
    paintWeek();
  };
})();
