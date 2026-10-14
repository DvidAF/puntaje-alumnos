
//  CONFIGURACIÓN 

const API_URL = 'https://script.google.com/macros/s/AKfycbzEhfOzDjlixj9B4yahnT2rxirPk44TP7MOlzEBV13LvuIhEUU40X97wosr9x7OR93M/exec';

//LÓGICA
const $ = id => document.getElementById(id);
const ICONOS = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>'
};
let datos = null;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function sinAcentos(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function marca(e) {
  if (e === 'ok') return '<i class="m ok" title="Logrado" aria-label="Logrado">' + ICONOS.ok + '</i>';
  if (e === 'no') return '<i class="m no" title="No logrado" aria-label="No logrado">' + ICONOS.no + '</i>';
  return '<i class="m pend" title="Pendiente" aria-label="Pendiente">–</i>';
}



async function cargar() {
  if (!API_URL) { await new Promise(r => setTimeout(r, 300)); return DEMO; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(API_URL + '?t=' + Date.now(), { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    return { ok: false, error: 'No fue posible cargar el listado. Verifique su conexión e intente nuevamente.' };
  } finally { clearTimeout(timer); }
}

function renderCabecera(semanas) {
  $('thead').innerHTML = '<th class="alumno">Alumno/a</th>' + semanas.map((s, i) =>
    '<th class="sem" data-i="' + i + '"><span class="t">Semana ' + esc(s.semana ?? i + 1) + '</span>' +
    (s.fecha ? '<span class="f">' + esc(s.fecha) + '</span>' : '') + '</th>'
  ).join('');
}

function renderFilas(filtro) {
  const q = sinAcentos(filtro || '').trim();
  const lista = datos.alumnos
    .map((a, i) => ({ a, n: i + 1 }))
    .filter(x => !q || sinAcentos(x.a.nombre).includes(q));

  $('tbody').innerHTML = lista.length
    ? lista.map(({ a, n }) =>
        '<tr><td class="alumno"><span class="num">' + n + '</span>' + esc(a.nombre) + '</td>' +
        datos.semanas.map((_, k) => '<td class="c">' + marca(a.estados[k]) + '</td>').join('') +
        '</tr>').join('')
    : '<tr><td class="vacio-tabla" colspan="' + (datos.semanas.length + 1) + '">No se encontraron alumnos con ese nombre.</td></tr>';

  $('conteo').textContent = q
    ? lista.length + ' de ' + datos.alumnos.length + ' alumnos'
    : datos.alumnos.length + ' alumnos · ' + datos.semanas.length + ' semanas de clase';
}

function render(d) {
  datos = d;
  renderCabecera(d.semanas || []);
  renderFilas($('buscar').value);
  const f = new Date(d.actualizado || Date.now());
  $('actualizado').textContent = 'Actualizado: ' + f.toLocaleDateString('es-PY') + ' ' +
    f.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  $('estado').classList.add('hidden');
  $('tablaWrap').classList.remove('hidden');
}


const tip = $('tip');
$('thead').addEventListener('mousemove', e => {
  const th = e.target.closest('th.sem');
  if (!th || !datos) { tip.classList.remove('on'); return; }
  const s = datos.semanas[+th.dataset.i];
  if (!s || !s.tema) { tip.classList.remove('on'); return; }
  tip.innerHTML = '<b>Semana ' + esc(s.semana) + '</b>' + esc(s.tema);
  const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 10);
  tip.style.left = x + 'px';
  tip.style.top = (e.clientY + 18) + 'px';
  tip.classList.add('on');
});
$('thead').addEventListener('mouseleave', () => tip.classList.remove('on'));

$('buscar').addEventListener('input', e => { if (datos) renderFilas(e.target.value); });


(async function iniciar() {
  if (!API_URL) $('demoBanner').classList.remove('hidden');
  const d = await cargar();
  if (!d || !d.ok) {
    $('estado').className = 'error';
    $('estado').textContent = (d && d.error) || 'Ocurrió un error inesperado.';
    return;
  }
  render(d);
})();
