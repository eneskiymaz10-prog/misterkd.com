/* Mister KD. Essential interactions, progressively enhanced. */
(() => {
  'use strict';
  const nav = document.querySelector('.nav');
  const burger = nav.querySelector('.nav__burger');
  const closeMenu = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); };
  burger.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
  nav.querySelectorAll('.nav__links a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); burger.focus(); } });
  matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

  const grid = document.getElementById('grid');
  const cards = Array.from(grid.querySelectorAll('.card'));
  const filters = Array.from(document.querySelectorAll('.filter'));
  const category = document.getElementById('category');
  const toggle = document.querySelector('.archive-toggle');
  const status = document.querySelector('.archive-status');
  let activeBrand = 'all';
  let expanded = false;
  const isFiltered = () => activeBrand !== 'all' || category.value !== 'all';
  function renderArchive() {
    grid.classList.toggle('is-selected', !isFiltered() && !expanded);
    let shown = 0;
    cards.forEach(card => {
      const matches = (activeBrand === 'all' || card.dataset.brand === activeBrand) && (category.value === 'all' || card.dataset.category === category.value);
      const visible = matches && (isFiltered() || expanded || card.dataset.curated === 'true');
      card.hidden = !visible;
      if (visible) shown++;
    });
    filters.forEach(filter => { const on = filter.dataset.filter === activeBrand; filter.classList.toggle('is-active', on); filter.setAttribute('aria-pressed', String(on)); });
    toggle.hidden = isFiltered();
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.firstChild.textContent = expanded ? 'Back to selected creations ' : 'View all 45 creations ';
    status.textContent = isFiltered() ? `${shown} ${shown === 1 ? 'creation' : 'creations'} in this selection.` : expanded ? `All ${cards.length} creations. Take a closer look.` : `A selection of ${shown} from ${cards.length} creations. Open a product to explore.`;
    document.querySelector('.grid__empty').hidden = shown > 0;
    document.dispatchEvent(new CustomEvent('kd:archive-render'));
  }
  filters.forEach(filter => filter.addEventListener('click', () => { activeBrand = filter.dataset.filter; renderArchive(); }));
  category.addEventListener('change', renderArchive);
  toggle.addEventListener('click', () => {
    expanded = !expanded;
    renderArchive();
    if (expanded) { const firstNew = cards.find(card => !card.hidden && card.dataset.curated !== 'true'); if (firstNew) firstNew.focus({ preventScroll: true }); }
    else document.getElementById('creations').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  document.querySelector('.archive-tools').hidden = false;
  renderArchive();

  const dialog = document.getElementById('lightbox');
  let current = null;
  let sequence = [];
  let previousFocus = null;
  function fillProduct(card) {
    current = card;
    const image = card.querySelector('img');
    const target = dialog.querySelector('img');
    target.src = image.getAttribute('src'); target.alt = image.alt;
    dialog.querySelector('.lightbox__brand').textContent = card.dataset.brand;
    dialog.querySelector('.lightbox__name').textContent = card.querySelector('.card__name').textContent;
    dialog.querySelector('.lightbox__claim').textContent = card.querySelector('.card__claim').textContent;
    dialog.querySelector('.lightbox__position').textContent = `${sequence.indexOf(card) + 1} / ${sequence.length}`;
    document.dispatchEvent(new CustomEvent('kd:product-change'));
  }
  function openProduct(card, selected = false) {
    if (!card || typeof dialog.showModal !== 'function') return false;
    previousFocus = document.activeElement;
    sequence = selected ? cards : cards.filter(item => !item.hidden);
    fillProduct(card);
    dialog.showModal();
    document.dispatchEvent(new CustomEvent('kd:product-open'));
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.lightbox__close').focus();
    return true;
  }
  cards.forEach(card => card.addEventListener('click', event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && openProduct(card)) event.preventDefault(); }));
  document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; const card = cards.find(item => item.dataset.product === link.dataset.open); if (openProduct(card, true)) event.preventDefault(); }));
  function step(direction) { if (!sequence.length) return; fillProduct(sequence[(sequence.indexOf(current) + direction + sequence.length) % sequence.length]); }
  dialog.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.dir))));
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); });

  const form = document.getElementById('contactForm');
  const intent = document.getElementById('c-intent');
  const formStatus = form.querySelector('.form__status');
  const submit = form.querySelector('[type="submit"]');
  const configured = () => { const value = form.elements.access_key.value.trim(); return value && value !== 'WEB3FORMS_ACCESS_KEY'; };
  document.querySelectorAll('[data-intent]').forEach(link => link.addEventListener('click', () => { intent.value = link.dataset.intent; }));
  function valid() { if (form.checkValidity()) return true; form.reportValidity(); return false; }
  function downloadBrief() {
    if (!valid()) return;
    const data = new FormData(form);
    const content = ['A brief for Kadir Demir / Mister KD', '', `Topic: ${data.get('intent')}`, `Name: ${data.get('name')}`, `Email: ${data.get('email')}`, `Company: ${data.get('company') || '—'}`, '', 'The idea', String(data.get('message')), '', 'Prepared on misterkd.com. Saved locally; not sent to Kadir.'].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'brief-for-kadir-demir.txt'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    formStatus.textContent = 'Your brief has been downloaded. Share the file with Kadir through your existing contact. Nothing has been sent from this page.';
  }
  form.querySelector('.download-brief').addEventListener('click', downloadBrief);
  if (configured()) { submit.firstChild.textContent = 'Send my brief '; document.querySelector('.contact__note').hidden = true; }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!valid()) return;
    if (!configured()) { formStatus.textContent = 'Your brief is ready. Online delivery is not connected yet, so nothing has been sent. Use “Download brief” to save a copy you can share with Kadir.'; return; }
    if (form.elements.botcheck.checked) return;
    submit.disabled = true; formStatus.textContent = 'Sending your brief…';
    try {
      const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Delivery failed');
      formStatus.textContent = 'Thank you. Your brief has been sent to Kadir.'; form.reset();
    } catch { formStatus.textContent = 'Your brief could not be sent. Your details are still here. Download a copy to keep or share.'; }
    finally { submit.disabled = false; }
  });
  submit.disabled = false;
  form.querySelector('.download-brief').disabled = false;
  document.documentElement.classList.add('js');
})();
