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
      '<div data-list></div>';

    var list = el.querySelector('[data-list]');

    var paint = function () {
      var rows = PL.filterExercises(f);
      if (!rows.length) {
        list.innerHTML = '<div class="panel empty">Нічого не знайдено</div>';
        return;
      }
      list.innerHTML =
        '<div class="ex-grid">' + rows.map(function (e) {
          return '<button class="ex-card" data-id="' + esc(e.id) + '" title="Натисніть, щоб редагувати">' +
            (e.photo
              ? '<img class="ex-photo" data-img="' + esc(e.photo) + '" alt="">'
              : '<span class="ex-photo is-empty">' + esc(PL.MUSCLES[e.muscle]) + '</span>') +
            '<span class="ex-name">' + esc(e.name) + (e.custom ? ' <span class="tag">своя</span>' : '') + '</span>' +
            '<span class="ex-tags">' + PL.exMeta(e) + '</span>' +
            (e.joints.length
              ? '<span class="ex-joints small muted">' + e.joints.map(function (j) { return esc(PL.JOINTS[j]); }).join(', ') + '</span>'
              : '') +
            '</button>';
        }).join('') + '</div>' +
        '<div class="small muted" style="margin:12px 0 0">Показано ' + rows.length + ' з ' + PL.S.exercises.length +
          '. Натисніть картку, щоб змінити вправу або додати фото.</div>';
      PL.fillImages(list);
    };

    bindFilters(el, f, paint);

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-a="add"]')) { editExercise(null, paint); return; }
      var card = e.target.closest('.ex-card');
      if (card) editExercise(PL.exById(card.dataset.id), paint);
    });

    paint();
  };

  var editExercise = function (ex, done) {
    var e = ex || { name: '', muscle: 'chest', equipment: 'barbell', joints: [], photo: null };
    var original = e.photo || null;
    var photo = original;
    var uploaded = [];   // знімки цього вікна: якщо не збережемось, їх треба прибрати
    var saved = false;

    var photoHtml = function () {
      return (photo
        ? '<img class="ex-photo" data-img="' + esc(photo) + '" alt="">'
        : '<span class="ex-photo is-empty">Без фото</span>') +
        '<div class="row" style="margin-top:8px">' +
          '<label class="btn sm">' + (photo ? 'Замінити фото' : 'Додати фото') +
            '<input type="file" accept="image/*" data-photo-file hidden></label>' +
          (photo ? '<button class="btn sm danger" data-a="photo-clear">Прибрати</button>' : '') +
        '</div>';
    };

    var m = PL.modal({
      title: ex ? 'Вправа' : 'Нова вправа',
      ok: 'Зберегти',
      onClose: function () {
        if (saved) return;
        uploaded.forEach(function (id) { PL.photoStore.del(id).catch(function () {}); });
      },
      body:
        '<div class="ex-edit">' +
          '<div data-photo-box>' + photoHtml() + '</div>' +
          '<div class="stack">' +
            '<label class="field"><span>Назва</span>' +
              '<input class="inp" data-e="name" value="' + esc(e.name) + '" autocomplete="off"></label>' +
            '<label class="field"><span>Група м’язів</span><select class="inp" data-e="muscle">' + PL.opts(PL.MUSCLES, e.muscle) + '</select></label>' +
            '<label class="field"><span>Обладнання</span><select class="inp" data-e="equipment">' + PL.opts(PL.EQUIPMENT, e.equipment) + '</select></label>' +
          '</div>' +
        '</div>' +
        '<div class="field" style="margin-top:14px"><span>Навантаження на суглоби — за цим працює виключення при травмах</span>' +
          '<div class="chips">' + Object.keys(PL.JOINTS).map(function (k) {
            return '<label class="chip"><input type="checkbox" data-j="' + k + '"' +
              (e.joints.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(PL.JOINTS[k]) + '</label>';
          }).join('') + '</div></div>' +
        (ex ? '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">' +
          '<button class="btn danger sm" data-a="del-ex">Видалити вправу</button></div>' : ''),
      onOk: function (body) {
        var nameInp = body.querySelector('[data-e=name]');
        var name = nameInp.value.trim();
        if (!name) { nameInp.focus(); return false; }
        var data = {
          name: name,
          muscle: body.querySelector('[data-e=muscle]').value,
          equipment: body.querySelector('[data-e=equipment]').value,
          joints: PL.$$('[data-j]', body).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.j; }),
          photo: photo
        };
        if (original && original !== photo) PL.photoStore.del(original).catch(function () {});
        if (ex) Object.assign(ex, data);
        else PL.S.exercises.push(Object.assign({ id: PL.uid(), custom: true }, data));
        saved = true;
        PL.saveNow();
        done();
        PL.toast(ex ? 'Вправу оновлено' : 'Вправу додано');
      }
    });

    var repaintPhoto = function () {
      var box = m.body.querySelector('[data-photo-box]');
      box.innerHTML = photoHtml();
      PL.fillImages(box);
    };

    m.body.addEventListener('change', function (evt) {
      if (!evt.target.matches('[data-photo-file]') || !evt.target.files.length) return;
      PL.readImage(evt.target.files[0], 900, 0.8).then(function (dataUrl) {
        var id = PL.uid();
        return PL.photoStore.put(id, dataUrl).then(function () {
          uploaded.push(id);
          photo = id;
          repaintPhoto();
        });
      }).catch(function () { PL.toast('Не вдалося зберегти фото'); });
    });

    m.body.addEventListener('click', function (evt) {
      var b = evt.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'photo-clear') { photo = null; repaintPhoto(); }
      if (b.dataset.a === 'del-ex') { m.close(); removeExercise(ex, done); }
    });

    PL.fillImages(m.body);
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
        if (ex.photo) PL.photoStore.del(ex.photo).catch(function () {});
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
              '<td style="width:52px">' + (r.e.photo
                ? '<img class="ex-thumb" data-img="' + esc(r.e.photo) + '" alt="">'
                : '<span class="ex-thumb is-empty"></span>') + '</td>' +
              '<td>' + esc(r.e.name) + (r.why ? ' <span class="tag warn">' + esc(r.why) + '</span>' : '') + '</td>' +
              '<td>' + PL.exMeta(r.e) + '</td>' +
              '<td class="actions"><button class="btn sm" data-a="pick">Додати</button></td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty">Нічого не знайдено</div>') +
        (hidden && !showExcluded
          ? '<div class="small muted" style="margin-top:10px">Приховано через обмеження профілю: ' + hidden + '</div>'
          : '');
      PL.fillImages(list);
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
