(() => {
  const BASE = [
    { name: 'Srdeční tep', desc: 'Optický senzor tepu' },
    { name: 'Spánkové fáze', desc: 'Teplotní senzor NTC' },
    { name: 'Gesta', desc: 'Senzor pohybu ruky' },
    { name: 'Bluetooth Low Energy', desc: 'Spojení s telefonem' },
    { name: 'Bezdrátové nabíjení' },
    { name: 'Baterie' },
  ];

  const MODULES = [
    { key: 'nfc', code: 'NFC', name: 'Platby NFC', desc: 'Bezkontaktní placení zápěstím.' },
    { key: 'vib', code: 'VIB', name: 'Vibrace', desc: 'Hmatová odezva, třeba tichý budík.' },
    { key: 'led', code: 'LED', name: 'LED kontrolky', desc: 'Světelné body pro čas a stav.' },
    { key: 'bia', code: 'BIA', name: 'BIA senzor', desc: 'Bioimpedance pro úroveň stresu.' },
    { key: 'uvb', code: 'UVB', name: 'Sledování UVB', desc: 'Hlídá UVB záření ze slunce.' },
    { key: 'gps', code: 'GPS', name: 'GPS', desc: 'Poloha a záznam trasy.' },
    { key: 'alt', code: 'ALT', name: 'Výškoměr', desc: 'Nadmořská výška.' },
    { key: 'sat', code: 'SAT', name: 'Satelitní komunikace', desc: 'Spojení i mimo mobilní signál.' },
    { key: 'sol', code: 'SOL', name: 'Solární nabíjení', desc: 'Dobíjení ze světla.' },
    { key: 'bat', code: 'BAT', name: 'Přídavná baterie', desc: 'Delší výdrž na jedno nabití.' },
    { key: 'mem', code: 'MEM', name: 'Flash paměť', desc: 'Ukládání dat přímo v náramku.' },
    { key: 'drn', code: 'DRN', name: 'Ovládání dronu', desc: 'Řízení dronu z náramku.' },
  ];

  const PRESETS = [
    { label: 'Jen základ', keys: [] },
    { label: 'Vedle hodinek', keys: ['nfc', 'vib'] },
    { label: 'Léto', keys: ['nfc', 'uvb', 'bat'] },
    { label: 'Hory', keys: ['gps', 'alt', 'sat', 'sol', 'bat'] },
    { label: 'Všechno', keys: MODULES.map((m) => m.key) },
  ];

  const L = 78;
  const H = 56;
  const G = 16;
  const PAD_X = 24;
  const PAD_Y = 22;
  const PITCH = L + G;
  const RING_Y = [12, 21, 30, 39];

  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const svg = document.getElementById('chain');
  const wrap = document.getElementById('chainWrap');
  const readout = document.getElementById('readout');
  const baseList = document.getElementById('baseList');
  const modGrid = document.getElementById('modGrid');
  const presetBox = document.getElementById('presets');
  const swatches = document.querySelectorAll('.swatch');

  const selected = new Set();
  const nodes = new Map();
  const chips = new Map();
  const presetButtons = [];

  function s(tag, attrs = {}, text) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text) el.textContent = text;
    return el;
  }

  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return few;
    return many;
  }

  function buildLink(key) {
    const mod = MODULES.find((m) => m.key === key);
    const g = s('g', { class: key === 'base' ? 'link is-base' : 'link' });
    const inner = s('g', { class: 'link__in' });

    inner.append(
      s('rect', { class: 'j-clip', x: L - 2, y: 4, width: G - 1, height: H - 8, rx: 3 }),
      s('rect', { class: 'j-neck', x: -6, y: 13, width: 8, height: H - 26 }),
      s('rect', { class: 'j-cyl', x: -G + 3, y: 7, width: 9, height: H - 14, rx: 4.5 }),
      ...RING_Y.map((y) => s('rect', { class: 'j-ring', x: -G + 2, y, width: 11, height: 2.5, rx: 1 })),
      s('rect', { class: 'l-body', x: 0, y: 0, width: L, height: H, rx: 10 }),
      s('rect', { class: 'l-bevel', x: 3, y: 3, width: L - 6, height: H - 6, rx: 7.5 })
    );

    if (key === 'base') {
      inner.append(s('text', { class: 'l-text', x: L / 2, y: H / 2 + 3.5, 'text-anchor': 'middle' }, 'ZÁKLAD'));
    } else if (key === 'led') {
      for (let i = 0; i < 5; i++) {
        inner.append(s('circle', { class: 'l-led', cx: L / 2 + (i - 2) * 8, cy: 19, r: 1.7 }));
      }
      inner.append(s('text', { class: 'l-text', x: L / 2, y: 40, 'text-anchor': 'middle' }, mod.code));
    } else {
      inner.append(s('text', { class: 'l-text', x: L / 2, y: H / 2 + 4, 'text-anchor': 'middle' }, mod.code));
    }

    g.append(inner);
    return g;
  }

  function currentKeys() {
    return ['base', ...MODULES.filter((m) => selected.has(m.key)).map((m) => m.key)];
  }

  function nextNodeAfter(key, keys) {
    for (let i = keys.indexOf(key) + 1; i < keys.length; i++) {
      const n = nodes.get(keys[i]);
      if (n) return n;
    }
    return null;
  }

  function sync(animate) {
    const keys = currentKeys();
    const motion = animate && !reduceMotion.matches;

    for (const [key, node] of nodes) {
      if (keys.includes(key)) continue;
      nodes.delete(key);
      if (!motion) {
        node.remove();
        continue;
      }
      node.classList.add('is-leaving');
      node.addEventListener('animationend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 400);
    }

    const fresh = [];
    for (const key of keys) {
      if (nodes.has(key)) continue;
      const node = buildLink(key);
      nodes.set(key, node);
      fresh.push(node);
      svg.insertBefore(node, nextNodeAfter(key, keys));
      if (motion) {
        node.classList.add('is-entering');
        node.addEventListener('animationend', () => node.classList.remove('is-entering'), { once: true });
      }
    }

    layout(keys, fresh, !animate);
    updateUI(keys);
    if (motion && fresh.length === 1) revealLink(fresh[0]);
  }

  function revealLink(node) {
    const r = node.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    if (r.left >= w.left && r.right <= w.right) return;
    wrap.scrollBy({ left: r.left - w.left - (w.width - r.width) / 2, behavior: 'smooth' });
  }

  function updateFade() {
    const max = wrap.scrollWidth - wrap.clientWidth;
    wrap.classList.toggle('fade-l', max > 1 && wrap.scrollLeft > 2);
    wrap.classList.toggle('fade-r', max > 1 && wrap.scrollLeft < max - 2);
  }

  function layout(keys = currentKeys(), fresh = [], instant = false) {
    const n = keys.length;
    const chainW = n * PITCH + G + PAD_X * 2;
    const style = getComputedStyle(wrap);
    const avail = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const kPref = avail < 640 ? 0.9 : 1.5;
    const kMin = 0.62;

    const vw = Math.max(avail / kPref, chainW);
    const vh = H + PAD_Y * 2;
    const pxW = avail / vw < kMin ? vw * kMin : avail;

    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.setAttribute('width', pxW);
    svg.setAttribute('height', (vh * pxW) / vw);

    const ox = (vw - chainW) / 2 + PAD_X + G;
    keys.forEach((key, i) => {
      const node = nodes.get(key);
      const t = `translate(${ox + i * PITCH}px, ${PAD_Y}px)`;
      if (instant || fresh.includes(node)) {
        node.style.transition = 'none';
        node.style.transform = t;
        node.getBoundingClientRect();
        node.style.transition = '';
      } else {
        node.style.transform = t;
      }
    });

    updateFade();
  }

  function updateUI(keys) {
    const n = keys.length;
    const m = n - 1;
    const links = `${n} ${plural(n, 'článek', 'články', 'článků')}`;
    readout.textContent = m === 0 ? `${links} · jen základ` : `${links} · základ + ${m} ${plural(m, 'modul', 'moduly', 'modulů')}`;

    const names = ['základ', ...MODULES.filter((x) => selected.has(x.key)).map((x) => x.name)];
    svg.setAttribute('aria-label', `Náramek: ${names.join(', ')}`);

    for (const [key, btn] of chips) btn.setAttribute('aria-pressed', String(selected.has(key)));

    for (const { btn, keys: pk } of presetButtons) {
      const match = pk.length === selected.size && pk.every((k) => selected.has(k));
      btn.setAttribute('aria-pressed', String(match));
    }
  }

  function setColor(color) {
    svg.classList.toggle('is-grey', color === 'grey');
    swatches.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === color)));
  }

  for (const item of BASE) {
    const li = h('li');
    const name = h('span', 'base__name', item.name);
    if (item.desc) name.append(h('span', 'base__desc', item.desc));
    li.append(name);
    baseList.append(li);
  }

  for (const mod of MODULES) {
    const btn = h('button', 'mod');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    const state = h('span', 'mod__state');
    state.setAttribute('aria-hidden', 'true');
    const icon = s('svg', { viewBox: '0 0 12 12' });
    icon.append(s('path', { class: 'i-plus', d: 'M6 1.5v9M1.5 6h9' }), s('path', { class: 'i-check', d: 'M2 6.4l2.6 2.6L10 3.2' }));
    state.append(icon);
    btn.append(
      h('span', 'mod__code', mod.code),
      state,
      h('span', 'mod__name', mod.name),
      h('span', 'mod__desc', mod.desc)
    );
    btn.addEventListener('click', () => {
      if (selected.has(mod.key)) selected.delete(mod.key);
      else selected.add(mod.key);
      sync(true);
    });
    chips.set(mod.key, btn);
    modGrid.append(btn);
  }

  for (const preset of PRESETS) {
    const btn = h('button', 'preset', preset.label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selected.clear();
      preset.keys.forEach((k) => selected.add(k));
      sync(true);
    });
    presetButtons.push({ btn, keys: preset.keys });
    presetBox.append(btn);
  }

  swatches.forEach((b) => b.addEventListener('click', () => setColor(b.dataset.color)));
  wrap.addEventListener('scroll', updateFade, { passive: true });

  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => layout(undefined, [], true));
  }).observe(wrap);

  selected.add('nfc');
  selected.add('vib');
  sync(false);
})();
