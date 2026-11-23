const DIA_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export function fechaLocal(fechaISO) {
  const [y, m, d] = fechaISO.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function claveFecha(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoyISO() {
  return claveFecha(new Date());
}

export function esFechaISO(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

// Días naturales incluyendo el de inicio y el de terminación.
export function diasEntre(inicioISO, finISO) {
  const [y1, m1, d1] = inicioISO.split('-').map(Number);
  const [y2, m2, d2] = finISO.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DIA_MS) + 1;
}

export function sumarDias(fechaISO, dias) {
  const d = fechaLocal(fechaISO);
  d.setDate(d.getDate() + dias);
  return claveFecha(d);
}

export function formatoCorto(fechaISO) {
  if (!fechaISO) return '—';
  return fechaLocal(fechaISO).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function inicioDeActividad(solicitud) {
  return (solicitud.fecha_inicio || solicitud.fecha_aprobacion || solicitud.fecha_objetivo || '').slice(0, 10) || null;
}
