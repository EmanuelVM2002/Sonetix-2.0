/* Descubre Medellín · by SONETIX — prototipo de interfaz (sin servidor).
   Los datos vienen de js/data.js. Las solicitudes se guardan solo en este navegador (localStorage). */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CATS = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  const BAR = Object.fromEntries(BARRIOS.map(b => [b.id, b]));
  const BIZ = Object.fromEntries(BUSINESSES.map(b => [b.id, b]));
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 960px)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: la página sigue funcionando */ } }
  };
  const catIco = (id, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${CATS[id].icon}"/></svg>`;
  const rawIco = (d, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const PRICE = ['', '$', '$$', '$$$'];

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
  }

  /* ---------- horarios (zona America/Bogota) ---------- */
  function bogotaNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { day, t: (+g('hour') % 24) + (+g('minute')) / 60 };
  }
  function isOpen(b) {
    const { day, t } = bogotaNow(), h = b.hours;
    if (h.days.includes(day) && t >= h.open && t < Math.min(h.close, 24)) return true;
    return h.close > 24 && h.days.includes((day + 6) % 7) && t < h.close - 24;
  }
  const fmtH = n => { const x = n % 24; return String(Math.floor(x)).padStart(2, '0') + ':' + String(Math.round((x % 1) * 60)).padStart(2, '0'); };
  function hoursToday(b) {
    const { day } = bogotaNow(), h = b.hours;
    return h.days.includes(day) ? `Hoy ${fmtH(h.open)} – ${fmtH(h.close)}` : 'Hoy cerrado';
  }

  /* ---------- estado ---------- */
  const state = { q: '', cats: new Set(), barrio: '', open: false, web: false, selected: null };
  let theme = store.get('dm_theme') === 'light' ? 'light' : 'dark';
  let favs = [];
  try { favs = JSON.parse(store.get('dm_favs') || '[]'); } catch { favs = []; }

  function filtered() {
    const q = norm(state.q.trim());
    return BUSINESSES.filter(b => {
      if (state.cats.size && !state.cats.has(b.cat)) return false;
      if (state.barrio && b.barrio !== state.barrio) return false;
      if (state.open && !isOpen(b)) return false;
      if (state.web && !b.web) return false;
      if (q) {
        const hay = norm([b.name, CATS[b.cat].label, BAR[b.barrio].name, b.desc, ...b.services].join(' '));
        return q.split(/\s+/).every(w => hay.includes(w));
      }
      return true;
    });
  }
  const anyFilter = () => state.q || state.cats.size || state.barrio || state.open || state.web;

  /* ---------- cabecera, tema, menú ---------- */
  const bar = $('#bar');
  addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 10), { passive: true });
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    $('meta[name="theme-color"]').content = theme === 'dark' ? '#050505' : '#f6f6f8';
  }
  $('#themeBtn').addEventListener('click', async () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    store.set('dm_theme', theme); applyTheme();
    if (map) { try { map.setStyle(await getStyle(), { diff: false }); } catch { /* el mapa conserva el estilo anterior */ } }
  });
  applyTheme();
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- mapa ---------- */
  let map = null, baseStyle = null, hoverPopup = null;
  const FONT = ['Noto Sans Regular'];

  async function getStyle() {
    if (!baseStyle) baseStyle = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
    const s = JSON.parse(JSON.stringify(baseStyle));
    if (theme === 'dark') recolor(s);
    return s;
  }
  /* Repinta el estilo base a la paleta SONETIX (negro, grafito, humo). */
  function recolor(s) {
    const C = { land: '#0f0f12', water: '#050505', park: '#121418', build: '#17181d', road: '#272930', major: '#3a3d46', cas: '#0a0a0c', label: '#8e909a', halo: '#050505', lwater: '#5a5d6a' };
    for (const l of s.layers) {
      const p = l.paint = l.paint || {};
      if (/shield/.test(l.id)) { (l.layout = l.layout || {}).visibility = 'none'; continue; }
      if (l.type === 'background') p['background-color'] = C.land;
      else if (l.type === 'fill') {
        if (l.id === 'water') p['fill-color'] = C.water;
        else if (/park|wood/.test(l.id)) p['fill-color'] = C.park;
        else if (/ice|glacier/.test(l.id)) p['fill-opacity'] = 0;
        else if (l.id === 'building') { p['fill-color'] = C.build; p['fill-outline-color'] = '#1d1f26'; }
        else p['fill-color'] = C.land;
      } else if (l.type === 'line') {
        if (/dashline/.test(l.id)) p['line-color'] = 'rgba(0,0,0,0)';
        else if (/boundary/.test(l.id)) p['line-color'] = '#3a3d46';
        else if (/casing/.test(l.id)) p['line-color'] = C.cas;
        else if (/railway|aeroway/.test(l.id)) p['line-color'] = '#1d1f26';
        else if (l.id === 'waterway') p['line-color'] = '#0a0b0e';
        else if (/major|motorway/.test(l.id)) p['line-color'] = C.major;
        else p['line-color'] = C.road;
      } else if (l.type === 'symbol') {
        p['text-color'] = /water/.test(l.id) ? C.lwater : C.label;
        p['text-halo-color'] = C.halo; p['text-halo-width'] = 1.2;
      }
    }
  }

  const pal = () => theme === 'dark'
    ? { pin: '#ffffff', stroke: '#050505', unc: '#8e909a', grn: '#3ddc84', txt: '#f2f2f4', halo: '#050505' }
    : { pin: '#050505', stroke: '#ffffff', unc: '#6a6c76', grn: '#13884a', txt: '#050505', halo: '#ffffff' };

  const toFC = list => ({
    type: 'FeatureCollection',
    features: list.map(b => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
      properties: { id: b.id, name: b.name, claimed: b.claimed, web: !!b.web, by: b.webBy || '' }
    }))
  });
  const selFC = () => {
    const b = BIZ[state.selected];
    return { type: 'FeatureCollection', features: b ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: {} }] : [] };
  };

  function addLayers() {
    const c = pal(), RED = '#ff0a1e';
    const dark = theme === 'dark', single = ['!', ['has', 'point_count']];
    map.addSource('biz', { type: 'geojson', data: toFC(filtered()), cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
    map.addSource('sel', { type: 'geojson', data: selFC() });
    map.addLayer({ id: 'clusters', type: 'circle', source: 'biz', filter: ['has', 'point_count'],
      paint: { 'circle-radius': ['step', ['get', 'point_count'], 17, 4, 21, 8, 25], 'circle-color': dark ? '#151518' : '#ffffff',
        'circle-stroke-color': RED, 'circle-stroke-width': 2, 'circle-opacity': 0.96 } });
    map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'biz', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': FONT, 'text-size': 13, 'text-allow-overlap': true },
      paint: { 'text-color': c.txt } });
    map.addLayer({ id: 'halo', type: 'circle', source: 'biz', filter: ['all', single, ['==', ['get', 'by'], 'sonetix']],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 11, 16, 24], 'circle-color': RED, 'circle-opacity': 0.3, 'circle-blur': 0.8 } });
    map.addLayer({ id: 'pins', type: 'circle', source: 'biz', filter: single,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 16, 9],
        'circle-color': ['case', ['==', ['get', 'by'], 'sonetix'], RED, ['get', 'claimed'], c.pin, 'rgba(142,144,154,0.22)'],
        'circle-stroke-color': ['case', ['==', ['get', 'by'], 'sonetix'], '#ffffff', ['get', 'claimed'], c.stroke, c.unc],
        'circle-stroke-width': 2
      } });
    map.addLayer({ id: 'webdot', type: 'circle', source: 'biz', filter: ['all', single, ['==', ['get', 'web'], true], ['!=', ['get', 'by'], 'sonetix']],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.4, 16, 4.6], 'circle-color': c.grn, 'circle-stroke-color': c.stroke, 'circle-stroke-width': 1.4,
        'circle-translate': [7, -7], 'circle-translate-anchor': 'viewport' } });
    map.addLayer({ id: 'labels', type: 'symbol', source: 'biz', minzoom: 14.2, filter: single,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': c.txt, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } });
    map.addLayer({ id: 'sel-ring', type: 'circle', source: 'sel',
      paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': RED, 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'sel-dot', type: 'circle', source: 'sel',
      paint: { 'circle-radius': 9, 'circle-color': RED, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
  }

  function initMap() {
    if (typeof maplibregl === 'undefined') { $('#mapFallback').hidden = false; return; }
    getStyle().then(style => {
      map = new maplibregl.Map({
        container: 'map', style, center: [-75.5812, 6.2442], zoom: 12.1, minZoom: 10, maxZoom: 18,
        attributionControl: { compact: true }, cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scroll para acercar el mapa',
          'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scroll para acercar el mapa',
          'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
          'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar'
        }
      });
      window.dmMap = map; // útil para depurar en la consola
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('style.load', addLayers);
      map.on('load', () => { map.resize(); fit(false); if (!reduceMotion) requestAnimationFrame(pulse); });
      if ('ResizeObserver' in window) new ResizeObserver(() => map.resize()).observe($('#map'));
      map.on('click', 'pins', e => select(e.features[0].properties.id, { from: 'map' }));
      map.on('click', 'clusters', e => {
        const f = e.features[0];
        map.getSource('biz').getClusterExpansionZoom(f.properties.cluster_id).then(z => map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.3, duration: reduceMotion ? 0 : 700 })).catch(() => {});
      });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
      map.on('mouseenter', 'pins', e => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        hoverPopup.setLngLat(f.geometry.coordinates).setText(f.properties.name).addTo(map);
      });
      map.on('mouseleave', 'pins', () => { map.getCanvas().style.cursor = ''; hoverPopup.remove(); });
      map.on('error', ev => { if (!map.loaded() && ev && ev.error && /Failed to fetch|NetworkError/i.test(String(ev.error.message))) $('#mapFallback').hidden = false; });
    }).catch(() => { $('#mapFallback').hidden = false; });
  }

  function pulse(t) {
    if (map && state.selected && map.getLayer && map.getLayer('sel-ring')) {
      const k = (t % 1800) / 1800;
      map.setPaintProperty('sel-ring', 'circle-radius', 12 + k * 18);
      map.setPaintProperty('sel-ring', 'circle-stroke-opacity', 1 - k);
    }
    requestAnimationFrame(pulse);
  }

  function fit(animate = true) {
    if (!map) return;
    const list = filtered();
    if (!list.length) return;
    if (list.length === 1) { map.easeTo({ center: [list[0].lng, list[0].lat], zoom: 15.4, duration: animate ? 800 : 0 }); return; }
    const b = new maplibregl.LngLatBounds();
    list.forEach(x => b.extend([x.lng, x.lat]));
    map.fitBounds(b, { padding: { top: 70, bottom: isMobile() ? 140 : 90, left: 50, right: 50 }, maxZoom: 15.4, duration: animate && !reduceMotion ? 900 : 0 });
  }

  /* ---------- lista y filtros ---------- */
  const listEl = $('#list');
  function renderList(list) {
    if (!list.length) {
      listEl.innerHTML = `<li class="empty"><strong>No encontramos negocios con esos filtros</strong>Prueba con otra categoría o limpia los filtros.</li>`;
      return;
    }
    listEl.innerHTML = list.map(b => {
      const open = isOpen(b);
      return `<li><button class="card${state.selected === b.id ? ' on' : ''}" data-id="${b.id}" type="button">
        <span class="thumb${b.webBy ? ' sx' : ''}">${catIco(b.cat)}</span>
        <span class="card-t"><strong>${esc(b.name)}</strong>
          <small>${CATS[b.cat].label} · ${esc(BAR[b.barrio].name)}</small>
          <span class="meta"><span class="${open ? 'open-b' : 'closed-b'}">${open ? 'Abierto' : 'Cerrado'}</span><span>${PRICE[b.price]}</span>${b.claimed ? '' : '<span class="unc">Sin reclamar</span>'}</span>
        </span></button></li>`;
    }).join('');
  }

  function refresh({ doFit = false } = {}) {
    const list = filtered();
    renderList(list);
    $('#count').textContent = `${list.length} ${list.length === 1 ? 'negocio' : 'negocios'}`;
    $('#clearBtn').hidden = !anyFilter();
    if (map && map.getSource('biz')) map.getSource('biz').setData(toFC(list));
    if (doFit) fit();
  }

  function syncUI() {
    $$('#catChips .chip').forEach(c => c.setAttribute('aria-pressed', state.cats.has(c.dataset.id)));
    $('#barrioSel').value = state.barrio;
    $('#openTgl').setAttribute('aria-pressed', state.open);
    $('#webTgl').setAttribute('aria-pressed', state.web);
    $('#q').value = state.q;
  }

  function buildControls() {
    $('#catChips').innerHTML = CATEGORIES.map(c => `<button class="chip" type="button" data-id="${c.id}" aria-pressed="false">${catIco(c.id)}${c.label}</button>`).join('');
    $('#barrioSel').innerHTML = `<option value="">Todos los barrios</option>` + BARRIOS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    $('#quickCats').innerHTML = CATEGORIES.slice(0, 6).map(c => `<button class="qchip" type="button" data-id="${c.id}">${catIco(c.id)}${c.label}</button>`).join('');
    const openNow = BUSINESSES.filter(isOpen).length;
    $('#stats').innerHTML = [
      [BUSINESSES.length, 'Negocios'], [BARRIOS.length, 'Barrios'], [CATEGORIES.length, 'Categorías'], [openNow, 'Abiertos ahora']
    ].map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join('');
    $('#barriosGrid').innerHTML = BARRIOS.map((b, i) => {
      const n = BUSINESSES.filter(x => x.barrio === b.id).length;
      return `<button class="barrio rv" type="button" data-id="${b.id}" data-n="${String(i + 1).padStart(2, '0')}">
        <span class="n">${n} negocios</span><strong>${esc(b.name)}</strong><small>${esc(b.vibe)}</small></button>`;
    }).join('');
  }

  const goExplorer = () => $('#explorar').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

  function bindFilters() {
    $('#catChips').addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      state.cats.has(c.dataset.id) ? state.cats.delete(c.dataset.id) : state.cats.add(c.dataset.id);
      closeFicha(); syncUI(); refresh({ doFit: true });
    });
    $('#barrioSel').addEventListener('change', e => {
      state.barrio = e.target.value; closeFicha(); refresh({ doFit: false });
      if (state.barrio && map) { const b = BAR[state.barrio]; map.flyTo({ center: [b.lng, b.lat], zoom: b.zoom, duration: reduceMotion ? 0 : 1200 }); } else fit();
    });
    $('#openTgl').addEventListener('click', () => { state.open = !state.open; syncUI(); refresh({ doFit: true }); });
    $('#webTgl').addEventListener('click', () => { state.web = !state.web; syncUI(); refresh({ doFit: true }); });
    let qT;
    $('#q').addEventListener('input', e => {
      state.q = e.target.value; refresh();
      clearTimeout(qT); qT = setTimeout(() => fit(), 350);
    });
    $('#clearBtn').addEventListener('click', () => {
      Object.assign(state, { q: '', barrio: '', open: false, web: false }); state.cats.clear();
      syncUI(); refresh({ doFit: true });
    });
    listEl.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) select(c.dataset.id, { from: 'list' }); });

    $('#quickCats').addEventListener('click', e => {
      const c = e.target.closest('.qchip'); if (!c) return;
      state.cats = new Set([c.dataset.id]); state.q = ''; state.barrio = '';
      syncUI(); refresh({ doFit: true }); goExplorer();
    });
    $('#barriosGrid').addEventListener('click', e => {
      const c = e.target.closest('.barrio'); if (!c) return;
      state.barrio = c.dataset.id; closeFicha(); syncUI(); refresh();
      goExplorer();
      if (map) { const b = BAR[state.barrio]; setTimeout(() => map.flyTo({ center: [b.lng, b.lat], zoom: b.zoom, duration: reduceMotion ? 0 : 1400 }), reduceMotion ? 0 : 500); }
    });
  }

  /* ---------- ficha ---------- */
  const ficha = $('#ficha'), sheetBg = $('#sheetBg');
  let lastFocus = null;

  function fichaHTML(b) {
    const open = isOpen(b), fav = favs.includes(b.id);
    const dest = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
    return `
      <div class="f-art">${catIco(b.cat)}<small>Foto del negocio (se publica con permiso del dueño)</small>
        <button class="f-x" type="button" data-act="close" aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>
        <button class="f-save" type="button" data-act="save" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de guardados' : 'Guardar negocio'}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.3 12c-2.300 4.400-9.300 9-9.300 9z"/></svg></button>
      </div>
      <div class="f-body">
        <div><h3>${esc(b.name)}</h3>
          <div class="f-sub"><span>${CATS[b.cat].label}</span><span class="sep">·</span><span>${esc(BAR[b.barrio].name)}</span><span class="sep">·</span><span>${PRICE[b.price]}</span>
            <span class="sep">·</span><span class="${open ? 'open-b' : 'closed-b'}">${open ? 'Abierto ahora' : 'Cerrado ahora'}</span></div></div>
        ${b.desc ? `<p class="f-desc">${esc(b.desc)}</p>` : ''}
        ${b.services.length ? `<div class="tags">${b.services.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
        <div class="f-info">
          <div><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span><b>${hoursToday(b)}</b></span></div>
          <div><svg class="ico" viewBox="0 0 24 24"><path d="M12 21s7-6.100 7-11a7 7 0 0 0-14 0c0 4.900 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/></svg><span>${esc(BAR[b.barrio].name)}, Medellín</span></div>
          ${b.ig ? `<div><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.500 6.500h.01"/></svg><span>@${esc(b.ig)}</span></div>` : ''}
        </div>
        ${b.webBy ? `<div class="sx-badge"><span class="eq" aria-hidden="true"><b></b><b></b><b></b><b></b></span><span><strong>Sitio creado por SONETIX</strong>Un ejemplo de lo que podemos hacer por tu negocio.</span></div>` : ''}
        <div class="f-act">
          <button class="btn btn-red wide" type="button" data-act="wa">Escribir por WhatsApp</button>
          ${b.web ? `<a class="btn btn-ghost" href="${esc(b.web)}" target="_blank" rel="noopener noreferrer">Sitio oficial</a>` : `<span></span>`}
          <a class="btn btn-ghost" href="${dest}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
        </div>
        ${b.claimed ? '' : `<div class="claim-box"><p><strong>Ficha sin reclamar.</strong> Solo mostramos datos públicos. Si este es tu negocio, reclámala gratis y completa fotos, horarios y enlaces.</p>
          <button class="btn btn-red" type="button" data-act="claim">Reclamar esta ficha</button></div>`}
        <p class="note-demo">Datos de ejemplo para la demostración.</p>
      </div>`;
  }

  function select(id, { from } = {}) {
    const b = BIZ[id]; if (!b) return;
    state.selected = id;
    if (map && map.getSource('sel')) map.getSource('sel').setData(selFC());
    $$('#list .card').forEach(c => c.classList.toggle('on', c.dataset.id === id));
    const card = $(`#list .card[data-id="${id}"]`);
    if (card && from === 'map') card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (map) map.easeTo({ center: [b.lng, b.lat], zoom: Math.max(map.getZoom(), 15.3), duration: reduceMotion ? 0 : 800 });
    lastFocus = document.activeElement;
    ficha.innerHTML = fichaHTML(b);
    ficha.scrollTop = 0;
    ficha.classList.add('open'); ficha.setAttribute('aria-hidden', 'false');
    if (isMobile()) sheetBg.hidden = false;
    const x = $('[data-act="close"]', ficha); if (x) x.focus({ preventScroll: true });
  }

  function closeFicha() {
    if (!state.selected && !ficha.classList.contains('open')) return;
    state.selected = null;
    ficha.classList.remove('open'); ficha.setAttribute('aria-hidden', 'true'); sheetBg.hidden = true;
    if (map && map.getSource('sel')) map.getSource('sel').setData(selFC());
    $$('#list .card.on').forEach(c => c.classList.remove('on'));
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  ficha.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const b = BIZ[state.selected];
    if (a.dataset.act === 'close') closeFicha();
    else if (a.dataset.act === 'save' && b) {
      favs = favs.includes(b.id) ? favs.filter(x => x !== b.id) : [...favs, b.id];
      store.set('dm_favs', JSON.stringify(favs));
      const on = favs.includes(b.id);
      a.setAttribute('aria-pressed', on); a.setAttribute('aria-label', on ? 'Quitar de guardados' : 'Guardar negocio');
      toast(on ? 'Guardado en tu lista' : 'Quitado de tu lista');
    } else if (a.dataset.act === 'wa') toast('Demostración: aquí se abre el WhatsApp del negocio.');
    else if (a.dataset.act === 'claim' && b) openClaim(b);
  });
  sheetBg.addEventListener('click', closeFicha);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); else if (e.key === 'Escape') closeFicha(); });

  /* ---------- buscador del inicio (sugerencias) ---------- */
  const heroQ = $('#heroQ'), sug = $('#heroSug');
  let sugItems = [], sugIdx = -1;
  function buildSug() {
    const q = norm(heroQ.value.trim());
    if (!q) { sug.hidden = true; sugItems = []; return; }
    const items = [];
    BARRIOS.filter(b => norm(b.name).includes(q)).forEach(b => items.push({ t: 'barrio', id: b.id, label: b.name, hint: 'Barrio' }));
    CATEGORIES.filter(c => norm(c.label).includes(q)).forEach(c => items.push({ t: 'cat', id: c.id, label: c.label, hint: 'Categoría', icon: c.id }));
    BUSINESSES.filter(b => norm(b.name + ' ' + b.services.join(' ')).includes(q)).slice(0, 5).forEach(b => items.push({ t: 'biz', id: b.id, label: b.name, hint: CATS[b.cat].label, icon: b.cat }));
    sugItems = items.slice(0, 7); sugIdx = -1;
    sug.innerHTML = sugItems.length
      ? sugItems.map((s, i) => `<li role="option" id="sg${i}" data-i="${i}">${s.icon ? catIco(s.icon, 'ico ic') : '<svg class="ico ic" viewBox="0 0 24 24"><path d="M12 21s7-6.100 7-11a7 7 0 0 0-14 0c0 4.900 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/></svg>'}<span>${esc(s.label)}</span><small>${s.hint}</small></li>`).join('')
      : `<li role="option" data-i="-1"><span>Buscar «${esc(heroQ.value.trim())}» en el mapa</span></li>`;
    sug.hidden = false;
  }
  function pickSug(i) {
    const s = sugItems[i]; sug.hidden = true;
    if (!s) { state.q = heroQ.value.trim(); }
    else if (s.t === 'barrio') { state.barrio = s.id; state.q = ''; }
    else if (s.t === 'cat') { state.cats = new Set([s.id]); state.q = ''; }
    else { state.q = ''; }
    syncUI(); refresh({ doFit: s?.t !== 'biz' }); goExplorer();
    if (s?.t === 'biz') setTimeout(() => select(s.id, { from: 'list' }), reduceMotion ? 0 : 700);
    if (s?.t === 'barrio' && map) { const b = BAR[s.id]; setTimeout(() => map.flyTo({ center: [b.lng, b.lat], zoom: b.zoom, duration: reduceMotion ? 0 : 1400 }), reduceMotion ? 0 : 500); }
    heroQ.value = '';
  }
  heroQ.addEventListener('input', buildSug);
  heroQ.addEventListener('keydown', e => {
    if (sug.hidden) return;
    const move = d => { sugIdx = (sugIdx + d + sugItems.length) % sugItems.length; $$('li', sug).forEach((li, i) => li.setAttribute('aria-selected', i === sugIdx)); e.preventDefault(); };
    if (e.key === 'ArrowDown' && sugItems.length) move(1);
    else if (e.key === 'ArrowUp' && sugItems.length) move(-1);
    else if (e.key === 'Escape') sug.hidden = true;
    else if (e.key === 'Enter' && sugIdx >= 0) { e.preventDefault(); pickSug(sugIdx); }
  });
  sug.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); pickSug(+li.dataset.i); } });
  heroQ.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 120));
  $('#heroSearch').addEventListener('submit', e => { e.preventDefault(); if (heroQ.value.trim()) pickSug(sugIdx >= 0 ? sugIdx : (sugItems.length === 1 ? 0 : -1)); else goExplorer(); });

  /* ---------- sección comercial ---------- */
  const SERVICES = [
    ['M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01', 'Páginas web corporativas', 'Sitios claros, rápidos y pensados para el celular.'],
    ['M4 7h16l-1 12H5L4 7zM8 7a4 4 0 0 1 8 0', 'Tiendas virtuales', 'Vende en línea con pagos y pedidos organizados.'],
    ['M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3', 'Rediseño de páginas', 'Renovamos lo que ya tienes: más claro, más rápido, más actual.'],
    ['M4 4h16v16H4zM4 10h16M10 10v10', 'Landing pages', 'Una página enfocada en una sola acción: cotizar, reservar o comprar.'],
    ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v7M14 20h3', 'Menús digitales', 'Carta con QR por mesa y pedido directo a tu WhatsApp.'],
    ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', 'Catálogos digitales', 'Tus productos con fotos, precios y botón de pedido.'],
    ['M13 2L4 14h7l-1 8 9-12h-7l1-8z', 'Automatizaciones', 'Respuestas, reservas y avisos sin trabajo manual.'],
    ['M3 17l6-6 4 4 8-8M15 7h6v6', 'Mantenimiento y SEO', 'Cambios al día y mejor posición cuando te buscan en Google.']
  ];
  const CASES = [
    ['Carta digital con QR', 'Para restaurantes y bares: el cliente escanea, elige y llama al mesero desde su celular.', [30, 52, 40, 64]],
    ['Sitio de varias sedes', 'Para negocios con más de un local: horarios, mapa y carta de cada sede en un solo lugar.', [44, 68, 34, 56]],
    ['Página de celebraciones', 'Galería de espacios, carta y cotización por WhatsApp para quienes planean una fiesta.', [58, 36, 66, 46]]
  ];
  $('#svcGrid').innerHTML = SERVICES.map(([d, t, p]) => `<div>${rawIco(d)}<strong>${t}</strong><p>${p}</p></div>`).join('');
  $('#casesGrid').innerHTML = CASES.map(([t, p, bars]) => `<article class="case"><div class="case-art"><em>Ejemplo</em>
    <div class="m">${bars.map((h, i) => `<i class="${i === 1 ? 'r' : ''}" style="height:${h + 16}px"></i>`).join('')}</div></div>
    <div class="case-b"><strong>${t}</strong><p>${p}</p></div></article>`).join('');

  /* ---------- modal ---------- */
  const modal = $('#modal'); let modalFocus = null;
  function openModal(html) {
    modalFocus = document.activeElement;
    $('#mBody').innerHTML = html; modal.hidden = false; document.body.style.overflow = 'hidden';
    const f = $('input,select,textarea,button.btn', $('#mBody')); if (f) f.focus();
  }
  function closeModal() {
    modal.hidden = true; document.body.style.overflow = '';
    if (modalFocus && modalFocus.focus) modalFocus.focus({ preventScroll: true });
  }
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });

  function saveLead(type, data) {
    let all = []; try { all = JSON.parse(store.get('dm_leads') || '[]'); } catch { all = []; }
    all.push({ type, ...data, at: new Date().toISOString() });
    store.set('dm_leads', JSON.stringify(all));
  }
  const cleanPhone = v => { const d = v.replace(/\D/g, ''); return d.length === 10 ? '57' + d : d; };
  const phoneOk = v => { const d = v.replace(/\D/g, ''); return d.length === 10 || (d.length === 12 && d.startsWith('57')); };

  function simpleForm(id, fields, submitLabel) {
    return `<form class="form" id="${id}" novalidate>${fields}
      <label class="chk"><input name="consent" type="checkbox" required><span>Autorizo que SONETIX use estos datos para atender mi solicitud. <button class="link" type="button" data-policy>Ver política de datos</button></span></label>
      <p class="err" role="alert" hidden></p><button class="btn btn-red btn-lg" type="submit">${submitLabel}</button></form>`;
  }
  function validate(form) {
    let ok = true; form.querySelectorAll('[required]').forEach(el => {
      const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'tel' && !phoneOk(el.value));
      el.classList.toggle('invalid', bad); if (bad) ok = false;
    });
    return ok;
  }

  function openClaim(b) {
    openModal(`<h3>Reclamar ${b ? '«' + esc(b.name) + '»' : 'mi ficha'}</h3>
      <p>Es gratis. Te escribiremos por WhatsApp para verificar que eres parte del negocio. Solo se publica lo que tú apruebes.</p>
      ${simpleForm('claimForm', `
        <label>Nombre del negocio<input name="biz" type="text" required value="${b ? esc(b.name) : ''}"></label>
        <label>Tu nombre<input name="name" type="text" required autocomplete="name"></label>
        <label>WhatsApp<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="300 000 0000"></label>
        <label>¿Cuál es tu relación con el negocio?<select name="role" required><option value="">Elige una opción</option><option>Soy el dueño</option><option>Administro el negocio</option><option>Trabajo aquí y tengo autorización</option></select></label>`, 'Enviar para verificar')}`);
    $('#claimForm').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, err = $('.err', f);
      if (!validate(f)) { err.textContent = 'Revisa los campos marcados.'; err.hidden = false; return; }
      saveLead('reclamo', { biz: f.biz.value.trim(), name: f.name.value.trim(), phone: cleanPhone(f.phone.value), role: f.role.value, ref: b ? b.id : null });
      $('#mBody').innerHTML = `<h3>Recibimos tu solicitud</h3><p class="ok">Gracias. Te escribiremos por WhatsApp para verificar tu negocio.</p><p>Modo demostración: la solicitud quedó guardada solo en este navegador.</p><button class="btn btn-ghost" type="button" data-close>Cerrar</button>`;
    });
  }
  function openOptout() {
    openModal(`<h3>Solicitar retirar mi negocio</h3>
      <p>Si tu negocio aparece en el mapa y prefieres que lo retiremos, cuéntanos cuál es. Lo retiramos y no volvemos a contactarte.</p>
      ${simpleForm('optForm', `
        <label>Nombre del negocio<input name="biz" type="text" required></label>
        <label>Tu WhatsApp o correo de contacto<input name="phone" type="text" required></label>`, 'Solicitar retiro')}`);
    $('#optForm').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, err = $('.err', f);
      if (!validate(f)) { err.textContent = 'Revisa los campos marcados.'; err.hidden = false; return; }
      saveLead('retiro', { biz: f.biz.value.trim(), contact: f.phone.value.trim() });
      $('#mBody').innerHTML = `<h3>Solicitud recibida</h3><p class="ok">Retiraremos tu negocio y no volveremos a contactarte.</p><p>Modo demostración: la solicitud quedó guardada solo en este navegador.</p><button class="btn btn-ghost" type="button" data-close>Cerrar</button>`;
    });
  }
  function openPolicy() {
    openModal(`<h3>Política de tratamiento de datos</h3>
      <p><strong>Borrador pendiente de revisión legal antes del lanzamiento.</strong></p>
      <p><b>Qué datos usamos:</b> datos comerciales públicos de los negocios (nombre, categoría, ubicación, horarios, enlaces) y los datos que tú nos das en los formularios (nombre, negocio, WhatsApp).</p>
      <p><b>Para qué:</b> mostrar el mapa, atender tus solicitudes de ficha o cotización y, si lo autorizas, contactarte con una propuesta.</p>
      <p><b>Tus derechos:</b> conocer, actualizar, rectificar y suprimir tus datos, y pedir que no te contactemos. Puedes usar «Solicitar retirar mi negocio» en el pie de página.</p>
      <p><b>Fotos y contenidos:</b> solo se publican con autorización del dueño del negocio.</p>
      <button class="btn btn-ghost" type="button" data-close>Cerrar</button>`);
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-policy]')) { e.preventDefault(); openPolicy(); }
  });
  $('#claimOpen').addEventListener('click', () => openClaim(null));
  $('#claimOpen2').addEventListener('click', () => openClaim(null));
  $('#optoutBtn').addEventListener('click', openOptout);

  /* ---------- cotización ---------- */
  function waLink(text) {
    const n = (window.SONETIX_WHATSAPP || '').replace(/\D/g, '');
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
  }
  $('#waDirect').addEventListener('click', () => {
    const l = waLink('Hola SONETIX, quiero información sobre una página web para mi negocio.');
    l ? open(l, '_blank', 'noopener') : toast('Falta configurar el número de WhatsApp de SONETIX (js/data.js).');
  });
  const qf = $('#quoteForm');
  qf.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#formErr'), ok = $('#formOk'); ok.hidden = true;
    if (!validate(qf)) { err.textContent = 'Revisa los campos marcados. El WhatsApp debe tener 10 dígitos.'; err.hidden = false; return; }
    err.hidden = true;
    const d = { name: qf.name.value.trim(), biz: qf.biz.value.trim(), phone: cleanPhone(qf.phone.value), service: qf.service.value, msg: qf.msg.value.trim() };
    saveLead('cotizacion', d);
    const text = `Hola SONETIX, soy ${d.name} de ${d.biz}. Necesito: ${d.service}.${d.msg ? ' ' + d.msg : ''} Mi WhatsApp: ${d.phone}`;
    const l = waLink(text);
    if (l) { open(l, '_blank', 'noopener'); ok.textContent = 'Listo. Abrimos WhatsApp para que envíes tu solicitud.'; }
    else ok.textContent = 'Recibimos tu solicitud. Modo demostración: quedó guardada solo en este navegador.';
    ok.hidden = false; qf.reset();
  });
  qf.addEventListener('input', e => e.target.classList.remove('invalid'));

  /* ---------- constructor en vivo: «mira cómo se vería tu página» ---------- */
  const SITE = {
    rest:    { tag: 'Cocina que se disfruta', cta: 'Reservar por WhatsApp', hours: '11:00 – 22:00', offer: [['Nuestra carta', 'Platos de la casa y para compartir'], ['Menú del día', 'Opciones que cambian cada día'], ['Domicilios', 'Pide directo, sin intermediarios']] },
    cafe:    { tag: 'Café y algo más', cta: 'Pedir por WhatsApp', hours: '7:00 – 19:00', offer: [['Café de origen', 'Preparado al momento'], ['Brunch y postres', 'Desayunos todo el día'], ['Para llevar', 'Pide y recoge sin filas']] },
    bar:     { tag: 'Una noche distinta', cta: 'Reservar mesa', hours: '17:00 – 02:00', offer: [['Coctelería', 'Preparaciones de autor'], ['Música y eventos', 'Planes cada semana'], ['Reservas', 'Asegura tu mesa en un clic']] },
    moda:    { tag: 'Estilo que te acompaña', cta: 'Pedir por WhatsApp', hours: '10:00 – 20:00', offer: [['Nueva colección', 'Piezas que acaban de llegar'], ['Tallas y ajustes', 'Te ayudamos a elegir'], ['Envíos', 'Recíbelo en tu casa']] },
    belleza: { tag: 'Cuidado para ti', cta: 'Agendar una cita', hours: '9:00 – 19:00', offer: [['Cortes y color', 'Con quien más confías'], ['Manos y pies', 'Tratamientos y diseños'], ['Cuidado facial', 'Rutinas a tu medida']] },
    libros:  { tag: 'Historias por descubrir', cta: 'Pedir un libro', hours: '10:00 – 19:00', offer: [['Novedades', 'Lo último en nuestras mesas'], ['Usados y agotados', 'Ediciones difíciles de hallar'], ['Club de lectura', 'Nos reunimos cada mes']] },
    ocio:    { tag: 'Planes para compartir', cta: 'Reservar o cotizar', hours: '14:00 – 01:00', offer: [['Experiencias', 'Para grupos y celebraciones'], ['Cumpleaños', 'Organizamos tu evento'], ['Boletería', 'Consigue tu entrada en línea']] },
    emprend: { tag: 'Hecho con dedicación', cta: 'Hacer un pedido', hours: '9:00 – 18:00', offer: [['Productos', 'Hechos con mucho cuidado'], ['Pedidos por encargo', 'Personalizados para ti'], ['Envíos', 'Lo llevamos a donde estés']] }
  };
  const ACCENTS = [['Rojo', '#ff0a1e', '#ffffff'], ['Naranja', '#ff7a1a', '#111111'], ['Verde', '#3ddc84', '#06210f'], ['Azul', '#3b82f6', '#ffffff'], ['Violeta', '#a855f7', '#ffffff'], ['Amarillo', '#f5c518', '#111111']];
  const DEMOS = [['Café La Esquina', 'cafe', 0], ['Parrilla El Fogón', 'rest', 1], ['Boutique Aurora', 'moda', 4], ['Bar Mirador', 'bar', 3]];
  const bd = { name: '', demo: DEMOS[0][0], cat: DEMOS[0][1], acc: DEMOS[0][2], dev: 'desktop', auto: true };
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '').slice(0, 22) || 'tunegocio';
  const catLabel = id => (CATS[id] ? CATS[id].label : '');

  function renderBdControls() {
    $('#bdCats').innerHTML = CATEGORIES.map(c => `<button class="chip" type="button" data-id="${c.id}" aria-pressed="${bd.cat === c.id}">${catIco(c.id)}${c.label}</button>`).join('');
    $('#bdSw').innerHTML = ACCENTS.map((a, i) => `<button class="swc" type="button" data-i="${i}" style="--c:${a[1]}" aria-pressed="${bd.acc === i}" aria-label="${a[0]}" title="${a[0]}"></button>`).join('');
  }
  function renderSite(swap) {
    const name = bd.name.trim() || bd.demo || 'Tu negocio', d = SITE[bd.cat], acc = ACCENTS[bd.acc][1], on = ACCENTS[bd.acc][2];
    $('#bdSite').innerHTML = `<div class="site-bar"><i></i><i></i><i></i><span class="url">${esc(slug(name))}.co</span></div>
      <div class="s-body${swap ? ' swap' : ''}" style="--acc:${acc};--on:${on}">
        <header class="s-nav"><span class="s-logo"><i></i><em>${esc(name)}</em></span><span class="s-links"><b></b><b></b><b></b></span><button class="s-wa" type="button" data-demo="wa">WhatsApp</button></header>
        <section class="s-hero"><div><small>${catLabel(bd.cat)} · Medellín</small><h3>${esc(name)}</h3><p>${d.tag}. Escríbenos y te respondemos al instante.</p>
          <div class="s-btns"><button class="s-b1" type="button" data-demo="wa">${d.cta}</button><button class="s-b2" type="button" data-demo="map">Cómo llegar</button></div></div>
          <div class="s-art">${catIco(bd.cat, 's-ico')}<span class="s-open"><i></i>Abierto hoy</span></div></section>
        <section class="s-sec"><h4>Lo que ofrecemos</h4><div class="s-cards">${d.offer.map((o, i) => `<div class="s-card"><span>${i + 1}</span><strong>${o[0]}</strong><small>${o[1]}</small></div>`).join('')}</div></section>
        <div class="s-info"><span><b>●</b> Hoy ${d.hours}</span><span>Medellín, Colombia</span></div>
        <footer class="s-foot">Página creada por <strong>SONETIX</strong></footer></div>`;
  }
  const stopAuto = () => { bd.auto = false; };
  function bdInit() {
    if (!$('#builder')) return;
    renderBdControls(); renderSite(false);
    $('#bdName').addEventListener('focus', stopAuto);
    $('#bdName').addEventListener('input', e => { stopAuto(); bd.name = e.target.value; renderSite(false); });
    $('#bdCats').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; stopAuto(); bd.cat = c.dataset.id; renderBdControls(); renderSite(true); });
    $('#bdSw').addEventListener('click', e => { const c = e.target.closest('.swc'); if (!c) return; stopAuto(); bd.acc = +c.dataset.i; renderBdControls(); renderSite(true); });
    $('.bd-dev').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      bd.dev = b.dataset.dev; $('#bdView').dataset.dev = bd.dev;
      $$('.bd-dev button').forEach(x => x.setAttribute('aria-pressed', x === b));
    });
    $('#bdSite').addEventListener('click', e => {
      const b = e.target.closest('[data-demo]'); if (!b) return;
      toast(b.dataset.demo === 'wa' ? 'Así se abriría el WhatsApp de tu negocio.' : 'Así se abriría tu ubicación en el mapa.');
    });
    $('#bdGo').addEventListener('click', () => {
      const name = bd.name.trim();
      if (!name) { stopAuto(); $('#bdName').focus(); toast('Escribe primero el nombre de tu negocio.'); return; }
      const f = $('#quoteForm');
      f.biz.value = name; f.service.value = 'Página web nueva';
      f.msg.value = `Quiero una página para mi negocio (${catLabel(bd.cat).toLowerCase()}). Color elegido: ${ACCENTS[bd.acc][0].toLowerCase()}.`;
      $('#cotizar').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      setTimeout(() => f.name.focus({ preventScroll: true }), reduceMotion ? 0 : 700);
    });
    // demostración automática mientras nadie la toque y la sección esté a la vista
    if (!reduceMotion && 'IntersectionObserver' in window) {
      let vis = false, i = 0;
      new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { threshold: 0.35 }).observe($('#builder'));
      setInterval(() => {
        if (!bd.auto || !vis || document.hidden) return;
        i = (i + 1) % DEMOS; [bd.demo, bd.cat, bd.acc] = DEMOS[i];
        renderBdControls(); renderSite(true);
      }, 3200);
    }
  }
  bdInit();

  /* plan: botones hacia la cotización */
  $('.plan-wrap').addEventListener('click', e => {
    const a = e.target.closest('[data-plan]'); if (!a) return;
    const f = $('#quoteForm');
    if (a.dataset.plan === 'info') { f.service.value = 'Página web nueva'; f.msg.value = 'Me interesa el plan Sitio para mostrar información ($50.000 al mes).'; }
    else { f.service.value = 'No estoy seguro, quiero asesoría'; f.msg.value = ''; }
    $('#cotizar').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- aparición al hacer scroll ---------- */
  function reveal() {
    const els = $$('.rv');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
    els.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  }

  /* ---------- pulido: inicio, menú activo, contadores ---------- */
  function heroFx() {
    const hero = $('#inicio'), art = $('#heroArt');
    $('#heroCount').textContent = BUSINESSES.length + ' negocios';
    if (art && !reduceMotion && matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        art.firstElementChild.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        art.firstElementChild.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      }, { passive: true });
    }
    if (!reduceMotion) {
      $$('#stats dd').forEach(dd => {
        const end = +dd.textContent; let n = 0; const step = Math.max(1, Math.ceil(end / 24));
        dd.textContent = '0';
        const t = setInterval(() => { n = Math.min(end, n + step); dd.textContent = n; if (n >= end) clearInterval(t); }, 45);
      });
    }
  }
  function spy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.menu a'), map2 = {};
    links.forEach(a => { map2[a.getAttribute('href').slice(1)] = a; });
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle('on', a === map2[en.target.id]));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['explorar', 'barrios', 'negocios', 'cotizar'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
    new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.remove('on')); }), { rootMargin: '-45% 0px -50% 0px' }).observe($('#inicio'));
  }

  /* ---------- arranque ---------- */
  buildControls();
  heroFx();
  spy();
  bindFilters();
  syncUI();
  refresh();
  reveal();
  initMap();
})();
