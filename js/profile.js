/* Профіль клієнта / самостійного трейні */
(function () {
  'use strict';

  var PL = window.PL;
  var esc = PL.esc;

  var val = function (v) { return esc(v == null ? '' : v); };

  // o: { trainer, onNameChange, onDelete }
  PL.views.profile = function (el, p, o) {
    o = o || {};

    var render = function () {
      el.innerHTML =
        '<div class="panel"><h2>Основне</h2><div class="grid">' +
          '<label class="field"><span>Імʼя</span><input class="inp" data-pf="name" value="' + val(p.name) + '" autocomplete="off" placeholder="' + (o.trainer ? 'Імʼя та прізвище' : 'Як до вас звертатись') + '"></label>' +
          (o.trainer
            ? '<label class="field"><span>Телефон</span><input class="inp" data-pf="phone" value="' + val(p.phone) + '" autocomplete="off"></label>' +
              '<label class="field"><span>Telegram</span><input class="inp" data-pf="telegram" value="' + val(p.telegram) + '" autocomplete="off" placeholder="@username"></label>' +
              '<label class="field"><span>Instagram</span><input class="inp" data-pf="instagram" value="' + val(p.instagram) + '" autocomplete="off" placeholder="@username"></label>'
            : '') +
        '</div></div>' +

        '<div class="panel"><h2>Антропометрія</h2><div class="grid">' +
          '<label class="field"><span>Стать</span><select class="inp" data-pf="sex">' + PL.opts(PL.SEX, p.sex) + '</select></label>' +
          '<label class="field"><span>Вік, років</span><input class="inp" data-pf="age" value="' + val(p.age) + '" autocomplete="off"></label>' +
          '<label class="field"><span>Зріст, см</span><input class="inp" data-pf="height" value="' + val(p.height) + '" autocomplete="off"></label>' +
          '<label class="field"><span>Вага, кг</span><input class="inp" data-pf="weight" value="' + val(p.weight) + '" autocomplete="off"></label>' +
        '</div><div class="small muted" style="margin-top:10px">Вага оновлюється сама після нового заміру на вкладці «Прогрес».</div></div>' +

        '<div class="panel"><h2>Цілі</h2><div class="grid" style="margin-bottom:12px">' +
          '<label class="field"><span>Ціль</span><select class="inp" data-pf="goal">' + PL.opts(PL.GOALS, p.goal) + '</select></label>' +
          '<label class="field"><span>Активність</span><select class="inp" data-pf="activity">' + PL.opts(PL.ACTIVITY, p.activity) + '</select></label>' +
        '</div>' +
          '<label class="field"><span>Опис цілей</span><textarea class="inp" data-pf="goals" placeholder="Напр., мінус 5 кг до літа">' + val(p.goals) + '</textarea></label></div>' +

        '<div class="panel"><h2>Травми та протипоказання</h2>' +
          '<label class="field"><span>Опис (для себе, у довільній формі)</span>' +
            '<textarea class="inp" data-pf="injuries" placeholder="Напр., біль у колінах на глибоких присіданнях">' + val(p.injuries) + '</textarea></label>' +
          '<div class="small muted" style="margin-top:10px">Щоб такі вправи зникли з підбору, позначте обмеження в блоці нижче.</div></div>' +

        '<div data-restrictions></div>' +

        (o.trainer
          ? '<div class="panel"><h2>Нотатки</h2>' +
              '<textarea class="inp" data-pf="notes" placeholder="Графік тренувань, побажання, що відпрацювали">' + val(p.notes) + '</textarea></div>' +
            '<div class="panel"><h2>Видалення</h2>' +
              '<p class="muted">Клієнт, його програма, прогрес і фото буде видалено назавжди.</p>' +
              '<button class="btn danger" data-a="del-client">Видалити клієнта</button></div>'
          : '');

      paintRestrictions();
    };

    var paintRestrictions = function () {
      el.querySelector('[data-restrictions]').innerHTML = PL.restrictionsHtml(p);
    };

    el.addEventListener('input', function (e) {
      var k = e.target.dataset.pf;
      if (!k) return;
      if (k === 'age' || k === 'height' || k === 'weight') p[k] = PL.num(e.target.value);
      else if (k === 'activity') p[k] = parseFloat(e.target.value);
      else p[k] = e.target.value;
      PL.save();
      if (k === 'name' && o.onNameChange) o.onNameChange();
    });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      if (PL.handleRestrictionClick(b, p)) { paintRestrictions(); return; }
      if (b.dataset.a === 'del-client' && o.onDelete) {
        PL.confirm('Видалити клієнта «' + (p.name || 'Без імені') + '»?',
          'Програма, заміри, результати у вправах і фото зникнуть безповоротно.', 'Видалити', o.onDelete);
      }
    });

    render();
  };
})();
