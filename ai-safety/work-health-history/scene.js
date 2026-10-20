/* 일과 건강의 역사와 AI — scene runtime. 05_AI역학조사/slides/scene.js 를 옮기고 '제목이 켜지는 리본' 을 더함.
   A slide declares:
     Scene.init({
       id: '12', meta: '…',                 // top bar (outside the stage)
       lit: 1,                              // ribbon right: how much of the talk's title is lit (0…5, see DECK below)
       prev: 's11.html', next: 's13.html',
       steps: [ { n: 'STEP 01', name: '…', title: '…', header: 'ribbon title', caption: 'html', dur: 5200 }, … ],
       apply(i) { … }                       // set the stage for step i (idempotent)
     });
   URL: ?step=N (0-based) jumps; autoplay starts only on ▶ Play / Space (&auto=1 to start playing).
   Keys: ← → steps (→ past the last step = next slide, ← before the first = previous slide at its last step) · PageDown/PageUp jump slides · Space play/pause · R restart · F fullscreen · H hide UI
   Portability: everything a scene needs lives under slides/ (scene.css/js, fonts.css, assets/fonts, assets/img) — copy that one folder. */
window.Scene = (function () {
  // the talk's title; segments light up as the talk earns each word (S02 "지금은 한 단어만 켜졌다. AI." → S54 "전부 켜졌다")
  // lit = 1 AI · 2 +HITL · 3 +맥락성 정보 · 4 +데이터 주권 · 5 everything (the leading phrase too)
  const DECK = [
    { t: '일과 건강의 역사와', at: 5 },
    { t: 'AI', at: 1, key: true, sep: ' : ' },
    { t: 'HITL', at: 2, key: true, sep: ' · ' },
    { t: '맥락성 정보', at: 3, key: true, sep: ' · ' },
    { t: '그리고 인간 중심의 데이터 주권', at: 4, key: true, sep: ' ' },
  ];
  function deckHtml(lit) {
    return DECK.map((s, k) => `${k ? `<span class="sep">${s.sep.trim() || ''}</span>` : ''}<span class="seg${s.key ? ' key' : ''}${lit >= s.at ? ' lit' : ''}">${s.t}</span>`).join('');
  }

  let cfg, cur = 0, playing = false, timer = null, loop = false;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function build() {
    const stage = $('.stage');
    const deck = cfg.deck != null ? cfg.deck : deckHtml(cfg.lit || 0);
    const ribbon = el('div', 'ribbon', `<h1><span class="dot"></span><span id="ribbonTitle"></span></h1><div class="deck">${deck}</div>`);
    const caption = el('div', 'caption', `<div><span class="badge" id="stepBadge"></span><span class="text" id="captionText"></span></div><div class="credit" id="credit">${cfg.credit || ''}</div>`);
    stage.prepend(ribbon); stage.append(caption);

    const top = el('div', 'ui-chrome topbar', `
      <div style="display:flex;align-items:center;gap:10px"><span class="tag">SCENE ${cfg.id || ''}</span><span>${cfg.meta || ''}</span></div>
      <div class="btns"><button class="btn" data-act="clean">UI 숨김 (H)</button><button class="btn" data-act="fs">전체화면 (F)</button></div>`);
    document.body.insertBefore(top, stage);

    const pills = cfg.steps.map((s, i) => `<button class="pill" data-i="${i}"><div class="n">${s.n}${s.name ? ' · ' + s.name : ''}</div><div class="t">${s.title || ''}</div></button>`).join('');
    const nav = `${cfg.prev ? `<a href="${cfg.prev}">‹ 이전</a>` : ''}${cfg.next ? `<a href="${cfg.next}">다음 ›</a>` : ''}`;
    const bottom = el('div', 'ui-chrome stepper', `
      <div class="ctl"><button class="btn primary" id="playBtn">❚❚ Pause</button><button class="btn" data-act="restart">↺ Restart</button></div>
      <div class="pills">${pills}</div>
      <div class="keys"><kbd>←</kbd><kbd>→</kbd> 단계, 끝에서 장 이동 · <kbd>PgUp</kbd><kbd>PgDn</kbd> 장</div><div class="nav">${nav}</div>`);
    stage.after(bottom);

    document.addEventListener('click', e => {
      const b = e.target.closest('[data-act],[data-i]'); if (!b) return;
      if (b.dataset.i != null) { stop(); set(+b.dataset.i); }
      else if (b.dataset.act === 'restart') restart();
      else if (b.dataset.act === 'clean') document.body.classList.toggle('clean');
      else if (b.dataset.act === 'fs') fullscreen();
    });
    $('#playBtn').addEventListener('click', toggle);
  }

  function set(i) {
    cur = Math.max(0, Math.min(cfg.steps.length - 1, i));
    const s = cfg.steps[cur];
    $('#ribbonTitle').textContent = s.header || cfg.steps[0].header || '';
    $('#stepBadge').textContent = s.n;
    $('#captionText').innerHTML = s.caption || '';
    if (s.lit != null) $('.ribbon .deck').innerHTML = deckHtml(s.lit);   // a step may light the next word
    else if (cfg.deck == null) $('.ribbon .deck').innerHTML = deckHtml(cfg.lit || 0);
    document.querySelectorAll('.pill').forEach((p, k) => p.classList.toggle('active', k === cur));
    document.body.dataset.step = cur;
    cfg.apply && cfg.apply(cur);
  }
  function schedule() {
    clearTimeout(timer); if (!playing) return;
    if (cur >= cfg.steps.length - 1 && !loop) { playing = false; paint(); return; }
    timer = setTimeout(() => { set((cur + 1) % cfg.steps.length); schedule(); }, cfg.steps[cur].dur || 5000);
  }
  function paint() { const b = $('#playBtn'); if (b) b.textContent = playing ? '❚❚ Pause' : '▶ Play'; }
  function stop() { playing = false; clearTimeout(timer); paint(); }
  function toggle() { playing = !playing; paint(); playing ? schedule() : clearTimeout(timer); }
  function restart() { playing = true; paint(); set(0); schedule(); }
  function fullscreen() {
    const st = $('.stage');
    if (!document.fullscreenElement) st.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {});
  }
  function fitFullscreen() {
    const st = $('.stage'); if (!st) return;
    if (document.fullscreenElement === st) { st.style.zoom = Math.min(innerWidth / 1280, innerHeight / 720); } else st.style.zoom = '';
  }

  function init(c) {
    cfg = c; loop = !!c.loop;
    document.body.dataset.steps = c.steps.length;
    build();
    const q = new URLSearchParams(location.search);
    const st = q.get('step');
    if (q.get('auto') === '1') playing = true;
    set(st === 'last' ? c.steps.length - 1 : st ? +st : 0);
    paint(); schedule();

    addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowRight') { stop(); if (cur < cfg.steps.length - 1) set(cur + 1); else if (cfg.next) location.href = cfg.next; }
      else if (k === 'ArrowLeft') { stop(); if (cur > 0) set(cur - 1); else if (cfg.prev) location.href = cfg.prev + '?step=last'; }
      else if (k === 'PageDown') { e.preventDefault(); if (cfg.next) location.href = cfg.next; }
      else if (k === 'PageUp') { e.preventDefault(); if (cfg.prev) location.href = cfg.prev; }
      else if (k === ' ') { e.preventDefault(); toggle(); }
      else if (k === 'r' || k === 'R') restart();
      else if (k === 'f' || k === 'F') fullscreen();
      else if (k === 'h' || k === 'H') document.body.classList.toggle('clean');
    });
    addEventListener('fullscreenchange', fitFullscreen); addEventListener('resize', fitFullscreen);
  }

  // helpers
  const util = {
    // camera transform that puts image point (rx%, ry%) at viewport (vx%, vy%) with scale s
    cam(rx, ry, s, vx = 50, vy = 50) { return `translate(${((vx - 50) + (50 - rx) * s).toFixed(2)}%, ${((vy - 50) + (50 - ry) * s).toFixed(2)}%) scale(${s})`; },
    spot(x, y, inner = 11, outer = 72, tint = 'rgba(7,10,14') {
      return `radial-gradient(circle at ${x}% ${y}%, rgba(0,0,0,0) ${inner}%, ${tint},.55) ${inner * 2}%, ${tint},.88) ${Math.round(outer * .55)}%, ${tint},.96) ${outer}%)`;
    },
    draw(path, dur = 900, delay = 0) {
      const L = path.getTotalLength ? path.getTotalLength() : 1000;
      path.style.transition = 'none'; path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      requestAnimationFrame(() => requestAnimationFrame(() => { path.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.2,.7,.2,1) ${delay}ms`; path.style.strokeDashoffset = 0; }));
    },
    undraw(path) { const L = path.getTotalLength ? path.getTotalLength() : 1000; path.style.transition = 'none'; path.style.strokeDasharray = L; path.style.strokeDashoffset = L; },
    count(el, to, { from = 0, dur = 1200, fmt = v => Math.round(v) } = {}) {
      const t0 = performance.now();
      (function tick(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); })(t0);
    },
    // typewriter; returns a cancel token — call again to restart, pass the same el with instant=true to show it whole
    type(el, text, { ms = 16, done } = {}) {
      el._tok = (el._tok || 0) + 1; const tok = el._tok; let k = 0;
      (function tick() { if (tok !== el._tok) return; k++; el.innerHTML = text.slice(0, k) + (k < text.length ? '<span class="cur">▍</span>' : ''); if (k < text.length) setTimeout(tick, ms); else done && done(); })();
    },
    untype(el, text) { el._tok = (el._tok || 0) + 1; el.innerHTML = text; }
  };
  return { init, set, get step() { return cur; }, ...util };
})();
