/* Fills the blog index's post list from posts.json.
 *
 * posts.json is the list of posts: [{ "slug": "...", "title": "...", "date": "YYYY-MM-DD" }].
 * Newest first as written, and sorted by date here anyway. If the file is
 * missing, unreadable, empty or the wrong shape, the page keeps the "No posts
 * yet." note that is already in the HTML. */
(function () {
  'use strict';

  var list = document.getElementById('post-list');
  if (!list) return;
  var empty = document.getElementById('post-empty');

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  fetch('posts.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (posts) {
      if (!Array.isArray(posts) || !posts.length) return;
      var rows = posts.filter(function (p) { return p && p.slug && p.title; });
      if (!rows.length) return;

      rows.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });

      rows.forEach(function (p) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = p.slug + '/';
        a.textContent = p.title;
        li.appendChild(a);
        var when = fmtDate(p.date);
        if (when) {
          var span = document.createElement('span');
          span.className = 'post-date';
          span.textContent = when;
          li.appendChild(span);
        }
        list.appendChild(li);
      });

      if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
    })
    .catch(function () { /* the static "No posts yet." stands */ });
})();
