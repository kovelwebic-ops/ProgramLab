/* Кабінет тренера: список клієнтів і картка клієнта */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  PL.CLIENT_TABS = { profile: 'Профіль', program: 'Програма', nutrition: 'Раціон', progress: 'Прогрес' };

  PL.clientById = function (id) {
    var found = null;
    PL.S.clients.forEach(function (c) { if (c.id === id) found = c; });
    return found;
  };

  var lastActivity = function (c) {
    var dates = [];
    c.bodyWeight.forEach(function (r) { dates.push(r.date); });
    c.lifts.forEach(function (r) { dates.push(r.date); });
    c.photos.forEach(function (r) { dates.push(r.date); });
    c.meals.forEach(function (r) { dates.push(r.date); });
    return dates.length ? dates.sort()[dates.length - 1] : null;
  };

  var shorten = function (s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  /* ── Список клієнтів ──────────────────────────────────────── */

  PL.screens.clients = function (el) {
    var q = '';

    el.innerHTML =
      '<div class="page-head"><h1>Клієнти</h1><span class="spacer"></span>' +
        '<button class="btn primary" data-a="new">+ Новий клієнт</button></div>' +
      '<div class="panel"><input class="inp wide" data-q placeholder="Пошук за імʼям, телефоном або email" autocomplete="off"></div>' +
      '<div class="panel" data-list></div>';

    var list = el.querySelector('[data-list]');

    var paint = function () {
      var rows = PL.S.clients.filter(function (c) {
        if (!q) return true;
        return [c.name, c.phone, c.email].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'uk'); });

      if (!rows.length) {
        list.innerHTML = '<div class="empty">' +
          (PL.S.clients.length ? 'Нікого не знайдено' : 'Клієнтів ще немає. Додайте першого — і призначте йому програму.') + '</div>';
        return;
      }

      list.innerHTML =
        '<table class="tbl"><thead><tr><th>Клієнт</th><th>Ціль</th><th>Контакти</th>' +
          '<th>Програма</th><th>Вага</th><th>Останній запис</th></tr></thead><tbody>' +
        rows.map(function (c) {
          var last = lastActivity(c);
          return '<tr class="click" data-id="' + esc(c.id) + '">' +
            '<td><b>' + esc(c.name || 'Без імені') + '</b>' +
              (c.injuries ? '<div class="small muted">⚠ ' + esc(shorten(c.injuries, 60)) + '</div>' : '') + '</td>' +
            '<td>' + esc(PL.GOALS[c.goal] || '—') + '</td>' +
            '<td class="small muted">' + (esc(c.phone) || '—') + (c.email ? '<br>' + esc(c.email) : '') + '</td>' +
            '<td class="small">' + (c.program ? esc(c.program.name) + ' <span class="muted">· ' + c.program.days.length + ' ' +
              PL.plural(c.program.days.length, 'день', 'дні', 'днів') + '</span>' : '<span class="muted">не призначена</span>') + '</td>' +
            '<td>' + (c.weight ? PL.fmt(c.weight) + ' кг' : '—') + '</td>' +
            '<td class="small muted">' + (last ? PL.fmtDate(last) : '—') + '</td></tr>';
        }).join('') + '</tbody></table>';
    };

    el.querySelector('[data-q]').addEventListener('input', function (e) {
      q = e.target.value.trim().toLowerCase();
      paint();
    });

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-a="new"]')) {
        PL.prompt('Новий клієнт', 'Імʼя та прізвище', '', 'Створити', function (name) {
          var c = PL.normalizeProfile({ name: name });
          PL.S.clients.push(c);
          PL.saveNow();
          PL.go({ screen: 'client', clientId: c.id, tab: 'profile' });
        });
        return;
      }
      var tr = e.target.closest('tr[data-id]');
      if (tr) PL.go({ screen: 'client', clientId: tr.dataset.id, tab: 'profile' });
    });

    paint();
  };

  /* ── Картка клієнта ───────────────────────────────────────── */

  PL.screens.client = function (el) {
    var ui = PL.S.ui.trainer;
    var c = PL.clientById(ui.clientId);
    if (!c) { PL.go({ screen: 'clients', clientId: null }); return; }
    if (!PL.CLIENT_TABS[ui.tab]) ui.tab = 'profile';

    el.innerHTML =
      '<div class="page-head">' +
        '<button class="btn ghost" data-a="back">← Клієнти</button>' +
        '<h1 data-title>' + esc(c.name || 'Без імені') + '</h1>' +
        '<span class="spacer"></span>' +
        '<span class="small muted">' + esc(PL.GOALS[c.goal] || '') +
          (c.weight ? ' · ' + PL.fmt(c.weight) + ' кг' : '') + '</span>' +
      '</div>' +
      '<div class="tabs">' + Object.keys(PL.CLIENT_TABS).map(function (k) {
        return '<button data-tab="' + k + '"' + (k === ui.tab ? ' class="on"' : '') + '>' + PL.CLIENT_TABS[k] + '</button>';
      }).join('') + '</div>' +
      '<div data-body></div>';

    var body = el.querySelector('[data-body]');
    var title = el.querySelector('[data-title]');

    var showTab = function () {
      PL.$$('[data-tab]', el).forEach(function (b) { b.classList.toggle('on', b.dataset.tab === ui.tab); });
      var box = document.createElement('div');
      body.replaceChildren(box);

      if (ui.tab === 'profile') {
        PL.views.profile(box, c, {
          trainer: true,
          onNameChange: function () {
            title.textContent = c.name || 'Без імені';
            PL.renderSide();
          },
          onDelete: function () {
            PL.dropPhotos(c);
            PL.S.clients = PL.S.clients.filter(function (x) { return x.id !== c.id; });
            PL.saveNow();
            PL.go({ screen: 'clients', clientId: null });
            PL.toast('Клієнта видалено');
          }
        });
      } else {
        PL.views[ui.tab](box, c);
      }
    };

    el.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        ui.tab = tab.dataset.tab;
        PL.save();
        showTab();
        return;
      }
      if (e.target.closest('[data-a="back"]')) PL.go({ screen: 'clients', clientId: null });
    });

    showTab();
  };
})();
