/* The dossier opens, products settle on the desk, and the process follows the reader.
   Nothing is hidden in CSS: content survives JS failure, slow fonts and reduced motion. */
(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const desk = document.querySelector('.selected');
  const process = document.querySelector('.process');
  const steps = Array.from(document.querySelectorAll('.steps li'));
  const readout = document.querySelector('.process__current');
  const running = new Set();
  const animate = (node, frames, options) => {
    if (preference.matches || !node || typeof node.animate !== 'function') return;
    const animation = node.animate(frames, { easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards', ...options });
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
    return animation;
  };

  const entrance = () => {
    if (preference.matches || window.scrollY > 120) return;
    document.querySelectorAll('.hero__line > span').forEach((line, index) => {
      animate(line, [{ transform: 'translateY(105%) rotate(2deg)' }, { transform: 'translateY(0) rotate(0)' }], { duration: 1100, delay: index * 110 });
    });
    document.querySelectorAll('.plate').forEach((plate, index) => {
      const final = getComputedStyle(plate).transform;
      const pose = final === 'none' ? '' : final;
      animate(plate, [{ opacity: 0, transform: `${pose} translate3d(${index % 2 ? 45 : -35}px,90px,0) rotate(${index % 2 ? 14 : -12}deg) scale(.9)` }, { opacity: 1, transform: pose || 'none' }], { duration: 1400, delay: 180 + index * 140 });
    });
    animate(document.querySelector('.hero__aside'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 800, delay: 350 });
  };
  // The opener depends on the DOM only; fonts never gate visibility.
  entrance();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        observer.unobserve(node);
        const card = node.classList.contains('card');
        animate(node, [{ opacity: card ? .15 : .45, transform: `translateY(${card ? 32 : 20}px)` }, { opacity: 1, transform: 'translateY(0)' }], { duration: card ? 850 : 800, delay: card ? Math.min(Number(node.dataset.revealIndex || 0) % 3 * 65, 130) : 0 });
      });
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.card, .section-heading, .brand, .about__copy, .work-row, .contact__intro').forEach((node, index) => { node.dataset.revealIndex = index; observer.observe(node); });
  }

  document.addEventListener('kd:archive-render', () => {
    const visible = Array.from(document.querySelectorAll('.card:not([hidden])'));
    visible.slice(0, 18).forEach((card, index) => {
      animate(card, [{ opacity: .25, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 620, delay: Math.min(index * 25, 210) });
    });
    schedule();
  });
  const detailImage = document.querySelector('.lightbox__image img');
  document.addEventListener('kd:product-change', () => {
    animate(detailImage, [{ opacity: .2, transform: 'translateX(18px) rotate(-4deg) scale(.91)' }, { opacity: 1, transform: 'translateX(0) rotate(0) scale(1)' }], { duration: 650 });
  });
  document.addEventListener('kd:product-open', () => {
    animate(document.querySelector('.lightbox'), [{ opacity: .3, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520 });
  });

  let frame = 0;
  let active = -1;
  function update() {
    frame = 0;
    if (!preference.matches && matchMedia('(min-width: 761px)').matches) {
      const heroBox = hero.getBoundingClientRect();
      const departure = Math.max(0, Math.min(1, -heroBox.top / Math.max(heroBox.height, 1)));
      desk.style.transform = `translate3d(0,${departure * 45}px,0) rotate(${departure * 1.6}deg)`;
    } else desk.style.transform = '';
    const threshold = innerHeight * .48;
    let next = 0;
    steps.forEach((step, index) => { if (step.getBoundingClientRect().top <= threshold) next = index; });
    const bounds = process.getBoundingClientRect();
    if (bounds.top > innerHeight) next = 0;
    if (next !== active) {
      active = next;
      readout.textContent = String(next + 1).padStart(2, '0');
      steps.forEach((step, index) => step.classList.toggle('is-active', index === next));
      animate(readout, [{ opacity: .4, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 360 });
    }
    process.style.setProperty('--process-progress', String((next + 1) / steps.length));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  preference.addEventListener('change', () => {
    running.forEach(animation => animation.cancel());
    schedule();
  });
  update();
})();
