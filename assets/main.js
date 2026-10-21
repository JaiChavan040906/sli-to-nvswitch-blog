(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme toggle ---------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- reading progress ---------- */
  var bar = document.getElementById('progress-bar');
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- side rail ---------- */
  var railLinks = {};
  document.querySelectorAll('.rail a').forEach(function (a) { railLinks[a.dataset.rail] = a; });
  if ('IntersectionObserver' in window) {
    var railIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(railLinks).forEach(function (k) { railLinks[k].classList.toggle('active', k === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(railLinks).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) railIo.observe(el);
    });
  }

  /* ---------- copy link ---------- */
  var copyBtn = document.getElementById('copy-link');
  copyBtn.addEventListener('click', function () {
    var url = location.href.split('#')[0];
    var done = function () {
      copyBtn.textContent = 'Link copied';
      setTimeout(function () { copyBtn.textContent = 'Copy link to share'; }, 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
    else done();
  });

  /* ---------- straggler simulation ---------- */
  var grid = document.getElementById('sim-grid');
  var N = 200;
  var cells = [];
  for (var i = 0; i < N; i++) { var c = document.createElement('i'); grid.appendChild(c); cells.push(c); }

  var stepsEl = document.getElementById('sim-steps');
  var statusEl = document.getElementById('sim-status');
  var idleEl = document.getElementById('sim-idle');
  var mode = 'lossy';
  var steps = 0, idle = 0, stalled = false, timer = null, running = false;

  function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = cls || ''; }

  function tick() {
    if (stalled) return;
    if (mode === 'lossy' && Math.random() < 0.4) {
      stalled = true;
      var s = Math.floor(Math.random() * N);
      cells.forEach(function (c, j) { c.classList.toggle('straggler', j === s); c.classList.toggle('wait', j !== s); });
      grid.classList.remove('pulse');
      setStatus('GPU #' + s + ' dropped a packet', 'bad');
      setTimeout(function () {
        idle += (N - 1) * 10;
        idleEl.textContent = idle.toLocaleString();
        cells.forEach(function (c) { c.classList.remove('straggler', 'wait'); });
        stalled = false;
        setStatus('Retransmitted', '');
      }, 1500);
      return;
    }
    steps++;
    stepsEl.textContent = steps;
    setStatus(mode === 'lossy' ? 'Running' : 'Lossless — no stalls', mode === 'lossy' ? '' : 'good');
    grid.classList.add('pulse');
    setTimeout(function () { grid.classList.remove('pulse'); }, 260);
  }

  function start() { if (!running && !reduceMotion) { running = true; timer = setInterval(tick, 650); } }
  function stop() { running = false; clearInterval(timer); }

  document.querySelectorAll('.seg button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.mode;
      document.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-checked', String(b === btn)); });
      steps = 0; idle = 0; stepsEl.textContent = '0'; idleEl.textContent = '0';
      if (reduceMotion) setStatus(mode === 'lossy' ? 'Stalls on every drop' : 'Lossless — no stalls', mode === 'lossy' ? 'bad' : 'good');
    });
  });

  if (reduceMotion) {
    grid.classList.add('pulse');
    setStatus('Stalls on every drop', 'bad');
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }).observe(grid);
  } else {
    start();
  }
})();
