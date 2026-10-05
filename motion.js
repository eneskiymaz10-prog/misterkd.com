/* Mister KD — "The Shelf". Motion: the sticker ring (continuous, pausable), "restock"
   (packs drop onto the rail once per shelf), the process rail, and the spec-sheet spring.
   Native WAAPI + IntersectionObserver. Content is never hidden waiting for JS: every animation
   starts from a visible state or uses fill: backwards only while it runs. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  const settle = 'cubic-bezier(.34,1.56,.64,1)';
  const easeOut = 'cubic-bezier(.16,1,.3,1)';
  const lift = 'cubic-bezier(.2,.7,.2,1)';   // a hand placing a pack: no overshoot

  function animate(node, frames, options) {
    if (reduce.matches || !node || typeof node.animate !== 'function') return null;
    const a = node.animate(frames, { fill: 'backwards', ...options });
    running.add(a);
    a.finished.catch(() => {}).finally(() => running.delete(a));
    return a;
  }

  /* ---------- Pause control: stops every continuous motion (the ring is the only one) ---------- */
  const toggle = document.querySelector('.motion-toggle');
  const label = toggle.querySelector('.motion-toggle__label');
  let paused = false;
  function syncToggle() {
    toggle.hidden = reduce.matches;
    root.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Resume motion' : 'Pause motion';
  }
  toggle.addEventListener('click', () => { paused = !paused; syncToggle(); });
  syncToggle();

  /* ---------- Opener: the sticker presses on, the front shelf restocks (once, ≤1s) ---------- */
  if (scrollY < 120) {
    animate(document.querySelector('.sticker__disc'), [
      { transform: 'scale(.9) rotate(-8deg)', opacity: 0 },
      { transform: 'scale(1) rotate(0)', opacity: 1 },
    ], { duration: 760, delay: 120, easing: settle });
    restock(Array.from(document.querySelectorAll('.front__item img')), 260);
  }

  /* ---------- Restock: packs are set down 16px onto the board, left to right; their contact shadows
     come in with them (a pack in the air casts none) ---------- */
  function restock(images, baseDelay = 0) {
    const duration = 480;
    const span = 700 - duration;                       // the whole shelf lands within ~700ms
    const stagger = images.length > 1 ? Math.min(35, span / (images.length - 1)) : 0;
    images.forEach((img, i) => {
      const delay = baseDelay + Math.round(i * stagger);
      animate(img, [
        { transform: 'translateY(-16px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration, delay, easing: lift });
      const stand = img.parentElement;                 // .pack__stage / .mini / .front__item own the ::after shadow
      if (stand) animate(stand, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: lift, pseudoElement: '::after' });
    });
  }
  if ('IntersectionObserver' in window) {
    const shelfObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        shelfObserver.unobserve(entry.target);
        const imgs = Array.from(entry.target.querySelectorAll('.pack__stage img, .mini img'));
        // Only packs that are actually on screen restock; the rest are already standing.
        const visible = imgs.filter(img => { const r = img.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.top < innerHeight; });
        restock(visible.slice(0, 14));
      });
    }, { threshold: 0, rootMargin: '0px 0px -18% 0px' });
    document.querySelectorAll('.shelf, .minis').forEach(s => shelfObserver.observe(s));

    // Section headings: one quiet reveal each, from a visible state.
    const headObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        headObserver.unobserve(entry.target);
        animate(entry.target, [{ opacity: .35, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: easeOut });
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('section:not(.hero) .display, .brief__title, .aisle__no').forEach(h => headObserver.observe(h));
  }

  /* ---------- Process: the bench. The readout follows the step being read; stages light up as they pass ----------
     Stacked (≤1099): the step being read is the last one whose middle has crossed 40% of the viewport.
     One row (desktop): the rail fills from the moment it enters (90%) until the whole row of six has been
     scrolled to the upper half (its bottom at 60%), so 06 lights only once every step has been in view. */
  const line = document.querySelector('.line');
  const fillBar = document.querySelector('.line__fill');
  const miniBar = document.querySelector('.readout__bar span');
  const stagesBox = document.querySelector('.stages');
  const stages = Array.from(document.querySelectorAll('.stage'));
  const readout = document.querySelector('.readout__now');
  let active = -1;
  let frame = 0;
  function updateProcess() {
    frame = 0;
    if (!line) return;
    let index;
    let p;
    if (innerWidth < 1100) {
      const mark = innerHeight * .4;
      index = 0;
      stages.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top + r.height / 2 <= mark) index = i; });
      const first = stages[0].getBoundingClientRect();
      const last = stages[stages.length - 1].getBoundingClientRect();
      const a = first.top + first.height / 2;
      const b = last.top + last.height / 2;
      p = Math.max(0, Math.min(1, (mark - a) / Math.max(1, b - a)));
    } else {
      const r = line.getBoundingClientRect();
      const rowH = stagesBox.getBoundingClientRect().height;
      const start = innerHeight * .9;
      const end = innerHeight * .6 - rowH;
      p = Math.max(0, Math.min(1, (start - r.top) / Math.max(1, start - end)));
      index = Math.min(stages.length - 1, Math.floor(p * stages.length * .999));
    }
    if (reduce.matches) p = Math.max(p, (index + 1) / stages.length);
    fillBar.style.setProperty('--p', p.toFixed(3));
    if (miniBar) miniBar.style.setProperty('--p', ((index + 1) / stages.length).toFixed(3));
    if (index !== active) {
      active = index;
      readout.textContent = String(index + 1).padStart(2, '0');
      stages.forEach((s, i) => { s.classList.toggle('is-active', i === index); s.classList.toggle('is-done', i < index); });
      animate(readout, [{ opacity: .3, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: easeOut });
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(updateProcess); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  updateProcess();

  /* ---------- Spec sheet: the pack is placed on the rail ---------- */
  document.addEventListener('kd:product-change', () => {
    const img = document.querySelector('.spec__media img');
    animate(img, [{ opacity: 0, transform: 'translateY(-16px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: lift });
  });
  document.addEventListener('kd:product-open', () => {
    animate(document.querySelector('.spec'), [{ opacity: .4, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: easeOut });
  });

  /* ---------- Reduced motion is honoured live ---------- */
  reduce.addEventListener('change', () => {
    running.forEach(a => a.cancel());
    running.clear();
    syncToggle();
    active = -1;
    schedule();
  });
})();
