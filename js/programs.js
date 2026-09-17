/* Білдер програм: пресети, дні, вправи, обмеження профілю */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  PL.programItem = function (ex, sets, reps) {
    return { id: PL.uid(), exId: ex.id, name: ex.name, sets: sets == null ? 3 : sets, reps: reps == null ? '10' : reps, weight: '' };
  };

  PL.itemName = function (it) {
    var ex = PL.exById(it.exId);
    return ex ? ex.name : (it.name || 'Вправа') + ' (видалена)';
  };

  // Пресет підганяється під обмеження: виключену вправу міняємо на дозволену з тієї ж групи м'язів
  PL.buildFromPreset = function (presetId, p) {
    var preset = null;
    PL.PRESETS.forEach(function (x) { if (x.id === presetId) preset = x; });
    if (!preset) return null;

    var report = { replaced: 0, skipped: 0 };

    var days = preset.days.map(function (d) {
      var planned = d.items.map(function (row) { return row[0]; });
      var items = [];
      var used = {};

      d.items.forEach(function (row) {
        var ex = PL.exById(row[0]);
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
        items.push(PL.programItem(ex, row[1], row[2]));
      });

      return { id: PL.uid(), name: d.name, items: items };
    });

    return { program: { name: preset.name, days: days }, report: report };
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

  // Повертає true, якщо клік був по блоку обмежень і його вже опрацьовано
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

  /* ── Вигляд програми ──────────────────────────────────────── */

  var presetsHtml = function () {
    return '<div class="grid">' + PL.PRESETS.map(function (x) {
      return '<div class="panel" style="margin:0"><h3>' + esc(x.name) + '</h3>' +
        '<div class="small muted" style="margin-bottom:12px">' + esc(x.note) + '</div>' +
        '<button class="btn" data-a="preset" data-preset="' + esc(x.id) + '">Взяти за основу</button></div>';
    }).join('') + '</div>';
  };

  var emptyHtml = function (p) {
    return '<div class="panel"><h2>Програми ще немає</h2>' +
      '<p class="muted">Створіть з нуля або візьміть готову схему. Вправи, що суперечать обмеженням нижче, у пресет не потраплять — їх замінить дозволена вправа з тієї ж групи м’язів.</p>' +
      '<button class="btn primary" data-a="scratch">Створити з нуля</button></div>' +
      '<div class="panel"><h2>Готові схеми</h2>' + presetsHtml() + '</div>' +
      PL.restrictionsHtml(p);
  };

  var itemRow = function (p, d, it, i) {
    var ex = PL.exById(it.exId);
    var why = ex ? PL.exclusionReason(ex, p) : 'вправу видалено з бази';
    var excludedManually = ex && p.exclusions.exercises.indexOf(ex.id) >= 0;

    return '<tr data-item="' + esc(it.id) + '"' + (why ? ' class="is-excluded"' : '') + '>' +
      '<td class="muted">' + (i + 1) + '</td>' +
      '<td>' + esc(ex ? ex.name : it.name) + (why ? ' <span class="tag warn">' + esc(why) + '</span>' : '') +
        (ex ? '<div>' + PL.exMeta(ex) + '</div>' : '') + '</td>' +
      '<td><input class="inp sm" data-i="sets" value="' + esc(it.sets) + '" autocomplete="off"></td>' +
      '<td><input class="inp md" data-i="reps" value="' + esc(it.reps) + '" autocomplete="off"></td>' +
      '<td><input class="inp md" data-i="weight" value="' + esc(it.weight) + '" autocomplete="off"></td>' +
      '<td class="actions">' +
        '<button class="icon-btn" data-a="up" title="Вище"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="icon-btn" data-a="down" title="Нижче"' + (i === d.items.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="icon-btn" data-a="swap" title="Замінити вправу">Замінити</button>' +
        (ex && !excludedManually ? '<button class="icon-btn" data-a="exclude" title="Прибрати й більше не пропонувати">Виключити</button>' : '') +
        '<button class="icon-btn danger" data-a="rm" title="Прибрати з дня">✕</button>' +
      '</td></tr>';
  };

  var dayHtml = function (p, pr, d, di) {
    return '<div class="day" data-day="' + esc(d.id) + '">' +
      '<div class="day-head">' +
        '<input class="inp" data-d="name" value="' + esc(d.name) + '" autocomplete="off">' +
        '<span class="small muted">' + d.items.length + ' ' + PL.plural(d.items.length, 'вправа', 'вправи', 'вправ') + '</span>' +
        '<span class="spacer"></span>' +
        '<button class="icon-btn" data-a="day-up" title="Вище"' + (di === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="icon-btn" data-a="day-down" title="Нижче"' + (di === pr.days.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="icon-btn danger" data-a="day-del">Видалити день</button>' +
      '</div>' +
      '<div class="day-body">' +
        (d.items.length
          ? '<table class="tbl"><thead><tr><th style="width:34px">#</th><th>Вправа</th>' +
            '<th style="width:88px">Підходи</th><th style="width:110px">Повтори</th><th style="width:110px">Вага, кг</th>' +
            '<th style="width:250px"></th></tr></thead><tbody>' +
            d.items.map(function (it, i) { return itemRow(p, d, it, i); }).join('') +
            '</tbody></table>'
          : '<div class="empty small">У цьому дні ще немає вправ</div>') +
        '<button class="btn sm" data-a="add" style="margin-top:10px">+ Додати вправу</button>' +
      '</div></div>';
  };

  var programHtml = function (p, pr) {
    var conflicts = 0;
    pr.days.forEach(function (d) {
      d.items.forEach(function (it) {
        var ex = PL.exById(it.exId);
        if (!ex || PL.exclusionReason(ex, p)) conflicts++;
      });
    });

    return '<div class="panel"><div class="row">' +
        '<label class="field" style="flex:1"><span>Назва програми</span>' +
          '<input class="inp" data-p="name" value="' + esc(pr.name) + '" autocomplete="off"></label>' +
        '<button class="btn danger" data-a="reset" style="align-self:flex-end">Видалити програму</button></div>' +
        (conflicts ? '<div class="notice">У програмі ' + conflicts + ' ' +
          PL.plural(conflicts, 'вправа', 'вправи', 'вправ') + ', що суперечать обмеженням — замініть або приберіть їх.</div>' : '') +
      '</div>' +
      (pr.days.length ? pr.days.map(function (d, di) { return dayHtml(p, pr, d, di); }).join('') : '<div class="panel empty">Тренувальних днів немає</div>') +
      '<div class="row" style="margin-bottom:16px"><button class="btn" data-a="day-add">+ Додати тренувальний день</button></div>' +
      PL.restrictionsHtml(p);
  };

  PL.views.program = function (el, p) {
    var paint = function () {
      el.innerHTML = p.program ? programHtml(p, p.program) : emptyHtml(p);
    };

    el.addEventListener('input', function (e) {
      var t = e.target;
      var pr = p.program;
      if (!pr) return;

      if (t.dataset.p === 'name') { pr.name = t.value; PL.save(); return; }

      var dayEl = t.closest('[data-day]');
      if (!dayEl) return;
      var day = null;
      pr.days.forEach(function (d) { if (d.id === dayEl.dataset.day) day = d; });
      if (!day) return;

      if (t.dataset.d === 'name') { day.name = t.value; PL.save(); return; }

      var tr = t.closest('[data-item]');
      if (!tr || !t.dataset.i) return;
      day.items.forEach(function (it) { if (it.id === tr.dataset.item) { it[t.dataset.i] = t.value; PL.save(); } });
    });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;

      if (PL.handleRestrictionClick(b, p)) { paint(); return; }

      var a = b.dataset.a;

      if (a === 'scratch') {
        p.program = { name: 'Програма', days: [{ id: PL.uid(), name: 'День 1', items: [] }] };
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

      var tr = b.closest('[data-item]');
      if (!tr) return;
      var ii = -1;
      day.items.forEach(function (it, i) { if (it.id === tr.dataset.item) ii = i; });
      var item = day.items[ii];
      if (!item) return;

      if (a === 'up' || a === 'down') {
        if (PL.move(day.items, ii, a === 'up' ? -1 : 1)) { PL.save(); paint(); }
      } else if (a === 'rm') {
        day.items.splice(ii, 1); PL.save(); paint();
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
          onPick: function (ex) { item.exId = ex.id; item.name = ex.name; PL.save(); paint(); }
        });
      }
    });

    paint();
  };
})();
