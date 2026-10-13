
//  CONFIGURACIÓN 

const API_URL = 'https://script.google.com/macros/s/AKfycbwe7fI7LNvejeEAV55WCZsvSOIwRuFXH3008O49VJ8YBiKjZgY6pgdkG7NlI3v7nH-T/exec';
const EVALUACION  = 'Segundo Parcial';

const $ = id => document.getElementById(id);
let credenciales = null;

function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','); }
function iniciales(nombre) {
  return String(nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
}


async function pedirNotas(ci, pin) {
  if (!API_URL) { await new Promise(r => setTimeout(r, 400)); return DEMO; }
  const url = API_URL + '?ci=' + encodeURIComponent(ci) + '&pin=' + encodeURIComponent(pin) + '&t=' + Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    return { ok: false, error: 'No fue posible conectarse con el servidor. Verifique su conexión e intente nuevamente.' };
  } finally { clearTimeout(timer); }
}

function mostrarError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function render(data) {
  const semanas = data.semanas || [];
  const fecha = new Date(data.consultado || Date.now());

  $('avatar').textContent = iniciales(data.alumno);
  $('fAlumno').textContent = data.alumno;
  $('fCi').textContent = data.ci || (credenciales && credenciales.ci) || '';
  $('fFecha').textContent = fecha.toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ', ' + fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  const evaluadas = semanas.filter(s => s.maximo && (s.puntaje !== null || s.estado));
  const obtenido = semanas.reduce((a, s) => a + (s.puntaje || 0), 0);
  const maxEvaluado = evaluadas.reduce((a, s) => a + s.maximo, 0);
  const maxTotal = semanas.reduce((a, s) => a + (s.maximo || 0), 0);

  $('rNota').innerHTML = esc(fmt(obtenido)) + '<small> / ' + esc(fmt(maxTotal)) + ' pts</small>';
  $('rNotaDet').textContent = 'Puntaje acumulado al ' + fecha.toLocaleDateString('es-PY');
  $('rSemanas').innerHTML = evaluadas.length + '<small> de ' + semanas.length + '</small>';
  $('rPct').textContent = maxEvaluado ? Math.round((obtenido / maxEvaluado) * 100) + '%' : '—';

  const avance = maxTotal ? (obtenido / maxTotal) * 100 : 0;
  $('avanceTxt').textContent = fmt(obtenido) + ' de ' + fmt(maxTotal) + ' pts';
  const bar = $('avanceBar');
  bar.style.width = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = Math.min(avance, 100) + '%'; }));

  $('tbody').innerHTML = semanas.length ? semanas.map(s => {
    let pts, hecha = false;
    if (s.puntaje !== null) { pts = '<span class="pts-v">' + esc(fmt(s.puntaje)) + '<small> / ' + esc(fmt(s.maximo || 0)) + '</small></span>'; hecha = true; }
    else if (s.estado) pts = '<span class="etq aus">' + esc(s.estado) + '</span>';
    else pts = '<span class="etq pend">Pendiente</span>';
    return '<tr class="' + (hecha ? 'hecha' : '') + '">' +
      '<td class="sem"><span class="sem-n"><i>' + esc(s.semana ?? '') + '</i>Semana ' + esc(s.semana ?? '') + '</span></td>' +
      '<td class="fecha">' + esc(s.fecha) + '</td>' +
      '<td class="tema">' + esc(s.tema) + (s.observacion ? '<span class="obs">' + esc(s.observacion) + '</span>' : '') + '</td>' +
      '<td class="pts">' + pts + '</td>' +
      '</tr>';
  }).join('') : '<tr><td colspan="4" style="color:var(--gris)">Aún no se registraron semanas de clase.</td></tr>';

  $('tLabel').textContent = 'Nota del ' + (data.evaluacion || EVALUACION);
  $('tTotal').innerHTML = '<span class="pts-v">' + esc(fmt(obtenido)) + '<small> / ' + esc(fmt(maxTotal)) + '</small></span>';

  $('vistaLogin').classList.add('hidden');
  $('vistaNotas').classList.remove('hidden');
}

async function ingresar(ci, pin) {
  const btn = $('btnIngresar');
  btn.disabled = true; btn.textContent = 'Consultando…';
  mostrarError('');
  const data = await pedirNotas(ci, pin);
  btn.disabled = false; btn.textContent = 'Consultar mis notas';
  if (!data || !data.ok) { mostrarError((data && data.error) || 'Ocurrió un error inesperado.'); return; }
  credenciales = { ci, pin };
  guardar('portal_ci', ci);
  render(data);
}

$('formLogin').addEventListener('submit', e => {
  e.preventDefault();
  const ci = $('ci').value.trim(), pin = $('pin').value.trim();
  if (ci && pin) ingresar(ci, pin);
});

$('btnSalir').addEventListener('click', () => {
  credenciales = null;
  $('pin').value = '';
  $('vistaNotas').classList.add('hidden');
  $('vistaLogin').classList.remove('hidden');
  $('pin').focus();
});

$('btnActualizar').addEventListener('click', async () => {
  if (!credenciales) return;
  const b = $('btnActualizar');
  b.disabled = true; b.textContent = 'Actualizando…';
  const data = await pedirNotas(credenciales.ci, credenciales.pin);
  b.disabled = false; b.textContent = 'Actualizar';
  if (data && data.ok) render(data);
});

