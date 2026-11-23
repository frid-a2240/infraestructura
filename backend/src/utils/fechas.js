const DIA_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [y, m, d] = valor.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// pg entrega las columnas DATE como Date a medianoche local; las TIMESTAMPTZ como instante.
export function fechaISO(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`;
}

export function hoyISO() {
  return fechaISO(new Date());
}

// Días naturales incluyendo el de inicio y el de terminación.
export function diasEntre(inicioISO, finISO) {
  const [y1, m1, d1] = inicioISO.split('-').map(Number);
  const [y2, m2, d2] = finISO.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DIA_MS) + 1;
}

export function formatearFecha(valor) {
  const iso = fechaISO(valor);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function validarRango(inicioISO, finISO) {
  if (!esFechaISO(finISO)) return 'Indica una fecha de terminación válida';
  if (!esFechaISO(inicioISO)) return 'Indica una fecha de inicio válida';
  if (inicioISO > finISO) return 'La fecha de inicio no puede ser posterior a la de terminación';
  return null;
}
