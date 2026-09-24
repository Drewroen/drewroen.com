/* drewroen.com — small jQuery enhancements */
$(function () {

  // --- Theme toggle (remembers choice, respects OS preference on first visit) ---
  var stored = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = stored || (prefersDark ? 'dark' : 'light');

  function applyTheme(t) {
    $('html').attr('data-theme', t);
    $('#theme-toggle').text(t === 'dark' ? '☀️' : '🌙');
  }

  applyTheme(theme);

  $('#theme-toggle').on('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  });

  // --- Footer year ---
  $('#year').text(new Date().getFullYear());

  // --- Reveal sections as they scroll into view ---
  var $reveals = $('.reveal');

  function showVisible() {
    var cutoff = $(window).scrollTop() + $(window).height() * 0.9;
    $reveals.not('.is-visible').each(function () {
      if ($(this).offset().top < cutoff) {
        $(this).addClass('is-visible');
      }
    });
  }

  showVisible();
  $(window).on('scroll resize', showVisible);

  // --- Smooth scroll for in-page links, offset by the sticky header ---
  $('a[href^="#"]').on('click', function (e) {
    var target = $(this.getAttribute('href'));
    if (!target.length) { return; }
    e.preventDefault();
    $('html, body').animate({ scrollTop: target.offset().top - 68 }, 400);
  });

});
