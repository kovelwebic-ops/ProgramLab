/* Ядро: утиліти, стан, сховище, модалки, сховище фото */
(function () {
  'use strict';

  var PL = window.PL = {};
  var STORE_KEY = 'pl:state:v1';

  PL.screens = {};
  PL.views = {};

  /* ── Утиліти ───────────────────────────────────────────────── */

  PL.$ = function (sel, root) { return (root || document).querySelector(sel); };
  PL.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  PL.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  };

  PL.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  PL.num = function (v) {
    if (v == null || v === '') return null;
    var n = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
    return isFinite(n) ? n : null;
  };

  PL.fmt = function (n, digits) {
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toLocaleString('uk-UA', { maximumFractionDigits: digits == null ? 1 : digits });
  };

  PL.plural = function (n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    return b === 1 ? one : many;
  };

  var pad = function (n) { return String(n).padStart(2, '0'); };
  PL.isoDate = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  PL.today = function () { return PL.isoDate(new Date()); };
  PL.daysAgo = function (n) { var d = new Date(); d.setDate(d.getDate() - n); return PL.isoDate(d); };
  PL.shiftDate = function (iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return PL.isoDate(d); };
  PL.fmtDate = function (iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
  };

  PL.opts = function (map, selected, empty) {
    var html = empty != null ? '<option value="">' + PL.esc(empty) + '</option>' : '';
    return html + Object.keys(map).map(function (k) {
      return '<option value="' + PL.esc(k) + '"' + (String(k) === String(selected) ? ' selected' : '') + '>' + PL.esc(map[k]) + '</option>';
    }).join('');
  };

  PL.move = function (arr, i, dir) {
    var j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return false;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    return true;
  };

  /* ── Стан ──────────────────────────────────────────────────── */

  PL.emptyProfile = function (name) {
    return {
      id: PL.uid(), name: name || '', phone: '', telegram: '', instagram: '',
      sex: 'male', age: null, height: null, weight: null, activity: 1.55, goal: 'maintain',
      goals: '', injuries: '', notes: '',
      exclusions: { exercises: [], muscles: [], equipment: [], joints: [] },
      program: null, nutrition: null,
      plan: [], bodyWeight: [], lifts: [], photos: [],
      createdAt: PL.today()
    };
  };

  PL.normalizeProfile = function (p) {
    var out = Object.assign(PL.emptyProfile(), p || {});
    out.exclusions = Object.assign({ exercises: [], muscles: [], equipment: [], joints: [] }, out.exclusions || {});
    ['exercises', 'muscles', 'equipment', 'joints'].forEach(function (k) {
      if (!Array.isArray(out.exclusions[k])) out.exclusions[k] = [];
    });
    ['plan', 'bodyWeight', 'lifts', 'photos'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (out.program) {
      if (!Array.isArray(out.program.days)) out.program.days = [];
      out.program.days.forEach(function (d) {
        if (!d.id) d.id = PL.uid();
        if (!Array.isArray(d.items)) d.items = [];
        d.items.forEach(function (it) { if (!it.id) it.id = PL.uid(); });
      });
    }
    return out;
  };

  PL.normalizeExercise = function (e) {
    e = e || {};
    return {
      id: e.id || PL.uid(),
      name: e.name || 'Без назви',
      muscle: PL.MUSCLES[e.muscle] ? e.muscle : Object.keys(PL.MUSCLES)[0],
      equipment: PL.EQUIPMENT[e.equipment] ? e.equipment : Object.keys(PL.EQUIPMENT)[0],
      joints: Array.isArray(e.joints) ? e.joints.filter(function (j) { return !!PL.JOINTS[j]; }) : [],
      photo: e.photo || null,
      custom: !!e.custom
    };
  };

  PL.normalize = function (s) {
    s = s && typeof s === 'object' ? s : {};
    var ui = s.ui || {};
    return {
      mode: s.mode === 'trainee' ? 'trainee' : 'trainer',
      exercises: Array.isArray(s.exercises) && s.exercises.length ? s.exercises.map(PL.normalizeExercise) : PL.seedExercises(),
      clients: Array.isArray(s.clients) ? s.clients.map(PL.normalizeProfile) : [],
      self: PL.normalizeProfile(s.self),
      ui: {
        trainer: Object.assign({ screen: 'clients', clientId: null, tab: 'profile' }, ui.trainer),
        trainee: Object.assign({ screen: 'profile' }, ui.trainee)
      }
    };
  };

  PL.profiles = function () { return [PL.S.self].concat(PL.S.clients); };

  /* ── Сховище ───────────────────────────────────────────────── */

  PL.load = function () {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        PL.S = PL.normalize(JSON.parse(raw));
        return;
      } catch (e) {
        // Пошкоджений JSON відкладаємо, а не перетираємо демо-даними
        try { localStorage.setItem(STORE_KEY + ':broken', raw); } catch (e2) { /* переповнене сховище */ }
      }
    }
    PL.S = PL.seed();
    PL.saveNow();
  };

  var saveTimer = null;
  PL.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(PL.saveNow, 300);
  };
  PL.saveNow = function () {
    clearTimeout(saveTimer);
    saveTimer = null;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(PL.S)); }
    catch (e) { PL.toast('Не вдалося зберегти дані на пристрої'); }
  };
  window.addEventListener('beforeunload', function () { if (saveTimer) PL.saveNow(); });

  /* ── Тост і модалки ────────────────────────────────────────── */

  var toastTimer = null;
  PL.toast = function (msg) {
    var t = PL.$('#toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  };

  PL.modal = function (o) {
    var root = document.createElement('div');
    root.className = 'overlay';
    root.innerHTML =
      '<div class="modal' + (o.wide ? ' wide' : '') + '" role="dialog">' +
        '<div class="modal-head">' + PL.esc(o.title) + '</div>' +
        '<div class="modal-body">' + (o.body || '') + '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn" data-mod="cancel">' + PL.esc(o.cancel || (o.ok ? 'Скасувати' : 'Закрити')) + '</button>' +
          (o.ok ? '<button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-mod="ok">' + PL.esc(o.ok) + '</button>' : '') +
        '</div>' +
      '</div>';

    var body = root.querySelector('.modal-body');
    var close = function () {
      root.remove();
      document.removeEventListener('keydown', onKey);
      if (o.onClose) o.onClose();
    };
    var submit = function () {
      if (!o.onOk || o.onOk(body, close) !== false) close();
    };
    var onKey = function (e) {
      // Верхня модалка забирає клавіші собі, щоб Esc не закривав стос одразу
      if (PL.$('#modal-root').lastElementChild !== root) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && o.ok && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        submit();
      }
    };

    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mod]');
      if (!b) return;
      if (b.dataset.mod === 'ok') submit(); else close();
    });
    document.addEventListener('keydown', onKey);
    PL.$('#modal-root').appendChild(root);

    var first = body.querySelector('input:not([type=checkbox]), select, textarea');
    if (first && o.autofocus !== false) first.focus();

    return { root: root, body: body, close: close };
  };

  PL.confirm = function (title, text, okLabel, cb) {
    return PL.modal({
      title: title,
      body: text ? '<p>' + PL.esc(text) + '</p>' : '',
      ok: okLabel || 'Підтвердити',
      danger: true,
      onOk: function () { cb(); }
    });
  };

  PL.prompt = function (title, label, value, okLabel, cb) {
    return PL.modal({
      title: title,
      ok: okLabel || 'Зберегти',
      body: '<label class="field"><span>' + PL.esc(label) + '</span>' +
        '<input class="inp" data-prompt value="' + PL.esc(value || '') + '" autocomplete="off"></label>',
      onOk: function (body) {
        var inp = body.querySelector('[data-prompt]');
        var v = inp.value.trim();
        if (!v) { inp.focus(); return false; }
        cb(v);
      }
    });
  };

  /* ── Фото: метадані в стані, самі знімки в IndexedDB ───────── */

  var dbPromise = null;
  var openDb = function () {
    if (!dbPromise) {
      dbPromise = new Promise(function (res, rej) {
        if (!window.indexedDB) return rej(new Error('IndexedDB недоступний'));
        var r = indexedDB.open('pl-photos', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('photos'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    }
    return dbPromise;
  };

  var tx = function (mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('photos', mode);
        var req = fn(t.objectStore('photos'));
        t.oncomplete = function () { res(req ? req.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  };

  var imgCache = {};

  PL.photoStore = {
    put: function (id, dataUrl) {
      imgCache[id] = dataUrl;
      return tx('readwrite', function (st) { return st.put(dataUrl, id); });
    },
    get: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
    del: function (id) {
      delete imgCache[id];
      return tx('readwrite', function (st) { return st.delete(id); });
    },
    clear: function () {
      imgCache = {};
      return tx('readwrite', function (st) { return st.clear(); });
    }
  };

  // Підставляє знімки в <img data-img="id">; кеш потрібен, бо списки перемальовуються часто
  PL.fillImages = function (root) {
    PL.$$('img[data-img]', root).forEach(function (img) {
      var id = img.dataset.img;
      if (imgCache[id]) { img.src = imgCache[id]; return; }
      PL.photoStore.get(id).then(function (src) {
        if (src) { imgCache[id] = src; img.src = src; }
        else img.classList.add('is-missing');
      }).catch(function () { img.classList.add('is-missing'); });
    });
  };

  PL.dropPhotos = function (profile) {
    return Promise.all(profile.photos.map(function (ph) {
      return PL.photoStore.del(ph.id).catch(function () {});
    }));
  };

  // Стискаємо перед збереженням: інакше кілька знімків з телефона з'їдять сховище
  PL.readImage = function (file, maxSide, quality) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Не вдалося прочитати зображення')); };
      img.src = url;
    });
  };
})();
