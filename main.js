/* Mister KD — "The Shelf". Interactions, progressively enhanced.
   Without JS: every pack is a link to its image, the aisle links work, the brief shows every field.
   No innerHTML: the DOM is built with createElement / textContent / append. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const mobile = matchMedia('(max-width: 760px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const smooth = () => (reduce.matches ? 'auto' : 'smooth');
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- Header: follows the reader, hides on the way down, returns on the way up ---------- */
  const header = $('.site-header');
  const nav = $('#site-nav');
  const menuButton = $('.menu-toggle');
  let lastY = scrollY;
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY;
    const menuOpen = nav.classList.contains('is-open');
    const focusInHeader = header.contains(document.activeElement);
    root.classList.toggle('at-top', y < 8);
    if (menuOpen || focusInHeader || y < 160) root.classList.remove('header-hidden');
    else if (y > lastY + 6) root.classList.add('header-hidden');
    else if (y < lastY - 6) root.classList.remove('header-hidden');
    lastY = y;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  header.addEventListener('focusin', () => root.classList.remove('header-hidden'));
  onScroll();

  // Header colours follow the surface under it (data-surface on each section).
  const surfaces = $$('[data-surface]');
  let surfaceObserver = null;
  function watchSurfaces() {
    if (!('IntersectionObserver' in window)) return;
    if (surfaceObserver) surfaceObserver.disconnect();
    const line = Math.round(header.offsetHeight / 2);
    surfaceObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) header.dataset.surface = entry.target.dataset.surface; });
    }, { rootMargin: `-${line}px 0px -${Math.max(0, innerHeight - line - 1)}px 0px` });
    surfaces.forEach(s => surfaceObserver.observe(s));
  }
  watchSurfaces();
  let resizeTimer = 0;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(watchSurfaces, 150); });

  /* ---------- In-page links: land on the target line every time ----------
     The landing line is html's scroll-padding-top + the target's scroll-margin-top (both in CSS).
     Smooth scrolling runs first; when it settles, the position is re-measured and corrected instantly
     (lazy images or a late font may have moved the target on the way), then focus moves if asked. */
  function landingY(target) {
    if (target.id === 'top') return 0;
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const y = target.getBoundingClientRect().top + scrollY - pad - margin;
    return Math.round(Math.max(0, Math.min(y, root.scrollHeight - innerHeight)));
  }
  function jumpTo(y) { // instant, whatever html { scroll-behavior } says
    const before = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    scrollTo(0, y);
    root.style.scrollBehavior = before;
  }
  let userScrolled = false;
  ['wheel', 'touchmove', 'keydown'].forEach(type => addEventListener(type, () => { userScrolled = true; }, { passive: true }));
  function whenSettled(callback) {
    let done = false;
    let last = scrollY;
    let still = 0;
    const started = performance.now();
    const finish = () => { if (done) return; done = true; removeEventListener('scrollend', finish); callback(); };
    if ('onscrollend' in window) addEventListener('scrollend', finish);
    (function poll() { // fallback for browsers without scrollend, and a safety net for no-op scrolls
      if (done) return;
      const y = scrollY;
      still = Math.abs(y - last) < 1 ? still + 1 : 0;
      last = y;
      const elapsed = performance.now() - started;
      if ((still > 12 && elapsed > 250) || elapsed > 2400) finish(); else requestAnimationFrame(poll);
    })();
  }
  let navToken = 0;
  function goTo(target, focusEl) {
    const token = ++navToken;
    userScrolled = false;
    const settle = () => {
      if (token !== navToken) return;
      if (!userScrolled) { const y = landingY(target); if (Math.abs(scrollY - y) > 2) jumpTo(y); }
      if (focusEl) focusEl.focus({ preventScroll: true });
    };
    const y = landingY(target);
    if (reduce.matches || Math.abs(scrollY - y) < 2) { jumpTo(y); requestAnimationFrame(settle); return; }
    scrollTo({ top: y, behavior: 'smooth' });
    whenSettled(settle);
  }
  const briefHeading = () => document.getElementById('contact-title');
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.classList.contains('skip-link')) return; // native: moves the focus start point to <main>
    const id = decodeURIComponent(link.hash.slice(1));
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    goTo(target, id === 'contact' ? briefHeading() : null);
  });
  // Deep links (llms.txt, shared URLs): once fonts and images have settled, put the target back on its line.
  (function settleDeepLink() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && id !== 'top' && document.getElementById(id);
    if (!target) return;
    userScrolled = false;
    const fix = () => { if (!userScrolled) { const y = landingY(target); if (Math.abs(scrollY - y) > 2) jumpTo(y); } };
    requestAnimationFrame(fix);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fix);
    addEventListener('load', () => { fix(); setTimeout(fix, 250); }, { once: true });
  })();

  /* ---------- Mobile menu ---------- */
  function setMenu(open, returnFocus) {
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    $('.menu-toggle__label', menuButton).textContent = open ? 'Close' : 'Menu';
    if (open) root.classList.remove('header-hidden');
    if (!open && returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, true); });
  document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !header.contains(e.target)) setMenu(false); });
  mobile.addEventListener('change', () => setMenu(false));

  /* ---------- The shelf: every count comes from the DOM ---------- */
  const packs = $$('.shelf .pack');
  const aisles = $$('.aisle');
  const total = packs.length;
  const byBrand = {};
  packs.forEach(p => { byBrand[p.dataset.brand] = (byBrand[p.dataset.brand] || 0) + 1; });
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  $$('[data-count]').forEach(el => {
    const key = el.dataset.count;
    el.textContent = String(key === 'total' ? total : (byBrand[key] || 0));
  });
  aisles.forEach(aisle => {
    const n = $$('.pack', aisle).length;
    const count = $('.aisle__count', aisle);
    const num = document.createElement('span');
    num.dataset.aisleTotal = '';
    num.textContent = String(n);
    count.replaceChildren(num, document.createTextNode(n === 1 ? ' creation' : ' creations'));
  });
  const aisleCount = cat => $$(`#aisle-${cat} .pack`).length;
  const aisleNames = { bars: 'Bars & chocolate', cereal: 'Cereal', puffs: 'Puffs & chips', spreads: 'Spreads', bakery: 'Bakery', drinks: 'Drinks' };
  const status = $('.shelf-status');
  const defaultStatus = () => `All ${total} creations on the shelf, in six aisles and product-number order.`;
  status.textContent = defaultStatus();

  /* ---------- Highlight a brand (never filters: the shelf geometry never moves) ---------- */
  const highlight = $('.highlight');
  const highlightButtons = $$('[data-highlight]', highlight);
  let activeBrand = 'all';
  const isLit = pack => activeBrand === 'all' || pack.dataset.brand === activeBrand;
  function applyHighlight(brand, announce = true) {
    activeBrand = brand;
    packs.forEach(p => p.classList.toggle('is-dim', !isLit(p)));
    highlightButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.highlight === brand)));
    aisles.forEach(aisle => {
      const cat = aisle.dataset.aisle;
      const all = $$('.pack', aisle);
      const lit = all.filter(isLit).length;
      // The note's line is always reserved (CSS), so highlighting never moves a shelf.
      const note = $('.aisle__note', aisle);
      note.hidden = false;
      note.textContent = brand === 'all' ? '' : lit === 0 ? `No ${brand} creations in this aisle` : `${lit} of ${all.length} highlighted`;
      const chip = $(`[data-aisle-chip="${cat}"]`);
      if (chip) {
        chip.textContent = brand === 'all' ? String(all.length) : `${lit}/${all.length}`;
        chip.closest('.aisle-chip').classList.toggle('is-empty', brand !== 'all' && lit === 0);
        chip.closest('.aisle-chip').setAttribute('aria-label', brand === 'all'
          ? `Aisle ${chip.closest('.aisle-chip').querySelector('.aisle-chip__no').textContent}, ${aisleNames[cat]}, ${plural(all.length, 'creation')}`
          : `Aisle ${chip.closest('.aisle-chip').querySelector('.aisle-chip__no').textContent}, ${aisleNames[cat]}, ${lit} of ${all.length} highlighted`);
      }
    });
    requestAnimationFrame(() => aisles.forEach(updateRail)); // reads after all writes, once per frame
    if (announce) status.textContent = brand === 'all' ? defaultStatus() : `${plural(packs.filter(isLit).length, `${brand} creation`)} highlighted. The others stay on the shelf, dimmed.`;
    emit('kd:highlight', { brand });
  }
  highlight.hidden = false;
  highlightButtons.forEach(b => b.addEventListener('click', () => applyHighlight(b.dataset.highlight === activeBrand && b.dataset.highlight !== 'all' ? 'all' : b.dataset.highlight)));
  // "See all 13 on the shelf" links in the brand bays highlight that brand, then jump to the aisles.
  $$('[data-show-brand]').forEach(link => link.addEventListener('click', () => applyHighlight(link.dataset.showBrand)));

  /* ---------- Aisle bar: the active aisle follows the reader ---------- */
  const aisleChips = $$('.aisle-chip');
  const aisleList = $('.aisle-bar__list');
  function setActiveAisle(id) {
    aisleChips.forEach(chip => {
      const on = chip.getAttribute('href') === `#${id}`;
      if (on) {
        chip.setAttribute('aria-current', 'true');
        const left = chip.offsetLeft - (aisleList.clientWidth - chip.offsetWidth) / 2;
        if (aisleList.scrollWidth > aisleList.clientWidth) aisleList.scrollTo({ left: Math.max(0, left), behavior: smooth() });
      } else chip.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const aisleObserver = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target.id, e.isIntersecting));
      const current = aisles.find(a => seen.get(a.id));
      if (current) setActiveAisle(current.id);
      else aisleChips.forEach(c => c.removeAttribute('aria-current'));
    }, { rootMargin: '-40% 0px -55% 0px' });
    aisles.forEach(a => aisleObserver.observe(a));
  }

  /* ---------- Mobile rails: previous / next, and a visible "more" count ---------- */
  function updateRail(aisle) {
    const shelf = $('.shelf', aisle);
    const ctrl = $('.aisle__ctrl', aisle);
    if (!mobile.matches) { ctrl.hidden = true; return; }
    const scrollable = shelf.scrollWidth > shelf.clientWidth + 4;
    ctrl.hidden = !scrollable;
    if (!scrollable) return;
    const [prev, next] = $$('[data-scroll]', ctrl);
    prev.disabled = shelf.scrollLeft < 8;
    next.disabled = shelf.scrollLeft + shelf.clientWidth > shelf.scrollWidth - 8;
    const edge = shelf.getBoundingClientRect().right;
    const remaining = $$('.facing', shelf).filter(f => f.getBoundingClientRect().left > edge - 24).length;
    $('.aisle__more', aisle).textContent = remaining ? `→ ${remaining}` : '';
  }
  aisles.forEach(aisle => {
    const shelf = $('.shelf', aisle);
    let raf = 0;
    shelf.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateRail(aisle); }); }, { passive: true });
    $$('[data-scroll]', aisle).forEach(btn => btn.addEventListener('click', () => {
      const facing = $('.facing', shelf);
      const step = facing ? facing.getBoundingClientRect().width : shelf.clientWidth * .8;
      shelf.scrollBy({ left: Number(btn.dataset.scroll) * Math.max(step, shelf.clientWidth - step), behavior: smooth() });
    }));
    updateRail(aisle);
  });
  // The hero's front shelf scrolls sideways on phones: make it a named, focusable region only then.
  const front = $('.front__packs');
  function syncFront() {
    const scrollable = front.scrollWidth > front.clientWidth + 4;
    if (scrollable) {
      front.removeAttribute('aria-hidden');
      front.setAttribute('role', 'region');
      front.setAttribute('aria-label', 'Front shelf: nine of my creations');
      front.tabIndex = 0;
    } else {
      front.setAttribute('aria-hidden', 'true');
      front.removeAttribute('role');
      front.removeAttribute('aria-label');
      front.removeAttribute('tabindex');
    }
  }
  const onLayout = () => { syncFront(); aisles.forEach(updateRail); if (dialog.open) placeFoot(); }; // runs after init (load / resize)
  mobile.addEventListener('change', onLayout);
  addEventListener('resize', () => { clearTimeout(onLayout.t); onLayout.t = setTimeout(onLayout, 120); });
  addEventListener('load', onLayout);
  syncFront();
  applyHighlight('all', false);

  /* ---------- Spec sheet (lightbox) ---------- */
  const dialog = $('#spec');
  const media = $('.spec__media', dialog);
  const develop = $('[data-develop]', dialog);
  let sequence = [];
  let current = null;
  let opener = null;
  let returnFocus = true;
  function fill(pack) {
    current = pack;
    const source = $('img', pack);
    let img = $('img', media);
    if (!img) { img = document.createElement('img'); img.decoding = 'async'; media.prepend(img); }
    const natW = Number(source.getAttribute('width'));
    const natH = Number(source.getAttribute('height'));
    const src = source.getAttribute('src');
    const stem = src.split('/').pop().replace(/\.webp$/, '');
    const scale = (Array.from(pack.classList).find(c => c.startsWith('pack--')) || 'pack--pouch').slice(6);
    dialog.dataset.scale = scale;
    // Never drawn above the file's pixels on a 2x screen: the box is capped at half the natural size.
    img.style.setProperty('--cap-w', `${Math.floor(natW / 2)}px`);
    img.style.setProperty('--cap-h', `${Math.floor(natH / 2)}px`);
    img.style.setProperty('--ar', `${natW} / ${natH}`);
    img.width = natW;
    img.height = natH;
    // One file, picked for the size it is drawn at (no srcset here, so naturalWidth is the file's real width).
    img.dataset.files = JSON.stringify([400, 600, 800, 1200].filter(w => w < natW).map(w => [w, `derived/c/${stem}-${w}.webp`]).concat([[natW, src]]));
    img.dataset.ratio = String(natW / natH);
    const guess = Math.min(natW / 2, mobile.matches ? 340 : 480);
    img.src = chooseFile(img, guess);
    const name = $('.label__name', pack).textContent;
    const brand = pack.dataset.brand;
    img.alt = `${brand} — ${name}`;
    $('.spec__name', dialog).textContent = name;
    $('.spec__brand', dialog).textContent = brand;
    $('.spec__format', dialog).textContent = pack.dataset.format;
    // Claim fragments ('15g protein', '· monk fruit') each stay on one line, as on the shelf ticket.
    const claim = $('.spec__claim', dialog);
    const fragments = $$('.cf', $('.label__claim', pack));
    if (fragments.length) {
      claim.replaceChildren();
      fragments.forEach((cf, i) => {
        const span = document.createElement('span');
        span.className = 'cf';
        span.textContent = cf.textContent;
        if (i) claim.append(' ');
        claim.append(span);
      });
    } else claim.textContent = $('.label__claim', pack).textContent;
    $('.spec__pos', dialog).textContent = `No. ${pack.dataset.no} · ${sequence.indexOf(pack) + 1} of ${sequence.length}`;
    placeFoot();
    emit('kd:product-change', { pack });
  }
  // The pack's contact shadow on the board is as wide as the pack is drawn (object-fit: contain).
  function placeFoot() {
    const img = $('img', media);
    if (!img || !img.offsetWidth) return;
    const w = img.offsetWidth;
    const drawn = dialog.dataset.scale === 'plate' ? w : Math.min(w, img.offsetHeight * Number(img.dataset.ratio));
    media.style.setProperty('--foot', `${Math.round(drawn)}px`);
  }
  // Smallest file that still covers the drawn width at this screen's density.
  function chooseFile(img, drawnGuess) {
    const files = JSON.parse(img.dataset.files);
    let drawn = drawnGuess;
    const w = img.offsetWidth; // layout box: unaffected by the placing animation's transform
    const h = img.offsetHeight;
    if (w) drawn = dialog.dataset.scale === 'plate' ? w : Math.min(w, h * Number(img.dataset.ratio));
    const need = Math.ceil(drawn * (window.devicePixelRatio || 1));
    return (files.find(([fw]) => fw >= need) || files[files.length - 1])[1];
  }
  function refineFile() { // after layout: swap to a better-fitting file only if the first guess was off
    const img = $('img', media);
    if (!img) return;
    const best = chooseFile(img, 0);
    if (best && best !== img.getAttribute('src')) img.src = best;
  }
  function openPack(pack) {
    if (typeof dialog.showModal !== 'function') return false;
    opener = pack;
    returnFocus = true;
    sequence = isLit(pack) ? packs.filter(isLit) : packs.slice();
    fill(pack);
    dialog.showModal();
    refineFile();
    placeFoot();
    root.classList.add('is-modal');
    $('.spec__close', dialog).focus();
    emit('kd:product-open');
    return true;
  }
  packs.forEach(pack => pack.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (openPack(pack)) e.preventDefault();
  }));
  const step = dir => { if (sequence.length) fill(sequence[(sequence.indexOf(current) + dir + sequence.length) % sequence.length]); };
  $$('[data-dir]', dialog).forEach(b => b.addEventListener('click', () => step(Number(b.dataset.dir))));
  $('.spec__close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    root.classList.remove('is-modal');
    if (returnFocus && opener && opener.isConnected) opener.focus({ preventScroll: true });
  });

  /* ---------- The brief: intent → project → details; downloads while sending is off ---------- */
  const form = $('#contactForm');
  const steps = $$('.step', form);
  const dots = $$('[data-step-dot]');
  const back = $('[data-step-go="-1"]', form);
  const next = $('[data-step-go="1"]', form);
  const submit = $('.brief__submit', form);
  const submitLabel = $('.brief__submit-label', submit);
  const briefStatus = $('.brief__status', form);
  const briefTitle = $('#contact-title');
  const configured = () => {
    const key = form.elements.access_key.value.trim();
    return key !== '' && key !== 'WEB3FORMS_ACCESS_KEY';
  };
  let stepNow = 1;
  form.classList.add('is-stepped');
  $('.brief__steps').hidden = false;
  steps.forEach(s => { s.tabIndex = -1; });
  function showStep(n, focus) {
    stepNow = n;
    steps.forEach(s => s.classList.toggle('is-current', Number(s.dataset.step) === n));
    back.hidden = n === 1;
    next.hidden = n === steps.length;
    submit.hidden = n !== steps.length;
    dots.forEach(d => {
      const k = Number(d.dataset.stepDot);
      if (k === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      d.classList.toggle('is-done', k < n);
    });
    if (focus) steps[n - 1].focus({ preventScroll: true });
    const box = form.getBoundingClientRect();
    if (focus && (box.top < 0 || box.top > innerHeight * .6)) $('#contact').scrollIntoView({ behavior: smooth(), block: 'start' });
  }
  const messages = {
    intent: 'Choose what you want help with.',
    message: 'Tell Kadir a little about the product or project.',
    name: 'Add your name.',
    email: 'Add your email address.',
    emailBad: 'Check the email address, for example name@company.com.',
    consent: 'Tick the box so Kadir can reply to this brief.',
  };
  const errorFor = name => ({ intent: 'err-intent', message: 'err-msg', name: 'err-name', email: 'err-email', consent: 'err-consent' }[name]);
  function setError(name, text) {
    const el = document.getElementById(errorFor(name));
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    const fields = name === 'intent' ? $$('input[name="intent"]', form) : [form.elements[name]];
    fields.forEach(f => { if (text) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); });
  }
  function checkField(name) {
    if (name === 'intent') {
      const ok = !!form.querySelector('input[name="intent"]:checked');
      setError('intent', ok ? '' : messages.intent);
      return ok;
    }
    const field = form.elements[name];
    if (field.checkValidity()) { setError(name, ''); return true; }
    let text = messages[name];
    if (name === 'email' && field.value.trim()) text = messages.emailBad;
    setError(name, text);
    return false;
  }
  const stepFields = { 1: ['intent'], 2: ['message'], 3: ['name', 'email', 'consent'] };
  function validateStep(n) {
    const bad = stepFields[n].filter(name => !checkField(name));
    if (!bad.length) return true;
    const first = bad[0] === 'intent' ? $('input[name="intent"]', form) : form.elements[bad[0]];
    first.focus();
    if (typeof first.reportValidity === 'function') first.reportValidity();
    return false;
  }
  ['message', 'name', 'email', 'consent'].forEach(name => {
    const field = form.elements[name];
    // Errors appear on Next / Submit only; leaving a field never inserts text above the button being clicked.
    field.addEventListener(name === 'consent' ? 'change' : 'blur', () => { if (field.getAttribute('aria-invalid') === 'true') checkField(name); });
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') checkField(name); });
  });
  $$('input[name="intent"]', form).forEach(r => r.addEventListener('change', () => checkField('intent')));
  next.addEventListener('click', () => { if (validateStep(stepNow)) showStep(stepNow + 1, true); });
  back.addEventListener('click', () => showStep(stepNow - 1, true));
  // Enter in a single-line field moves forward instead of submitting early.
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"])') && stepNow < steps.length) { e.preventDefault(); next.click(); }
  });
  function selectIntent(value) {
    const radio = $$('input[name="intent"]', form).find(r => r.value === value);
    if (radio) { radio.checked = true; checkField('intent'); }
  }

  // The lightbox CTA: Partnership, a pre-filled message only if it is empty, then focus the brief.
  develop.addEventListener('click', e => {
    e.preventDefault();
    const name = $('.spec__name', dialog).textContent;
    const brand = $('.spec__brand', dialog).textContent;
    returnFocus = false;
    dialog.close();
    selectIntent('Partnership');
    const message = form.elements.message;
    if (!message.value.trim()) message.value = `About: ${name} (${brand})`;
    showStep(2, false);
    if (location.hash !== '#contact') history.pushState(null, '', '#contact');
    // Phones stack the brief: land on the pre-filled project step itself; wider screens show the whole brief card.
    if (mobile.matches) goTo(form, steps[1]); else goTo($('#contact'), briefTitle);
  });
  // Any other link with data-intent pre-selects the topic.
  $$('a[data-intent]').forEach(link => link.addEventListener('click', () => selectIntent(link.dataset.intent)));
  // Every "Work with KD" link lands on the brief with focus on its heading (see goTo above).

  function briefText(data) {
    return [
      'A brief for Kadir Demir / Mister KD',
      '',
      `Topic: ${data.get('intent')}`,
      `Name: ${data.get('name')}`,
      `Email: ${data.get('email')}`,
      `Company: ${data.get('company') || '—'}`,
      '',
      'The product or project',
      String(data.get('message')),
      '',
      'Prepared on misterkd.com. Saved on your device; nothing was sent from the page.',
    ].join('\n');
  }
  function say(text, ok) {
    briefStatus.textContent = text;
    briefStatus.classList.toggle('is-ok', !!ok);
    const r = briefStatus.getBoundingClientRect();
    if (r.bottom > innerHeight - 90 || r.top < 0) briefStatus.scrollIntoView({ behavior: smooth(), block: 'center' });
  }
  if (configured()) {
    submitLabel.textContent = 'Send my brief';
    $('.brief__state', form).textContent = 'Your brief goes straight to Kadir.';
    $('.brief__privacy', form).textContent = 'Your details are used only to reply to this enquiry.';
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    for (let n = 1; n <= steps.length; n++) {
      const bad = stepFields[n].filter(name => !checkField(name));
      if (bad.length) { showStep(n, false); validateStep(n); return; }
    }
    if (form.elements.botcheck.checked) return;
    const data = new FormData(form);
    if (!configured()) {
      const url = URL.createObjectURL(new Blob([briefText(data)], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brief-for-kadir-demir.txt';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      say('Your brief is saved as brief-for-kadir-demir.txt. Nothing was sent from this page.', true);
      return;
    }
    submit.disabled = true;
    say('Sending your brief…');
    try {
      const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Delivery failed');
      say('Thank you. Your brief has been sent to Kadir.', true);
      form.reset();
      showStep(1, false);
    } catch (err) {
      say('Your brief could not be sent. Your details are still here.');
    } finally {
      submit.disabled = false;
    }
  });
  submit.disabled = false;
  showStep(1, false);

  /* ---------- Direct line: renders only when kd-contact holds real values ---------- */
  (function directLine() {
    let config = {};
    try { config = JSON.parse(($('#kd-contact') || {}).textContent || '{}') || {}; } catch (err) { config = {}; }
    const rows = [];
    const email = typeof config.email === 'string' ? config.email.trim() : '';
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) rows.push(['Email', `mailto:${email}`, email]);
    const linkedin = typeof config.linkedin === 'string' ? config.linkedin.trim() : '';
    if (/^https:\/\/([a-z]+\.)?linkedin\.com\/.+/i.test(linkedin)) rows.push(['LinkedIn', linkedin, linkedin.replace(/^https:\/\/(www\.)?/i, '')]);
    const whatsapp = typeof config.whatsapp === 'string' ? config.whatsapp.replace(/[^\d]/g, '') : '';
    if (whatsapp.length >= 8) rows.push(['WhatsApp', `https://wa.me/${whatsapp}`, `+${whatsapp}`]);
    if (!rows.length) return;
    const list = $('.direct__list');
    rows.forEach(([kind, href, text]) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      if (href.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener'; }
      const k = document.createElement('span');
      k.textContent = kind;
      a.append(k, document.createTextNode(text));
      li.append(a);
      list.append(li);
    });
    $('.direct').hidden = false;
  })();

  /* ---------- Sticky CTA (≤760px): after the hero, never over the brief ---------- */
  const sticky = $('.sticky-cta');
  sticky.hidden = false;
  const heroEl = $('#hero');
  const contact = $('#contact');
  let pastHero = false;
  let atBrief = false;
  const syncSticky = () => sticky.classList.toggle('is-on', pastHero && !atBrief);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; syncSticky(); }).observe(heroEl);
    new IntersectionObserver(([e]) => { atBrief = e.isIntersecting; syncSticky(); }, { rootMargin: '0px 0px -10% 0px' }).observe(contact);
  }
})();
