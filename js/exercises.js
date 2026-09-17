/* База вправ: фільтри, екран бази, редактор вправи, вибір вправи в програму */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  PL.exById = function (id) {
    for (var i = 0; i < PL.S.exercises.length; i++) if (PL.S.exercises[i].id === id) return PL.S.exercises[i];
    return null;
  };

  PL.exMeta = function (e) {
    return '<span class="tag">' + esc(PL.MUSCLES[e.muscle]) + '</span><span class="tag">' + esc(PL.EQUIPMENT[e.equipment]) + '</span>';
  };

  // Чому вправа не підходить профілю: ручне виключення, група м'язів, обладнання або травма
  PL.exclusionReason = function (ex, p) {
    if (!ex || !p) return null;
    var x = p.exclusions;
    if (x.exercises.indexOf(ex.id) >= 0) return 'виключено вручну';
    if (x.muscles.indexOf(ex.muscle) >= 0) return 'група: ' + PL.MUSCLES[ex.muscle];
    if (x.equipment.indexOf(ex.equipment) >= 0) return 'обладнання: ' + PL.EQUIPMENT[ex.equipment];
    for (var i = 0; i < ex.joints.length; i++) {
      if (x.joints.indexOf(ex.joints[i]) >= 0) return 'навантаження: ' + PL.JOINTS[ex.joints[i]];
    }
    return null;
  };

  PL.filterExercises = function (f) {
    var q = (f.q || '').trim().toLowerCase();
    return PL.S.exercises.filter(function (e) {
      if (q && e.name.toLowerCase().indexOf(q) < 0) return false;
      if (f.muscle && e.muscle !== f.muscle) return false;
      if (f.equipment && e.equipment !== f.equipment) return false;
      if (f.noJoint && e.joints.indexOf(f.noJoint) >= 0) return false;
      return true;
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'uk'); });
  };

  var jointFilterOpts = function () {
    var map = {};
    Object.keys(PL.JOINTS).forEach(function (k) { map[k] = 'Без навантаження на: ' + PL.JOINTS[k].toLowerCase(); });
    return map;
  };

  var filtersHtml = function (f) {
    return '<div class="row">' +
      '<input class="inp" data-f="q" placeholder="Пошук вправи" value="' + esc(f.q) + '" autocomplete="off" style="flex:1;min-width:180px">' +
      '<select class="inp" data-f="muscle">' + PL.opts(PL.MUSCLES, f.muscle, 'Усі групи м’язів') + '</select>' +
      '<select class="inp" data-f="equipment">' + PL.opts(PL.EQUIPMENT, f.equipment, 'Будь-яке обладнання') + '</select>' +
      '<select class="inp" data-f="noJoint">' + PL.opts(jointFilterOpts(), f.noJoint, 'Без обмежень по суглобах') + '</select>' +
      '</div>';
  };

  var bindFilters = function (root, f, paint) {
    PL.$$('[data-f]', root).forEach(function (inp) {
      inp.addEventListener(inp.tagName === 'INPUT' ? 'input' : 'change', function () {
        f[inp.dataset.f] = inp.value;
        paint();
      });
    });
  };

  /* ── Екран «База вправ» ────────────────────────────────────── */

  PL.screens.exercises = function (el) {
    var f = { q: '', muscle: '', equipment: '', noJoint: '' };

    el.innerHTML =
      '<div class="page-head"><h1>База вправ</h1><span class="spacer"></span>' +
        '<button class="btn primary" data-a="add">+ Додати вправу</button></div>' +
      '<div class="panel">' + filtersHtml(f) + '</div>' +
      '<div class="panel" data-list></div>';

    var list = el.querySelector('[data-list]');

    var paint = function () {
      var rows = PL.filterExercises(f);
      if (!rows.length) {
        list.innerHTML = '<div class="empty">Нічого не знайдено</div>';
        return;
      }
      list.innerHTML =
        '<table class="tbl"><thead><tr><th>Вправа</th><th>Група м’язів</th><th>Обладнання</th>' +
          '<th>Навантаження на суглоби</th><th></th></tr></thead><tbody>' +
        rows.map(function (e) {
          return '<tr data-id="' + esc(e.id) + '">' +
            '<td>' + esc(e.name) + (e.custom ? ' <span class="tag">своя</span>' : '') + '</td>' +
            '<td>' + esc(PL.MUSCLES[e.muscle]) + '</td>' +
            '<td>' + esc(PL.EQUIPMENT[e.equipment]) + '</td>' +
            '<td class="small muted">' + (e.joints.map(function (j) { return esc(PL.JOINTS[j]); }).join(', ') || '—') + '</td>' +
            '<td class="actions"><button class="icon-btn" data-a="edit">Змінити</button>' +
            '<button class="icon-btn danger" data-a="del">Видалити</button></td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<div class="small muted" style="margin-top:10px">Показано ' + rows.length + ' з ' + PL.S.exercises.length + '</div>';
    };

    bindFilters(el, f, paint);

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var tr = b.closest('tr[data-id]');
      var ex = tr ? PL.exById(tr.dataset.id) : null;
      if (b.dataset.a === 'add') editExercise(null, paint);
      if (b.dataset.a === 'edit' && ex) editExercise(ex, paint);
      if (b.dataset.a === 'del' && ex) removeExercise(ex, paint);
    });

    paint();
  };

  var editExercise = function (ex, done) {
    var e = ex || { name: '', muscle: 'chest', equipment: 'barbell', joints: [] };
    PL.modal({
      title: ex ? 'Редагувати вправу' : 'Нова вправа',
      ok: 'Зберегти',
      body:
        '<label class="field" style="margin-bottom:12px"><span>Назва</span>' +
          '<input class="inp" data-e="name" value="' + esc(e.name) + '" autocomplete="off"></label>' +
        '<div class="grid-2" style="margin-bottom:12px">' +
          '<label class="field"><span>Група м’язів</span><select class="inp" data-e="muscle">' + PL.opts(PL.MUSCLES, e.muscle) + '</select></label>' +
          '<label class="field"><span>Обладнання</span><select class="inp" data-e="equipment">' + PL.opts(PL.EQUIPMENT, e.equipment) + '</select></label>' +
        '</div>' +
        '<div class="field"><span>Навантаження на суглоби — за цим працює виключення при травмах</span>' +
          '<div class="chips">' + Object.keys(PL.JOINTS).map(function (k) {
            return '<label class="chip"><input type="checkbox" data-j="' + k + '"' +
              (e.joints.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(PL.JOINTS[k]) + '</label>';
          }).join('') + '</div></div>',
      onOk: function (body) {
        var nameInp = body.querySelector('[data-e=name]');
        var name = nameInp.value.trim();
        if (!name) { nameInp.focus(); return false; }
        var data = {
          name: name,
          muscle: body.querySelector('[data-e=muscle]').value,
          equipment: body.querySelector('[data-e=equipment]').value,
          joints: PL.$$('[data-j]', body).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.j; })
        };
        if (ex) Object.assign(ex, data);
        else PL.S.exercises.push(Object.assign({ id: PL.uid(), custom: true }, data));
        PL.saveNow();
        done();
        PL.toast(ex ? 'Вправу оновлено' : 'Вправу додано');
      }
    });
  };

  var usageCount = function (id) {
    var n = 0;
    PL.profiles().forEach(function (p) {
      if (p.program) p.program.days.forEach(function (d) {
        d.items.forEach(function (it) { if (it.exId === id) n++; });
      });
      p.lifts.forEach(function (l) { if (l.exId === id) n++; });
    });
    return n;
  };

  var removeExercise = function (ex, done) {
    var n = usageCount(ex.id);
    PL.confirm(
      'Видалити «' + ex.name + '»?',
      n ? 'Вправа є в програмах або в історії прогресу (' + n + ' ' +
        PL.plural(n, 'запис', 'записи', 'записів') + '). Там вона залишиться позначеною як видалена.' : '',
      'Видалити',
      function () {
        PL.S.exercises = PL.S.exercises.filter(function (e) { return e.id !== ex.id; });
        PL.saveNow();
        done();
        PL.toast('Вправу видалено');
      }
    );
  };

  /* ── Вибір вправи (модалка) ────────────────────────────────── */

  // o: { profile, title, muscle, single, onPick(ex) }
  PL.pickExercise = function (o) {
    var f = { q: '', muscle: o.muscle || '', equipment: '', noJoint: '' };
    var showExcluded = false;

    var m = PL.modal({
      title: o.title || 'Додати вправу',
      wide: true,
      body: filtersHtml(f) +
        (o.profile ? '<label class="small muted" style="display:inline-block;margin-top:10px">' +
          '<input type="checkbox" data-sx> Показати виключені вправи</label>' : '') +
        '<div data-list style="margin-top:10px"></div>'
    });

    var list = m.body.querySelector('[data-list]');

    var paint = function () {
      var all = PL.filterExercises(f).map(function (e) { return { e: e, why: PL.exclusionReason(e, o.profile) }; });
      var hidden = all.filter(function (r) { return r.why; }).length;
      var rows = showExcluded ? all : all.filter(function (r) { return !r.why; });

      list.innerHTML = (rows.length
        ? '<table class="tbl"><tbody>' + rows.map(function (r) {
            return '<tr data-id="' + esc(r.e.id) + '" class="' + (r.why ? 'is-excluded' : 'click') + '">' +
              '<td>' + esc(r.e.name) + (r.why ? ' <span class="tag warn">' + esc(r.why) + '</span>' : '') + '</td>' +
              '<td>' + PL.exMeta(r.e) + '</td>' +
              '<td class="actions"><button class="btn sm" data-a="pick">Додати</button></td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty">Нічого не знайдено</div>') +
        (hidden && !showExcluded
          ? '<div class="small muted" style="margin-top:10px">Приховано через обмеження профілю: ' + hidden + '</div>'
          : '');
    };

    bindFilters(m.body, f, paint);

    var sx = m.body.querySelector('[data-sx]');
    if (sx) sx.addEventListener('change', function () { showExcluded = sx.checked; paint(); });

    list.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      var ex = PL.exById(tr.dataset.id);
      if (!ex) return;
      o.onPick(ex);
      if (o.single) m.close();
      else PL.toast('Додано: ' + ex.name);
    });

    paint();
    return m;
  };
})();
