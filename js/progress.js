/* Трекінг прогресу: вага тіла, результати у вправах, фото + графіки */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  PL.views.progress = function (el, p) {
    var bwDate = PL.today();
    var liftDate = PL.today();
    var photoDate = PL.today();
    var exId = null;

    el.innerHTML = '<div class="panel" data-bw></div><div class="panel" data-lifts></div><div class="panel" data-photos></div>';

    var $bw = el.querySelector('[data-bw]');
    var $lifts = el.querySelector('[data-lifts]');
    var $photos = el.querySelector('[data-photos]');

    /* ── Вага тіла ──────────────────────────────────────────── */

    var syncWeight = function () {
      // Вага в профілі — це останній замір: з неї рахується норма калорій
      if (!p.bodyWeight.length) return;
      var last = p.bodyWeight.reduce(function (a, b) { return b.date > a.date ? b : a; });
      p.weight = last.weight;
    };

    var paintBw = function () {
      var rows = p.bodyWeight.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
      var total = rows.length > 1 ? rows[0].weight - rows[rows.length - 1].weight : null;

      $bw.innerHTML =
        '<div class="row" style="margin-bottom:14px"><h2 style="margin:0">Вага тіла</h2>' +
          (total != null ? '<span class="small muted">' + PL.fmt(rows[rows.length - 1].weight) + ' → ' + PL.fmt(rows[0].weight) +
            ' кг (' + (total > 0 ? '+' : '') + PL.fmt(total) + ' кг)</span>' : '') +
          '<span class="spacer"></span>' +
          '<input type="date" class="inp" data-bw-f="date" value="' + esc(bwDate) + '">' +
          '<input class="inp md" data-bw-f="weight" placeholder="кг" autocomplete="off">' +
          '<button class="btn primary" data-a="bw-add">Додати</button>' +
        '</div>' +
        '<div class="two"><div>' +
          PL.lineChart(rows.map(function (r) { return { x: r.date, y: r.weight }; }), { unit: 'кг', empty: 'Додайте перший замір ваги' }) +
        '</div><div class="scroll-box">' +
          (rows.length
            ? '<table class="tbl"><thead><tr><th>Дата</th><th>Вага, кг</th><th>Зміна</th><th></th></tr></thead><tbody>' +
              rows.map(function (r, i) {
                var prev = rows[i + 1];
                var d = prev ? r.weight - prev.weight : null;
                return '<tr data-id="' + esc(r.id) + '"><td>' + PL.fmtDate(r.date) + '</td><td>' + PL.fmt(r.weight) + '</td>' +
                  '<td class="small muted">' + (d == null ? '—' : (d > 0 ? '+' : '') + PL.fmt(d)) + '</td>' +
                  '<td class="actions"><button class="icon-btn danger" data-a="bw-del" title="Видалити">✕</button></td></tr>';
              }).join('') + '</tbody></table>'
            : '<div class="empty small">Записів немає</div>') +
        '</div></div>';
    };

    var addBw = function () {
      var inp = $bw.querySelector('[data-bw-f="weight"]');
      var w = PL.num(inp.value);
      if (!w || w <= 0 || w > 400) {
        PL.toast('Вкажіть вагу в кілограмах');
        inp.focus();
        return;
      }
      var existing = null;
      p.bodyWeight.forEach(function (r) { if (r.date === bwDate) existing = r; });
      if (existing) existing.weight = w;
      else p.bodyWeight.push({ id: PL.uid(), date: bwDate, weight: w });
      syncWeight();
      PL.save();
      paintBw();
      PL.toast(existing ? 'Замір за ' + PL.fmtDate(bwDate) + ' оновлено' : 'Замір додано');
    };

    /* ── Прогрес у вправах ──────────────────────────────────── */

    var programExIds = function () {
      var ids = [];
      if (p.program) p.program.days.forEach(function (d) {
        d.items.forEach(function (it) { if (ids.indexOf(it.exId) < 0) ids.push(it.exId); });
      });
      return ids;
    };

    var liftName = function (id) {
      var ex = PL.exById(id);
      if (ex) return ex.name;
      var found = '';
      p.lifts.forEach(function (l) { if (l.exId === id && l.name) found = l.name; });
      return (found || 'Вправа') + ' (видалена)';
    };

    var paintLifts = function () {
      var logged = [];
      var counts = {};
      p.lifts.forEach(function (l) {
        if (logged.indexOf(l.exId) < 0) logged.push(l.exId);
        counts[l.exId] = (counts[l.exId] || 0) + 1;
      });
      var fromProgram = programExIds().filter(function (id) { return logged.indexOf(id) < 0; });
      var rest = PL.S.exercises.filter(function (e) {
        return logged.indexOf(e.id) < 0 && fromProgram.indexOf(e.id) < 0;
      }).map(function (e) { return e.id; });

      if (!exId || logged.concat(fromProgram, rest).indexOf(exId) < 0) {
        exId = logged[0] || fromProgram[0] || rest[0] || null;
      }

      var group = function (label, ids) {
        if (!ids.length) return '';
        return '<optgroup label="' + esc(label) + '">' + ids.map(function (id) {
          return '<option value="' + esc(id) + '"' + (id === exId ? ' selected' : '') + '>' +
            esc(liftName(id)) + (counts[id] ? ' (' + counts[id] + ')' : '') + '</option>';
        }).join('') + '</optgroup>';
      };

      var rows = p.lifts.filter(function (l) { return l.exId === exId; })
        .sort(function (a, b) { return b.date.localeCompare(a.date) || b.weight - a.weight; });

      var best = {};
      rows.forEach(function (r) { if (best[r.date] == null || r.weight > best[r.date]) best[r.date] = r.weight; });
      var points = Object.keys(best).map(function (d) { return { x: d, y: best[d] }; });
      var record = rows.reduce(function (m, r) { return !m || r.weight > m.weight ? r : m; }, null);

      $lifts.innerHTML =
        '<div class="row" style="margin-bottom:14px"><h2 style="margin:0">Прогрес у вправах</h2><span class="spacer"></span>' +
          '<select class="inp" data-lift-f="ex" style="max-width:340px">' +
            group('Є записи', logged) + group('З програми', fromProgram) + group('Усі вправи', rest) +
          '</select></div>' +
        (exId
          ? '<div class="row" style="margin-bottom:14px">' +
              '<input type="date" class="inp" data-lift-f="date" value="' + esc(liftDate) + '">' +
              '<input class="inp md" data-lift-f="weight" placeholder="Вага, кг" autocomplete="off">' +
              '<span class="muted">×</span>' +
              '<input class="inp sm" data-lift-f="reps" placeholder="Повт." autocomplete="off">' +
              '<input class="inp sm" data-lift-f="sets" placeholder="Підх." autocomplete="off" title="Кількість підходів, необовʼязково">' +
              '<button class="btn primary" data-a="lift-add">Додати</button>' +
              (record ? '<span class="spacer"></span><span class="small muted">Рекорд: <b>' + PL.fmt(record.weight) +
                ' кг × ' + PL.fmt(record.reps, 0) + '</b> · ' + PL.fmtDate(record.date) + '</span>' : '') +
            '</div>' +
            '<div class="two"><div>' +
              PL.lineChart(points, { unit: 'кг', empty: 'Додайте перший результат у цій вправі' }) +
            '</div><div class="scroll-box">' +
              (rows.length
                ? '<table class="tbl"><thead><tr><th>Дата</th><th>Результат</th><th>Підходи</th><th></th></tr></thead><tbody>' +
                  rows.map(function (r) {
                    return '<tr data-id="' + esc(r.id) + '"><td>' + PL.fmtDate(r.date) + '</td>' +
                      '<td>' + PL.fmt(r.weight) + ' кг × ' + PL.fmt(r.reps, 0) + '</td>' +
                      '<td>' + (r.sets ? r.sets : '—') + '</td>' +
                      '<td class="actions"><button class="icon-btn danger" data-a="lift-del" title="Видалити">✕</button></td></tr>';
                  }).join('') + '</tbody></table>'
                : '<div class="empty small">Записів немає</div>') +
            '</div></div>'
          : '<div class="empty">У базі немає вправ</div>');
    };

    var addLift = function () {
      var field = function (k) { return $lifts.querySelector('[data-lift-f="' + k + '"]'); };
      if (!exId) return;
      var w = PL.num(field('weight').value);
      var reps = PL.num(field('reps').value);
      var sets = PL.num(field('sets').value);
      if (w == null || w < 0) {
        PL.toast('Вкажіть вагу (0 — якщо працюєте з власною вагою)');
        field('weight').focus();
        return;
      }
      if (!reps || reps <= 0) {
        PL.toast('Вкажіть кількість повторів');
        field('reps').focus();
        return;
      }
      var ex = PL.exById(exId);
      p.lifts.push({
        id: PL.uid(), exId: exId, name: ex ? ex.name : liftName(exId),
        date: liftDate, weight: w, reps: Math.round(reps), sets: sets ? Math.round(sets) : null
      });
      PL.save();
      paintLifts();
    };

    /* ── Фото прогресу ──────────────────────────────────────── */

    var loadImages = function () {
      PL.$$('img[data-img]', $photos).forEach(function (img) {
        PL.photoStore.get(img.dataset.img).then(function (src) {
          if (src) img.src = src; else img.alt = 'Фото не знайдено';
        }).catch(function () { img.alt = 'Сховище фото недоступне'; });
      });
    };

    var paintPhotos = function () {
      var rows = p.photos.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
      var dates = [];
      var byDate = {};
      rows.forEach(function (ph) {
        if (!byDate[ph.date]) { byDate[ph.date] = []; dates.push(ph.date); }
        byDate[ph.date].push(ph);
      });

      $photos.innerHTML =
        '<div class="row" style="margin-bottom:14px"><h2 style="margin:0">Фото прогресу</h2><span class="spacer"></span>' +
          '<input type="date" class="inp" data-photo-f="date" value="' + esc(photoDate) + '">' +
          '<label class="btn primary">Завантажити фото<input type="file" accept="image/*" multiple data-photo-f="file" hidden></label>' +
        '</div>' +
        (rows.length
          ? dates.map(function (d) {
              return '<h3 style="margin:16px 0 8px">' + PL.fmtDate(d) + '</h3><div class="photos">' +
                byDate[d].map(function (ph) {
                  return '<div class="photo" data-photo="' + esc(ph.id) + '">' +
                    '<img alt="Фото від ' + PL.fmtDate(ph.date) + '" data-img="' + esc(ph.id) + '">' +
                    '<div class="cap"><button class="icon-btn danger" data-a="photo-del" title="Видалити">✕</button></div></div>';
                }).join('') + '</div>';
            }).join('')
          : '<div class="empty">Фото ще немає. Оберіть дату й завантажте знімки — вони зберігаються лише на цьому компʼютері.</div>');

      loadImages();
    };

    var upload = function (files) {
      var done = 0;
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          return PL.readImage(file, 1600, 0.85).then(function (dataUrl) {
            var id = PL.uid();
            return PL.photoStore.put(id, dataUrl).then(function () {
              p.photos.push({ id: id, date: photoDate });
              done++;
            });
          }).catch(function (err) { console.error(err); });
        });
      });
      chain.then(function () {
        PL.save();
        paintPhotos();
        PL.toast(done === files.length
          ? 'Завантажено ' + done + ' ' + PL.plural(done, 'фото', 'фото', 'фото')
          : 'Завантажено ' + done + ' з ' + files.length + '. Решту не вдалося зберегти.');
      });
    };

    /* ── Події ──────────────────────────────────────────────── */

    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.bwF === 'date') bwDate = t.value || PL.today();
      else if (t.dataset.liftF === 'ex') { exId = t.value; paintLifts(); }
      else if (t.dataset.liftF === 'date') liftDate = t.value || PL.today();
      else if (t.dataset.photoF === 'date') photoDate = t.value || PL.today();
      else if (t.dataset.photoF === 'file' && t.files && t.files.length) upload(Array.prototype.slice.call(t.files));
    });

    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var t = e.target;
      if (t.dataset.bwF === 'weight') { e.preventDefault(); addBw(); }
      if (t.dataset.liftF && t.dataset.liftF !== 'ex' && t.dataset.liftF !== 'date') { e.preventDefault(); addLift(); }
    });

    el.addEventListener('click', function (e) {
      if (e.target.matches('img[data-img]')) {
        var photo = null;
        p.photos.forEach(function (ph) { if (ph.id === e.target.dataset.img) photo = ph; });
        if (photo && e.target.src) {
          PL.modal({
            title: 'Фото від ' + PL.fmtDate(photo.date),
            wide: true,
            body: '<div class="lightbox"><img src="' + esc(e.target.src) + '" alt=""></div>'
          });
        }
        return;
      }

      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.dataset.a;

      if (a === 'bw-add') addBw();
      else if (a === 'bw-del') {
        var bwId = b.closest('[data-id]').dataset.id;
        p.bodyWeight = p.bodyWeight.filter(function (r) { return r.id !== bwId; });
        syncWeight();
        PL.save(); paintBw();
      } else if (a === 'lift-add') addLift();
      else if (a === 'lift-del') {
        var liftId = b.closest('[data-id]').dataset.id;
        p.lifts = p.lifts.filter(function (l) { return l.id !== liftId; });
        PL.save(); paintLifts();
      } else if (a === 'photo-del') {
        var photoId = b.closest('[data-photo]').dataset.photo;
        PL.confirm('Видалити фото?', '', 'Видалити', function () {
          PL.photoStore.del(photoId).catch(function () {});
          p.photos = p.photos.filter(function (ph) { return ph.id !== photoId; });
          PL.save(); paintPhotos();
        });
      }
    });

    paintBw();
    paintLifts();
    paintPhotos();
  };
})();
