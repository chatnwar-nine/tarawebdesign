/* Vael — brand guidelines interactions */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Faces: eyes follow the cursor and blink */
  const faces = $$('.vael');
  let px = innerWidth / 2, py = innerHeight / 3, queued = false;
  function look() {
    queued = false;
    for (const f of faces) {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const s = r.width, dx = px - (r.left + s / 2), dy = py - (r.top + s / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 400);
      f.style.setProperty('--lx', `${(dx / d) * k * s * .14}px`);
      f.style.setProperty('--ly', `${(dy / d) * k * s * .1}px`);
    }
  }
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!queued) { queued = true; requestAnimationFrame(look); } });
  if (!reduced) faces.forEach(f => {
    const blink = () => { f.classList.add('blink'); setTimeout(() => f.classList.remove('blink'), 130); setTimeout(blink, 2500 + Math.random() * 4000); };
    setTimeout(blink, 1000 + Math.random() * 3000);
  });

  /* Chapter nav: highlight the chapter on screen */
  const links = $$('.bg-toc a');
  const chObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('.bg-ch').forEach(s => chObs.observe(s));

  /* Imagery: dot field sample */
  const field = $('#bg-field');
  if (field) {
    const ctx = field.getContext('2d'), gap = 18;
    let w, h, mx = -999, my = -999, t = 0, on = true;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = field.clientWidth; h = field.clientHeight;
      field.width = w * dpr; field.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    field.parentElement.addEventListener('pointermove', e => { const r = field.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    field.parentElement.addEventListener('pointerleave', () => { mx = my = -999; });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(field);
    const frame = () => {
      if (on) {
        t += .012; ctx.clearRect(0, 0, w, h);
        for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
          const d = Math.hypot(x - mx, y - my), g = d < 150 ? (1 - d / 150) ** 2 : 0;
          const cd = Math.hypot(x - w / 2, y - h * .7) / Math.hypot(w, h);
          const a = .14 + ((Math.sin(cd * 18 - t * 2.2) + 1) / 2) * .4 * (1 - cd) + g * .9;
          const s = 1.6 + g * 1.8;
          ctx.fillStyle = g > .04 ? `rgba(230,255,43,${a})` : `rgba(255,255,255,${a})`;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      if (!reduced) requestAnimationFrame(frame);
    };
    addEventListener('resize', size); size(); frame();
  }

  /* Imagery: dithered orb sample */
  const orb = $('#bg-orb');
  if (orb) {
    const ctx = orb.getContext('2d');
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
    const cell = 4, light = { x: -.5, y: -.6 }, target = { x: -.5, y: -.6 };
    let s, n, on = true;
    const size = () => {
      s = orb.clientWidth; const dpr = Math.min(devicePixelRatio || 1, 2);
      orb.width = orb.height = s * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); n = Math.floor(s / cell);
    };
    orb.parentElement.addEventListener('pointermove', e => {
      const r = orb.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1; target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(orb);
    const draw = () => {
      if (on) {
        light.x += (target.x - light.x) * .06; light.y += (target.y - light.y) * .06;
        ctx.clearRect(0, 0, s, s);
        const lx = light.x, ly = light.y, lz = .75, ll = Math.hypot(lx, ly, lz);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = (i / n) * 2 - 1, y = (j / n) * 2 - 1, r2 = x * x + y * y;
          if (r2 > .72) continue;
          const z = Math.sqrt(.72 - r2);
          const lum = Math.pow(Math.max(0, (x * lx + y * ly + z * lz) / (Math.sqrt(.72) * ll)), 1.6);
          const th = BAYER[(j % 4) * 4 + (i % 4)];
          if (lum > th) {
            ctx.fillStyle = lum > .86 + th * .12 ? '#E6FF2B' : `rgba(255,255,255,${.22 + lum * .6})`;
            ctx.fillRect(i * cell, j * cell, cell - 1.1, cell - 1.1);
          }
        }
      }
      if (!reduced) requestAnimationFrame(draw);
    };
    addEventListener('resize', size); size(); draw();
  }
})();
