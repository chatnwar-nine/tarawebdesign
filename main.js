/* Vael — site interactions */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const NEON = [230, 255, 43];

  /* ─────────────────────────────────────────────
     Dot field: points bend toward the cursor and light up.
     Ripples fire when Vael works.
     ───────────────────────────────────────────── */
  function dotField(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const gap = opts.gap || 20;
    let w, h, dots = [];
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const ripples = [];
    let visible = true, t = 0;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1;
      const ox = (w - (cols - 1) * gap) / 2;
      dots = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) dots.push({ x: ox + x * gap, y: y * gap, seed: Math.random() });
    }

    function frame() {
      if (!visible) return requestAnimationFrame(frame);
      t += 0.012;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      const maxR = Math.max(w, h) * 1.2;
      for (let i = ripples.length - 1; i >= 0; i--) if ((ripples[i].r += 9) > maxR) ripples.splice(i, 1);

      const R = opts.radius || 190;
      const cx = w / 2, cy = h * (opts.focusY || 0.55), maxD = Math.hypot(w, h) / 2;
      for (const d of dots) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
        let glow = 0, px = d.x, py = d.y;
        if (dist < R) {
          const f = 1 - dist / R;
          glow = f * f;
          px += (dx / (dist || 1)) * f * 14;
          py += (dy / (dist || 1)) * f * 14;
        }
        const cd = Math.hypot(d.x - cx, d.y - cy) / maxD;
        const wave = (Math.sin(cd * 9 - t * 2.2 + d.seed * .6) + 1) / 2;
        let a = 0.08 + wave * 0.2 * (1 - cd * .7);
        for (const r of ripples) {
          const rd = Math.abs(Math.hypot(d.x - r.x, d.y - r.y) - r.r);
          if (rd < 40) glow = Math.max(glow, (1 - rd / 40) * (1 - r.r / maxR));
        }
        a = Math.min(1, a + glow * 0.95);
        const size = 1 + glow * 1.6;
        ctx.fillStyle = glow > 0.04 ? `rgba(${NEON},${a})` : `rgba(255,255,255,${a})`;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
      requestAnimationFrame(frame);
    }

    const host = canvas.parentElement;
    host.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    });
    host.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    addEventListener('resize', resize);
    resize();
    if (reduced) { t = 1; frame(); visible = false; } else requestAnimationFrame(frame);

    return {
      rippleAt(el) {
        const a = canvas.getBoundingClientRect(), b = el.getBoundingClientRect();
        ripples.push({ x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2, r: 0 });
      }
    };
  }

  const heroField = dotField($('#field'), { gap: 20, focusY: .3 });
  dotField($('#cta-field'), { gap: 22, focusY: .5, radius: 220 });

  /* ─────────────────────────────────────────────
     Vael's faces: eyes follow the cursor and blink.
     ───────────────────────────────────────────── */
  const faces = $$('.vael');
  let px = innerWidth / 2, py = innerHeight / 3, lookQueued = false;
  function look() {
    lookQueued = false;
    for (const f of faces) {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const s = r.width, dx = px - (r.left + s / 2), dy = py - (r.top + s / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 400);
      f.style.setProperty('--lx', `${(dx / d) * k * s * .14}px`);
      f.style.setProperty('--ly', `${(dy / d) * k * s * .1}px`);
    }
  }
  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    if (!lookQueued) { lookQueued = true; requestAnimationFrame(look); }
  });
  if (!reduced) faces.forEach(f => {
    const blink = () => {
      f.classList.add('blink');
      setTimeout(() => f.classList.remove('blink'), 130);
      setTimeout(blink, 2500 + Math.random() * 4000);
    };
    setTimeout(blink, 1000 + Math.random() * 3000);
  });

  /* ─────────────────────────────────────────────
     Console: a conversation with Vael
     ───────────────────────────────────────────── */
  const TASKS = {
    reconcile: {
      prompt: 'Reconcile October bank feeds against NetSuite.',
      intro: "On it. I'll match your bank lines to the ledger.",
      steps: [
        ['I pulled <b>4,812</b> bank lines'],
        ['I read <b>5,104</b> ledger entries from NetSuite'],
        ['I matched <b>4,690</b> lines on amount, date and memo'],
        ['<b>122</b> lines need a look. I sorted them into 6 causes', 'warn'],
        ['I drafted <b>6</b> journal entries to fix them'],
      ],
      result: [['97.5%', 'matched'], ['3 min', 'run time'], ['6', 'entries']],
      ask: 'Nothing posts until you approve.',
      done: 'Posted to NetSuite. Logged in your audit trail.',
    },
    collect: {
      prompt: 'Chase every invoice more than 7 days late.',
      intro: "Sure. I'll check who owes you and write to them.",
      steps: [
        ['I found <b>32</b> late invoices worth $418,200'],
        ['I checked each client\'s payment history'],
        ['I skipped <b>4</b> clients with open disputes', 'warn'],
        ['I wrote <b>28</b> friendly reminders with a pay link'],
      ],
      result: [['28', 'emails'], ['$371k', 'to collect'], ['−11', 'days to pay']],
      ask: 'Review the drafts or send them all.',
      done: 'Sent. Replies will land in #finance-ar.',
    },
    audit: {
      prompt: 'Why did SaaS spend jump 41% last month?',
      intro: "Let me dig in. I'll compare it to the last 6 months.",
      steps: [
        ['I pulled <b>214</b> software charges from Brex'],
        ['I matched every seat to your team list'],
        ['<b>19</b> seats belong to people who left', 'warn'],
        ['<b>3</b> tools are billed twice', 'warn'],
      ],
      result: [['$2,940', 'saved a month'], ['22', 'seats to cut'], ['3', 'duplicates']],
      ask: 'I drafted cancel requests for each owner.',
      done: 'Sent. Owners got a note in Slack.',
    },
  };

  const customTask = text => ({
    prompt: text,
    intro: "Got it. Here's my plan.",
    steps: [
      ['I mapped your request to NetSuite, Stripe and your bank'],
      ['I checked your approval rules'],
      ['I ran it on a safe copy of your books'],
      ['I wrote a summary with every source cited'],
    ],
    result: [['4', 'steps'], ['100%', 'sourced'], ['0', 'changes made']],
    ask: 'Ready when you are.',
    done: "Approved. I'll ping you in Slack when it's done.",
  });

  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const consoleEl = $('#console'), thread = $('#thread'), input = $('#prompt-input'), sendBtn = $('#run-btn');
  const statusEl = $('#status'), heroFace = $('#hero-face'), chatFace = $('#chat-face');
  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  let runId = 0;

  function setState(state, label) {
    heroFace.dataset.state = chatFace.dataset.state = state;
    statusEl.textContent = label;
    statusEl.classList.toggle('is-busy', state === 'working' || state === 'thinking');
  }
  function add(html, cls) {
    const el = document.createElement('div');
    el.className = `msg ${cls}`;
    el.innerHTML = html;
    thread.appendChild(el);
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    return el;
  }

  async function run(task) {
    const id = ++runId;
    thread.innerHTML = '';
    sendBtn.disabled = true;
    input.value = '';
    add(`<p>${esc(task.prompt)}</p>`, 'msg-user');
    setState('thinking', 'Thinking…');
    await wait(700);
    if (id !== runId) return;
    add(`<p>${task.intro}</p>`, 'msg-vael');
    setState('working', 'Working…');
    heroField.rippleAt(heroFace);

    const list = add('<ol class="steps-out"></ol>', 'msg-vael').firstChild;
    for (const [text, kind] of task.steps) {
      if (id !== runId) return;
      const li = document.createElement('li');
      li.className = 'is-running';
      li.innerHTML = `<span class="st"></span><span>${text}</span>`;
      list.appendChild(li);
      thread.scrollTo({ top: thread.scrollHeight });
      await wait(600 + Math.random() * 400);
      if (id !== runId) return;
      li.className = kind === 'warn' ? 'is-warn' : 'is-done';
      li.firstChild.textContent = kind === 'warn' ? '!' : '✓';
    }

    const card = add(`
      <div class="result-grid">${task.result.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      <div class="result-actions"><p>${task.ask}</p><button class="btn btn-neon btn-sm">Approve</button></div>`, 'result');
    setState('idle', 'Waiting for you');
    sendBtn.disabled = false;

    card.querySelector('button').onclick = e => {
      card.classList.add('is-approved');
      card.querySelector('p').textContent = task.done;
      e.target.textContent = 'Done';
      e.target.disabled = true;
      setState('done', 'Done');
      heroField.rippleAt(heroFace);
      setTimeout(() => runId === id && setState('idle', 'Ready'), 2400);
    };
  }

  $$('.chip-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.chip-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    run(TASKS[btn.dataset.task]);
  }));
  $('#prompt').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return input.focus();
    $$('.chip-btn').forEach(b => b.classList.remove('is-active'));
    run(customTask(text));
  });

  let autoRan = false;
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting && !autoRan) {
      autoRan = true; obs.disconnect();
      setTimeout(() => run(TASKS.reconcile), 1200);
    }
  }, { threshold: .5 }).observe(consoleEl);

  /* ─────────────────────────────────────────────
     Customer logos: duplicate for a seamless loop
     ───────────────────────────────────────────── */
  const track = $('#logo-track');
  track.innerHTML += track.innerHTML;

  /* ─────────────────────────────────────────────
     How it works: scroll-driven steps
     ───────────────────────────────────────────── */
  const steps = $$('.step'), stages = $$('.stage-card');
  const setStep = i => {
    steps.forEach((s, j) => s.classList.toggle('is-active', i === j));
    stages.forEach((s, j) => s.classList.toggle('is-active', i === j));
  };
  setStep(0);
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setStep(+e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => { stepObs.observe(s); s.addEventListener('click', () => setStep(+s.dataset.step)); });

  /* ─────────────────────────────────────────────
     Pricing: annual / monthly
     ───────────────────────────────────────────── */
  $$('.billing button').forEach(btn => btn.addEventListener('click', () => {
    $$('.billing button').forEach(b => b.classList.toggle('is-active', b === btn));
    $$('[data-annual]').forEach(el => { el.textContent = el.dataset[btn.dataset.bill]; });
  }));

  $('#cta-form').addEventListener('submit', e => { e.preventDefault(); e.target.classList.add('sent'); });

  /* ─────────────────────────────────────────────
     Reveal + counters
     ───────────────────────────────────────────── */
  $$('.section-head, .tile, .story, .quote, .audit, .int, .plan-card, .stat').forEach(el => el.classList.add('reveal'));
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
      e.target.style.transitionDelay = `${Math.max(0, sibs.indexOf(e.target)) * 60}ms`;
      e.target.classList.add('is-in');
      revealObs.unobserve(e.target);
    });
  }, { threshold: .15 });
  $$('.reveal').forEach(el => revealObs.observe(el));

  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, start = performance.now(), dur = reduced ? 1 : 1600;
      const tick = now => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ─────────────────────────────────────────────
     Nav: dark or light, depending on the section beneath
     ───────────────────────────────────────────── */
  const nav = $('#nav');
  const lightSections = $$('.how, .caps, .customers, .security, .stack, .pricing');
  function onScroll() {
    nav.classList.toggle('is-scrolled', scrollY > 40);
    nav.classList.toggle('is-light', lightSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= 50 && r.bottom >= 50; }));
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ─────────────────────────────────────────────
     Results: dithered orb (ordered Bayer dither).
     The light follows the cursor.
     ───────────────────────────────────────────── */
  const orb = $('#orb');
  if (orb) {
    const ctx = orb.getContext('2d');
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
    const cell = 5;
    let size, n, on = true;
    const light = { x: -.5, y: -.6 }, target = { x: -.5, y: -.6 };

    function resizeOrb() {
      size = orb.clientWidth;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      orb.width = orb.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      n = Math.floor(size / cell);
    }
    function draw(now) {
      if (on) {
        const t0 = now / 1000;
        light.x += (target.x - light.x) * .05;
        light.y += (target.y - light.y) * .05;
        ctx.clearRect(0, 0, size, size);
        const lx = light.x + Math.sin(t0 * .4) * .1, ly = light.y, lz = .75, ll = Math.hypot(lx, ly, lz);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = (i / n) * 2 - 1, y = (j / n) * 2 - 1, r2 = x * x + y * y;
          if (r2 > .72) continue;
          const z = Math.sqrt(.72 - r2);
          const lum = Math.pow(Math.max(0, (x * lx + y * ly + z * lz) / (Math.sqrt(.72) * ll)), 1.6);
          const th = BAYER[(j % 4) * 4 + (i % 4)];
          if (lum > th) {
            ctx.fillStyle = lum > .86 + th * .12 ? '#E6FF2B' : `rgba(255,255,255,${.22 + lum * .6})`;
            ctx.fillRect(i * cell, j * cell, cell - 1.4, cell - 1.4);
          }
        }
      }
      if (!reduced) requestAnimationFrame(draw);
    }
    $('.proof').addEventListener('pointermove', e => {
      const r = orb.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(orb);
    addEventListener('resize', resizeOrb);
    resizeOrb();
    requestAnimationFrame(draw);
  }
})();
