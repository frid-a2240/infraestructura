// Las solicitudes de colaboradores se identifican por quién las pidió; las actividades de
// administradores (o importadas de Notion) por su descripción.
export function esActividadAdmin(s) {
  return !!s.origen && s.origen !== 'solicitud';
}

export function tituloDe(s) {
  return s.titulo || (esActividadAdmin(s) ? s.explicacion : s.nombre_solicitante);
}

export const MOTIVO_ESPERANDO = 'Esperando respuesta';

export function componerMotivoPausa(esperando, comentario) {
  const texto = comentario.trim();
  if (esperando) return texto ? `${MOTIVO_ESPERANDO} — ${texto}` : MOTIVO_ESPERANDO;
  return texto;
}
