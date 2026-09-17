/* Білдер програм: два режими (культуризм / пауерліфтинг) на спільній моделі,
   блоки роботи, % від ПМ, розрахунки тоннажу й КПШ, обмеження профілю */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  PL.KINDS = { bodybuilding: 'Культуризм', powerlifting: 'Пауерліфтинг' };
  PL.LOADS = { light: 'Легке', medium: 'Середнє', heavy: 'Важке' };
  PL.LIFT_GROUPS = { squat: 'ПР — присід', bench: 'ЖМ — жим', deadlift: 'ТГ — тяга', gpp: 'ЗФП' };

  var COMPETITION = { 'back-squat': 'squat', 'bench-press': 'bench', 'deadlift': 'deadlift' };
  var guessGroup = function (ex) { return ex && COMPETITION[ex.id] ? COMPETITION[ex.id] : 'gpp'; };

  /* ── Модель ───────────────────────────────────────────────── */

  PL.programBlock = function (o) {
    o = o || {};
    return {
      id: PL.uid(),
      weight: o.weight == null ? null : o.weight,
      pct: o.pct == null ? null : o.pct,
      reps: o.reps == null ? '' : o.reps,
      sets: o.sets == null ? '' : o.sets,
      rest: o.rest == null ? null : o.rest
    };
  };

  PL.programItem = function (ex, sets, reps, o) {
    o = o || {};
    return {
      id: PL.uid(), exId: ex.id, name: ex.name,
      group: o.group || guessGroup(ex), load: o.load || 'medium', note: '',
      blocks: [PL.programBlock({
        sets: sets == null ? 3 : sets,
        reps: reps == null ? '10' : reps,
        weight: o.weight, pct: o.pct, rest: o.rest
      })]
    };
  };

  PL.itemName = function (it) {
    var ex = PL.exById(it.exId);
    return ex ? ex.name : (it.name || 'Вправа') + ' (видалена)';
  };

  PL.maxOf = function (p, exId) {
    var v = PL.num(p.maxes[exId]);
    return v && v > 0 ? v : null;
  };

  /* ── Розрахунки ───────────────────────────────────────────── */

  // Повтори можуть бути діапазоном («6-8») — у розрахунок іде перше число
  var repsNum = function (v) {
    var n = PL.num(v);
    return n && n > 0 ? n : 0;
  };

  var round05 = function (v) { return Math.round(v * 2) / 2; };

  PL.syncFromPct = function (b, max) {
    var pct = PL.num(b.pct);
    if (max && pct) b.weight = round05(max * pct / 100);
  };

  PL.syncFromWeight = function (b, max) {
    var w = PL.num(b.weight);
    if (max && w) b.pct = Math.round(w / max * 100);
  };

  var blockStats = function (b) {
    var sets = PL.num(b.sets) || 0;
    var lifts = repsNum(b.reps) * sets;
    return {
      lifts: lifts,
      tonnage: (PL.num(b.weight) || 0) * lifts,
      seconds: sets * (PL.num(b.rest) || 0)
    };
  };

  PL.itemStats = function (it, p) {
    var t = { lifts: 0, tonnage: 0, seconds: 0 };
    it.blocks.forEach(function (b) {
      var s = blockStats(b);
      t.lifts += s.lifts;
      t.tonnage += s.tonnage;
      t.seconds += s.seconds;
    });
    t.avg = t.lifts ? t.tonnage / t.lifts : null;
    var max = PL.maxOf(p, it.exId);
    t.ri = t.avg && max ? t.avg / max * 100 : null;
    return t;
  };

  // ВІ по дню й тижню — середнє, зважене за КПШ: інакше один розминковий підхід
  // важив би стільки ж, скільки важка робота
  PL.sumStats = function (items, p) {
    var t = { lifts: 0, tonnage: 0, seconds: 0 };
    var riSum = 0, riLifts = 0;
    items.forEach(function (it) {
      var s = PL.itemStats(it, p);
      t.lifts += s.lifts;
      t.tonnage += s.tonnage;
      t.seconds += s.seconds;
      if (s.ri != null) { riSum += s.ri * s.lifts; riLifts += s.lifts; }
    });
    t.avg = t.lifts ? t.tonnage / t.lifts : null;
    t.ri = riLifts ? riSum / riLifts : null;
    return t;
  };

  var statsLine = function (t) {
    return '<span class="stats-line small">' +
      'Тоннаж <b>' + PL.fmt(t.tonnage, 0) + '</b> кг · КПШ <b>' + PL.fmt(t.lifts, 0) + '</b>' +
      (t.avg ? ' · сер. вага <b>' + PL.fmt(t.avg, 1) + '</b> кг' : '') +
      (t.ri ? ' · ВІ <b>' + PL.fmt(t.ri, 0) + '%</b>' : '') +
      (t.seconds ? ' · <b>' + Math.round(t.seconds / 60) + '</b> хв' : '') +
      '</span>';
  };

  /* ── Пресети ──────────────────────────────────────────────── */

  // Виключену вправу міняємо на дозволену з тієї ж групи м'язів
  PL.buildFromPreset = function (presetId, p) {
    var preset = null;
    PL.PRESETS.forEach(function (x) { if (x.id === presetId) preset = x; });
    if (!preset) return null;

    var report = { replaced: 0, skipped: 0 };

    var days = preset.days.map(function (d) {
      var planned = d.items.map(function (row) { return row.ex; });
      var used = {};
      var items = [];

      d.items.forEach(function (row) {
        var ex = PL.exById(row.ex);
        if (!ex || PL.exclusionReason(ex, p)) {
          var alt = null;
          if (ex) {
            PL.S.exercises.forEach(function (cand) {
              if (alt || cand.muscle !== ex.muscle) return;
              if (used[cand.id] || planned.indexOf(cand.id) >= 0) return;
              if (PL.exclusionReason(cand, p)) return;
              alt = cand;
            });
          }
          if (!alt) { report.skipped++; return; }
          ex = alt;
          report.replaced++;
        }
        used[ex.id] = true;
        var item = PL.programItem(ex, row.sets, row.reps, { load: row.load, pct: row.pct, rest: row.rest });
        PL.syncFromPct(item.blocks[0], PL.maxOf(p, ex.id));
        items.push(item);
      });

      return { id: PL.uid(), name: d.name, items: items };
    });

    return {
      program: { name: preset.name, kind: preset.kind || 'bodybuilding', days: days },
      report: report
    };
  };

  /* ── Обмеження (спільний блок для профілю й програми) ──────── */

  PL.restrictionsHtml = function (p) {
    var x = p.exclusions;

    var chips = function (map, key) {
      return '<div class="chips">' + Object.keys(map).map(function (k) {
        return '<span class="chip' + (x[key].indexOf(k) >= 0 ? ' on' : '') + '" data-a="toggle-ex" data-key="' + key + '" data-val="' + esc(k) + '">' +
          esc(map[k]) + '</span>';
      }).join('') + '</div>';
    };

    var manual = x.exercises.map(function (id) {
      var ex = PL.exById(id);
      return '<span class="chip on" data-a="unexclude" data-val="' + esc(id) + '">' +
        esc(ex ? ex.name : 'Видалена вправа') + ' ✕</span>';
    }).join('');

    return '<div class="panel"><h2>Обмеження та виключення</h2>' +
      '<p class="small muted">Позначене ховається з пошуку вправ і не потрапляє в пресети. Натисніть ще раз, щоб зняти.</p>' +
      '<div class="field" style="margin-bottom:12px"><span>Травми — виключити навантаження на</span>' + chips(PL.JOINTS, 'joints') + '</div>' +
      '<div class="field" style="margin-bottom:12px"><span>Групи м’язів</span>' + chips(PL.MUSCLES, 'muscles') + '</div>' +
      '<div class="field" style="margin-bottom:12px"><span>Обладнання</span>' + chips(PL.EQUIPMENT, 'equipment') + '</div>' +
      '<div class="field"><span>Виключені вручну вправи</span>' +
        (manual ? '<div class="chips">' + manual + '</div>'
          : '<span class="small muted">Немає. Вправу можна виключити кнопкою «Виключити» в програмі.</span>') +
      '</div></div>';
  };

  PL.handleRestrictionClick = function (b, p) {
    if (b.dataset.a === 'toggle-ex') {
      var arr = p.exclusions[b.dataset.key];
      var i = arr.indexOf(b.dataset.val);
      if (i < 0) arr.push(b.dataset.val); else arr.splice(i, 1);
      PL.save();
      return true;
    }
    if (b.dataset.a === 'unexclude') {
      p.exclusions.exercises = p.exclusions.exercises.filter(function (id) { return id !== b.dataset.val; });
      PL.save();
      return true;
    }
    return false;
  };

  /* ── Розмітка ─────────────────────────────────────────────── */

  var num = function (v) { return v == null ? '' : v; };

  var presetsHtml = function () {
    return '<div class="grid">' + PL.PRESETS.map(function (x) {
      return '<div class="panel" style="margin:0"><h3>' + esc(x.name) + '</h3>' +
        '<div style="margin-bottom:6px"><span class="tag">' + esc(PL.KINDS[x.kind]) + '</span></div>' +
        '<div class="small muted" style="margin-bottom:12px">' + esc(x.note) + '</div>' +
        '<button class="btn" data-a="preset" data-preset="' + esc(x.id) + '">Взяти за основу</button></div>';
    }).join('') + '</div>';
  };

  var emptyHtml = function (p) {
    return '<div class="panel"><h2>Програми ще немає</h2>' +
      '<p class="muted">Створіть з нуля або візьміть готову схему. Вправи, що суперечать обмеженням нижче, у пресет не потраплять — їх замінить дозволена вправа з тієї ж групи м’язів.</p>' +
      '<div class="row"><button class="btn primary" data-a="scratch" data-kind-new="bodybuilding">Створити для культуризму</button>' +
        '<button class="btn" data-a="scratch" data-kind-new="powerlifting">Створити для пауерліфтингу</button></div></div>' +
      '<div class="panel"><h2>Готові схеми</h2>' + presetsHtml() + '</div>' +
      PL.restrictionsHtml(p);
  };

  var maxesHtml = function (p, pr) {
    var ids = [];
    pr.days.forEach(function (d) {
      d.items.forEach(function (it) { if (ids.indexOf(it.exId) < 0) ids.push(it.exId); });
    });
    if (!ids.length) return '';

    return '<div class="panel"><h2>Персональні максимуми</h2>' +
      '<p class="small muted">Вписуються руками. Від ПМ рахуються % від максимуму й ВІ — відносна інтенсивність.</p>' +
      '<div class="grid">' + ids.map(function (id) {
        var ex = PL.exById(id);
        return '<label class="field"><span>' + esc(ex ? ex.name : 'Видалена вправа') + '</span>' +
          '<input class="inp" data-max="' + esc(id) + '" value="' + esc(num(p.maxes[id])) + '" placeholder="кг" autocomplete="off"></label>';
      }).join('') + '</div></div>';
  };

  var itemActions = function (p, it, i, count, ex) {
    return '<button class="icon-btn" data-a="up" title="Вище"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="icon-btn" data-a="down" title="Нижче"' + (i === count - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button class="icon-btn" data-a="swap" title="Замінити вправу">Замінити</button>' +
      (ex && p.exclusions.exercises.indexOf(ex.id) < 0
        ? '<button class="icon-btn" data-a="exclude" title="Прибрати й більше не пропонувати">Виключити</button>' : '') +
      '<button class="icon-btn danger" data-a="rm" title="Прибрати з дня">✕</button>';
  };

  var blockInputs = function (b, withRest) {
    var f = function (key, cls, ph) {
      return '<input class="inp ' + cls + '" data-b="' + key + '" data-block="' + esc(b.id) + '" value="' +
        esc(num(b[key])) + '" placeholder="' + ph + '" autocomplete="off">';
    };
    return f('weight', 'sm', 'кг') + f('pct', 'sm', '%') +
      '<span class="muted">×</span>' + f('reps', 'sm', 'пов') +
      '<span class="muted">×</span>' + f('sets', 'sm', 'під') +
      (withRest ? '<span class="small muted">відп.</span>' + f('rest', 'sm', 'сек') : '');
  };

  // Пауерліфтинг: вправа — картка з кількома блоками роботи й розрахунками
  var pwItemHtml = function (p, d, it, i) {
    var ex = PL.exById(it.exId);
    var why = ex ? PL.exclusionReason(ex, p) : 'вправу видалено з бази';
    var t = PL.itemStats(it, p);

    return '<div class="pw-item' + (why ? ' is-excluded' : '') + '" data-item="' + esc(it.id) + '">' +
      '<div class="pw-head">' +
        '<span class="muted small">' + (i + 1) + '</span>' +
        '<select class="inp sm" data-i="load" title="Навантаження">' + PL.opts(PL.LOADS, it.load) + '</select>' +
        '<select class="inp" data-i="group" title="Група руху">' + PL.opts(PL.LIFT_GROUPS, it.group) + '</select>' +
        '<b>' + esc(ex ? ex.name : it.name) + '</b>' +
        (why ? '<span class="tag warn">' + esc(why) + '</span>' : '') +
        '<span class="spacer"></span>' + statsLine(t) +
        itemActions(p, it, i, d.items.length, ex) +
      '</div>' +
      '<div class="pw-blocks">' +
        it.blocks.map(function (b) {
          return '<div class="pw-block" data-block="' + esc(b.id) + '">' + blockInputs(b, true) +
            (it.blocks.length > 1 ? '<button class="icon-btn danger" data-a="block-del" title="Прибрати блок">✕</button>' : '') +
            '</div>';
        }).join('') +
        '<button class="btn sm" data-a="block-add">+ блок</button>' +
      '</div>' +
      '<input class="inp wide" data-i="note" value="' + esc(it.note || '') + '" autocomplete="off" placeholder="Коментар: акценти, техніка, самопочуття">' +
      '</div>';
  };

  // Культуризм: компактна таблиця, один блок на вправу
  var bbRowHtml = function (p, d, it, i) {
    var ex = PL.exById(it.exId);
    var why = ex ? PL.exclusionReason(ex, p) : 'вправу видалено з бази';
    var b = it.blocks[0];
    var f = function (key, cls, ph) {
      return '<input class="inp ' + cls + '" data-b="' + key + '" data-block="' + esc(b.id) + '" value="' +
        esc(num(b[key])) + '" placeholder="' + ph + '" autocomplete="off">';
    };

    return '<tr data-item="' + esc(it.id) + '"' + (why ? ' class="is-excluded"' : '') + '>' +
      '<td class="muted">' + (i + 1) + '</td>' +
      '<td>' + esc(ex ? ex.name : it.name) + (why ? ' <span class="tag warn">' + esc(why) + '</span>' : '') +
        (it.blocks.length > 1
          ? ' <span class="tag">ще ' + (it.blocks.length - 1) + ' ' +
            PL.plural(it.blocks.length - 1, 'блок', 'блоки', 'блоків') + ' — видно в режимі пауерліфтингу</span>'
          : '') +
        (ex ? '<div>' + PL.exMeta(ex) + '</div>' : '') + '</td>' +
      '<td>' + f('sets', 'sm', 'під') + '</td>' +
      '<td>' + f('reps', 'md', 'пов') + '</td>' +
      '<td>' + f('weight', 'md', 'кг') + '</td>' +
      '<td>' + f('pct', 'sm', '%') + '</td>' +
      '<td class="actions">' + itemActions(p, it, i, d.items.length, ex) + '</td></tr>';
  };

  var dayHtml = function (p, pr, d, di) {
    var isPw = pr.kind === 'powerlifting';
    var body;

    if (!d.items.length) {
      body = '<div class="empty small">У цьому дні ще немає вправ</div>';
    } else if (isPw) {
      body = d.items.map(function (it, i) { return pwItemHtml(p, d, it, i); }).join('');
    } else {
      body = '<table class="tbl"><thead><tr><th style="width:34px">#</th><th>Вправа</th>' +
        '<th style="width:84px">Підходи</th><th style="width:100px">Повтори</th>' +
        '<th style="width:100px">Вага, кг</th><th style="width:74px">% ПМ</th>' +
        '<th style="width:250px"></th></tr></thead><tbody>' +
        d.items.map(function (it, i) { return bbRowHtml(p, d, it, i); }).join('') +
        '</tbody></table>';
    }

    return '<div class="day" data-day="' + esc(d.id) + '">' +
      '<div class="day-head">' +
        '<input class="inp" data-d="name" value="' + esc(d.name) + '" autocomplete="off">' +
        (isPw
          ? statsLine(PL.sumStats(d.items, p))
          : '<span class="small muted">' + d.items.length + ' ' + PL.plural(d.items.length, 'вправа', 'вправи', 'вправ') + '</span>') +
        '<span class="spacer"></span>' +
        '<button class="icon-btn" data-a="day-up" title="Вище"' + (di === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="icon-btn" data-a="day-down" title="Нижче"' + (di === pr.days.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="icon-btn danger" data-a="day-del">Видалити день</button>' +
      '</div>' +
      '<div class="day-body">' + body +
        '<button class="btn sm" data-a="add" style="margin-top:10px">+ Додати вправу</button>' +
      '</div></div>';
  };

  var programHtml = function (p, pr) {
    var all = [];
    var conflicts = 0;
    pr.days.forEach(function (d) {
      d.items.forEach(function (it) {
        all.push(it);
        var ex = PL.exById(it.exId);
        if (!ex || PL.exclusionReason(ex, p)) conflicts++;
      });
    });

    return '<div class="panel">' +
        '<div class="row">' +
          '<label class="field" style="flex:1"><span>Назва програми</span>' +
            '<input class="inp" data-p="name" value="' + esc(pr.name) + '" autocomplete="off"></label>' +
          '<div class="field"><span>Тип програми</span>' +
            '<div class="mode-switch" style="margin:0;width:260px">' + Object.keys(PL.KINDS).map(function (k) {
              return '<button data-kind="' + k + '"' + (pr.kind === k ? ' class="on"' : '') + '>' + PL.KINDS[k] + '</button>';
            }).join('') + '</div></div>' +
          '<button class="btn danger" data-a="reset" style="align-self:flex-end">Видалити програму</button>' +
        '</div>' +
        (pr.kind === 'powerlifting'
          ? '<div style="margin-top:12px">За тиждень: ' + statsLine(PL.sumStats(all, p)) + '</div>'
          : '<div class="small muted" style="margin-top:12px">Вага і % від ПМ перераховуються одне з одного — заповніть ПМ нижче.</div>') +
        (conflicts ? '<div class="notice">У програмі ' + conflicts + ' ' +
          PL.plural(conflicts, 'вправа', 'вправи', 'вправ') + ', що суперечать обмеженням — замініть або приберіть їх.</div>' : '') +
      '</div>' +
      (pr.days.length ? pr.days.map(function (d, di) { return dayHtml(p, pr, d, di); }).join('') : '<div class="panel empty">Тренувальних днів немає</div>') +
      '<div class="row" style="margin-bottom:16px"><button class="btn" data-a="day-add">+ Додати тренувальний день</button></div>' +
      maxesHtml(p, pr) +
      PL.restrictionsHtml(p);
  };

  /* ── Вигляд ───────────────────────────────────────────────── */

  PL.views.program = function (el, p) {
    var paint = function () {
      el.innerHTML = p.program ? programHtml(p, p.program) : emptyHtml(p);
    };

    var findDay = function (pr, id) {
      var found = null;
      pr.days.forEach(function (d) { if (d.id === id) found = d; });
      return found;
    };
    var findItem = function (day, id) {
      var found = null;
      day.items.forEach(function (it) { if (it.id === id) found = it; });
      return found;
    };
    var findBlock = function (item, id) {
      var found = null;
      item.blocks.forEach(function (b) { if (b.id === id) found = b; });
      return found;
    };

    // Знаходить вправу й блок, до яких належить поле
    var locate = function (t) {
      var pr = p.program;
      if (!pr) return null;
      var dayEl = t.closest('[data-day]');
      var itemEl = t.closest('[data-item]');
      if (!dayEl || !itemEl) return null;
      var day = findDay(pr, dayEl.dataset.day);
      if (!day) return null;
      var item = findItem(day, itemEl.dataset.item);
      if (!item) return null;
      return { day: day, item: item, block: t.dataset.block ? findBlock(item, t.dataset.block) : null };
    };

    el.addEventListener('input', function (e) {
      var t = e.target;
      var pr = p.program;
      if (!pr) return;

      if (t.dataset.p === 'name') { pr.name = t.value; PL.save(); return; }
      if (t.dataset.max) { p.maxes[t.dataset.max] = PL.num(t.value); PL.save(); return; }

      var dayEl = t.closest('[data-day]');
      if (!dayEl) return;
      if (t.dataset.d === 'name') {
        var day = findDay(pr, dayEl.dataset.day);
        if (day) { day.name = t.value; PL.save(); }
        return;
      }

      var at = locate(t);
      if (!at) return;
      if (t.dataset.i) { at.item[t.dataset.i] = t.value; PL.save(); return; }
      if (t.dataset.b && at.block) {
        at.block[t.dataset.b] = t.dataset.b === 'reps' ? t.value : PL.num(t.value);
        PL.save();
      }
    });

    // Похідні числа (вага ↔ %, тоннаж, КПШ) оновлюємо на change, а не на кожну
    // натиснуту клавішу — інакше перемальовування забирало б фокус із поля
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (!p.program) return;

      // Змінився ПМ — плани пишуться у відсотках, тож ваги перераховуємо за ними
      if (t.dataset.max) {
        var exId = t.dataset.max;
        var max = PL.maxOf(p, exId);
        p.program.days.forEach(function (d) {
          d.items.forEach(function (it) {
            if (it.exId !== exId) return;
            it.blocks.forEach(function (bl) {
              if (PL.num(bl.pct)) PL.syncFromPct(bl, max);
              else PL.syncFromWeight(bl, max);
            });
          });
        });
        PL.save();
        paint();
        return;
      }

      var at = locate(t);
      if (!at) return;

      if (t.dataset.b && at.block) {
        var max = PL.maxOf(p, at.item.exId);
        if (t.dataset.b === 'weight') PL.syncFromWeight(at.block, max);
        if (t.dataset.b === 'pct') PL.syncFromPct(at.block, max);
        PL.save();
        paint();
        return;
      }
      if (t.dataset.i === 'load' || t.dataset.i === 'group') paint();
    });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a], [data-kind]');
      if (!b || b.disabled) return;

      if (b.dataset.kind) {
        if (p.program && p.program.kind !== b.dataset.kind) {
          p.program.kind = b.dataset.kind;
          PL.save();
          paint();
        }
        return;
      }

      if (PL.handleRestrictionClick(b, p)) { paint(); return; }

      var a = b.dataset.a;

      if (a === 'scratch') {
        p.program = {
          name: b.dataset.kindNew === 'powerlifting' ? 'Мезоцикл' : 'Програма',
          kind: b.dataset.kindNew,
          days: [{ id: PL.uid(), name: 'День 1', items: [] }]
        };
        PL.save(); paint();
        return;
      }

      if (a === 'preset') {
        var built = PL.buildFromPreset(b.dataset.preset, p);
        if (!built) return;
        p.program = built.program;
        PL.save(); paint();
        var notes = [];
        if (built.report.replaced) notes.push('замінено ' + built.report.replaced);
        if (built.report.skipped) notes.push('пропущено ' + built.report.skipped);
        PL.toast('Програму створено' + (notes.length ? ' (через обмеження: ' + notes.join(', ') + ')' : ''));
        return;
      }

      var pr = p.program;
      if (!pr) return;

      if (a === 'reset') {
        PL.confirm('Видалити програму «' + pr.name + '»?', 'Усі дні та вправи зникнуть. Історія прогресу залишиться.', 'Видалити', function () {
          p.program = null; PL.save(); paint();
        });
        return;
      }

      if (a === 'day-add') {
        pr.days.push({ id: PL.uid(), name: 'День ' + (pr.days.length + 1), items: [] });
        PL.save(); paint();
        return;
      }

      var dayEl = b.closest('[data-day]');
      if (!dayEl) return;
      var di = -1;
      pr.days.forEach(function (d, i) { if (d.id === dayEl.dataset.day) di = i; });
      var day = pr.days[di];
      if (!day) return;

      if (a === 'day-del') {
        var drop = function () { pr.days.splice(di, 1); PL.save(); paint(); };
        if (day.items.length) {
          PL.confirm('Видалити «' + day.name + '»?', 'У дні ' + day.items.length + ' ' +
            PL.plural(day.items.length, 'вправа', 'вправи', 'вправ') + '.', 'Видалити', drop);
        } else drop();
        return;
      }

      if (a === 'day-up' || a === 'day-down') {
        if (PL.move(pr.days, di, a === 'day-up' ? -1 : 1)) { PL.save(); paint(); }
        return;
      }

      if (a === 'add') {
        PL.pickExercise({
          profile: p,
          title: 'Додати вправу — ' + day.name,
          onPick: function (ex) { day.items.push(PL.programItem(ex)); PL.save(); paint(); }
        });
        return;
      }

      var itemEl = b.closest('[data-item]');
      if (!itemEl) return;
      var ii = -1;
      day.items.forEach(function (it, i) { if (it.id === itemEl.dataset.item) ii = i; });
      var item = day.items[ii];
      if (!item) return;

      if (a === 'up' || a === 'down') {
        if (PL.move(day.items, ii, a === 'up' ? -1 : 1)) { PL.save(); paint(); }
      } else if (a === 'rm') {
        day.items.splice(ii, 1); PL.save(); paint();
      } else if (a === 'block-add') {
        var last = item.blocks[item.blocks.length - 1];
        item.blocks.push(PL.programBlock({ reps: last.reps, sets: last.sets, rest: last.rest }));
        PL.save(); paint();
      } else if (a === 'block-del') {
        var blockEl = b.closest('[data-block]');
        if (blockEl && item.blocks.length > 1) {
          item.blocks = item.blocks.filter(function (x) { return x.id !== blockEl.dataset.block; });
          PL.save(); paint();
        }
      } else if (a === 'exclude') {
        if (p.exclusions.exercises.indexOf(item.exId) < 0) p.exclusions.exercises.push(item.exId);
        var label = PL.itemName(item);
        day.items.splice(ii, 1);
        PL.save(); paint();
        PL.toast('«' + label + '» більше не пропонується для цього профілю');
      } else if (a === 'swap') {
        var cur = PL.exById(item.exId);
        PL.pickExercise({
          profile: p,
          single: true,
          muscle: cur ? cur.muscle : '',
          title: 'Замінити «' + PL.itemName(item) + '»',
          onPick: function (ex) {
            item.exId = ex.id;
            item.name = ex.name;
            item.group = guessGroup(ex);
            PL.save(); paint();
          }
        });
      }
    });

    paint();
  };
})();
