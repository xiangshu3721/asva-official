(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('#site-nav');
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开菜单');
  }

  function openNav() {
    if (!nav || !toggle) return;
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '关闭菜单');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeNav();
      else openNav();
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      closeNav();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  document.addEventListener('click', function (e) {
    if (!nav || !toggle) return;
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    closeNav();
  });

  /* Smooth scroll for same-page anchors (enhances browsers without CSS smooth) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', id);
  });

  /* Active nav highlight on scroll */
  function setActiveNav() {
    if (!sections.length) return;
    var offset = (header ? header.offsetHeight : 64) + 24;
    var current = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      if (rect.top <= offset) current = sections[i].id;
    }
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === '#' + current) link.classList.add('is-active');
      else link.classList.remove('is-active');
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      setActiveNav();
      ticking = false;
    });
  }, { passive: true });

  setActiveNav();

  /* Fit long hero tagline on one line without clipping */
  function fitHeroTagline() {
    var el = document.querySelector('.hero .hero-tagline');
    var wrap = document.querySelector('.hero-tagline-wrap');
    if (!el || !wrap) return;
    el.style.transform = 'none';
    el.style.fontSize = '';
    var maxPx = Math.min(window.innerWidth * 0.042, 16.5);
    var minPx = 10;
    el.style.fontSize = maxPx + 'px';
    var guard = 0;
    while (el.scrollWidth > wrap.clientWidth - 4 && maxPx > minPx && guard < 40) {
      maxPx -= 0.5;
      el.style.fontSize = maxPx + 'px';
      guard += 1;
    }
  }
  fitHeroTagline();
  window.addEventListener('resize', function () {
    window.clearTimeout(window.__asvaFitT);
    window.__asvaFitT = window.setTimeout(fitHeroTagline, 80);
  });

})();
