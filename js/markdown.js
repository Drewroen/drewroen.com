/* Renders a blog post's markdown into the page.
 *
 * The post's own directory holds index.md (the source of truth) and an
 * index.html that loads marked (pinned in the page's script tag, with SRI)
 * plus this file. Without JavaScript, or if the fetch/parse fails, the page
 * keeps its fallback note and link to the raw markdown. */
(function () {
  'use strict';

  var post = document.getElementById('post');
  if (!post) return;

  var fallback = document.getElementById('post-fallback');

  function giveUp() {
    /* leave the fallback in place: it links to index.md */
  }

  if (typeof marked === 'undefined') return giveUp();   // the pinned script never ran

  fetch('index.md', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (md) {
      post.innerHTML = marked.parse(md);

      // the post's first heading is its title
      var h1 = post.querySelector('h1');
      if (h1) document.title = h1.textContent.trim() + ' \u2014 Drew\u2019s Blog';

      // external links open in a new tab, internal ones stay here
      var links = post.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (/^https?:\/\//i.test(href) && links[i].host !== location.host) {
          links[i].setAttribute('target', '_blank');
          links[i].setAttribute('rel', 'noopener');
        }
      }

      // a wide table scrolls in its own box rather than stretching the page
      var tables = post.querySelectorAll('table');
      for (var j = 0; j < tables.length; j++) {
        var box = document.createElement('div');
        box.className = 'table-scroll';
        tables[j].parentNode.insertBefore(box, tables[j]);
        box.appendChild(tables[j]);
      }

      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
    })
    .catch(giveUp);
})();
