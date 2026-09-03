/* ───────────────────────── MISTER KD — main.js ───────────────────────── */
(function () {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const items = Array.isArray(window.CREATIONS) ? window.CREATIONS : [];

  /* ---------- nav ---------- */
  const nav = document.querySelector('.nav');
  const burger = nav.querySelector('.nav__burger');
  burger.addEventListener('click', () => { const o = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', o); });
  nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));

  /* ---------- intent from tiles ---------- */
  const intentSel = document.getElementById('c-intent');
  document.querySelectorAll('[data-intent]').forEach(a => a.addEventListener('click', () => { if (intentSel) intentSel.value = a.dataset.intent; }));

  /* ---------- gallery ---------- */
  const grid = document.getElementById('grid');
  const cards = [];
  const makeCard = (it, i) => {
    const card = document.createElement('article');
    card.className = 'card' + (it.wide ? ' card--wide' : '') + (it.tall ? ' card--tall' : '');
    card.dataset.brand = it.brand; card.dataset.cat = it.cat; card.dataset.i = i;
    card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', `${it.name}, ${it.brand}`);
    const wrap = document.createElement('div'); wrap.className = 'card__img';
    const img = document.createElement('img');
    img.src = `assets/creations/${it.img}${it.cut ? '-cut' : ''}.webp`; img.alt = `${it.brand} — ${it.name}`; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 600; img.height = 600;
    wrap.appendChild(img);
    const meta = document.createElement('div'); meta.className = 'card__meta';
    const b = document.createElement('span'); b.className = 'card__brand'; b.textContent = it.brand;
    const n = document.createElement('span'); n.className = 'card__name'; n.textContent = it.name;
    meta.append(b, n); card.append(wrap, meta);
    if (fine) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
        if (hasGsap && !reduce) gsap.to(card, { rotateY: (px - .5) * 10, rotateX: (.5 - py) * 10, duration: .5, ease: 'power2.out', transformPerspective: 800 });
      });
      card.addEventListener('pointerleave', () => { if (hasGsap && !reduce) gsap.to(card, { rotateY: 0, rotateX: 0, duration: .7, ease: 'power3.out' }); });
    }
    card.addEventListener('click', () => openLb(i));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } });
    return card;
  };
  items.forEach((it, i) => { const c = makeCard(it, i); cards.push(c); grid.appendChild(c); });
  const countEl = document.querySelector('.filter .count'); if (countEl) countEl.textContent = items.length;

  const filters = document.querySelectorAll('.filter');
  const applyFilter = (key) => {
    let shown = 0;
    cards.forEach(c => { const ok = key === 'all' || c.dataset.brand === key || c.dataset.cat === key; c.classList.toggle('is-hidden', !ok); if (ok) shown++; });
    filters.forEach(f => { const on = f.dataset.filter === key; f.classList.toggle('is-active', on); f.setAttribute('aria-selected', on); });
    if (hasGsap && !reduce) gsap.fromTo(cards.filter(c => !c.classList.contains('is-hidden')), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, stagger: .03, ease: 'power3.out', overwrite: true });
  };
  filters.forEach(f => f.addEventListener('click', () => applyFilter(f.dataset.filter)));

  /* ---------- lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img'), lbBrand = lb.querySelector('.lightbox__brand'), lbName = lb.querySelector('.lightbox__name'), lbClaim = lb.querySelector('.lightbox__claim');
  let cur = 0, lastFocus = null;
  const visible = () => cards.filter(c => !c.classList.contains('is-hidden')).map(c => +c.dataset.i);
  const fill = (i) => {
    const it = items[i]; cur = i;
    lbImg.src = `assets/creations/${it.img}${it.cut ? '-cut' : ''}.webp`; lbImg.alt = `${it.brand} — ${it.name}`;
    lbBrand.textContent = it.brand; lbName.textContent = it.name; lbClaim.textContent = it.claim || '';
    if (hasGsap && !reduce) gsap.fromTo(lbImg, { scale: .85, opacity: 0, rotate: -4 }, { scale: 1, opacity: 1, rotate: 0, duration: .7, ease: 'expo.out' });
  };
  function openLb(i) { lastFocus = document.activeElement; fill(i); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lightbox__close').focus(); }
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
  const step = (d) => { const v = visible(); if (!v.length) return; const idx = v.indexOf(cur); fill(v[(idx + d + v.length) % v.length]); };
  lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  lb.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => step(+b.dataset.dir)));
  document.addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

  /* ---------- form ---------- */
  const form = document.getElementById('contactForm');
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = form.querySelector('button[type=submit]');
    const key = form.access_key.value;
    if (!key || key === 'WEB3FORMS_ACCESS_KEY') {
      const fd = new FormData(form);
      const body = encodeURIComponent(`Topic: ${fd.get('intent')}\nName: ${fd.get('name')}\nCompany: ${fd.get('company') || '-'}\n\n${fd.get('message') || ''}`);
      location.href = `mailto:hello@misterkd.com?subject=${encodeURIComponent('Brief via misterkd.com')}&body=${body}`;
      status.textContent = 'Opening your email app…'; return;
    }
    btn.disabled = true; status.textContent = 'Sending…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const json = await res.json();
      if (res.ok && json.success) { form.classList.add('is-sent'); status.textContent = 'Got it. I reply within 48 hours.'; }
      else { status.textContent = json.message || 'Something went wrong. Email hello@misterkd.com.'; btn.disabled = false; }
    } catch { status.textContent = 'Network error. Email hello@misterkd.com.'; btn.disabled = false; }
  });

  /* ---------- fallback ---------- */
  const showAll = () => {
    document.querySelectorAll('[data-reveal], .badge__img, .badge__pack').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.querySelectorAll('[data-count]').forEach(el => el.textContent = (+el.dataset.count).toLocaleString('en-US'));
    const l = document.querySelector('.loader'); if (l) l.remove();
  };
  if (!hasGsap || reduce) { showAll(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- lenis ---------- */
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return; const t = document.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -64, duration: 1.4 });
    }));
  }

  /* ---------- cursor + magnetic ---------- */
  if (fine) {
    const c = document.querySelector('.cursor');
    const cx = gsap.quickTo(c, 'x', { duration: .22, ease: 'power3' }), cy = gsap.quickTo(c, 'y', { duration: .22, ease: 'power3' });
    window.addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); gsap.to(c, { opacity: 1, duration: .3 }); }, { passive: true });
    document.querySelectorAll('a, button, .card').forEach(el => {
      el.addEventListener('pointerenter', () => gsap.to(c, { scale: 3, duration: .3 }));
      el.addEventListener('pointerleave', () => gsap.to(c, { scale: 1, duration: .3 }));
    });
    document.querySelectorAll('.magnetic').forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: .6, ease: 'power3' }), yTo = gsap.quickTo(btn, 'y', { duration: .6, ease: 'power3' });
      btn.addEventListener('pointermove', e => { const r = btn.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * .3); yTo((e.clientY - (r.top + r.height / 2)) * .3); });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  const countUp = (el) => { const end = +el.dataset.count, o = { v: 0 }; return gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); } }); };

  document.fonts.ready.then(() => {
    document.querySelectorAll('[data-split]').forEach(el => {
      const inHero = !!el.closest('.hero');
      SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: s => inHero ? null : gsap.from(s.lines, { yPercent: 105, duration: 1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }) });
    });

    /* opener */
    const loader = document.querySelector('.loader');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.loader__mark', { opacity: 1, y: 0, duration: .8 })
      .to('.loader__bar i', { width: '100%', duration: .9, ease: 'power2.inOut' }, '-=.5')
      .to(loader, { yPercent: -100, duration: .9, ease: 'expo.inOut', delay: .15, onComplete: () => loader.remove() })
      .from('.hero__title .line', { yPercent: 105, duration: 1.1, stagger: .1 }, '-=.5')
      .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1, stagger: .1 }, '-=.8')
      .fromTo('.badge__img', { opacity: 0, scale: .7, rotate: -20 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.4 }, '-=1.1')
      .fromTo('.badge__pack', { opacity: 0, y: 60, scale: .8 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, stagger: .1 }, '-=1');

    /* hero parallax */
    if (fine) {
      const packs = [...document.querySelectorAll('.badge__pack')].map((p, i) => ({ x: gsap.quickTo(p, 'x', { duration: 1, ease: 'power3' }), y: gsap.quickTo(p, 'y', { duration: 1, ease: 'power3' }), d: [.08, .14, .2][i] }));
      const badge = document.querySelector('.badge__img');
      const bx = gsap.quickTo(badge, 'x', { duration: 1.2, ease: 'power3' }), by = gsap.quickTo(badge, 'y', { duration: 1.2, ease: 'power3' });
      window.addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; packs.forEach(p => { p.x(nx * 300 * p.d); p.y(ny * 200 * p.d); }); bx(nx * -20); by(ny * -20); }, { passive: true });
    }
    gsap.to('.hero__badge', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* reveals */
    gsap.utils.toArray('[data-reveal]').filter(el => !el.closest('.hero')).forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

    /* cards batch reveal */
    ScrollTrigger.batch('.card', { start: 'top 92%', once: true, onEnter: els => gsap.from(els, { y: 40, opacity: 0, duration: .8, stagger: .05, ease: 'power3.out' }) });

    /* counters */
    document.querySelectorAll('[data-count]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => countUp(el) }));

    /* nav state */
    ScrollTrigger.create({ start: 40, onUpdate: s => nav.classList.toggle('is-scrolled', s.scroll() > 40) });
    document.querySelectorAll('.creations, .process, .work, .exp').forEach(sec => ScrollTrigger.create({ trigger: sec, start: 'top 60px', end: 'bottom 60px', onToggle: s => nav.classList.toggle('on-light', s.isActive) }));

    /* sticky */
    const sticky = document.querySelector('.sticky-cta');
    if (sticky) ScrollTrigger.create({ trigger: '#hero', start: 'bottom 60%', endTrigger: '#contact', end: 'top 80%', onToggle: s => sticky.classList.toggle('is-visible', s.isActive) });

    ScrollTrigger.refresh();
  });
})();
