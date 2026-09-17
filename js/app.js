/* Навігація, перемикач режиму, екран даних, старт */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  var NAV = {
    trainer: [['clients', 'Клієнти'], ['exercises', 'База вправ'], ['data', 'Дані']],
    trainee: [
      ['profile', 'Мій профіль'], ['program', 'Моя програма'], ['nutrition', 'Раціон'],
      ['progress', 'Прогрес'], ['exercises', 'База вправ'], ['data', 'Дані']
    ]
  };

  var TRAINEE_TITLES = { profile: 'Мій профіль', program: 'Моя програма', nutrition: 'Раціон', progress: 'Прогрес' };

  PL.renderSide = function () {
    var S = PL.S;
    var ui = S.ui[S.mode];
    var openClient = S.mode === 'trainer' && ui.screen === 'client' ? PL.clientById(ui.clientId) : null;

    PL.$('#side').innerHTML =
      '<div class="logo">ProgramLab</div>' +
      '<div class="mode-switch">' +
        '<button data-mode="trainer"' + (S.mode === 'trainer' ? ' class="on"' : '') + '>Тренер</button>' +
        '<button data-mode="trainee"' + (S.mode === 'trainee' ? ' class="on"' : '') + '>Тренуюсь сам</button>' +
      '</div>' +
      '<nav class="nav">' + NAV[S.mode].map(function (row) {
        var id = row[0];
        var html = '<a data-screen="' + id + '"' + (ui.screen === id ? ' class="on"' : '') + '>' + row[1] +
          (id === 'clients' ? ' <span class="small muted">' + S.clients.length + '</span>' : '') + '</a>';
        if (id === 'clients' && openClient) {
          html += '<a class="sub on" data-screen="client">' + esc(openClient.name || 'Без імені') + '</a>';
        }
        if (id === 'exercises') html = '<div class="sep"></div>' + html;
        return html;
      }).join('') + '</nav>';
  };

  PL.go = function (patch) {
    Object.assign(PL.S.ui[PL.S.mode], patch);
    PL.save();
    PL.render();
    window.scrollTo(0, 0);
  };

  PL.render = function () {
    var S = PL.S;
    var ui = S.ui[S.mode];

    var main = PL.$('#main');
    var el = document.createElement('div');
    main.replaceChildren(el);

    if (S.mode === 'trainer') {
      if (ui.screen === 'client') PL.screens.client(el);
      else if (ui.screen === 'exercises') PL.screens.exercises(el);
      else if (ui.screen === 'data') PL.screens.data(el);
      else { ui.screen = 'clients'; PL.screens.clients(el); }
    } else {
      if (ui.screen === 'exercises') PL.screens.exercises(el);
      else if (ui.screen === 'data') PL.screens.data(el);
      else {
        if (!TRAINEE_TITLES[ui.screen]) ui.screen = 'profile';
        el.innerHTML = '<div class="page-head"><h1>' + TRAINEE_TITLES[ui.screen] + '</h1></div><div data-body></div>';
        var box = el.querySelector('[data-body]');
        if (ui.screen === 'profile') PL.views.profile(box, S.self, { trainer: false, onNameChange: function () {} });
        else PL.views[ui.screen](box, S.self);
      }
    }

    PL.renderSide();
  };

  /* ── Екран «Дані» ─────────────────────────────────────────── */

  PL.screens.data = function (el) {
    var S = PL.S;
    var total = function (key) {
      return PL.profiles().reduce(function (n, p) { return n + p[key].length; }, 0);
    };
    var programs = PL.profiles().filter(function (p) { return !!p.program; }).length;

    el.innerHTML =
      '<div class="page-head"><h1>Дані</h1></div>' +
      '<div class="panel"><h2>Що збережено</h2>' +
        '<p class="muted">Усе живе лише в цьому браузері на цьому компʼютері — без акаунта й сервера. Очищення даних браузера видалить і дані застосунку. Фото зберігаються окремо (IndexedDB), решта — у localStorage.</p>' +
        '<table class="tbl" style="max-width:440px"><tbody>' +
          '<tr><td>Клієнтів</td><td>' + S.clients.length + '</td></tr>' +
          '<tr><td>Програм</td><td>' + programs + '</td></tr>' +
          '<tr><td>Вправ у базі</td><td>' + S.exercises.length + '</td></tr>' +
          '<tr><td>Замірів ваги</td><td>' + total('bodyWeight') + '</td></tr>' +
          '<tr><td>Результатів у вправах</td><td>' + total('lifts') + '</td></tr>' +
          '<tr><td>Записів у раціоні</td><td>' + total('plan') + '</td></tr>' +
          '<tr><td>Фото прогресу</td><td>' + total('photos') + '</td></tr>' +
        '</tbody></table></div>' +
      '<div class="panel"><h2>Скидання</h2>' +
        '<p class="muted">Для тестування: повернути демо-набір (клієнти з програмами та прогресом) або почати з чистого аркуша.</p>' +
        '<div class="row"><button class="btn" data-a="demo">Повернути демо-дані</button>' +
          '<button class="btn danger" data-a="wipe">Очистити все</button></div></div>';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'demo') {
        PL.confirm('Повернути демо-дані?', 'Поточні клієнти, програми, прогрес і фото буде видалено.', 'Скинути', function () {
          reset(PL.seed);
        });
      }
      if (b.dataset.a === 'wipe') {
        PL.confirm('Очистити все?', 'Клієнти, програми, прогрес і фото зникнуть. База вправ повернеться до стандартної.', 'Очистити', function () {
          reset(function () { return PL.normalize({}); });
        });
      }
    });
  };

  // build() підміняє PL.S, тому режим запамʼятовуємо до виклику
  var reset = function (build) {
    var mode = PL.S.mode;
    PL.photoStore.clear().catch(function () {});
    PL.S = build();
    PL.S.mode = mode;
    PL.saveNow();
    PL.render();
    PL.toast('Готово');
  };

  /* ── Старт ────────────────────────────────────────────────── */

  document.addEventListener('click', function (e) {
    var mode = e.target.closest('#side [data-mode]');
    if (mode) {
      if (PL.S.mode !== mode.dataset.mode) {
        PL.S.mode = mode.dataset.mode;
        PL.save();
        PL.render();
        window.scrollTo(0, 0);
      }
      return;
    }
    var link = e.target.closest('#side [data-screen]');
    if (link) PL.go({ screen: link.dataset.screen });
  });

  PL.load();
  PL.render();
})();
