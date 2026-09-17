/* Лінійний графік на SVG — без зовнішніх бібліотек */
(function () {
  'use strict';

  var PL = window.PL;

  var W = 640, L = 46, R = 14, T = 14, B = 26;

  PL.lineChart = function (points, o) {
    o = o || {};
    var pts = (points || []).filter(function (p) { return p.y != null && isFinite(p.y); })
      .sort(function (a, b) { return a.x < b.x ? -1 : a.x > b.x ? 1 : 0; });

    if (!pts.length) return '<div class="empty small">' + PL.esc(o.empty || 'Ще немає даних для графіка') + '</div>';

    var H = o.height || 220;
    var time = function (p) { return new Date(p.x + 'T00:00:00').getTime(); };
    var x0 = time(pts[0]), x1 = time(pts[pts.length - 1]);
    var ys = pts.map(function (p) { return p.y; });
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    var padY = (y1 - y0) * 0.12;
    y0 -= padY; y1 += padY;

    var sx = function (p) { return x1 === x0 ? L + (W - L - R) / 2 : L + (time(p) - x0) / (x1 - x0) * (W - L - R); };
    var sy = function (v) { return T + (1 - (v - y0) / (y1 - y0)) * (H - T - B); };

    var grid = '';
    for (var i = 0; i <= 4; i++) {
      var v = y0 + (y1 - y0) * i / 4, y = sy(v).toFixed(1);
      grid += '<line class="c-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="c-lbl" x="' + (L - 6) + '" y="' + (sy(v) + 4).toFixed(1) + '" text-anchor="end">' + PL.fmt(v, 1) + '</text>';
    }

    var marks = [pts[0]];
    if (pts.length > 2) marks.push(pts[Math.floor((pts.length - 1) / 2)]);
    if (pts.length > 1) marks.push(pts[pts.length - 1]);
    var xLabels = marks.map(function (p, i) {
      var anchor = pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle';
      return '<text class="c-lbl" x="' + sx(p).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="' + anchor + '">' + PL.fmtDate(p.x) + '</text>';
    }).join('');

    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p).toFixed(1) + ' ' + sy(p.y).toFixed(1); }).join(' ');
    var unit = o.unit ? ' ' + o.unit : '';
    var dots = pts.map(function (p) {
      return '<circle class="c-dot" cx="' + sx(p).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '" r="3.5">' +
        '<title>' + PL.fmtDate(p.x) + ': ' + PL.fmt(p.y, 2) + PL.esc(unit) + '</title></circle>';
    }).join('');

    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' +
      grid + xLabels + '<path class="c-line" d="' + path + '"/>' + dots + '</svg></div>';
  };
})();
