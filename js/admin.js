/* Panel SONETIX — prototipo sin servidor.
   Clientes derivados de js/data.js. Todo se guarda en localStorage (clave dm_admin).
   Regla de oro: ninguna etiqueta sobre la web de un negocio sin una medición registrada (fecha + herramienta). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CATS = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  const BAR = Object.fromEntries(BARRIOS.map(b => [b.id, b]));
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignorar */ } }
  };
  const barName = id => (BAR[id] ? BAR[id].name : 'Sin definir');
  const catName = id => (CATS[id] ? CATS[id].label : 'Sin definir');
  const fmtM = n => (n == null || n === '' ? '—' : '$' + Math.round(+n).toLocaleString('es-CO'));

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3000); }

  /* ---------- fechas (zona Bogotá) ---------- */
  const isoOf = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(d);
  const today = () => isoOf(new Date());
  const addDays = (n) => isoOf(new Date(Date.now() + n * 864e5));
  const fmtD = iso => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—');

  /* ---------- definiciones ---------- */
  const STAGES = [
    ['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['respondio', 'Respondió'], ['reunion', 'Reunión'],
    ['propuesta', 'Propuesta'], ['cerrado', 'Cerrado (cliente)'], ['perdido', 'Perdido']
  ];
  const STAGE_L = Object.fromEntries([...STAGES, ['nocontactar', 'No contactar']]);
  const ORDER = ['nuevo', 'contactado', 'respondio', 'reunion', 'propuesta', 'cerrado'];
  const ACTIVE = ['nuevo', 'contactado', 'respondio', 'reunion', 'propuesta'];
  const RUBRIC = [
    { k: 'need', l: 'Necesidad de una página web', max: 25, h: '¿Qué tan bien reemplaza hoy su web un parche (Linktree, Instagram, nada)?' },
    { k: 'growth', l: 'Potencial de crecimiento', max: 20, h: 'Audiencia, tipo de negocio, domicilios o reservas que podría captar.' },
    { k: 'presence', l: 'Calidad de la presencia actual', max: 15, h: 'Base sobre la cual construir: contenido, actividad, marca.' },
    { k: 'contact', l: 'Facilidad de contacto', max: 15, h: 'Teléfono verificado, horarios, canal natural.' },
    { k: 'diff', l: 'Oportunidad de diferenciación', max: 10, h: 'Algo propio que una página pueda contar mejor.' },
    { k: 'convert', l: 'Posibilidad de convertirlo en cliente', max: 15, h: 'Señales de presupuesto y decisor.' }
  ];
  const YN = [['si', 'Sí'], ['no', 'No']];
  const SIGNALS = [
    { k: 'hasUrl', l: '¿Tiene URL propia registrada?', t: 'sel', o: YN },
    { k: 'http', l: '¿El dominio responde (HTTP 200)?', t: 'sel', o: YN },
    { k: 'https', l: 'HTTPS válido', t: 'sel', o: YN },
    { k: 'mobile', l: 'Declara adaptación a móvil (viewport)', t: 'sel', o: YN },
    { k: 'speed', l: 'PageSpeed móvil (0–100)', t: 'num', min: 0, max: 100 },
    { k: 'year', l: 'Año del copyright en el pie', t: 'num', min: 2000, max: 2100 },
    { k: 'social', l: 'Depende solo de redes o Linktree', t: 'sel', o: YN }
  ];
  const PLANS = { 'Sitio de información': [0, 80000], 'Plan superior (a cotizar)': [null, null] };
  const LOST = ['No respondió', 'No es el momento', 'Precio', 'Ya tiene proveedor', 'Cerró el negocio', 'Otro'];

  /* ---------- datos ---------- */
  let P = [];
  const save = () => store.set('dm_admin', JSON.stringify({ v: 3, prospects: P }));

  function blank(o) {
    return Object.assign({
      id: 'x' + Date.now() + Math.floor(Math.random() * 99), name: '', cat: 'emprend', barrio: '', lat: null, lng: null,
      phone: '', ig: '', web: '', source: 'Alta manual', sourceDate: today(), status: 'nuevo', prevStatus: '', maxStage: 0, contactedAt: null,
      rubric: { need: null, growth: null, presence: null, contact: null, diff: null, convert: null }, signals: {},
      plan: '', setup: null, monthly: null, lostReason: '', next: null, notes: [], optout: null, created: today()
    }, o);
  }

  /* Solo los clientes reales de SONETIX (sus sitios ya están entregados). Plan y valores se registran a mano. */
  function seed() {
    const t = today();
    return BUSINESSES.map(b => {
      const p = blank({
        id: b.id, name: b.name, cat: b.cat, barrio: b.barrio, lat: b.lat, lng: b.lng, ig: b.ig || '', web: b.web || '',
        source: 'Cliente de SONETIX', sourceDate: t, created: t, phone: b.wa ? b.wa.replace(/^57/, '') : ''
      });
      p.status = 'cerrado'; p.maxStage = 5;
      p.notes.push({ at: t, type: 'nota', text: 'Cliente: sitio web entregado por SONETIX. Plan y valores por registrar.' });
      return p;
    });
  }

  function load() {
    try { const d = JSON.parse(store.get('dm_admin') || 'null'); if (d && d.v >= 3 && Array.isArray(d.prospects) && d.prospects.length) { P = d.prospects; return; } } catch { /* sembrar */ }
    P = seed(); save();
  }

  /* ---------- cálculos ---------- */
  function scoreOf(p) {
    const vals = RUBRIC.map(r => p.rubric[r.k]);
    const filled = vals.filter(v => v != null).length;
    return { sum: vals.reduce((a, v) => a + (v || 0), 0), filled, full: filled === RUBRIC.length };
  }
  function prio(p) { const s = scoreOf(p); if (!s.full) return 'sin'; return s.sum >= 75 ? 'alta' : s.sum >= 55 ? 'media' : 'baja'; }
  const PRIO_L = { alta: 'Alta', media: 'Media', baja: 'Baja', sin: 'Sin calificar' };
  const isClient = p => p.status === 'cerrado';
  const byId = id => P.find(p => p.id === id);

  function evidence(p) {
    const s = p.signals, n = SIGNALS.filter(x => s[x.k]).length;
    if (s.hasUrl && s.hasUrl.value === 'no') return `Sin URL propia · medido ${fmtD(s.hasUrl.date)}`;
    if (s.hasUrl && s.hasUrl.value === 'si') return 'URL registrada' + (s.speed ? ` · móvil ${s.speed.value}/100` : '') + (n ? ` · ${n}/7 señales` : '');
    if (p.web) return 'URL en la fuente · sin medir';
    return n ? `${n}/7 señales medidas` : 'Sin evaluar';
  }

  /* ---------- acciones sobre prospectos ---------- */
  function log(p, type, text) { p.notes.push({ at: today(), type, text }); }
  function setStatus(p, st) {
    if (p.status === st) return;
    const prev = p.status;
    p.status = st;
    if (ORDER.includes(st)) p.maxStage = Math.max(p.maxStage || 0, ORDER.indexOf(st));
    if (st !== 'nuevo' && !p.contactedAt) p.contactedAt = today();
    if (st === 'cerrado' && p.plan && p.setup == null) [p.setup, p.monthly] = PLANS[p.plan] || [null, null];
    if (st === 'cerrado' || st === 'perdido') p.next = null;
    log(p, 'ch', `Estado: ${STAGE_L[prev]} → ${STAGE_L[st]}`);
    save();
  }
  function setOptout(p, reason) {
    p.prevStatus = p.status === 'nocontactar' ? (p.prevStatus || 'nuevo') : p.status;
    p.status = 'nocontactar'; p.optout = { at: today(), reason: reason || 'Sin motivo indicado' }; p.next = null;
    log(p, 'ch', `Marcado como «No contactar»: ${p.optout.reason}`); save();
  }
  function reactivate(p) {
    p.status = p.prevStatus || 'nuevo'; p.optout = null;
    log(p, 'ch', 'Retirado de «No contactar» (reactivado manualmente)'); save();
  }

  /* ---------- tema ---------- */
  let theme = store.get('dm_theme') === 'light' ? 'light' : 'dark';
  const applyTheme = () => { document.documentElement.dataset.theme = theme; };
  applyTheme();
  $('#themeBtn').addEventListener('click', async () => {
    theme = theme === 'dark' ? 'light' : 'dark'; store.set('dm_theme', theme); applyTheme();
    if (amap) { try { amap.setStyle(await getStyle(), { diff: false }); } catch { /* conserva el estilo */ } }
  });

  /* ---------- pestañas ---------- */
  let tab = 'resumen';
  function show(t) {
    tab = t;
    $$('.snav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
    if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t);
    render();
  }
  $('#snav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.tab); });

  function render() {
    renderBadge();
    if (tab === 'resumen') renderResumen();
    else if (tab === 'prospectos') renderTable();
    else if (tab === 'embudo') renderKanban();
    else if (tab === 'mapa') renderMap();
    else if (tab === 'solicitudes') renderLeads();
  }

  /* ---------- RESUMEN ---------- */
  function renderResumen() {
    const real = P.filter(p => p.status !== 'nocontactar');
    const contacted = real.filter(p => p.maxStage >= 1).length;
    const reach = k => real.filter(p => p.maxStage >= k).length;
    const clients = P.filter(isClient);
    const mrr = clients.reduce((a, p) => a + (+p.monthly || 0), 0);
    const setup = clients.reduce((a, p) => a + (+p.setup || 0), 0);
    const resp = contacted ? Math.round(reach(2) / contacted * 100) + ' %' : '—';
    const conv = contacted ? (reach(5) / contacted * 100).toFixed(1).replace('.', ',') + ' %' : '—';
    const note = $('#sampleNote');
    if (contacted < 100) { note.hidden = false; note.innerHTML = `<b>Muestra pequeña:</b> con ${contacted} contactados, los porcentajes todavía no son indicadores. Empiezan a servir a partir de unos 100 contactos. Estos datos son de ejemplo.`; } else note.hidden = true;
    const k = [
      ['Prospectos', real.length - clients.length, 'sin contar clientes'], ['Contactados', contacted, 'alguna vez'],
      ['Respuesta', resp, `${reach(2)} respondieron`], ['Reuniones', reach(3), 'llegaron a reunión'],
      ['Propuestas', reach(4), 'enviadas'], ['Clientes', clients.length, 'cerrados', 'hot'],
      ['Conversión', conv, 'contactado → cliente'], ['Mensualidad (MRR)', fmtM(mrr), 'recurrente hoy', 'hot'], ['Instalación', fmtM(setup), 'acumulada']
    ];
    $('#kpis').innerHTML = k.map(([l, v, s, c]) => `<div class="kpi ${c || ''}"><small>${l}</small><strong>${v}</strong><span>${s}</span></div>`).join('');

    const total = real.length || 1;
    const steps = [['Prospectos', total], ['Contactados', reach(1)], ['Respondieron', reach(2)], ['Reunión', reach(3)], ['Propuesta', reach(4)], ['Clientes', reach(5)]];
    $('#funnel').innerHTML = steps.map(([l, n], i) => `<div class="fn"><span>${l}</span><div class="bar2"><i style="width:${Math.max(n / total * 100, n ? 3 : 0)}%"></i></div><b>${n}</b>${i ? `<small>${steps[i - 1][1] ? Math.round(n / steps[i - 1][1] * 100) : 0} % del paso anterior</small>` : ''}`.concat('</div>')).join('');

    const due = P.filter(p => p.next && ACTIVE.includes(p.status)).sort((a, b) => a.next.date.localeCompare(b.next.date)).slice(0, 8);
    $('#tasks').innerHTML = due.length ? due.map(p => {
      const d = p.next.date, od = d < today();
      return `<li><button type="button" data-open="${p.id}"><span class="d ${od ? 'overdue' : ''}">${d === today() ? 'Hoy' : od ? 'Vencida' : fmtD(d)}</span><span class="t"><strong>${esc(p.name)}</strong><small>${esc(p.next.text)}</small></span></button></li>`;
    }).join('') : `<li class="empty-s">No hay seguimientos pendientes.</li>`;

    const grp = (list, keyFn, nameFn) => {
      const rows = list.map(g => {
        const ps = real.filter(p => keyFn(p) === g.id && !isClient(p));
        const sc = ps.map(scoreOf).filter(s => s.full);
        const avg = sc.length ? Math.round(sc.reduce((a, s) => a + s.sum, 0) / sc.length) : null;
        return { name: nameFn(g), n: ps.length, q: sc.length, avg, cl: clients.filter(p => keyFn(p) === g.id).length };
      }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
      return `<thead><tr><th>Nombre</th><th class="num">Prospectos</th><th class="num">Calificados</th><th class="num">Puntaje prom.</th><th class="num">Clientes</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i === 0 && r.avg != null ? '<span class="kicker"><span class="dot"></span></span> ' : ''}${esc(r.name)}</td><td class="num">${r.n}</td><td class="num">${r.q}</td><td class="num">${r.avg ?? '—'}</td><td class="num">${r.cl}</td></tr>`).join('')}</tbody>`;
    };
    $('#tBarrio').innerHTML = grp(BARRIOS, p => p.barrio, g => g.name);
    $('#tCat').innerHTML = grp(CATEGORIES, p => p.cat, g => g.label);

    const acts = P.flatMap(p => p.notes.map(n => ({ p, n }))).filter(x => x.n.type !== 'ch' || true).sort((a, b) => b.n.at.localeCompare(a.n.at)).slice(0, 8);
    $('#activity').innerHTML = acts.map(({ p, n }) => `<li><button type="button" data-open="${p.id}"><span><b>${esc(p.name)}</b> · ${esc(n.text)}</span><time>${fmtD(n.at)}</time></button></li>`).join('');
  }

  /* ---------- PROSPECTOS ---------- */
  const F = { q: '', status: 'activos', prio: '', barrio: '', cat: '', web: '' };
  let sort = { k: 'score', dir: -1 };
  function buildFilters() {
    $('#fStatus').innerHTML = `<option value="activos">Activos (sin cerrar ni perder)</option><option value="">Todos los estados</option>` + [...STAGES, ['nocontactar', 'No contactar']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    $('#fBarrio').innerHTML = `<option value="">Todos los barrios</option>` + BARRIOS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    $('#fCat').innerHTML = `<option value="">Todas las categorías</option>` + CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  }
  function filteredP() {
    const q = norm(F.q.trim());
    return P.filter(p => {
      if (F.status === 'activos' ? !ACTIVE.includes(p.status) : (F.status && p.status !== F.status)) return false;
      if (F.prio && prio(p) !== F.prio) return false;
      if (F.barrio && p.barrio !== F.barrio) return false;
      if (F.cat && p.cat !== F.cat) return false;
      if (F.web) {
        const hu = p.signals.hasUrl && p.signals.hasUrl.value;
        if (F.web === 'nourl' && hu !== 'no') return false;
        if (F.web === 'url' && !(hu === 'si' || p.web)) return false;
        if (F.web === 'none' && (hu || p.web)) return false;
      }
      if (q && !norm([p.name, barName(p.barrio), catName(p.cat), p.phone, ...p.notes.map(n => n.text)].join(' ')).includes(q)) return false;
      return true;
    });
  }
  const sortVal = (p, k) => k === 'name' ? norm(p.name) : k === 'score' ? (scoreOf(p).full ? scoreOf(p).sum : -1) : k === 'status' ? ORDER.indexOf(p.status) : k === 'next' ? (p.next ? p.next.date : '9999') : 0;
  function renderTable() {
    const list = filteredP().sort((a, b) => {
      const x = sortVal(a, sort.k), y = sortVal(b, sort.k);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || norm(a.name).localeCompare(norm(b.name));
    });
    const th = (k, l, cls = '') => `<th class="srt ${cls} ${sort.k === k ? (sort.dir > 0 ? 'asc' : 'desc') : ''}" data-sort="${k}" scope="col">${l}</th>`;
    $('#ptable').innerHTML = `<thead><tr>${th('name', 'Negocio')}${th('status', 'Estado')}${th('score', 'Puntaje')}<th scope="col">Evidencia web</th>${th('next', 'Próxima acción')}<th scope="col">WhatsApp</th></tr></thead><tbody>${list.map(p => {
      const s = scoreOf(p), pr = prio(p);
      const od = p.next && p.next.date < today();
      return `<tr data-open="${p.id}" tabindex="0"><td class="nm"><strong>${esc(p.name)}</strong><small>${catName(p.cat)} · ${esc(barName(p.barrio))}</small></td>
        <td><span class="st ${p.status}">${STAGE_L[p.status]}</span></td>
        <td><span class="pr ${pr}">${s.full ? `<b>${s.sum}</b><span class="meter"><i style="width:${s.sum}%"></i></span><span class="pill2 ${pr === 'alta' ? 'alta' : ''}">${PRIO_L[pr]}</span>` : `<small>${s.filled ? `Parcial ${s.filled}/6` : 'Sin calificar'}</small>`}</span></td>
        <td class="${p.signals.hasUrl || p.web ? '' : 'muted'}">${esc(evidence(p))}</td>
        <td>${p.next ? `<span class="${od ? 'overdue' : ''}">${fmtD(p.next.date)}</span> · ${esc(p.next.text)}` : '<span class="muted">—</span>'}</td>
        <td>${p.phone ? esc(p.phone) : '<span class="muted">Sin número</span>'}</td></tr>`;
    }).join('') || `<tr><td colspan="6" class="empty-s">No hay prospectos con esos filtros.</td></tr>`}</tbody>`;
    const any = F.q || F.prio || F.barrio || F.cat || F.web || F.status !== 'activos';
    $('#pcount').textContent = `${list.length} ${list.length === 1 ? 'prospecto' : 'prospectos'}`;
    $('#pclear').hidden = !any;
  }
  function bindTable() {
    $('#pq').addEventListener('input', e => { F.q = e.target.value; renderTable(); });
    [['fStatus', 'status'], ['fPrio', 'prio'], ['fBarrio', 'barrio'], ['fCat', 'cat'], ['fWeb', 'web']].forEach(([id, k]) => $('#' + id).addEventListener('change', e => { F[k] = e.target.value; renderTable(); }));
    $('#pclear').addEventListener('click', () => {
      Object.assign(F, { q: '', status: 'activos', prio: '', barrio: '', cat: '', web: '' });
      $('#pq').value = ''; ['fStatus', 'fPrio', 'fBarrio', 'fCat', 'fWeb'].forEach(id => { $('#' + id).value = id === 'fStatus' ? 'activos' : ''; }); renderTable();
    });
    $('#ptable').addEventListener('click', e => {
      const h = e.target.closest('[data-sort]');
      if (h) { sort = { k: h.dataset.sort, dir: sort.k === h.dataset.sort ? -sort.dir : (h.dataset.sort === 'score' ? -1 : 1) }; renderTable(); return; }
      const r = e.target.closest('[data-open]'); if (r) openDrawer(r.dataset.open);
    });
    $('#ptable').addEventListener('keydown', e => { if (e.key === 'Enter') { const r = e.target.closest('[data-open]'); if (r) openDrawer(r.dataset.open); } });
    $('#csvBtn').addEventListener('click', exportCsv);
    $('#addBtn').addEventListener('click', openAdd);
  }
  function exportCsv() {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Negocio', 'Categoría', 'Barrio', 'Estado', 'Puntaje', 'Prioridad', 'Teléfono', 'Evidencia web', 'Próxima acción', 'Fecha próxima acción', 'Fuente']];
    filteredP().forEach(p => { const s = scoreOf(p); rows.push([p.name, catName(p.cat), barName(p.barrio), STAGE_L[p.status], s.full ? s.sum : '', PRIO_L[prio(p)], p.phone, evidence(p), p.next ? p.next.text : '', p.next ? p.next.date : '', p.source]); });
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prospectos-sonetix-' + today() + '.csv'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('CSV descargado con los prospectos filtrados.');
  }

  /* ---------- EMBUDO (kanban) ---------- */
  function renderKanban() {
    $('#kanban').innerHTML = STAGES.map(([id, l]) => {
      const list = P.filter(p => p.status === id).sort((a, b) => (scoreOf(b).full ? scoreOf(b).sum : -1) - (scoreOf(a).full ? scoreOf(a).sum : -1));
      return `<div class="col" data-col="${id}"><h3>${l}<b>${list.length}</b></h3><ul>${list.map(p => {
        const s = scoreOf(p), od = p.next && p.next.date < today();
        return `<li class="kc" draggable="true" data-id="${p.id}" data-open="${p.id}"><strong>${esc(p.name)}</strong><small>${catName(p.cat)} · ${esc(barName(p.barrio))}</small>
          <div class="row"><span class="pill2 ${prio(p) === 'alta' ? 'alta' : ''}">${s.full ? s.sum + ' · ' + PRIO_L[prio(p)] : 'Sin calificar'}</span>${id === 'cerrado' ? `<span class="money">${fmtM(p.monthly)}/mes</span>` : p.next ? `<span class="${od ? 'overdue' : ''}">${fmtD(p.next.date)}</span>` : ''}</div></li>`;
      }).join('')}</ul></div>`;
    }).join('');
  }
  function bindKanban() {
    const kb = $('#kanban'); let dragId = null;
    kb.addEventListener('dragstart', e => { const c = e.target.closest('.kc'); if (!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch { /* ignorar */ } });
    kb.addEventListener('dragend', () => { $$('.kc.drag').forEach(c => c.classList.remove('drag')); $$('.col.over').forEach(c => c.classList.remove('over')); });
    kb.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (c) { e.preventDefault(); $$('.col.over').forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); } });
    kb.addEventListener('drop', e => {
      const c = e.target.closest('.col'); if (!c || !dragId) return; e.preventDefault();
      const p = byId(dragId), st = c.dataset.col; dragId = null;
      if (!p || p.status === st) { renderKanban(); return; }
      if (p.status === 'nocontactar') { toast('Este negocio está en «No contactar». Reactívalo desde su ficha.'); renderKanban(); return; }
      setStatus(p, st); renderKanban();
      if (st === 'cerrado' || st === 'perdido') { openDrawer(p.id); toast(st === 'cerrado' ? 'Registra el plan y los valores del cierre.' : 'Indica el motivo de la pérdida.'); }
    });
    kb.addEventListener('click', e => { const c = e.target.closest('[data-open]'); if (c) openDrawer(c.dataset.open); });
  }

  /* ---------- MAPA ---------- */
  let amap = null, baseStyle = null, mapInit = false;
  const FONT = ['Noto Sans Regular'];
  async function getStyle() {
    if (!baseStyle) baseStyle = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
    const s = JSON.parse(JSON.stringify(baseStyle));
    declutter(s);
    if (theme === 'dark') recolor(s);
    return s;
  }
  /* Mismo estilo limpio que el sitio público: lo menor aparece solo al acercarse. */
  function declutter(s) {
    const minz = { highway_path: 15.5, highway_minor: 14.4, 'highway-name-path': 17, 'highway-name-minor': 16.5, 'highway-name-major': 15, label_other: 14.6, label_village: 14.2, building: 15.4, waterway: 13.5, landuse_residential: 13 };
    for (const l of s.layers) {
      if (minz[l.id] != null) l.minzoom = Math.max(l.minzoom || 0, minz[l.id]);
      if (/^(waterway_line_label|water_name_point_label|water_name_line_label|airport)$/.test(l.id) || /shield/.test(l.id)) (l.layout = l.layout || {}).visibility = 'none';
      if (l.type === 'line' && /casing/.test(l.id)) { l.paint = l.paint || {}; l.paint['line-opacity'] = 0; }
    }
  }
  function recolor(s) {
    const C = { land: '#0f0f12', water: '#050505', park: '#121418', build: '#17181d', road: '#1a1c22', major: '#272930', cas: '#0a0a0c', label: '#8e909a', halo: '#050505', lwater: '#5a5d6a' };
    for (const l of s.layers) {
      const p = l.paint = l.paint || {};
      if (/shield/.test(l.id)) { (l.layout = l.layout || {}).visibility = 'none'; continue; }
      if (l.type === 'background') p['background-color'] = C.land;
      else if (l.type === 'fill') {
        if (l.id === 'water') p['fill-color'] = C.water; else if (/park|wood/.test(l.id)) p['fill-color'] = C.park;
        else if (/ice|glacier/.test(l.id)) p['fill-opacity'] = 0; else if (l.id === 'building') { p['fill-color'] = C.build; p['fill-outline-color'] = '#1d1f26'; } else p['fill-color'] = C.land;
      } else if (l.type === 'line') {
        if (/dashline/.test(l.id)) p['line-color'] = 'rgba(0,0,0,0)'; else if (/boundary/.test(l.id)) p['line-color'] = '#3a3d46';
        else if (/casing/.test(l.id)) p['line-color'] = C.cas; else if (/railway|aeroway/.test(l.id)) p['line-color'] = '#1d1f26';
        else if (l.id === 'waterway') p['line-color'] = '#0a0b0e'; else if (/major|motorway/.test(l.id)) p['line-color'] = C.major; else p['line-color'] = C.road;
      } else if (l.type === 'symbol') { p['text-color'] = /water/.test(l.id) ? C.lwater : C.label; p['text-halo-color'] = C.halo; p['text-halo-width'] = 1.2; }
    }
  }
  function mapList() {
    const f = $('#mFilter').value;
    return P.filter(p => p.lat != null && p.status !== 'nocontactar' && (f === 'todos' || (f === 'alta' ? prio(p) === 'alta' && !isClient(p) : ACTIVE.includes(p.status))));
  }
  const toFC = list => ({ type: 'FeatureCollection', features: list.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, name: p.name, prio: prio(p), client: isClient(p), score: scoreOf(p).full ? scoreOf(p).sum : null } })) });
  function addMapLayers() {
    const dark = theme === 'dark';
    const sin = dark ? 'rgba(255,255,255,0.28)' : 'rgba(5,5,5,0.25)';
    amap.addSource('p', { type: 'geojson', data: toFC(mapList()) });
    amap.addLayer({ id: 'halo', type: 'circle', source: 'p', filter: ['all', ['==', ['get', 'prio'], 'alta'], ['!=', ['get', 'client'], true]],
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 16, 26], 'circle-color': '#ff0a1e', 'circle-opacity': 0.32, 'circle-blur': 0.85 } });
    amap.addLayer({ id: 'pins', type: 'circle', source: 'p', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 10],
      'circle-color': ['case', ['==', ['get', 'client'], true], dark ? '#0f0f12' : '#ffffff', ['match', ['get', 'prio'], 'alta', '#ff0a1e', 'media', '#a0000f', 'baja', '#8e909a', sin]],
      'circle-stroke-color': ['case', ['==', ['get', 'client'], true], '#3ddc84', dark ? '#050505' : '#ffffff'], 'circle-stroke-width': ['case', ['==', ['get', 'client'], true], 3, 1.6] } });
    amap.addLayer({ id: 'labels', type: 'symbol', source: 'p', minzoom: 14.2, layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': dark ? '#f2f2f4' : '#050505', 'text-halo-color': dark ? '#050505' : '#ffffff', 'text-halo-width': 1.4 } });
  }
  function fitMap() {
    const l = mapList(); if (!amap || !l.length) return;
    const b = new maplibregl.LngLatBounds(); l.forEach(p => b.extend([p.lng, p.lat]));
    amap.fitBounds(b, { padding: { top: 60, bottom: 90, left: 50, right: 50 }, maxZoom: 15.4, duration: 600 });
  }
  function renderMap() {
    if (typeof maplibregl === 'undefined') { $('#amapFallback').hidden = false; return; }
    if (!mapInit) {
      mapInit = true;
      getStyle().then(style => {
        amap = new maplibregl.Map({ container: 'amap', style, center: [-75.5812, 6.2442], zoom: 12, minZoom: 10, maxZoom: 18, attributionControl: { compact: true }, cooperativeGestures: true,
          locale: { 'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scroll para acercar el mapa', 'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scroll para acercar el mapa', 'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa', 'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar' } });
        window.dmAdminMap = amap;
        amap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        amap.on('style.load', addMapLayers);
        amap.on('load', () => { amap.resize(); fitMap(); });
        if ('ResizeObserver' in window) new ResizeObserver(() => amap.resize()).observe($('#amap'));
        amap.on('click', 'pins', e => openDrawer(e.features[0].properties.id));
        const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
        amap.on('mouseenter', 'pins', e => { amap.getCanvas().style.cursor = 'pointer'; const f = e.features[0]; pop.setLngLat(f.geometry.coordinates).setText(f.properties.name + (f.properties.score != null ? ' · ' + f.properties.score : '')).addTo(amap); });
        amap.on('mouseleave', 'pins', () => { amap.getCanvas().style.cursor = ''; pop.remove(); });
      }).catch(() => { $('#amapFallback').hidden = false; });
    } else if (amap) {
      amap.resize();
      if (amap.getSource('p')) amap.getSource('p').setData(toFC(mapList()));
    }
  }
  $('#mFilter').addEventListener('change', () => { if (amap && amap.getSource('p')) { amap.getSource('p').setData(toFC(mapList())); fitMap(); } });

  /* ---------- SOLICITUDES ---------- */
  const getLeads = () => { try { const a = JSON.parse(store.get('dm_leads') || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const putLeads = a => store.set('dm_leads', JSON.stringify(a));
  function renderBadge() { const n = getLeads().filter(l => !l.handled).length; const b = $('#leadBadge'); b.textContent = n; b.hidden = !n; }
  const LEAD_T = { cotizacion: 'Cotización', reclamo: 'Reclamo de ficha', retiro: 'Retiro', evento: 'Evento por revisar', reporte: 'Reseña reportada' };
  function renderLeads() {
    const L = getLeads();
    $('#leads').innerHTML = L.length ? L.map((l, i) => {
      const detail = l.type === 'cotizacion' ? `${esc(l.name)} · ${esc(l.phone)} · ${esc(l.service)}${l.msg ? '<br>' + esc(l.msg) : ''}` : l.type === 'reclamo' ? `${esc(l.name)} · ${esc(l.phone)} · ${esc(l.role)}${l.photos ? ' · ' + l.photos + (l.photos === 1 ? ' foto' : ' fotos') + ' por revisar' : ''}` : l.type === 'evento' ? `${esc(l.name)} · ${esc(l.phone)}<br><b>${esc(l.title)}</b> · ${esc(l.date)} ${esc(l.time)}${l.desc ? '<br>' + esc(l.desc) : ''}` : l.type === 'reporte' ? `Reseña de «${esc(l.reviewer)}»: ${esc(l.text)}` : `Contacto: ${esc(l.contact)}`;
      return `<li class="lead ${l.handled ? 'done' : ''}"><div class="lh"><span class="tp ${l.type}">${LEAD_T[l.type] || l.type}</span><strong>${esc(l.biz)}</strong><p>${detail}</p><p>${new Date(l.at).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}${l.handled ? ' · atendida' : ''}</p></div>
        <div class="la">${l.handled ? '' : `<button class="btn btn-red btn-sm" type="button" data-lead="apply" data-i="${i}">${l.type === 'retiro' ? 'Aplicar retiro' : l.type === 'reclamo' ? 'Registrar reclamo' : l.type === 'evento' ? 'Registrar en el prospecto' : l.type === 'reporte' ? 'Marcar revisada' : 'Convertir en prospecto'}</button><button class="btn btn-ghost btn-sm" type="button" data-lead="done" data-i="${i}">Marcar atendida</button>`}<button class="btn btn-ghost btn-sm" type="button" data-lead="del" data-i="${i}">Eliminar</button></div></li>`;
    }).join('') : `<li class="panelx empty-s">Aún no hay solicitudes. Envía una desde el <a href="index.html#cotizar">formulario público</a>.</li>`;
    const O = P.filter(p => p.status === 'nocontactar');
    $('#optouts').innerHTML = O.length ? O.map(p => `<li><span><strong>${esc(p.name)}</strong> <small>· ${fmtD(p.optout && p.optout.at)} · ${esc(p.optout ? p.optout.reason : '')}</small></span><span class="row-a"><button class="btn btn-ghost btn-sm" type="button" data-open="${p.id}">Ver ficha</button></span></li>`).join('') : `<li class="muted">Nadie en la lista por ahora.</li>`;
  }
  function findByName(name) { const n = norm(name).trim(); return P.find(p => norm(p.name).trim() === n) || P.find(p => n.length > 4 && (norm(p.name).includes(n) || n.includes(norm(p.name)))); }
  function applyLead(i) {
    const L = getLeads(), l = L[i]; if (!l) return;
    if (l.type === 'reporte') { l.handled = true; putLeads(L); render(); toast('Reporte marcado como revisado. Si procede, retira la reseña.'); return; }
    let p = findByName(l.biz);
    if (l.type === 'cotizacion') {
      if (!p) { p = blank({ name: l.biz, phone: l.phone, source: 'Cotización en el sitio público', status: 'respondio', maxStage: 2, contactedAt: today() }); P.unshift(p); log(p, 'ch', 'Creado desde una cotización del sitio'); }
      else { p.phone = p.phone || l.phone; if (ORDER.indexOf(p.status) < 2 && ORDER.includes(p.status)) setStatus(p, 'respondio'); }
      log(p, 'nota', `Cotización: ${l.service}${l.msg ? '. ' + l.msg : ''}`); p.next = { date: today(), text: 'Responder la cotización por WhatsApp' };
    } else if (l.type === 'reclamo') {
      if (!p) { p = blank({ name: l.biz, phone: l.phone, source: 'Reclamo en el sitio público', status: 'respondio', maxStage: 2, contactedAt: today() }); P.unshift(p); }
      else { p.phone = p.phone || l.phone; if (ORDER.indexOf(p.status) < 2 && ORDER.includes(p.status)) setStatus(p, 'respondio'); }
      log(p, 'nota', `Reclamó su ficha (${l.role}). Verificar por WhatsApp antes de publicar fotos.`); p.next = { date: today(), text: 'Verificar la ficha por WhatsApp' };
    } else if (l.type === 'evento') {
      if (!p) { p = blank({ name: l.biz, phone: l.phone, source: 'Evento enviado en el sitio público', status: 'respondio', maxStage: 2, contactedAt: today() }); P.unshift(p); }
      else { p.phone = p.phone || l.phone; }
      log(p, 'nota', `Quiere publicar un evento: «${l.title}» el ${l.date} a las ${l.time}. Revisar antes de publicar.`); p.next = { date: today(), text: 'Revisar y confirmar el evento por WhatsApp' };
    } else if (l.type === 'retiro') {
      if (!p) { p = blank({ name: l.biz, source: 'Solicitud de retiro', status: 'nuevo' }); P.unshift(p); }
      setOptout(p, 'Solicitó retiro desde el sitio');
    }
    l.handled = true; putLeads(L); save(); render(); toast(l.type === 'retiro' ? 'Negocio retirado y marcado «No contactar».' : 'Listo: quedó registrado en Prospectos.');
  }
  $('#leads').addEventListener('click', e => {
    const b = e.target.closest('[data-lead]'); if (!b) return;
    const i = +b.dataset.i, L = getLeads();
    if (b.dataset.lead === 'apply') applyLead(i);
    else if (b.dataset.lead === 'done') { L[i].handled = true; putLeads(L); render(); }
    else if (b.dataset.lead === 'del') { L.splice(i, 1); putLeads(L); render(); }
  });
  $('#optouts').addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (o) openDrawer(o.dataset.open); });
  /* ---------- FICHA LATERAL ---------- */
  const drawer = $('#drawer'), dBg = $('#dBg');
  let cur = null, dirty = false, lastFocus = null;
  const planOpts = sel => `<option value="">Sin plan</option>` + Object.keys(PLANS).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');

  function hint(p) {
    const s = p.signals, v = k => s[k] && s[k].value;
    if (v('hasUrl') === 'no' && v('social') === 'si') return 'Según la evidencia registrada: sin URL propia y depende de redes. La necesidad de web parece alta. Es solo una sugerencia: califica tú.';
    if (v('hasUrl') === 'no') return 'Sin URL propia registrada. Falta saber si usa redes, Linktree u otro parche.';
    if (v('hasUrl') === 'si' && s.speed && s.speed.value < 50) return 'La URL tiene PageSpeed móvil bajo: posible oportunidad de rediseño. Revisa antes de afirmarlo.';
    if (v('hasUrl') === 'si' && (s.speed || s.mobile)) return 'La web tiene señales medidas aceptables: la necesidad de una nueva parece menor.';
    return 'Sin evidencia suficiente: no califiques la necesidad por intuición. Registra primero las señales.';
  }
  function message(p, kind) {
    const n = p.name, b = barName(p.barrio), plan = p.plan || '[plan]';
    const optline = '\n\nSi prefieres que no te escribamos más, dímelo y lo retiramos de inmediato.';
    if (kind === 'invitacion') return `Hola, ¿hablo con el responsable de ${n}? Soy [Tu nombre], de SONETIX (diseño de páginas web en Medellín).\n\nEstamos armando un mapa de negocios${p.barrio ? ' de ' + b : ''} y ${n} ya aparece con una ficha básica con datos públicos. Puedes reclamarla gratis para completar tus fotos, horarios y enlaces: [enlace a la ficha].${optline}`;
    if (kind === 'seguimiento') return `Hola de nuevo, soy [Tu nombre] de SONETIX. Te escribí hace unos días sobre la ficha de ${n} en nuestro mapa. ¿Pudiste verla? Si quieres, la completamos juntos en una llamada de 15 minutos.${optline}`;
    return `Hola, soy [Tu nombre] de SONETIX. Como hablamos, te dejo la propuesta para ${n}:\n\nPlan: ${plan}\n${p.setup ? `Instalación: ${fmtM(p.setup)} (pago único)\n` : ''}Mensualidad: ${p.monthly != null ? fmtM(p.monthly) : '[valor]'}\n\nIncluye: ${p.plan === 'Sitio de información' ? 'tu página con nombre, marca y fotos, WhatsApp, cómo llegar, horarios y tu ficha en el mapa' : '[alcance]'}. ¿Te la explico en una llamada corta?`;
  }

  function drawerHTML(p) {
    const s = scoreOf(p), pr = prio(p), blocked = p.status === 'nocontactar';
    const rub = RUBRIC.map(r => `<div class="rb"><span>${r.l} <small>${r.h}</small></span><input class="in2" type="number" inputmode="numeric" min="0" max="${r.max}" step="1" data-r="${r.k}" value="${p.rubric[r.k] ?? ''}" placeholder="0–${r.max}" aria-label="${r.l} (máximo ${r.max})"></div>`).join('');
    const sig = SIGNALS.map(x => {
      const v = p.signals[x.k];
      const ctl = x.t === 'sel' ? `<select data-s="${x.k}"><option value="">No evaluado</option>${x.o.map(([val, l]) => `<option value="${val}" ${v && v.value === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`
        : `<input type="number" data-s="${x.k}" min="${x.min}" max="${x.max}" value="${v ? v.value : ''}" placeholder="No evaluado">`;
      return `<div class="sg"><span>${x.l}</span>${ctl}<span class="meta2">${v ? `Medido el ${fmtD(v.date)} · Herramienta: <input data-st="${x.k}" value="${esc(v.tool || '')}" placeholder="Ej: PageSpeed" aria-label="Herramienta de ${x.l}">` : 'Sin medición: no se afirma nada.'}</span></div>`;
    }).join('');
    const notes = [...p.notes].reverse().map(n => `<li class="${n.type === 'ch' ? 'ch' : ''}"><small>${fmtD(n.at)} · ${n.type === 'ch' ? 'Cambio' : 'Nota'}</small>${esc(n.text)}</li>`).join('');
    return `
      <div class="d-h"><div><h2>${esc(p.name)}</h2><small>${catName(p.cat)} · ${esc(barName(p.barrio))} · Fuente: ${esc(p.source)} (${fmtD(p.sourceDate)})</small></div>
        <button class="icon-btn" type="button" data-act="close" aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="d-b">
        ${blocked ? `<div class="blocked"><b>No contactar.</b> ${esc(p.optout ? p.optout.reason : '')} (${fmtD(p.optout && p.optout.at)}). No se generan mensajes para este negocio.<div class="row-a" style="margin-top:10px"><button class="btn btn-ghost btn-sm" type="button" data-act="reactivate">Reactivar (confirmar)</button></div></div>` : ''}
        <div class="dsec"><h3>Estado</h3>
          <div class="d-grid">
            <label class="lbl">Estado del embudo<select data-f="status" ${blocked ? 'disabled' : ''}>${STAGES.map(([v, l]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${l}</option>`).join('')}${blocked ? '<option selected>No contactar</option>' : ''}</select></label>
            <label class="lbl">WhatsApp<input data-f="phone" type="tel" value="${esc(p.phone)}" placeholder="300 000 0000"></label>
            <label class="lbl">Barrio<select data-f="barrio"><option value="">Sin definir</option>${BARRIOS.map(b => `<option value="${b.id}" ${p.barrio === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
            <label class="lbl">Categoría<select data-f="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
            <label class="lbl">Instagram<input data-f="ig" value="${esc(p.ig)}" placeholder="usuario sin @"></label>
            <label class="lbl">Web en la fuente<input data-f="web" value="${esc(p.web)}" placeholder="https://"></label>
          </div></div>

        ${p.status === 'cerrado' ? `<div class="dsec"><h3>Cierre</h3><div class="d-grid">
          <label class="lbl full">Plan contratado<select data-f="plan">${planOpts(p.plan)}</select></label>
          <label class="lbl">Instalación (COP)<input data-f="setup" type="number" min="0" step="10000" value="${p.setup ?? ''}"></label>
          <label class="lbl">Mensualidad (COP)<input data-f="monthly" type="number" min="0" step="5000" value="${p.monthly ?? ''}"></label></div></div>` : ''}
        ${p.status === 'perdido' ? `<div class="dsec"><h3>Motivo de pérdida</h3><label class="lbl"><select data-f="lostReason"><option value="">Sin motivo</option>${LOST.map(m => `<option ${p.lostReason === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>` : ''}

        <div class="dsec"><h3>Puntaje <em id="dScore">${s.full ? s.sum + ' / 100 · ' + PRIO_L[pr] : s.filled ? `Parcial ${s.filled}/6` : 'Sin calificar'}</em></h3>
          <div class="hint">${esc(hint(p))}</div>${rub}</div>

        <div class="dsec"><h3>Evidencia web <em style="font-size:.8rem;color:var(--mut)">${SIGNALS.filter(x => p.signals[x.k]).length} de ${SIGNALS.length} medidas</em></h3>
          <p class="ev">Registra solo lo que mediste. Cada dato guarda fecha y herramienta. Esta información es interna y no se publica.</p>${sig}</div>

        <div class="dsec"><h3>Siguiente acción</h3><div class="d-grid">
          <label class="lbl">Fecha<input data-f="nextDate" type="date" value="${p.next ? p.next.date : ''}"></label>
          <label class="lbl">Qué hacer<input data-f="nextText" value="${p.next ? esc(p.next.text) : ''}" placeholder="Ej: Llamar para agendar reunión"></label></div></div>

        <div class="dsec"><h3>Mensaje y propuesta</h3>
          ${blocked ? '<div class="hint">No disponible: el negocio pidió no ser contactado.</div>' : `
          <label class="lbl">Plantilla<select id="tmpl"><option value="invitacion">Invitación a reclamar la ficha</option><option value="seguimiento">Seguimiento</option><option value="propuesta">Propuesta con valores</option></select></label>
          <div class="d-grid"><label class="lbl">Plan<select data-f="plan">${planOpts(p.plan)}</select></label>
            <label class="lbl">Valores<input value="${p.setup != null ? fmtM(p.setup) + ' + ' + fmtM(p.monthly) + '/mes' : 'Se llenan al elegir plan'}" disabled></label></div>
          <div class="msgbox" id="msgBox">${esc(message(p, 'invitacion'))}</div>
          <div class="row-a"><button class="btn btn-red btn-sm" type="button" data-act="copy">Copiar mensaje</button></div>
          <p class="ev">Revisa los textos entre [corchetes] antes de enviar. Todo mensaje incluye cómo pedir no ser contactado.</p>`}</div>

        <div class="dsec"><h3>Notas e historial</h3>
          <label class="lbl">Nueva nota<textarea id="noteTxt" placeholder="Qué pasó, qué dijo, qué sigue"></textarea></label>
          <div class="row-a"><button class="btn btn-ghost btn-sm" type="button" data-act="addnote">Agregar nota</button></div>
          <ul class="tl">${notes}</ul></div>

        ${blocked ? '' : `<div class="dsec"><h3>Privacidad</h3><p class="ev">Si el negocio pide que no lo contactemos, regístralo aquí y se respeta siempre.</p>
          <div class="row-a"><button class="btn btn-danger btn-sm" type="button" data-act="optout">Marcar «No contactar»</button></div></div>`}
      </div>`;
  }

  function openDrawer(id) {
    const p = byId(id); if (!p) return;
    cur = id; lastFocus = document.activeElement;
    drawer.innerHTML = drawerHTML(p); drawer.scrollTop = 0;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); dBg.hidden = false;
    const x = $('[data-act="close"]', drawer); if (x) x.focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); dBg.hidden = true; cur = null;
    if (dirty) { dirty = false; render(); }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  const redraw = () => { const p = byId(cur); if (p) { const st = drawer.scrollTop; drawer.innerHTML = drawerHTML(p); drawer.scrollTop = st; } dirty = true; };

  drawer.addEventListener('input', e => {
    const r = e.target.dataset.r; if (!r) return;
    const p = byId(cur), def = RUBRIC.find(x => x.k === r);
    const raw = e.target.value.trim();
    p.rubric[r] = raw === '' ? null : Math.max(0, Math.min(def.max, Math.round(+raw) || 0));
    save(); dirty = true;
    const s = scoreOf(p), pr = prio(p);
    $('#dScore').textContent = s.full ? `${s.sum} / 100 · ${PRIO_L[pr]}` : s.filled ? `Parcial ${s.filled}/6` : 'Sin calificar';
  });
  drawer.addEventListener('change', e => {
    const t = e.target, p = byId(cur); if (!p) return;
    if (t.id === 'tmpl') { $('#msgBox').textContent = message(p, t.value); return; }
    if (t.dataset.f) {
      const f = t.dataset.f, v = t.value;
      if (f === 'status') { setStatus(p, v); redraw(); return; }
      if (f === 'plan') { p.plan = v; if (v) { [p.setup, p.monthly] = PLANS[v]; } save(); redraw(); return; }
      if (f === 'setup' || f === 'monthly') { p[f] = v === '' ? null : +v; save(); dirty = true; return; }
      if (f === 'barrio') { p.barrio = v; if (v && p.lat == null) { p.lat = BAR[v].lat + (Math.random() - .5) * .004; p.lng = BAR[v].lng + (Math.random() - .5) * .004; } save(); redraw(); return; }
      if (f === 'nextDate' || f === 'nextText') {
        const d = f === 'nextDate' ? v : (p.next ? p.next.date : ''), tx = f === 'nextText' ? v.trim() : (p.next ? p.next.text : '');
        p.next = d || tx ? { date: d || addDays(1), text: tx || 'Dar seguimiento' } : null; save(); dirty = true; return;
      }
      p[f] = v.trim(); save(); dirty = true; return;
    }
    if (t.dataset.s) {
      const k = t.dataset.s, raw = t.value.trim();
      if (raw === '') delete p.signals[k];
      else { const prev = p.signals[k]; p.signals[k] = { value: t.type === 'number' ? +raw : raw, date: today(), tool: prev && prev.tool ? prev.tool : 'Revisión manual' }; }
      save(); redraw(); return;
    }
    if (t.dataset.st) { const sg = p.signals[t.dataset.st]; if (sg) { sg.tool = t.value.trim(); save(); dirty = true; } }
  });
  drawer.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const p = byId(cur);
    if (a.dataset.act === 'close') closeDrawer();
    else if (a.dataset.act === 'addnote') {
      const t = $('#noteTxt').value.trim(); if (!t) { toast('Escribe la nota primero.'); return; }
      log(p, 'nota', t); save(); redraw(); toast('Nota agregada.');
    } else if (a.dataset.act === 'copy') {
      const txt = $('#msgBox').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Mensaje copiado.'), () => {
        const r = document.createRange(); r.selectNodeContents($('#msgBox')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Selecciona y copia el texto (Ctrl+C).');
      });
    } else if (a.dataset.act === 'optout') {
      const why = prompt('¿Por qué se marca como «No contactar»? (opcional)', 'Pidió no ser contactado');
      if (why === null) return;
      setOptout(p, why.trim()); redraw(); toast('Marcado «No contactar».');
    } else if (a.dataset.act === 'reactivate') {
      if (confirm('¿Reactivar este negocio? Solo hazlo si te lo pidió el propio negocio.')) { reactivate(p); redraw(); }
    }
  });
  dBg.addEventListener('click', closeDrawer);

  /* ---------- modales ---------- */
  const modal = $('#modal');
  function openModal(html) { $('#mBody').innerHTML = html; modal.hidden = false; const f = $('input,select', $('#mBody')); if (f) f.focus(); }
  const closeModal = () => { modal.hidden = true; };
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!modal.hidden) closeModal(); else closeDrawer(); } });
  function openAdd() {
    openModal(`<h3 id="mTitle">Agregar prospecto</h3><p>Usa solo datos comerciales públicos o que el propio negocio te dio. Anota de dónde salieron.</p>
      <form class="form" id="addForm" novalidate><label>Nombre del negocio<input name="name" type="text" required></label>
      <label>Categoría<select name="cat">${CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select></label>
      <label>Barrio<select name="barrio"><option value="">Sin definir</option>${BARRIOS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
      <label>WhatsApp <span class="opt">(opcional)</span><input name="phone" type="tel"></label>
      <label>Fuente del dato<input name="source" type="text" required placeholder="Ej: Directorio de la Alcaldía, visita, referido"></label>
      <p class="err" role="alert" hidden></p><button class="btn btn-red btn-lg" type="submit">Agregar</button></form>`);
    $('#addForm').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      if (!f.name.value.trim() || !f.source.value.trim()) { const er = $('.err', f); er.textContent = 'El nombre y la fuente son obligatorios.'; er.hidden = false; return; }
      const b = f.barrio.value;
      const p = blank({ name: f.name.value.trim(), cat: f.cat.value, barrio: b, phone: f.phone.value.trim(), source: f.source.value.trim(),
        lat: b ? BAR[b].lat + (Math.random() - .5) * .004 : null, lng: b ? BAR[b].lng + (Math.random() - .5) * .004 : null });
      log(p, 'ch', 'Prospecto creado manualmente'); P.unshift(p); save(); closeModal(); render(); openDrawer(p.id);
    });
  }
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Esto borra los cambios y vuelve a la lista inicial de clientes. ¿Continuar?')) return;
    P = seed(); save(); render(); toast('Lista inicial restaurada.');
  });
  document.addEventListener('click', e => { const o = e.target.closest('#tab-resumen [data-open]'); if (o) openDrawer(o.dataset.open); });

  /* ---------- arranque ---------- */
  load(); buildFilters(); bindTable(); bindKanban();
  const first = location.hash.slice(1);
  show(['resumen', 'prospectos', 'embudo', 'mapa', 'solicitudes'].includes(first) ? first : 'resumen');
})();
