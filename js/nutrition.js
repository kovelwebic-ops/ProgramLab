/* Калькулятор раціону: денна норма (Міффлін — Сан-Жеор) і щоденник прийомів їжі */
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

  PL.views.nutrition = function (el, p) {
    var date = PL.today();

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
      '<div class="panel" data-diary></div>';

    var $preview = el.querySelector('[data-preview]');
    var $target = el.querySelector('[data-target]');
    var $diary = el.querySelector('[data-diary]');

    var paintPreview = function () {
      var r = PL.calcNutrition(p);
      $preview.innerHTML = r
        ? '<div class="small muted">Базовий обмін ' + PL.fmt(r.bmr, 0) + ' ккал · з активністю ' + PL.fmt(r.tdee, 0) + ' ккал</div>' +
          '<div style="margin:8px 0 12px"><b>' + PL.fmt(r.kcal, 0) + ' ккал</b> · Б ' + r.protein + ' г · Ж ' + r.fat + ' г · В ' + r.carbs + ' г</div>' +
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
          '<div class="small muted" style="margin-top:12px">' + (t.manual ? 'Змінено вручну' : 'Розраховано') + ' ' + PL.fmtDate(t.date) + '. Значення можна підправити руками.</div>' +
          '<button class="btn danger sm" data-a="clear-target" style="margin-top:12px">Скинути норму</button>'
        : '<p class="muted">Норму ще не встановлено. Розрахуйте її в блоці ліворуч або впишіть значення після розрахунку.</p>');
    };

    var paintDiary = function () {
      var meals = p.meals.filter(function (m) { return m.date === date; });
      var t = p.nutrition;
      var sum = function (k) {
        return meals.reduce(function (s, m) { return s + (PL.num(m[k]) || 0); }, 0);
      };

      var stat = function (key, label, unit) {
        var v = sum(key);
        var goal = t ? PL.num(t[key]) : null;
        var left = goal ? goal - v : null;
        return '<div class="stat"><span>' + label + '</span>' +
          '<b>' + PL.fmt(v, 0) + (goal ? ' <span class="small muted">/ ' + PL.fmt(goal, 0) + ' ' + unit + '</span>' : ' <span class="small muted">' + unit + '</span>') + '</b>' +
          (goal
            ? '<div class="bar"><i class="' + (v > goal ? 'over' : '') + '" style="width:' + Math.min(100, goal ? v / goal * 100 : 0).toFixed(1) + '%"></i></div>' +
              '<span>' + (left >= 0 ? 'Залишилось ' + PL.fmt(left, 0) : 'Перебір ' + PL.fmt(-left, 0)) + ' ' + unit + '</span>'
            : '') +
          '</div>';
      };

      $diary.innerHTML =
        '<div class="row" style="margin-bottom:16px"><h2 style="margin:0">Щоденник харчування</h2><span class="spacer"></span>' +
          '<button class="btn sm" data-a="prev" title="Попередній день">←</button>' +
          '<input type="date" class="inp" data-date value="' + esc(date) + '">' +
          '<button class="btn sm" data-a="next" title="Наступний день">→</button>' +
          (date !== PL.today() ? '<button class="btn sm" data-a="today">Сьогодні</button>' : '') +
        '</div>' +
        '<div class="stats" style="margin-bottom:18px">' +
          MACROS.map(function (m) { return stat(m[0], m[1], m[2]); }).join('') +
        '</div>' +
        '<table class="tbl"><thead><tr><th>Прийом їжі</th><th style="width:100px">Ккал</th>' +
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
          '<td><button class="btn primary sm" data-a="meal-add" title="Додати запис">+</button></td>' +
        '</tr></tbody></table>' +
        (meals.length ? '' : '<div class="small muted" style="margin-top:10px">За цей день записів ще немає. Калорії та БЖУ вписуються вручну — бази продуктів у MVP немає.</div>');
    };

    var addMeal = function () {
      var field = function (k) { return $diary.querySelector('[data-mf="' + k + '"]'); };
      var name = field('name').value.trim();
      if (!name) {
        PL.toast('Вкажіть назву прийому їжі');
        field('name').focus();
        return;
      }
      p.meals.push({
        id: PL.uid(), date: date, name: name,
        kcal: PL.num(field('kcal').value), protein: PL.num(field('protein').value),
        fat: PL.num(field('fat').value), carbs: PL.num(field('carbs').value)
      });
      PL.save();
      paintDiary();
      $diary.querySelector('[data-mf="name"]').focus();
    };

    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.n) {
        var k = t.dataset.n;
        p[k] = (k === 'sex' || k === 'goal') ? t.value : (k === 'activity' ? parseFloat(t.value) : PL.num(t.value));
        PL.save();
        paintPreview();
      } else if (t.dataset.t && p.nutrition) {
        p.nutrition[t.dataset.t] = PL.num(t.value);
        p.nutrition.manual = true;
        p.nutrition.date = PL.today();
        PL.save();
        paintDiary();
      }
    });

    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-date]')) {
        date = e.target.value || PL.today();
        paintDiary();
      }
    });

    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.dataset.mf) { e.preventDefault(); addMeal(); }
    });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.dataset.a;

      if (a === 'apply') {
        var r = PL.calcNutrition(p);
        if (!r) return;
        p.nutrition = Object.assign(r, { date: PL.today(), manual: false });
        PL.save(); paintTarget(); paintDiary();
        PL.toast('Денну норму встановлено');
      } else if (a === 'clear-target') {
        p.nutrition = null;
        PL.save(); paintTarget(); paintDiary();
      } else if (a === 'prev' || a === 'next') {
        date = PL.shiftDate(date, a === 'prev' ? -1 : 1);
        paintDiary();
      } else if (a === 'today') {
        date = PL.today();
        paintDiary();
      } else if (a === 'meal-del') {
        var id = b.closest('[data-meal]').dataset.meal;
        p.meals = p.meals.filter(function (m) { return m.id !== id; });
        PL.save(); paintDiary();
      } else if (a === 'meal-add') {
        addMeal();
      }
    });

    paintPreview();
    paintTarget();
    paintDiary();
  };
})();
