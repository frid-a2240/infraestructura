const DIA_MS = 86400000;

// Avance lineal entre el inicio de la fecha de inicio y el final del día de terminación.
export function calcularAvance(fechaInicio, fechaObjetivo) {
  if (!fechaInicio || !fechaObjetivo) return 0;
  const inicio = new Date(fechaInicio).getTime();
  const fin = new Date(fechaObjetivo).getTime() + DIA_MS;
  const ahora = Date.now();
  if (fin <= inicio) return 100;
  const porcentaje = ((ahora - inicio) / (fin - inicio)) * 100;
  return Math.max(0, Math.min(100, Math.round(porcentaje)));
}

// Avance a mostrar: congelado si está pausada, fijo si el seguimiento es manual,
// o calculado por fechas si es automático.
export function avanceEfectivo(row) {
  if (row.pausada) return row.avance_congelado ?? 0;
  if (row.modo_avance === 'manual' && row.avance_manual != null) return row.avance_manual;
  return calcularAvance(row.fecha_inicio || row.fecha_aprobacion, row.fecha_objetivo);
}

// Días restantes hasta la fecha objetivo (negativo = vencida).
export function diasRestantes(fechaObjetivo) {
  if (!fechaObjetivo) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fechaObjetivo);
  return Math.round((objetivo - hoy) / DIA_MS);
}
