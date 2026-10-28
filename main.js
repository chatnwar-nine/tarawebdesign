/* Vael — site interactions */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const NEON = [230, 255, 43];

  /* ─────────────────────────────────────────────
     Dot field: a grid of points that bends toward the
     cursor and lights up neon. Ripples fire when the agent works.
     ───────────────────────────────────────────── */
  function dotField(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const gap = opts.gap || 20;
    let w, h, dpr, cols, rows, dots = [];
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const ripples = [];
    let visible = true, t = 0;

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
      dots = [];
      const ox = (w - (cols - 1) * gap) / 2;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        dots.push({ x: ox + x * gap, y: y * gap, seed: Math.random() });
      }
    }

    function frame() {
      if (!visible) return requestAnimationFrame(frame);
      t += 0.012;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      ctx.clearRect(0, 0, w, h);

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 9;
        if (ripples[i].r > Math.max(w, h) * 1.2) ripples.splice(i, 1);
      }

      const R = opts.radius || 190;
      const cx = w / 2, cy = h * (opts.focusY || 0.55);
      const maxD = Math.hypot(w, h) / 2;
      for (const d of dots) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        let glow = 0, px = d.x, py = d.y;
        if (dist < R) {
          const f = 1 - dist / R;
          glow = f * f;
          px += (dx / (dist || 1)) * f * 14;
          py += (dy / (dist || 1)) * f * 14;
        }
        // ambient breathing wave, stronger near the centre
        const cd = Math.hypot(d.x - cx, d.y - cy) / maxD;
        const wave = (Math.sin(cd * 9 - t * 2.2 + d.seed * .6) + 1) / 2;
        let a = 0.08 + wave * 0.2 * (1 - cd * .7);

        for (const r of ripples) {
          const rd = Math.abs(Math.hypot(d.x - r.x, d.y - r.y) - r.r);
          if (rd < 40) { const f = (1 - rd / 40) * (1 - r.r / (Math.max(w, h) * 1.2)); glow = Math.max(glow, f); }
        }

        a = Math.min(1, a + glow * 0.95);
        const size = 1 + glow * 1.6;
        if (glow > 0.04) ctx.fillStyle = `rgba(${NEON[0]},${NEON[1]},${NEON[2]},${a})`;
        else ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
      requestAnimationFrame(frame);
    }

    const host = opts.host || canvas.parentElement;
    host.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    });
    host.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = -9999; mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    addEventListener('resize', resize);
    resize();
    if (reduced) { t = 1; frame(); visible = false; } else requestAnimationFrame(frame);

    return {
      ripple(x, y) { ripples.push({ x: x ?? w / 2, y: y ?? h / 2, r: 0 }); },
      center(el) {
        const a = canvas.getBoundingClientRect(), b = el.getBoundingClientRect();
        return [b.left - a.left + b.width / 2, b.top - a.top + b.height / 2];
      }
    };
  }

  const heroField = dotField($('#field'), { gap: 20, focusY: .62 });
  dotField($('#cta-field'), { gap: 22, focusY: .5, radius: 220 });

  /* ─────────────────────────────────────────────
     Agent console
     ───────────────────────────────────────────── */
  const TASKS = {
    reconcile: {
      prompt: 'Reconcile October bank feeds against NetSuite',
      steps: [
        ['Pulled <b>4,812</b> bank lines from Operating ••4821', 'bank.feed.read'],
        ['Read <b>5,104</b> ledger entries for Oct-26', 'netsuite.ledger.read'],
        ['Matched Stripe payouts to <b>1,288</b> invoices', 'stripe.payouts.match'],
        ['Cleared <b>4,690</b> lines by amount, date and memo', 'vael.match'],
        ['Grouped <b>122</b> exceptions into 6 causes', 'vael.explain', 'warn'],
        ['Drafted <b>6</b> journal entries for review', 'netsuite.je.draft'],
      ],
      result: [['97.5%', 'auto-matched'], ['3m 12s', 'run time'], ['6', 'entries to approve']],
      note: '6 entries ready. Nothing posts until you approve.',
      done: '✓ Posted 6 entries to NetSuite · logged to audit trail',
    },
    collect: {
      prompt: 'Chase every invoice more than 7 days late',
      steps: [
        ['Found <b>32</b> invoices past due · $418,200', 'netsuite.ar.aging'],
        ['Checked payment history for each client', 'stripe.customers.read'],
        ['Skipped <b>4</b> clients with open disputes', 'vael.policy', 'warn'],
        ['Wrote <b>28</b> reminders in your house tone', 'vael.compose'],
        ['Attached a pay link to each email', 'stripe.paylinks.create'],
      ],
      result: [['28', 'emails drafted'], ['$371k', 'to collect'], ['−11d', 'expected DSO']],
      note: '28 drafts ready in Gmail. Review or send all.',
      done: '✓ Sent 28 reminders · replies route to #finance-ar',
    },
    audit: {
      prompt: 'Why did SaaS spend jump 41% last month?',
      steps: [
        ['Pulled <b>214</b> card charges tagged Software', 'ramp.transactions.read'],
        ['Compared to the 6-month baseline', 'vael.flux'],
        ['Matched seats to your HR roster', 'rippling.employees.read'],
        ['Found <b>19</b> seats for people who left', 'vael.explain', 'warn'],
        ['Found <b>3</b> tools billed twice', 'vael.explain', 'warn'],
      ],
      result: [['$2,940', 'saved each month'], ['22', 'seats to cut'], ['3', 'duplicate tools']],
      note: 'Vael drafted cancel requests for each owner.',
      done: '✓ Sent 3 cancel requests · owners notified in Slack',
    },
  };

  function customTask(text) {
    const short = text.length > 46 ? text.slice(0, 46) + '…' : text;
    return {
      prompt: text,
      steps: [
        [`Read your request: <b>“${escapeHtml(short)}”</b>`, 'vael.plan'],
        ['Mapped it to NetSuite, Stripe and your bank feed', 'vael.route'],
        ['Checked your approval rules and limits', 'vael.policy'],
        ['Ran the work on a safe copy of your books', 'vael.sandbox'],
        ['Wrote a summary with every source cited', 'vael.report'],
      ],
      result: [['5', 'steps run'], ['100%', 'sources cited'], ['0', 'changes posted']],
      note: 'Plan ready. Vael waits for your go.',
      done: '✓ Approved · Vael is on it. You get a Slack ping when done.',
    };
  }

  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const consoleEl = $('#console');
  const log = $('#log'), result = $('#result'), resultGrid = $('#result-grid');
  const note = $('#result-note'), approve = $('#approve-btn');
  const input = $('#prompt-input'), runBtn = $('#run-btn');
  let runId = 0, current = 'reconcile';

  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));

  async function typeInto(text, id) {
    input.value = '';
    for (let i = 0; i < text.length; i++) {
      if (id !== runId) return;
      input.value += text[i];
      await wait(14 + Math.random() * 18);
    }
  }

  async function run(task, { type = false } = {}) {
    const id = ++runId;
    consoleEl.classList.add('has-run');
    log.innerHTML = '';
    result.hidden = true;
    result.classList.remove('is-approved');
    runBtn.disabled = true;
    if (type) await typeInto(task.prompt, id);
    if (id !== runId) return;

    const [x, y] = heroField.center(consoleEl);
    heroField.ripple(x, y - 100);

    for (const [text, tool, kind] of task.steps) {
      if (id !== runId) return;
      const li = document.createElement('li');
      li.className = 'is-running';
      li.innerHTML = `<span class="st"></span><span>${text}</span><span class="tool">${tool}</span>`;
      log.appendChild(li);
      await wait(520 + Math.random() * 380);
      if (id !== runId) return;
      li.className = kind === 'warn' ? 'is-warn' : 'is-done';
      li.querySelector('.st').textContent = kind === 'warn' ? '!' : '✓';
    }

    resultGrid.innerHTML = task.result.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    note.textContent = task.note;
    approve.textContent = 'Approve';
    approve.disabled = false;
    approve.onclick = () => {
      result.classList.add('is-approved');
      note.textContent = task.done;
      approve.textContent = 'Done';
      approve.disabled = true;
      heroField.ripple(x, y);
    };
    result.hidden = false;
    runBtn.disabled = false;
  }

  $$('.task').forEach(btn => btn.addEventListener('click', () => {
    $$('.task').forEach(b => b.classList.toggle('is-active', b === btn));
    current = btn.dataset.task;
    run(TASKS[current], { type: true });
  }));

  $('#prompt').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return input.focus();
    const preset = Object.entries(TASKS).find(([, t]) => t.prompt === text);
    if (preset) {
      $$('.task').forEach(b => b.classList.toggle('is-active', b.dataset.task === preset[0]));
      run(preset[1]);
    } else {
      $$('.task').forEach(b => b.classList.remove('is-active'));
      run(customTask(text));
    }
  });

  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      consoleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.select();
    }
  });

  // Auto-run the first task once the console is on screen
  let autoRan = false;
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting && !autoRan) {
      autoRan = true; obs.disconnect();
      setTimeout(() => run(TASKS.reconcile, { type: true }), 900);
    }
  }, { threshold: .4 }).observe(consoleEl);

  /* ─────────────────────────────────────────────
     01 — scroll-driven steps
     ───────────────────────────────────────────── */
  const steps = $$('.step'), stages = $$('.stage-card');
  function setStep(i) {
    steps.forEach((s, j) => s.classList.toggle('is-active', i === j));
    stages.forEach((s, j) => s.classList.toggle('is-active', i === j));
  }
  setStep(0);
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setStep(+e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => { stepObs.observe(s); s.addEventListener('click', () => setStep(+s.dataset.step)); });

  /* ─────────────────────────────────────────────
     Reveal + counters
     ───────────────────────────────────────────── */
  $$('.section-head, .card, .step, .story, .quote, .ratings, .trust li, .audit, .integrations, .plan-card, .stat').forEach(el => el.classList.add('reveal'));
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
      e.target.style.transitionDelay = `${Math.max(0, sibs.indexOf(e.target)) * 70}ms`;
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
        const p = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ─────────────────────────────────────────────
     Nav state + progress rail
     ───────────────────────────────────────────── */
  const nav = $('#nav');
  const lightSections = $$('.how, .caps, .customers, .security, .stack');
  const railLinks = $$('.rail a');
  function onScroll() {
    nav.classList.toggle('is-scrolled', scrollY > 40);
    const probe = 50;
    const onLight = lightSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    nav.classList.toggle('is-light', onLight);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const railObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) railLinks.forEach(a => a.classList.toggle('is-active', a.dataset.rail === e.target.dataset.section));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  $$('[data-section]').forEach(s => railObs.observe(s));

  /* ─────────────────────────────────────────────
     03 — dithered orb artwork (ordered Bayer dither)
     The light source follows the cursor.
     ───────────────────────────────────────────── */
  const orb = $('#orb');
  if (orb) {
    const ctx = orb.getContext('2d');
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
    const cell = 5;
    let size, n, light = { x: -.5, y: -.6 }, target = { x: -.5, y: -.6 }, on = true, t0 = 0;

    function resizeOrb() {
      size = orb.clientWidth;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      orb.width = orb.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      n = Math.floor(size / cell);
    }
    function draw(now) {
      if (on) {
        t0 = now / 1000;
        light.x += (target.x - light.x) * .05;
        light.y += (target.y - light.y) * .05;
        ctx.clearRect(0, 0, size, size);
        const lx = light.x + Math.sin(t0 * .4) * .1, ly = light.y, lz = .75;
        const ll = Math.hypot(lx, ly, lz);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = (i / n) * 2 - 1, y = (j / n) * 2 - 1;
          const r2 = x * x + y * y;
          if (r2 > .72) continue;
          const z = Math.sqrt(.72 - r2);
          let lum = Math.max(0, (x * lx + y * ly + z * lz) / (Math.sqrt(.72) * ll));
          lum = Math.pow(lum, 1.6);
          const th = BAYER[(j % 4) * 4 + (i % 4)];
          if (lum > th) {
            const hot = lum > .86 + th * .12;
            ctx.fillStyle = hot ? '#E6FF2B' : `rgba(255,255,255,${.22 + lum * .6})`;
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
