(() => {
  const select = (buttons, active, attr = 'aria-selected') => buttons.forEach((b) => b.setAttribute(attr, String(b === active)));

  function initShelf(root) {
    const items = [...root.querySelectorAll('.nh-stage__item')];
    if (!items.length) return;
    const tabs = [...root.querySelectorAll('[data-nh-filter]')];
    const tag = root.querySelector('[data-nh-tag]');
    const name = root.querySelector('[data-nh-name]');
    const text = root.querySelector('[data-nh-text]');
    let visible = items;
    let active = 0;

    const layout = () => {
      const n = visible.length;
      const w = visible[0]?.offsetWidth || 240;
      items.forEach((el) => { if (!visible.includes(el)) { el.hidden = true; el.style.transform = 'scale(0.4)'; } });
      visible.forEach((el, i) => {
        let o = i - active;
        if (o > n / 2) o -= n;
        if (o < -Math.floor((n - 1) / 2)) o += n;
        const d = Math.abs(o);
        const x = d === 0 ? 0 : Math.sign(o) * (w * 0.92 + (d - 1) * w * 0.56);
        const y = d === 0 ? 0 : w * 0.3 + (d - 1) * w * 0.05;
        const s = d === 0 ? 1 : Math.max(0.42, 0.6 - (d - 1) * 0.05);
        el.hidden = d > 3;
        el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
        el.style.zIndex = String(10 - d);
        el.setAttribute('aria-current', String(d === 0));
      });
      const cur = visible[active];
      if (cur) {
        if (tag) tag.textContent = cur.dataset.tag || '';
        if (name) name.textContent = cur.dataset.name || '';
        if (text) text.textContent = cur.dataset.text || '';
      }
    };

    const go = (delta) => { active = (active + delta + visible.length) % visible.length; layout(); };
    root.querySelector('[data-nh-prev]')?.addEventListener('click', () => go(-1));
    root.querySelector('[data-nh-next]')?.addEventListener('click', () => go(1));
    tabs.forEach((t) => t.addEventListener('click', () => {
      select(tabs, t);
      const g = t.dataset.nhFilter;
      visible = g === 'all' ? items : items.filter((el) => el.dataset.group === g);
      if (!visible.length) visible = items;
      active = 0;
      layout();
    }));

    let lastSwipe = 0;
    const stage = root.querySelector('.nh-stage');
    if (stage) {
      let startX = 0;
      let startY = 0;
      let tracking = false;
      stage.addEventListener('touchstart', (e) => {
        if (e.target.closest('a, button')) { tracking = false; return; }
        const t = e.changedTouches[0];
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
        lastSwipe = Date.now();
        go(dx < 0 ? 1 : -1);
      }, { passive: true });
      stage.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch' || !tracking) return;
        tracking = false;
        const dx = e.clientX - startX;
        if (Math.abs(dx) < 40) return;
        lastSwipe = Date.now();
        go(dx < 0 ? 1 : -1);
      });
      stage.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.target.closest('a, button')) return;
        startX = e.clientX;
        startY = 0;
        tracking = true;
      });
      stage.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      });
    }
    items.forEach((el) => el.addEventListener('click', (e) => {
      if (Date.now() - lastSwipe < 450) { e.preventDefault(); e.stopPropagation(); return; }
      const i = visible.indexOf(el);
      if (i > -1) { active = i; layout(); }
    }));
    window.addEventListener('resize', layout, { passive: true });
    layout();
  }

  function initCrave(root) {
    const tabs = [...root.querySelectorAll('[data-nh-set]')];
    tabs.forEach((t) => t.addEventListener('click', () => {
      select(tabs, t);
      const set = t.dataset.nhSet;
      root.querySelectorAll('[data-nh-stickers]').forEach((el) => { el.hidden = el.dataset.nhStickers !== set; });
      root.querySelectorAll('[data-nh-img]').forEach((el) => { el.hidden = el.dataset.nhImg !== set; });
    }));
  }

  function initBuilder(root) {
    const steps = [...root.querySelectorAll('[data-nh-step]')];
    const dots = [...root.querySelectorAll('[data-nh-step-dot]')];
    const moments = [...root.querySelectorAll('[data-nh-moment]')];
    const focuses = [...root.querySelectorAll('[data-nh-focus]')];
    const tiers = [...root.querySelectorAll('[data-nh-tier]')];
    const qty = root.querySelector('[data-nh-qty]');
    const tip = root.querySelector('[data-nh-tip]');
    const sum = (k) => root.querySelector(`[data-nh-sum="${k}"]`);
    const pressed = (list) => list.find((b) => b.getAttribute('aria-pressed') === 'true') || list[0];

    const pickable = (list) => list.forEach((b) => b.addEventListener('click', () => { select(list, b, 'aria-pressed'); update(); }));
    pickable(moments);
    pickable(focuses);
    pickable(tiers);

    function update() {
      const m = pressed(moments);
      const f = pressed(focuses);
      const t = pressed(tiers);
      if (sum('moment')) sum('moment').textContent = m ? m.dataset.nhMoment : '';
      if (sum('focus')) sum('focus').textContent = f ? f.dataset.nhFocus : '';
      if (sum('supply')) sum('supply').textContent = t ? t.dataset.label : '';
      if (sum('total')) sum('total').textContent = t ? t.dataset.total : '';
      if (qty && t) qty.value = t.dataset.qty;
      if (tip) {
        tip.textContent = (tip.dataset.template || '')
          .replace('[moment]', m ? m.dataset.tip || m.dataset.nhMoment.toLowerCase() : '')
          .replace('[focus]', f ? f.dataset.nhFocus.toLowerCase() : '')
          .replace('[star]', f ? f.dataset.star : '');
      }
    }

    function show(n) {
      steps.forEach((s) => { s.hidden = s.dataset.nhStep !== String(n); });
      dots.forEach((d) => {
        const i = Number(d.dataset.nhStepDot);
        d.classList.toggle('is-current', i === n);
        d.classList.toggle('is-done', i < n);
      });
      const heading = steps.find((s) => !s.hidden)?.querySelector('.nh-h3');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    root.querySelectorAll('[data-nh-go]').forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.nhGo))));
    update();
  }

  function initQuiz(root) {
    const chips = [...root.querySelectorAll('[data-nh-goal]')];
    const why = root.querySelector('[data-nh-why]');
    const initial = chips.map((c) => c.getAttribute('aria-pressed'));
    const update = () => {
      const stars = [...new Set(chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.star))];
      if (!why) return;
      if (!stars.length) { why.textContent = why.dataset.empty; return; }
      const list = stars.length > 1 ? `${stars.slice(0, -1).join(', ')} & ${stars[stars.length - 1]}` : stars[0];
      why.textContent = (why.dataset.template || '[stars]').replace('[stars]', list);
    };
    chips.forEach((c) => c.addEventListener('click', () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); update(); }));
    root.querySelector('[data-nh-reset]')?.addEventListener('click', () => { chips.forEach((c, i) => c.setAttribute('aria-pressed', initial[i])); update(); });
    update();
  }

  function initIdeas(root) {
    const tabs = [...root.querySelectorAll('[data-nh-ideas-tab]')];
    const lists = [...root.querySelectorAll('[data-nh-ideas-list]')];
    const current = () => lists.find((l) => !l.hidden);
    tabs.forEach((t) => t.addEventListener('click', () => {
      select(tabs, t);
      lists.forEach((l) => { l.hidden = l.dataset.nhIdeasList !== t.dataset.nhIdeasTab; l.scrollLeft = 0; });
    }));
    const step = (dir) => {
      const list = current();
      const card = list?.firstElementChild;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      list.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: 'smooth' });
    };
    root.querySelector('[data-nh-ideas-prev]')?.addEventListener('click', () => step(-1));
    root.querySelector('[data-nh-ideas-next]')?.addEventListener('click', () => step(1));
  }

  const MODULES = [
    ['[data-nh-shelf]', initShelf],
    ['[data-nh-crave]', initCrave],
    ['[data-nh-builder]', initBuilder],
    ['[data-nh-quiz]', initQuiz],
    ['[data-nh-ideas]', initIdeas],
  ];

  function init(scope = document) {
    MODULES.forEach(([sel, fn]) => scope.querySelectorAll(sel).forEach((el) => {
      if (el.dataset.nhReady) return;
      el.dataset.nhReady = '1';
      fn(el);
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
