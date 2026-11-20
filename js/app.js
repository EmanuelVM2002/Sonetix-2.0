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
  const state = { q: '', cats: new Set(), barrio: '', open: false, web: false, ev: false, top: false, view: false, selected: null };
  let theme = store.get('dm_theme') === 'light' ? 'light' : 'dark';
  let favs = [];
  try { favs = JSON.parse(store.get('dm_favs') || '[]'); } catch { favs = []; }

  /* ---------- eventos y reseñas (datos de demostración + lo que escribe la persona en este navegador) ---------- */
  const BOG = { timeZone: 'America/Bogota' };
  const fmtDayNum = new Intl.DateTimeFormat('es-CO', { ...BOG, day: 'numeric' });
  const fmtMon = new Intl.DateTimeFormat('es-CO', { ...BOG, month: 'short' });
  const fmtLong = new Intl.DateTimeFormat('es-CO', { ...BOG, weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = new Intl.DateTimeFormat('es-CO', { ...BOG, weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDate = ms => new Date(ms).toLocaleDateString('es-CO', { ...BOG, day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  const evWhen = e => new Date(Date.now() + e.d * 864e5);
  const evLabel = e => (e.d === 0 ? 'Hoy' : e.d === 1 ? 'Mañana' : fmtShort.format(evWhen(e)).replace('.', ''));
  const EVB = {};
  EVENTS.forEach(e => { (EVB[e.biz] = EVB[e.biz] || []).push(e); });
  Object.values(EVB).forEach(l => l.sort((a, b) => a.d - b.d));
  const EVT = Object.fromEntries(EVENT_TYPES.map(t => [t.id, t.label]));
  let myRev = {};
  try { myRev = JSON.parse(store.get('dm_reviews') || '{}'); } catch { myRev = {}; }
  function reviewsOf(id) {
    const seed = REVIEWS_SEED.filter(r => r.biz === id).map(r => ({ stars: r.stars, name: r.name, text: r.text, at: Date.now() - r.daysAgo * 864e5, example: true }));
    const mine = myRev[id] ? [{ ...myRev[id], mine: true }] : [];
    return [...mine, ...seed].sort((a, b) => b.at - a.at);
  }
  function ratingOf(id) {
    const r = reviewsOf(id), n = r.length;
    return { n, avg: n ? r.reduce((a, x) => a + x.stars, 0) / n : 0 };
  }
  const starsHTML = avg => `<span class="stars" style="--r:${avg.toFixed(2)}" role="img" aria-label="${avg.toFixed(1).replace('.', ',')} de 5 estrellas">★★★★★</span>`;
  const avgTxt = v => v.toFixed(1).replace('.', ',');

  function filtered() {
    const q = norm(state.q.trim());
    return BUSINESSES.filter(b => {
      if (state.cats.size && !state.cats.has(b.cat)) return false;
      if (state.barrio && b.barrio !== state.barrio) return false;
      if (state.open && !isOpen(b)) return false;
      if (state.web && !b.web) return false;
      if (state.ev && !(EVB[b.id] || []).length) return false;
      if (state.view && map) { try { if (!map.getBounds().contains([b.lng, b.lat])) return false; } catch { /* mapa aún cargando */ } }
      if (state.top) { const r = ratingOf(b.id); if (!(r.n && r.avg >= 4)) return false; }
      if (q) {
        const hay = norm([b.name, CATS[b.cat].label, BAR[b.barrio].name, b.desc, ...b.services].join(' '));
        return q.split(/\s+/).every(w => hay.includes(w));
      }
      return true;
    });
  }
  const anyFilter = () => state.q || state.cats.size || state.barrio || state.open || state.web || state.ev || state.top || state.view;

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
  let map = null, baseStyle = null, hoverPopup = null, hovId = null, zoneHov = null;
  const FONT = ['Noto Sans Regular'];
  const ZOOM_PINS = 13.9;                       // por debajo se ven zonas; por encima, negocios
  const mapOpt = { d3: true, ev: false };
  const TILT = { pitch: 52, bearing: -14 };

  async function getStyle() {
    if (!baseStyle) baseStyle = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
    const s = JSON.parse(JSON.stringify(baseStyle));
    declutter(s);
    if (theme === 'dark') recolor(s);
    return s;
  }
  /* Menos ruido: lo menor aparece solo al acercarse y se quitan contornos y etiquetas secundarias. */
  function declutter(s) {
    const minz = { highway_path: 15.5, highway_minor: 14.4, 'highway-name-path': 17, 'highway-name-minor': 16.5, 'highway-name-major': 15, label_other: 14.6, label_village: 14.2, building: 15.4, waterway: 13.5, landuse_residential: 13 };
    for (const l of s.layers) {
      if (minz[l.id] != null) l.minzoom = Math.max(l.minzoom || 0, minz[l.id]);
      if (/^(waterway_line_label|water_name_point_label|water_name_line_label|airport)$/.test(l.id) || /shield/.test(l.id)) (l.layout = l.layout || {}).visibility = 'none';
      if (l.type === 'line' && /casing/.test(l.id)) { l.paint = l.paint || {}; l.paint['line-opacity'] = 0; }
    }
  }
  /* Repinta el estilo base a la paleta SONETIX (negro, grafito, humo). */
  function recolor(s) {
    const C = { land: '#0f0f12', water: '#050505', park: '#101115', build: '#14151a', road: '#1a1c22', major: '#272930', cas: '#0a0a0c', label: '#8e909a', halo: '#050505', lwater: '#5a5d6a' };
    for (const l of s.layers) {
      const p = l.paint = l.paint || {};
      if (/shield/.test(l.id)) { (l.layout = l.layout || {}).visibility = 'none'; continue; }
      if (l.type === 'background') p['background-color'] = C.land;
      else if (l.type === 'fill') {
        if (l.id === 'water') p['fill-color'] = C.water;
        else if (/park|wood/.test(l.id)) p['fill-color'] = C.park;
        else if (/ice|glacier/.test(l.id)) p['fill-opacity'] = 0;
        else if (l.id === 'building') { p['fill-color'] = C.build; p['fill-outline-color'] = '#181a20'; }
        else p['fill-color'] = C.land;
      } else if (l.type === 'line') {
        if (/dashline/.test(l.id)) p['line-color'] = 'rgba(0,0,0,0)';
        else if (/boundary/.test(l.id)) p['line-color'] = '#2f313a';
        else if (/casing/.test(l.id)) p['line-color'] = C.cas;
        else if (/railway|aeroway/.test(l.id)) p['line-color'] = '#181a20';
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
      properties: { id: b.id, name: b.name, claimed: b.claimed, web: !!b.web, by: b.webBy || '', ev: !!(EVB[b.id] || []).length }
    }))
  });
  const zonesFC = list => {
    const g = {};
    list.forEach(b => { (g[b.barrio] = g[b.barrio] || []).push(b); });
    return { type: 'FeatureCollection', features: Object.entries(g).filter(([id]) => BAR[id]).map(([id, arr]) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [BAR[id].lng, BAR[id].lat] }, properties: { id, name: BAR[id].name, count: arr.length } })) };
  };
  const selFC = () => {
    const b = BIZ[state.selected];
    return { type: 'FeatureCollection', features: b ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: {} }] : [] };
  };
  function pushData(list) {
    if (!map) return;
    const s = map.getSource('biz'); if (s) s.setData(toFC(list));
    const z = map.getSource('zones'); if (z) z.setData(zonesFC(list));
  }

  function addLayers() {
    const c = pal(), RED = '#ff0a1e', dark = theme === 'dark', list = filtered();
    const H = ['boolean', ['feature-state', 'hover'], false];
    const fadeIn = ['interpolate', ['linear'], ['zoom'], 13.3, 0, ZOOM_PINS, 1];
    const fadeOut = ['interpolate', ['linear'], ['zoom'], 13.2, 1, ZOOM_PINS, 0];
    map.addSource('biz', { type: 'geojson', data: toFC(list), promoteId: 'id' });
    map.addSource('zones', { type: 'geojson', data: zonesFC(list), promoteId: 'id' });
    map.addSource('sel', { type: 'geojson', data: selFC() });

    // edificios en 3D (solo visibles con el botón 3D)
    map.addLayer({ id: 'bld3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14.8,
      layout: { visibility: mapOpt.d3 ? 'visible' : 'none' },
      paint: { 'fill-extrusion-color': dark ? '#23252d' : '#dcdde4', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.9 } });

    // vista de zonas: una burbuja por barrio
    const zr = ['+', 15, ['*', 2.6, ['sqrt', ['get', 'count']]]];
    map.addLayer({ id: 'zone-bubble', type: 'circle', source: 'zones', maxzoom: ZOOM_PINS,
      paint: { 'circle-radius': ['case', H, ['+', zr, 4], zr], 'circle-color': dark ? '#151518' : '#ffffff', 'circle-opacity': fadeOut,
        'circle-stroke-color': RED, 'circle-stroke-width': ['case', H, 2.5, 1.5], 'circle-stroke-opacity': fadeOut } });
    map.addLayer({ id: 'zone-count', type: 'symbol', source: 'zones', maxzoom: ZOOM_PINS,
      layout: { 'text-field': ['to-string', ['get', 'count']], 'text-font': FONT, 'text-size': 14, 'text-allow-overlap': true },
      paint: { 'text-color': c.txt, 'text-opacity': fadeOut } });
    map.addLayer({ id: 'zone-name', type: 'symbol', source: 'zones', maxzoom: ZOOM_PINS,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 2.5], 'text-optional': true },
      paint: { 'text-color': c.txt, 'text-halo-color': c.halo, 'text-halo-width': 1.4, 'text-opacity': fadeOut } });

    // vista de negocios
    map.addLayer({ id: 'halo', type: 'circle', source: 'biz', minzoom: 13.3, filter: ['==', ['get', 'by'], 'sonetix'],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 24], 'circle-color': RED, 'circle-blur': 0.8,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 13.3, 0, ZOOM_PINS, 0.26] } });
    map.addLayer({ id: 'evring', type: 'circle', source: 'biz', minzoom: 13.3, filter: ['==', ['get', 'ev'], true],
      layout: { visibility: mapOpt.ev ? 'visible' : 'none' },
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 17], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': RED, 'circle-stroke-width': 1.6, 'circle-stroke-opacity': fadeIn } });
    map.addLayer({ id: 'pins', type: 'circle', source: 'biz', minzoom: 13.3,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, ['case', H, 6.5, 4], 16, ['case', H, 11.5, 8.5]],
        'circle-color': ['case', ['==', ['get', 'by'], 'sonetix'], RED, ['get', 'claimed'], c.pin, 'rgba(142,144,154,0.22)'],
        'circle-stroke-color': ['case', ['==', ['get', 'by'], 'sonetix'], '#ffffff', ['get', 'claimed'], c.stroke, c.unc],
        'circle-stroke-width': ['case', H, 3, 2], 'circle-opacity': fadeIn, 'circle-stroke-opacity': fadeIn
      } });
    map.addLayer({ id: 'webdot', type: 'circle', source: 'biz', minzoom: 13.3, filter: ['all', ['==', ['get', 'web'], true], ['!=', ['get', 'by'], 'sonetix']],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2.4, 16, 4.6], 'circle-color': c.grn, 'circle-stroke-color': c.stroke, 'circle-stroke-width': 1.4,
        'circle-translate': [7, -7], 'circle-translate-anchor': 'viewport', 'circle-opacity': fadeIn, 'circle-stroke-opacity': fadeIn } });
    map.addLayer({ id: 'labels', type: 'symbol', source: 'biz', minzoom: 15,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11.5, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': c.txt, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } });
    map.addLayer({ id: 'sel-ring', type: 'circle', source: 'sel',
      paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': RED, 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'sel-dot', type: 'circle', source: 'sel',
      paint: { 'circle-radius': 9, 'circle-color': RED, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
  }

  /* tarjeta que aparece sobre el mapa al pasar el cursor */
  function tipHTML(b) {
    const rt = ratingOf(b.id), open = isOpen(b), nev = (EVB[b.id] || []).length;
    return `<div class="mp"><span class="mp-ic">${catIco(b.cat)}</span><div><strong>${esc(b.name)}</strong><small>${CATS[b.cat].label} · ${esc(BAR[b.barrio].name)}</small>
      <span class="mp-m"><b class="${open ? 'o' : ''}">${open ? 'Abierto' : 'Cerrado'}</b>${rt.n ? ` · ★ ${avgTxt(rt.avg)} (${rt.n})` : ''}${nev ? ' · Evento' : ''}</span></div></div>`;
  }
  function setHover(id) {
    if (!map || !map.getSource('biz')) return;
    if (hovId && hovId !== id) { try { map.setFeatureState({ source: 'biz', id: hovId }, { hover: false }); } catch { /* ignorar */ } }
    hovId = id;
    if (id) { try { map.setFeatureState({ source: 'biz', id }, { hover: true }); } catch { /* ignorar */ } }
  }
  function setZoneHover(id) {
    if (!map || !map.getSource('zones')) return;
    if (zoneHov && zoneHov !== id) { try { map.setFeatureState({ source: 'zones', id: zoneHov }, { hover: false }); } catch { /* ignorar */ } }
    zoneHov = id;
    if (id) { try { map.setFeatureState({ source: 'zones', id }, { hover: true }); } catch { /* ignorar */ } }
  }
  function clearHL() { $$('#list .card.hl').forEach(x => x.classList.remove('hl')); }
  function hoverFromList(id) {
    const b = BIZ[id]; if (!map || !b) return;
    if (map.getZoom() < ZOOM_PINS) { setZoneHover(b.barrio); return; }
    setHover(id);
    if (hoverPopup) hoverPopup.setLngLat([b.lng, b.lat]).setHTML(tipHTML(b)).addTo(map);
  }
  function clearHoverFromList() { setHover(null); setZoneHover(null); if (hoverPopup) hoverPopup.remove(); }

  function set3D(on) {
    mapOpt.d3 = on; $('#mt3d').setAttribute('aria-pressed', on);
    if (!map) return;
    if (map.getLayer('bld3d')) map.setLayoutProperty('bld3d', 'visibility', on ? 'visible' : 'none');
    const b = BIZ[state.selected];
    map.easeTo({ pitch: on ? TILT.pitch : 0, bearing: on ? TILT.bearing : 0, zoom: on && b ? Math.max(map.getZoom(), 15.3) : map.getZoom(),
      center: on && b ? [b.lng, b.lat] : map.getCenter(), duration: reduceMotion ? 0 : 1000 });
  }
  function setEvLayer(on) {
    mapOpt.ev = on; $('#mtEv').setAttribute('aria-pressed', on);
    if (map && map.getLayer('evring')) map.setLayoutProperty('evring', 'visibility', on ? 'visible' : 'none');
    if (on && map && map.getZoom() < ZOOM_PINS) toast('Acércate a una zona para ver los negocios con eventos.');
  }
  function bindMapTools() {
    $('#mt3d').addEventListener('click', () => set3D(!mapOpt.d3));
    $('#mtEv').addEventListener('click', () => setEvLayer(!mapOpt.ev));
    $('#mtView').addEventListener('click', () => { state.view = !state.view; syncUI(); refresh(); if (!state.view) fit(); });
    $('#lgBtn').addEventListener('click', () => {
      const body = $('#lgBody'), open = body.hidden;
      body.hidden = !open; $('#lgBtn').setAttribute('aria-expanded', open);
    });
  }

  function initMap() {
    if (typeof maplibregl === 'undefined') { $('#mapFallback').hidden = false; return; }
    getStyle().then(style => {
      map = new maplibregl.Map({
        container: 'map', style, center: [-75.5812, 6.2442], zoom: 12.1, minZoom: 10, maxZoom: 18, maxPitch: 70,
        pitch: mapOpt.d3 ? TILT.pitch : 0, bearing: mapOpt.d3 ? TILT.bearing : 0,
        attributionControl: { compact: true }, cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scroll para acercar el mapa',
          'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scroll para acercar el mapa',
          'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
          'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar',
          'GeolocateControl.FindMyLocation': 'Cerca de mí', 'GeolocateControl.LocationNotAvailable': 'Ubicación no disponible'
        }
      });
      window.dmMap = map; // útil para depurar en la consola
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false, showAccuracyCircle: false, fitBoundsOptions: { maxZoom: 15 } });
      map.addControl(geo, 'top-right');
      geo.on('error', () => toast('No pudimos acceder a tu ubicación. Revisa el permiso del navegador.'));
      map.on('style.load', addLayers);
      map.on('load', () => {
        map.resize();
        const sb = BIZ[state.selected];
        if (sb) map.jumpTo({ center: [sb.lng, sb.lat], zoom: 15.3 }); else fit(false);
        if (!reduceMotion) requestAnimationFrame(pulse);
      });
      if ('ResizeObserver' in window) new ResizeObserver(() => map.resize()).observe($('#map'));

      let mvT;
      map.on('moveend', () => { if (!state.view) return; clearTimeout(mvT); mvT = setTimeout(() => refresh(), 180); });

      map.on('click', 'pins', e => select(e.features[0].properties.id, { from: 'map' }));
      map.on('click', 'zone-bubble', e => {
        const id = e.features[0].properties.id, z = BAR[id]; if (!z) return;
        state.barrio = id; closeFicha(); syncUI(); refresh();
        if (hoverPopup) hoverPopup.remove();
        map.flyTo({ center: [z.lng, z.lat], zoom: z.zoom, duration: reduceMotion ? 0 : 1100 });
      });

      hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 16, className: 'tip' });
      map.on('mouseenter', 'pins', e => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0], id = f.properties.id, b = BIZ[id]; if (!b) return;
        setHover(id);
        hoverPopup.setLngLat(f.geometry.coordinates).setHTML(tipHTML(b)).addTo(map);
        clearHL(); const card = $(`#list .card[data-id="${id}"]`);
        if (card) { card.classList.add('hl'); card.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
      });
      map.on('mouseleave', 'pins', () => { map.getCanvas().style.cursor = ''; setHover(null); hoverPopup.remove(); clearHL(); });
      map.on('mouseenter', 'zone-bubble', e => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0], p = f.properties;
        setZoneHover(p.id);
        hoverPopup.setLngLat(f.geometry.coordinates).setHTML(`<div class="mp"><div><strong>${esc(p.name)}</strong><small>${p.count} ${p.count === 1 ? 'negocio' : 'negocios'} · toca para explorar</small></div></div>`).addTo(map);
      });
      map.on('mouseleave', 'zone-bubble', () => { map.getCanvas().style.cursor = ''; setZoneHover(null); hoverPopup.remove(); });
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
    if (!map || state.view) return;
    const list = filtered();
    if (!list.length) return;
    if (list.length === 1) { map.easeTo({ center: [list[0].lng, list[0].lat], zoom: 15.4, duration: animate ? 800 : 0 }); return; }
    const b = new maplibregl.LngLatBounds();
    list.forEach(x => b.extend([x.lng, x.lat]));
    map.fitBounds(b, { padding: { top: 70, bottom: isMobile() ? 140 : 90, left: 50, right: 50 }, maxZoom: 15.4, pitch: mapOpt.d3 ? TILT.pitch : 0, bearing: mapOpt.d3 ? TILT.bearing : 0, duration: animate && !reduceMotion ? 900 : 0 });
  }

  /* ---------- lista y filtros ---------- */
  const listEl = $('#list');
  function renderList(list) {
    if (!list.length) {
      listEl.innerHTML = `<li class="empty"><strong>No encontramos negocios con esos filtros</strong>Prueba con otra categoría o limpia los filtros.</li>`;
      return;
    }
    listEl.innerHTML = list.map(b => {
      const open = isOpen(b), rt = ratingOf(b.id), nev = (EVB[b.id] || []).length;
      return `<li><button class="card${state.selected === b.id ? ' on' : ''}" data-id="${b.id}" type="button">
        <span class="thumb${b.webBy ? ' sx' : ''}">${catIco(b.cat)}</span>
        <span class="card-t"><strong>${esc(b.name)}</strong>
          <small>${CATS[b.cat].label} · ${esc(BAR[b.barrio].name)}</small>
          <span class="meta"><span class="${open ? 'open-b' : 'closed-b'}">${open ? 'Abierto' : 'Cerrado'}</span><span>${PRICE[b.price]}</span>${rt.n ? `<span class="rt">★ ${avgTxt(rt.avg)} <small>(${rt.n})</small></span>` : ''}${nev ? '<span class="evtag">Evento</span>' : ''}${b.claimed ? '' : '<span class="unc">Sin reclamar</span>'}</span>
        </span></button></li>`;
    }).join('');
  }

  function refresh({ doFit = false } = {}) {
    const list = filtered();
    renderList(list);
    $('#count').textContent = `${list.length} ${list.length === 1 ? 'negocio' : 'negocios'}` + (state.cats.size ? ' · ' + [...state.cats].map(id => CATS[id].label).join(', ') : '');
    $('#clearBtn').hidden = !anyFilter();
    pushData(list);
    if (doFit) fit();
  }

  function syncUI() {
    $$('#catChips .cat').forEach(c => c.setAttribute('aria-pressed', state.cats.has(c.dataset.id)));
    const nf = [state.barrio, state.open, state.web, state.ev, state.top].filter(Boolean).length;
    $('#fBadge').hidden = !nf; $('#fBadge').textContent = nf;
    $('#barrioSel').value = state.barrio;
    $('#openTgl').setAttribute('aria-pressed', state.open);
    $('#webTgl').setAttribute('aria-pressed', state.web);
    $('#evTgl').setAttribute('aria-pressed', state.ev);
    $('#topTgl').setAttribute('aria-pressed', state.top);
    $('#mtView').setAttribute('aria-pressed', state.view);
    $('#q').value = state.q;
  }

  function buildControls() {
    $('#catChips').innerHTML = CATEGORIES.map(c => `<button class="cat" type="button" data-id="${c.id}" aria-pressed="false" aria-label="${c.label}" title="${c.label}">${catIco(c.id)}</button>`).join('');
    $('#barrioSel').innerHTML = `<option value="">Todos los barrios</option>` + BARRIOS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    $('#quickCats').innerHTML = CATEGORIES.slice(0, 6).map(c => `<button class="qchip" type="button" data-id="${c.id}">${catIco(c.id)}${c.label}</button>`).join('');
    const openNow = BUSINESSES.filter(isOpen).length;
    $('#stats').innerHTML = [
      [BUSINESSES.length, 'Negocios'], [BARRIOS.length, 'Barrios'], [EVENTS.length, 'Eventos'], [openNow, 'Abiertos ahora']
    ].map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join('');
    $('#barriosGrid').innerHTML = BARRIOS.map((b, i) => {
      const n = BUSINESSES.filter(x => x.barrio === b.id).length;
      return `<button class="barrio rv" type="button" data-id="${b.id}" data-n="${String(i + 1).padStart(2, '0')}">
        <span class="n">${n} negocios</span><strong>${esc(b.name)}</strong><small>${esc(b.vibe)}</small></button>`;
    }).join('');
  }

  const goExplorer = () => openMap();

  function bindFilters() {
    $('#catChips').addEventListener('click', e => {
      const c = e.target.closest('.cat'); if (!c) return;
      state.cats.has(c.dataset.id) ? state.cats.delete(c.dataset.id) : state.cats.add(c.dataset.id);
      closeFicha(); syncUI(); refresh({ doFit: true });
    });
    $('#barrioSel').addEventListener('change', e => {
      state.barrio = e.target.value; closeFicha(); syncUI(); refresh({ doFit: false });
      if (state.barrio && map) { const b = BAR[state.barrio]; map.flyTo({ center: [b.lng, b.lat], zoom: b.zoom, duration: reduceMotion ? 0 : 1200 }); } else fit();
    });
    $('#openTgl').addEventListener('click', () => { state.open = !state.open; syncUI(); refresh({ doFit: true }); });
    $('#webTgl').addEventListener('click', () => { state.web = !state.web; syncUI(); refresh({ doFit: true }); });
    $('#evTgl').addEventListener('click', () => { state.ev = !state.ev; syncUI(); refresh({ doFit: true }); });
    $('#topTgl').addEventListener('click', () => { state.top = !state.top; syncUI(); refresh({ doFit: true }); });
    let qT;
    $('#q').addEventListener('input', e => {
      state.q = e.target.value; refresh();
      clearTimeout(qT); qT = setTimeout(() => fit(), 350);
    });
    $('#clearBtn').addEventListener('click', () => {
      Object.assign(state, { q: '', barrio: '', open: false, web: false, ev: false, top: false, view: false }); state.cats.clear();
      syncUI(); refresh({ doFit: true });
    });
    listEl.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) select(c.dataset.id, { from: 'list' }); });
    listEl.addEventListener('mouseover', e => { const c = e.target.closest('.card'); if (c && matchMedia('(hover: hover)').matches) hoverFromList(c.dataset.id); });
    listEl.addEventListener('mouseleave', clearHoverFromList);
    $('#fBtn').addEventListener('click', () => {
      const p = $('#fPanel'), open = p.hidden;
      p.hidden = !open; $('#fBtn').setAttribute('aria-expanded', open);
    });
    bindMapTools();

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

  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove(); return ok ? Promise.resolve() : Promise.reject(new Error('copy'));
    };
    return navigator.clipboard ? navigator.clipboard.writeText(text).catch(fallback) : fallback();
  }

  /* ---------- galería de fotos, visor, horario semanal ---------- */
  const PH_CAPS = {
    rest: ['El salón', 'Platos de la casa', 'La terraza', 'La cocina'],
    cafe: ['El local', 'Café y repostería', 'La barra', 'Un rincón favorito'],
    bar: ['La barra', 'Coctelería', 'El ambiente', 'La terraza'],
    moda: ['La tienda', 'Nueva colección', 'Los probadores', 'La vitrina'],
    belleza: ['El salón', 'Nuestros servicios', 'Zona de espera', 'El equipo'],
    libros: ['La librería', 'Novedades', 'Rincón de lectura', 'Los estantes'],
    ocio: ['El espacio', 'Actividades', 'Eventos', 'Zona de grupos'],
    emprend: ['El taller', 'Productos', 'El proceso', 'Pedidos']
  };
  /* Si el negocio trae `photos: [{src, alt, cap}]` se usan; si no, composiciones de ejemplo claramente marcadas. */
  function photosOf(b) {
    const caps = PH_CAPS[b.cat] || PH_CAPS.emprend;
    if (b.photos && b.photos.length) return b.photos.map((p, i) => ({ src: p.src, alt: p.alt, cap: p.cap || caps[i] || 'Foto' }));
    return caps.map(c => ({ src: null, cap: c }));
  }
  function phHTML(b, i, big) {
    let h = 0; for (const ch of b.id + '-' + i) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `<span class="ph${big ? ' big' : ''}" style="--a:${h % 360}deg;--x:${20 + (h >> 3) % 60}%;--y:${15 + (h >> 7) % 65}%">${catIco(b.cat)}<em>Foto de ejemplo</em></span>`;
  }
  function galleryHTML(b) {
    const ph = photosOf(b), n = ph.length;
    const tile = (p, i) => `<button class="gm${i === 0 ? ' main' : ''}" type="button" data-gal="${i}" aria-label="Ver la foto ${i + 1} de ${n}: ${esc(p.cap)}">${p.src ? `<img src="${esc(p.src)}" alt="${esc(p.alt || p.cap)}" loading="lazy">` : phHTML(b, i)}</button>`;
    return `${ph.slice(0, 3).map(tile).join('')}
      <button class="f-all" type="button" data-gal="0"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Ver ${n} fotos</button>
      <button class="f-share" type="button" data-act="share" aria-label="Copiar el enlace de este negocio" title="Copiar enlace"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg></button>`;
  }
  const DAYN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  function weekHTML(b) {
    const { day } = bogotaNow(), h = b.hours;
    return `<details class="wk"><summary><b>${hoursToday(b)}</b><i aria-hidden="true"></i></summary><ul>${[1, 2, 3, 4, 5, 6, 0].map(d =>
      `<li class="${d === day ? 'today' : ''}"><span>${DAYN[d]}</span><span>${h.days.includes(d) ? fmtH(h.open) + ' – ' + fmtH(h.close) : 'Cerrado'}</span></li>`).join('')}</ul></details>`;
  }

  /* visor de fotos */
  let lb = { id: null, i: 0 };
  function lbRender() {
    const b = BIZ[lb.id], ph = photosOf(b), p = ph[lb.i];
    $('#lbImg').innerHTML = p.src ? `<img src="${esc(p.src)}" alt="${esc(p.alt || p.cap)}">` : phHTML(b, lb.i, true);
    $('#lbCap').textContent = `${b.name} · ${p.cap}${p.src ? '' : ' · Foto de ejemplo'}`;
    $('#lbDots').innerHTML = ph.map((_, i) => `<button type="button" data-lb="go" data-i="${i}" aria-label="Foto ${i + 1}" aria-current="${i === lb.i}"></button>`).join('');
  }
  function openLb(id, i) {
    lb = { id, i: i || 0 }; $('#lb').hidden = false; document.body.style.overflow = 'hidden'; lbRender();
    $('#lb [data-lb="close"]').focus();
  }
  function closeLb() { $('#lb').hidden = true; document.body.style.overflow = ''; }
  function lbStep(d) { const n = photosOf(BIZ[lb.id]).length; lb.i = (lb.i + d + n) % n; lbRender(); }
  $('#lb').addEventListener('click', e => {
    const a = e.target.closest('[data-lb]');
    if (!a) { if (e.target.id === 'lb' || e.target.closest('.lb-fig') === null) closeLb(); return; }
    const k = a.dataset.lb;
    if (k === 'close') closeLb(); else if (k === 'prev') lbStep(-1); else if (k === 'next') lbStep(1); else if (k === 'go') { lb.i = +a.dataset.i; lbRender(); }
  });

  function reviewsHTML(b) {
    const list = reviewsOf(b.id), { n, avg } = ratingOf(b.id), mine = myRev[b.id];
    return `<h4>Calificaciones y comentarios</h4>
      <div class="rev-sum">${n ? `<strong>${avgTxt(avg)}</strong>${starsHTML(avg)}<small>${n} ${n === 1 ? 'reseña' : 'reseñas'}</small>` : '<small>Aún no hay reseñas. Sé la primera persona en calificar.</small>'}</div>
      <form class="rev-form" id="revForm" novalidate>
        <fieldset><legend>${mine ? 'Actualiza tu calificación' : 'Tu calificación'}</legend>
          <div class="pick" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="pk${mine && mine.stars >= v ? ' on' : ''}" role="radio" aria-checked="${!!mine && mine.stars === v}" data-v="${v}" aria-label="${v} ${v === 1 ? 'estrella' : 'estrellas'}">★</button>`).join('')}</div></fieldset>
        <input type="hidden" name="stars" value="${mine ? mine.stars : ''}">
        <label>Tu nombre <span class="opt">(opcional)</span><input name="name" type="text" maxlength="30" value="${mine ? esc(mine.name) : ''}" placeholder="Cómo quieres aparecer"></label>
        <label>Tu comentario <span class="opt">(opcional)</span><textarea name="text" rows="3" maxlength="400" placeholder="Cuenta cómo te fue: atención, ambiente, precios…">${mine ? esc(mine.text) : ''}</textarea></label>
        <p class="rev-rules">Habla de tu experiencia y sé respetuoso. No se permiten enlaces, datos de contacto ni insultos. Revisamos las reseñas reportadas.</p>
        <p class="err" role="alert" hidden></p>
        <button class="btn btn-red" type="submit">${mine ? 'Actualizar reseña' : 'Publicar reseña'}</button>
      </form>
      <ul class="rev-list">${list.slice(0, 6).map((r, i) => `<li><div class="rev-h">${starsHTML(r.stars)}<span><strong>${esc(r.name || 'Anónimo')}</strong> · ${fmtDate(r.at)}${r.example ? ' <em class="exm">Ejemplo</em>' : ''}${r.mine ? ' <em class="exm mine">Tuya</em>' : ''}</span></div>${r.text ? `<p>${esc(r.text)}</p>` : ''}${r.mine ? '' : `<button class="link rep" type="button" data-rep="${i}">Reportar</button>`}</li>`).join('')}</ul>`;
  }

  function fichaHTML(b) {
    const open = isOpen(b), fav = favs.includes(b.id);
    const dest = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
    return `
      <div class="f-gal">${galleryHTML(b)}
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
          <div><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${weekHTML(b)}</div>
          <div><svg class="ico" viewBox="0 0 24 24"><path d="M12 21s7-6.100 7-11a7 7 0 0 0-14 0c0 4.900 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/></svg><span>${esc(BAR[b.barrio].name)}, Medellín</span></div>
          ${b.ig ? `<div><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.500 6.500h.01"/></svg><span>@${esc(b.ig)}</span></div>` : ''}
        </div>
        ${b.webBy ? `<div class="sx-badge"><span class="eq" aria-hidden="true"><b></b><b></b><b></b><b></b></span><span><strong>Sitio creado por SONETIX</strong>Un ejemplo de lo que podemos hacer por tu negocio.</span></div>` : ''}
        <div class="f-act">
          <button class="btn btn-red wide" type="button" data-act="wa">Escribir por WhatsApp</button>
          ${b.web ? `<a class="btn btn-ghost" href="${esc(b.web)}" target="_blank" rel="noopener noreferrer">Sitio oficial</a>` : `<span></span>`}
          <a class="btn btn-ghost" href="${dest}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
        </div>
        ${(EVB[b.id] || []).length ? `<div class="f-ev"><h4>Próximos eventos</h4>${EVB[b.id].map(e => `<button class="f-evi" type="button" data-ev="${e.id}"><span class="d"><b>${fmtDayNum.format(evWhen(e))}</b><i>${fmtMon.format(evWhen(e)).replace('.', '')}</i></span><span class="t"><strong>${esc(e.title)}</strong><small>${evLabel(e)} · ${e.time} · ${esc(e.price)}</small></span></button>`).join('')}</div>` : ''}
        <div class="rev" id="revBlock">${reviewsHTML(b)}</div>
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
    try { history.replaceState(null, '', '#/mapa/' + id); } catch { /* sin historial */ }
    ficha.scrollTop = 0;
    ficha.classList.add('open'); ficha.setAttribute('aria-hidden', 'false');
    if (isMobile()) sheetBg.hidden = false;
    const x = $('[data-act="close"]', ficha); if (x) x.focus({ preventScroll: true });
  }

  function closeFicha() {
    if (!state.selected && !ficha.classList.contains('open')) return;
    state.selected = null;
    if (/^#(\/mapa\/|n=)/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search + '#/mapa'); } catch { /* ignorar */ } }
    ficha.classList.remove('open'); ficha.setAttribute('aria-hidden', 'true'); sheetBg.hidden = true;
    if (map && map.getSource('sel')) map.getSource('sel').setData(selFC());
    $$('#list .card.on').forEach(c => c.classList.remove('on'));
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  const REVIEW_BAD = /(https?:\/\/|www\.|\b[\w-]+\.(com|co|net|org|io)\b|@|\b\d{7,}\b)/i;
  ficha.addEventListener('click', e => {
    const gal = e.target.closest('[data-gal]'); if (gal) { openLb(state.selected, +gal.dataset.gal); return; }
    const pk = e.target.closest('.pk');
    if (pk) {
      const f = pk.closest('form'), v = +pk.dataset.v; f.stars.value = v;
      $$('.pk', f).forEach(x => { x.classList.toggle('on', +x.dataset.v <= v); x.setAttribute('aria-checked', +x.dataset.v === v); });
      return;
    }
    const ev = e.target.closest('[data-ev]'); if (ev) { openEvent(ev.dataset.ev); return; }
    const rep = e.target.closest('[data-rep]');
    if (rep && state.selected) {
      const r = reviewsOf(state.selected)[+rep.dataset.rep];
      if (r) { saveLead('reporte', { biz: BIZ[state.selected].name, reviewer: r.name || 'Anónimo', text: r.text || '(solo calificación)' }); rep.textContent = 'Reportada, gracias'; rep.disabled = true; toast('Gracias. Revisaremos esta reseña.'); }
      return;
    }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const b = BIZ[state.selected];
    if (a.dataset.act === 'close') closeFicha();
    else if (a.dataset.act === 'save' && b) {
      favs = favs.includes(b.id) ? favs.filter(x => x !== b.id) : [...favs, b.id];
      store.set('dm_favs', JSON.stringify(favs));
      const on = favs.includes(b.id);
      a.setAttribute('aria-pressed', on); a.setAttribute('aria-label', on ? 'Quitar de guardados' : 'Guardar negocio');
      toast(on ? 'Guardado en tu lista' : 'Quitado de tu lista');
    } else if (a.dataset.act === 'share' && b) {
      const url = location.origin + location.pathname + '#/mapa/' + b.id;
      copyText(url).then(() => toast('Enlace copiado. Quien lo abra verá este negocio.'), () => toast('No se pudo copiar. El enlace es: ' + url));
    } else if (a.dataset.act === 'wa') toast('Demostración: aquí se abre el WhatsApp del negocio.');
    else if (a.dataset.act === 'claim' && b) openClaim(b);
  });
  ficha.addEventListener('submit', e => {
    if (e.target.id !== 'revForm') return;
    e.preventDefault();
    const f = e.target, b = BIZ[state.selected], err = $('.err', f);
    const stars = +f.stars.value, name = f.name.value.trim(), text = f.text.value.trim();
    const fail = m => { err.textContent = m; err.hidden = false; };
    if (!(stars >= 1 && stars <= 5)) return fail('Elige de 1 a 5 estrellas.');
    if (REVIEW_BAD.test(name) || REVIEW_BAD.test(text)) return fail('No se permiten enlaces, correos ni números de contacto.');
    myRev[b.id] = { stars, name, text, at: Date.now() };
    store.set('dm_reviews', JSON.stringify(myRev));
    $('#revBlock').innerHTML = reviewsHTML(b);
    refresh();
    toast('Gracias por tu reseña.');
  });
  sheetBg.addEventListener('click', closeFicha);
  addEventListener('keydown', e => {
    if (!$('#lb').hidden) {
      if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowRight') lbStep(1); else if (e.key === 'ArrowLeft') lbStep(-1);
      return;
    }
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); else if (e.key === 'Escape') closeFicha();
  });

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
  /* Trabajos reales de SONETIX: capturas de sitios publicados. Todo lo que dice cada caso se puede ver en el sitio.
     Para ocultar un caso (por ejemplo si un cliente no autoriza mostrarlo) pon `show: false`. */
  const CASES = [
    { show: true, name: 'El Coctelazo', kind: 'Bar · Medellín desde 2017', url: 'https://elcoctelazo.com', shot: 'img/casos/coctelazo.jpg', device: 'desktop', accent: '#ff3d8b',
      lead: 'La carta completa de un bar con varias sedes, lista para pedir por WhatsApp desde el celular o el computador.',
      facts: ['Carta por categorías: granizados, micheladas, bombas, litrones, nevecones, cervezas y más', 'Carta de punto de venta y carta de domicilios, con pedido directo por WhatsApp', 'Buscador de sedes, sección de eventos y versión en inglés', 'Aviso en vivo de si el bar está abierto ahora'],
      tags: ['Carta digital', 'Domicilios', 'Varias sedes', 'ES / EN'] },
    { show: true, name: 'Coctelazo & Perritos Gourmet', kind: 'Bar y comida gourmet · Provenza', url: 'https://elcoctelazoprovenza.emanuelvillada10.workers.dev', shot: 'img/casos/provenza.jpg', device: 'phone', accent: '#ff4f9a',
      lead: 'Una carta que se abre al escanear el QR de la mesa: el cliente elige cómo quiere pedir y el pedido llega directo a la barra.',
      facts: ['Pedido en la mesa con QR, o a domicilio por WhatsApp, o solo ver la carta', 'Carrito «Mi pedido» y botón para llamar al mesero', 'Horarios de domicilios y de cocina siempre visibles', 'Español e inglés'],
      tags: ['Carta con QR por mesa', 'Pedidos', 'Domicilios'] },
    { show: true, name: 'Vibrans Gourmet', kind: 'Pasabocas gourmet y catering para eventos', url: '', shot: 'img/casos/vibrans.jpg', device: 'desktop', accent: '#c6a15b',
      lead: 'Un catálogo para pedir pasabocas y una forma de cotizar eventos, con alquiler de torres y bandejas, todo conectado al WhatsApp del negocio.',
      facts: ['Catálogo con precios y pedido mínimo: el cliente arma su pedido y ve el total estimado', 'Simulador de mesa para ver cuántas piezas caben y cotizar esa configuración', 'Formulario de cotización de eventos que deja listo el mensaje para WhatsApp', 'Identidad borgoña y dorado con animaciones suaves'],
      tags: ['Catálogo y pedidos', 'Simulador de mesa', 'Cotización por WhatsApp'] }
  ];
  const EXT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  function caseHTML(c, i) {
    const link = !!c.url, host = link ? new URL(c.url).host : 'Vista previa del sitio';
    const frame = `<span class="c2-frame ${c.device}"><span class="c2-bar"><i></i><i></i><i></i><em>${esc(host)}</em></span>
          <img src="${esc(c.shot)}" alt="Captura del sitio de ${esc(c.name)}" loading="lazy"></span>`;
    const shot = link
      ? `<a class="c2-shot" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir el sitio de ${esc(c.name)} en una pestaña nueva">${frame}<span class="c2-hint">Visitar ${EXT}</span></a>`
      : `<div class="c2-shot">${frame}</div>`;
    return `<article class="case2${i % 2 ? ' flip' : ''}" style="--ca:${c.accent}">
      ${shot}
      <div class="c2-body">
        <span class="c2-kind">${esc(c.kind)}</span>
        <h4>${esc(c.name)}</h4>
        <p class="c2-lead">${esc(c.lead)}</p>
        <ul class="c2-facts">${c.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="tags">${c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${link ? `<a class="btn btn-ghost" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Ver el sitio ${EXT}</a>` : ''}
      </div></article>`;
  }
  $('#svcGrid').innerHTML = SERVICES.map(([d, t, p]) => `<div>${rawIco(d)}<strong>${t}</strong><p>${p}</p></div>`).join('');
  $('#casesGrid').innerHTML = CASES.filter(c => c.show).map(caseHTML).join('');

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

  /* fotos del negocio al reclamar la ficha (en la demostración solo se previsualizan, no se suben) */
  let claimFiles = [];
  const MAX_PHOTOS = 6, MAX_MB = 5;
  function renderUploads() {
    const g = $('#upGrid'); if (!g) return;
    $$('img', g).forEach(i => URL.revokeObjectURL(i.src));
    g.innerHTML = claimFiles.map((f, i) => `<figure class="up-i"><img src="${URL.createObjectURL(f)}" alt="Foto ${i + 1} elegida"><button type="button" data-rm="${i}" aria-label="Quitar la foto ${i + 1}">×</button></figure>`).join('');
    $('#upCount').textContent = claimFiles.length ? `${claimFiles.length} de ${MAX_PHOTOS} fotos` : '';
  }
  function openClaim(b) {
    claimFiles = [];
    openModal(`<h3>Reclamar ${b ? '«' + esc(b.name) + '»' : 'mi ficha'}</h3>
      <p>Es gratis. Te escribiremos por WhatsApp para verificar que eres parte del negocio. Solo se publica lo que tú apruebes.</p>
      ${simpleForm('claimForm', `
        <label>Nombre del negocio<input name="biz" type="text" required value="${b ? esc(b.name) : ''}"></label>
        <label>Tu nombre<input name="name" type="text" required autocomplete="name"></label>
        <label>WhatsApp<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="300 000 0000"></label>
        <label>¿Cuál es tu relación con el negocio?<select name="role" required><option value="">Elige una opción</option><option>Soy el dueño</option><option>Administro el negocio</option><option>Trabajo aquí y tengo autorización</option></select></label>
        <div class="up">
          <p class="up-t">Fotos de tu negocio <span class="opt">(opcional)</span></p>
          <label class="up-drop"><input id="upFiles" class="sr" type="file" accept="image/*" multiple>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5M7 10l5-5 5 5M5 19h14"/></svg>
            <span><strong>Elige tus fotos</strong><small>Hasta ${MAX_PHOTOS} imágenes, máximo ${MAX_MB} MB cada una</small></span></label>
          <div class="up-grid" id="upGrid"></div><p class="up-n" id="upCount"></p>
          <label class="chk"><input name="photoConsent" type="checkbox"><span>Confirmo que estas fotos son mías (o tengo permiso) y autorizo mostrarlas en Descubre Medellín. Puedo pedir que las retiren cuando quiera.</span></label>
        </div>`, 'Enviar para verificar')}`);
    $('#upFiles').addEventListener('change', e => {
      for (const f of [...e.target.files]) {
        if (claimFiles.length >= MAX_PHOTOS) { toast(`Máximo ${MAX_PHOTOS} fotos.`); break; }
        if (!/^image\//.test(f.type)) { toast('Solo se aceptan imágenes.'); continue; }
        if (f.size > MAX_MB * 1048576) { toast(`«${f.name}» pesa más de ${MAX_MB} MB.`); continue; }
        claimFiles.push(f);
      }
      e.target.value = ''; renderUploads();
    });
    $('#upGrid').addEventListener('click', e => { const r = e.target.closest('[data-rm]'); if (r) { claimFiles.splice(+r.dataset.rm, 1); renderUploads(); } });
    $('#claimForm').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, err = $('.err', f);
      if (!validate(f)) { err.textContent = 'Revisa los campos marcados.'; err.hidden = false; return; }
      if (claimFiles.length && !f.photoConsent.checked) { err.textContent = 'Confirma que las fotos son tuyas para poder enviarlas.'; err.hidden = false; return; }
      const n = claimFiles.length;
      saveLead('reclamo', { biz: f.biz.value.trim(), name: f.name.value.trim(), phone: cleanPhone(f.phone.value), role: f.role.value, ref: b ? b.id : null, photos: n });
      $$('#upGrid img').forEach(i => URL.revokeObjectURL(i.src)); claimFiles = [];
      $('#mBody').innerHTML = `<h3>Recibimos tu solicitud</h3><p class="ok">Gracias. Te escribiremos por WhatsApp para verificar tu negocio${n ? ' y revisar tus fotos' : ''}.</p><p>Modo demostración: la solicitud quedó guardada solo en este navegador${n ? ' y las fotos no se suben' : ''}.</p><button class="btn btn-ghost" type="button" data-close>Cerrar</button>`;
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
        i = (i + 1) % DEMOS.length; [bd.demo, bd.cat, bd.acc] = DEMOS[i];
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

  /* ---------- eventos ---------- */
  let evFilter = 'all';
  function evList() {
    return EVENTS.filter(e => evFilter === 'all' || (evFilter === 'today' ? e.d === 0 : evFilter === 'week' ? e.d <= 6 : e.type === evFilter))
      .sort((a, b) => a.d - b.d || a.time.localeCompare(b.time));
  }
  function renderEvents() {
    const fl = [['all', 'Todos'], ['today', 'Hoy'], ['week', 'Esta semana'], ...EVENT_TYPES.map(t => [t.id, t.label])];
    $('#evFilters').innerHTML = fl.map(([id, l]) => `<button class="chip" type="button" data-f="${id}" aria-pressed="${evFilter === id}">${l}</button>`).join('');
    const list = evList();
    $('#evGrid').innerHTML = list.length ? list.map(e => {
      const b = BIZ[e.biz], w = evWhen(e);
      return `<button class="evc rv in" type="button" data-ev="${e.id}"><span class="ev-d"><b>${fmtDayNum.format(w)}</b><i>${fmtMon.format(w).replace('.', '')}</i></span>
        <span class="ev-b"><em class="ev-t">${EVT[e.type] || 'Evento'}</em><strong>${esc(e.title)}</strong><small>${esc(b.name)} · ${esc(BAR[b.barrio].name)}</small>
        <span class="ev-m">${evLabel(e)} · ${e.time} · ${esc(e.price)}</span></span></button>`;
    }).join('') : `<p class="ev-empty">No hay eventos con ese filtro. Prueba con «Todos».</p>`;
  }
  function openEvent(id) {
    const e = EVENTS.find(x => x.id === id); if (!e) return;
    const b = BIZ[e.biz], rt = ratingOf(b.id), dest = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
    openModal(`<span class="ev-t">${EVT[e.type] || 'Evento'}</span><h3 id="mTitle">${esc(e.title)}</h3>
      <p><strong>${esc(fmtLong.format(evWhen(e)))} · ${e.time}</strong><br>${esc(e.price)}</p>
      <p>${esc(e.desc)}</p>
      <p><strong>${esc(b.name)}</strong> · ${esc(BAR[b.barrio].name)}${rt.n ? ` · ★ ${avgTxt(rt.avg)} (${rt.n})` : ''}</p>
      <div class="row-a"><button class="btn btn-red" type="button" data-evmap="${b.id}">Ver el negocio en el mapa</button>
        <a class="btn btn-ghost" href="${dest}" target="_blank" rel="noopener noreferrer">Cómo llegar</a></div>
      <p class="note-demo">Evento de ejemplo para la demostración.</p>`);
  }
  function openPublishEvent() {
    const min = new Intl.DateTimeFormat('sv-SE', BOG).format(new Date());
    openModal(`<h3 id="mTitle">Publicar un evento</h3>
      <p>Es gratis. Revisamos cada evento antes de mostrarlo y te avisamos por WhatsApp.</p>
      ${simpleForm('evForm', `
        <label>Nombre del negocio<input name="biz" type="text" required></label>
        <label>Tu nombre<input name="name" type="text" required autocomplete="name"></label>
        <label>WhatsApp<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="300 000 0000"></label>
        <label>Nombre del evento<input name="title" type="text" required maxlength="70" placeholder="Ej: Noche de música en vivo"></label>
        <label>Fecha<input name="date" type="date" required min="${min}"></label>
        <label>Hora<input name="time" type="time" required></label>
        <label>Cuéntanos más <span class="opt">(opcional)</span><textarea name="desc" rows="3" maxlength="300" placeholder="Qué habrá, precio o cover, cómo reservar…"></textarea></label>`, 'Enviar evento')}`);
    $('#evForm').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, err = $('.err', f);
      if (!validate(f)) { err.textContent = 'Revisa los campos marcados.'; err.hidden = false; return; }
      saveLead('evento', { biz: f.biz.value.trim(), name: f.name.value.trim(), phone: cleanPhone(f.phone.value), title: f.title.value.trim(), date: f.date.value, time: f.time.value, desc: f.desc.value.trim() });
      $('#mBody').innerHTML = `<h3>Recibimos tu evento</h3><p class="ok">Gracias. Lo revisamos y, si todo está bien, lo publicamos.</p><p>Modo demostración: la solicitud quedó guardada solo en este navegador.</p><button class="btn btn-ghost" type="button" data-close>Cerrar</button>`;
    });
  }
  $('#evFilters').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; evFilter = c.dataset.f; renderEvents(); });
  $('#evGrid').addEventListener('click', e => { const c = e.target.closest('[data-ev]'); if (c) openEvent(c.dataset.ev); });
  $('#evPublish').addEventListener('click', openPublishEvent);
  $('#mBody').addEventListener('click', e => {
    const m = e.target.closest('[data-evmap]'); if (!m) return;
    closeModal(); state.q = ''; syncUI(); refresh(); goExplorer();
    setTimeout(() => select(m.dataset.evmap, { from: 'list' }), reduceMotion ? 0 : 650);
  });
  renderEvents();

  /* ---------- aparición al hacer scroll ---------- */
  function reveal() {
    const els = $$('.rv');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
    els.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  }

  /* ---------- portada: horizonte de barras, contadores y menú activo ---------- */
  function heroFx() {
    const tz = $('#mapTeaser'), art = $('#heroArt');
    const hc = $('#heroCount'); if (hc) hc.textContent = BUSINESSES.length + ' negocios';
    if (tz && art && !reduceMotion && matchMedia('(pointer: fine)').matches) {
      tz.addEventListener('pointermove', e => {
        const r = tz.getBoundingClientRect();
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
    skyline();
  }

  /* El ecualizador de SONETIX convertido en el valle de Medellín: montañas a los lados, ciudad al centro.
     Las barras rojas son los barrios; al tocarlas se abre el mapa en ese barrio. */
  function skyline() {
    const cv = $('#skyCv'), box = $('#sky'), tagsEl = $('#skyTags');
    if (!cv || !box) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, bars = [], mx = -1, hot = -1, col = {}, vis = true;
    const rnd = i => { const x = Math.sin(i * 12.9898 + 7.233) * 43758.5453; return x - Math.floor(x); };
    const pickColors = () => {
      const cs = getComputedStyle(document.documentElement), v = (n, d) => cs.getPropertyValue(n).trim() || d;
      col = { gray: v('--ln2', '#34363f'), red: v('--red', '#ff0a1e'), redd: v('--redd', '#a0000f') };
    };
    function build() {
      const r = box.getBoundingClientRect(); if (!r.width) return;
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const n = Math.max(24, Math.floor(W / (W < 700 ? 12 : 16)));
      bars = [];
      for (let i = 0; i < n; i++) {
        const p = i / (n - 1), edge = Math.pow(Math.abs(p - 0.5) * 2, 1.7);
        let h = 0.2 + 0.5 * edge + 0.06 * Math.sin(p * 9) + 0.05 * rnd(i);
        if (rnd(i + 99) > 0.88) h += 0.14 + 0.1 * rnd(i + 5);
        bars.push({ x: (i + 0.5) * (W / n), w: (W / n) * 0.62, h: Math.min(h, 0.86), ph: rnd(i + 31) * 6.28, zone: null });
      }
      const picks = BARRIOS.map((b, k) => ({ b, i: Math.round(((k + 0.5) / BARRIOS.length) * (n - 1)) }));
      picks.forEach(({ b, i }) => { bars[i].zone = b; bars[i].h = Math.max(bars[i].h, 0.42 + 0.1 * rnd(i + 3)); });
      tagsEl.innerHTML = picks.map(({ b, i }) => {
        const cnt = BUSINESSES.filter(x => x.barrio === b.id).length;
        return `<button class="sky-tag" type="button" data-id="${b.id}" data-i="${i}" style="left:${(bars[i].x / W * 100).toFixed(2)}%;bottom:calc(${(bars[i].h * 78).toFixed(1)}% + 14px)">${esc(b.name)}<small>${cnt}</small></button>`;
      }).join('');
      pickColors();
    }
    function draw(now) {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const maxH = H * 0.78;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        let h = b.h * maxH;
        if (!reduceMotion) h *= 1 + 0.045 * Math.sin(now / 900 + b.ph);
        if (mx >= 0) { const d = Math.abs(b.x - mx) / (W * 0.1); if (d < 1) h += (1 - d) * (1 - d) * maxH * 0.22; }
        if (b.zone && hot === i) h += maxH * 0.08;
        const y = H - h, x = b.x - b.w / 2, r = Math.min(b.w / 2, 5);
        const g = ctx.createLinearGradient(0, y, 0, H);
        if (b.zone) { g.addColorStop(0, col.red); g.addColorStop(1, col.redd); ctx.shadowColor = col.red; ctx.shadowBlur = hot === i ? 26 : 12; }
        else { g.addColorStop(0, col.gray); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.shadowBlur = 0; }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.arcTo(x + b.w, y, x + b.w, y + r, r); ctx.lineTo(x + b.w, H); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    const loop = now => { if (vis) draw(now); requestAnimationFrame(loop); };
    build(); draw(performance.now());
    if (!reduceMotion) requestAnimationFrame(loop);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { threshold: 0 }).observe(box);
    if ('ResizeObserver' in window) { let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(performance.now()); }, 120); }).observe(box); }
    new MutationObserver(() => { pickColors(); draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    box.addEventListener('pointermove', e => { mx = e.clientX - box.getBoundingClientRect().left; if (reduceMotion) draw(performance.now()); }, { passive: true });
    box.addEventListener('pointerleave', () => { mx = -1; if (reduceMotion) draw(performance.now()); });
    tagsEl.addEventListener('pointerover', e => { const t = e.target.closest('.sky-tag'); if (t) { hot = +t.dataset.i; if (reduceMotion) draw(performance.now()); } });
    tagsEl.addEventListener('pointerout', e => { if (e.target.closest('.sky-tag')) { hot = -1; if (reduceMotion) draw(performance.now()); } });
    tagsEl.addEventListener('click', e => {
      const t = e.target.closest('.sky-tag'); if (!t) return;
      const card = $(`#barriosGrid .barrio[data-id="${t.dataset.id}"]`); if (card) card.click();   // reutiliza el flujo de «barrios»
    });
  }

  function spy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.menu a'), byId = {};
    links.forEach(a => { byId[a.getAttribute('href').slice(1)] = a; });
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting && !isMapView()) links.forEach(a => a.classList.toggle('on', a === byId[en.target.id]));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['barrios', 'eventos', 'negocios', 'cotizar'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
    new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && !isMapView()) links.forEach(a => a.classList.remove('on')); }), { rootMargin: '-45% 0px -50% 0px' }).observe($('#inicio'));
  }

  /* ---------- pantallas: portada y mapa (ruta #/mapa) ---------- */
  let mapStarted = false;
  const isMapView = () => document.body.classList.contains('view-map');
  const openMap = () => { if (location.hash.startsWith('#/mapa')) route(); else location.hash = '#/mapa'; };
  function route() {
    const h = location.hash, mm = /^#\/mapa(?:\/(\w+))?/.exec(h) || /^#n=(\w+)/.exec(h);
    const wantMap = !!mm;
    document.body.classList.toggle('view-map', wantMap);
    $$('.menu a').forEach(a => a.classList.toggle('on', wantMap && a.dataset.route === 'mapa'));
    menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    if (wantMap) {
      window.scrollTo(0, 0);
      if (!mapStarted) { mapStarted = true; initMap(); }
      else if (map) setTimeout(() => map.resize(), 50);
      const id = mm[1];
      if (id && BIZ[id] && state.selected !== id) setTimeout(() => select(id, { from: 'list' }), map ? 100 : 900);
    } else {
      const el = h.length > 1 ? document.getElementById(decodeURIComponent(h.slice(1))) : null;
      setTimeout(() => { if (el) el.scrollIntoView({ behavior: 'auto' }); else window.scrollTo(0, 0); }, 30);
    }
  }
  addEventListener('hashchange', route);

  /* ---------- arranque ---------- */
  buildControls();
  heroFx();
  spy();
  bindFilters();
  syncUI();
  refresh();
  reveal();
  route();
})();
