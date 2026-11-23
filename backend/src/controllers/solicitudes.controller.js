import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { calcularAvance, avanceEfectivo, diasRestantes } from '../services/prioridad.service.js';
import { notificarNuevaSolicitud, notificarResultadoSolicitud, notificarCambioFechas } from '../services/email.service.js';
import { fechaISO, hoyISO, validarRango } from '../utils/fechas.js';

const PRIORIDADES = ['alta', 'media', 'baja'];

// Las solicitudes de colaboradores se identifican por quién las pidió; las actividades
// creadas por administradores (o traídas de Notion) por su propia descripción.
const TITULO_SQL = `CASE WHEN s.origen = 'solicitud' THEN s.nombre_solicitante ELSE s.explicacion END AS titulo`;
const RESPONSABLE_SQL = 'COALESCE(r.nombre_corto, r.nombre) AS responsable_nombre';
const RESPONSABLE_JOIN = 'LEFT JOIN usuarios r ON r.id = s.responsable_id';

async function esAdminActivo(id) {
  const { rows } = await pool.query(
    `SELECT 1 FROM usuarios WHERE id = $1 AND rol = 'admin' AND activo = true`,
    [id]
  );
  return rows.length > 0;
}

function borrarSubidos(archivos) {
  for (const archivo of archivos) fs.rm(archivo.path, { force: true }, () => {});
}

async function adjuntarImagenes(solicitudes) {
  if (solicitudes.length === 0) return solicitudes;
  const ids = solicitudes.map((s) => s.id);
  const { rows } = await pool.query(
    'SELECT * FROM solicitud_imagenes WHERE solicitud_id = ANY($1::int[])',
    [ids]
  );
  const imagenesPorSolicitud = new Map();
  const evidenciasPorSolicitud = new Map();
  for (const img of rows) {
    const mapa = img.tipo === 'evidencia' ? evidenciasPorSolicitud : imagenesPorSolicitud;
    if (!mapa.has(img.solicitud_id)) mapa.set(img.solicitud_id, []);
    mapa.get(img.solicitud_id).push(`/uploads/solicitudes/${path.basename(img.ruta_archivo)}`);
  }
  return solicitudes.map((s) => ({
    ...s,
    imagenes: imagenesPorSolicitud.get(s.id) || [],
    evidencias: evidenciasPorSolicitud.get(s.id) || [],
  }));
}

export async function listar(req, res) {
  const { estado } = req.query;
  const esAdmin = req.user.rol === 'admin';

  const condiciones = [];
  const params = [];

  if (!esAdmin) {
    params.push(req.user.id);
    condiciones.push(`s.usuario_id = $${params.length}`);
  }
  if (estado) {
    params.push(estado);
    condiciones.push(`s.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT s.*, u.email AS email, ${TITULO_SQL}, ${RESPONSABLE_SQL}
     FROM solicitudes s
     LEFT JOIN usuarios u ON u.id = s.usuario_id
     ${RESPONSABLE_JOIN}
     ${where}
     ORDER BY s.fecha_creacion DESC`,
    params
  );

  const conImagenes = await adjuntarImagenes(rows);
  const enriquecidas = conImagenes.map((s) =>
    s.estado === 'aprobada'
      ? { ...s, avance: avanceEfectivo(s), dias_restantes: diasRestantes(s.fecha_objetivo) }
      : s
  );
  return res.json({ solicitudes: enriquecidas });
}

export async function crear(req, res) {
  const { nombre_solicitante, area, explicacion } = req.body;
  const archivos = req.files || [];
  const rechazar = (detail) => {
    borrarSubidos(archivos);
    return res.status(400).json({ detail });
  };

  if (!nombre_solicitante || !area || !explicacion) {
    return rechazar('Completa nombre, área y explicación de la necesidad');
  }
  if (archivos.length === 0) {
    return rechazar('Adjunta al menos una foto como evidencia de la necesidad');
  }
  const prioridad = PRIORIDADES.includes(req.body.prioridad) ? req.body.prioridad : 'media';

  const { rows } = await pool.query(
    `INSERT INTO solicitudes (usuario_id, nombre_solicitante, area, explicacion, prioridad)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.id, nombre_solicitante, area, explicacion, prioridad]
  );
  const solicitud = rows[0];

  for (const archivo of archivos) {
    await pool.query(
      `INSERT INTO solicitud_imagenes (solicitud_id, ruta_archivo, tipo) VALUES ($1, $2, 'solicitud')`,
      [solicitud.id, archivo.filename]
    );
  }

  notificarNuevaSolicitud(solicitud);

  return res.status(201).json({ solicitud });
}

// Actividad creada directamente por un administrador: entra ya aprobada, las fotos son
// opcionales y la fecha compromiso también (sin fecha no aparece en el calendario).
export async function crearActividad(req, res) {
  const archivos = req.files || [];
  const rechazar = (detail) => {
    borrarSubidos(archivos);
    return res.status(400).json({ detail });
  };

  const titulo = (req.body.titulo || '').trim();
  const area = (req.body.area || '').trim() || 'Infraestructura';
  if (!titulo) return rechazar('Escribe en qué consiste la actividad');
  if (titulo.length > 2000 || area.length > 100) return rechazar('La actividad o el área son demasiado largas');

  const prioridad = PRIORIDADES.includes(req.body.prioridad) ? req.body.prioridad : 'media';

  const responsableId = req.body.responsable_id ? Number(req.body.responsable_id) : null;
  if (responsableId && !(await esAdminActivo(responsableId))) {
    return rechazar('El responsable debe ser un administrador activo');
  }

  let fechaInicio = null;
  let fechaObjetivo = null;
  if (req.body.fecha_objetivo) {
    fechaObjetivo = req.body.fecha_objetivo;
    fechaInicio = req.body.fecha_inicio || hoyISO();
    const errorRango = validarRango(fechaInicio, fechaObjetivo);
    if (errorRango) return rechazar(errorRango);
  }

  let avance = null;
  if (req.body.avance !== undefined && req.body.avance !== '') {
    avance = Number(req.body.avance);
    if (!Number.isInteger(avance) || avance < 0 || avance > 100) {
      return rechazar('El avance debe ser un número entero entre 0 y 100');
    }
  }

  const pausada = req.body.estatus === 'pausada';
  const motivoPausa = pausada ? ((req.body.motivo_pausa || '').trim().slice(0, 1000) || 'Esperando respuesta') : null;

  const creador = await pool.query('SELECT COALESCE(nombre_corto, nombre) AS nombre FROM usuarios WHERE id = $1', [req.user.id]);
  const maxOrden = await pool.query(
    `SELECT COALESCE(MAX(orden_prioridad), 0) AS max FROM solicitudes WHERE estado = 'aprobada'`
  );

  const { rows } = await pool.query(
    `INSERT INTO solicitudes (
       usuario_id, nombre_solicitante, area, explicacion, prioridad, estado,
       fecha_inicio, fecha_objetivo, orden_prioridad, fecha_aprobacion,
       modo_avance, avance_manual, pausada, fecha_pausa_inicio, motivo_pausa, avance_congelado,
       responsable_id, origen)
     VALUES ($1, $2, $3, $4, $5, 'aprobada', $6, $7, $8, now(), $9, $10, $11,
             CASE WHEN $11::boolean THEN now() END, $12, $13, $14, 'admin')
     RETURNING *`,
    [
      req.user.id, creador.rows[0]?.nombre || req.user.nombre, area, titulo, prioridad,
      fechaInicio, fechaObjetivo, maxOrden.rows[0].max + 1,
      avance === null ? 'automatico' : 'manual', avance,
      pausada, motivoPausa, pausada ? avance ?? 0 : null,
      responsableId,
    ]
  );

  for (const archivo of archivos) {
    await pool.query(
      `INSERT INTO solicitud_imagenes (solicitud_id, ruta_archivo, tipo) VALUES ($1, $2, 'solicitud')`,
      [rows[0].id, archivo.filename]
    );
  }

  return res.status(201).json({ solicitud: rows[0] });
}

export async function responsables(req, res) {
  const { rows } = await pool.query(
    `SELECT id, COALESCE(nombre_corto, nombre) AS nombre, numero_empleado
     FROM usuarios WHERE rol = 'admin' AND activo = true
     ORDER BY nombre`
  );
  return res.json({ responsables: rows });
}

export async function asignarResponsable(req, res) {
  const { id } = req.params;
  const responsableId = req.body.responsable_id ? Number(req.body.responsable_id) : null;
  if (responsableId && !(await esAdminActivo(responsableId))) {
    return res.status(400).json({ detail: 'El responsable debe ser un administrador activo' });
  }

  const { rows } = await pool.query(
    `UPDATE solicitudes SET responsable_id = $1
     WHERE id = $2 AND (estado = 'pendiente' OR (estado = 'aprobada' AND completada = false))
     RETURNING *`,
    [responsableId, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Actividad no encontrada o ya está cerrada' });
  }
  return res.json({ solicitud: rows[0] });
}

export async function editarMotivoPausa(req, res) {
  const { id } = req.params;
  const motivo = (req.body.motivo || '').trim();
  if (!motivo) {
    return res.status(400).json({ detail: 'Escribe el motivo de la pausa' });
  }
  if (motivo.length > 1000) {
    return res.status(400).json({ detail: 'El motivo no puede pasar de 1000 caracteres' });
  }

  const { rows } = await pool.query(
    `UPDATE solicitudes SET motivo_pausa = $1
     WHERE id = $2 AND estado = 'aprobada' AND completada = false AND pausada = true
     RETURNING *`,
    [motivo, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Actividad no encontrada o no está en pausa' });
  }
  return res.json({ solicitud: rows[0] });
}

export async function cambiarPrioridad(req, res) {
  const { id } = req.params;
  const { prioridad } = req.body;
  if (!PRIORIDADES.includes(prioridad)) {
    return res.status(400).json({ detail: 'Prioridad inválida (usa alta, media o baja)' });
  }

  const { rows } = await pool.query(
    `UPDATE solicitudes SET prioridad = $1
     WHERE id = $2 AND (estado = 'pendiente' OR (estado = 'aprobada' AND completada = false))
     RETURNING *`,
    [prioridad, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o ya no se puede reclasificar' });
  }
  return res.json({ solicitud: rows[0] });
}

export async function aprobar(req, res) {
  const { id } = req.params;
  const fecha_inicio = req.body.fecha_inicio || hoyISO();
  const { fecha_objetivo } = req.body;

  const errorRango = validarRango(fecha_inicio, fecha_objetivo);
  if (errorRango) {
    return res.status(400).json({ detail: errorRango });
  }

  const maxOrden = await pool.query(
    `SELECT COALESCE(MAX(orden_prioridad), 0) AS max FROM solicitudes WHERE estado = 'aprobada'`
  );
  const orden_prioridad = maxOrden.rows[0].max + 1;

  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET estado = 'aprobada', fecha_inicio = $1, fecha_objetivo = $2, orden_prioridad = $3,
         fecha_aprobacion = now(), motivo_rechazo = NULL
     WHERE id = $4 AND estado = 'pendiente'
     RETURNING *`,
    [fecha_inicio, fecha_objetivo, orden_prioridad, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o ya procesada' });
  }

  const solicitante = await pool.query('SELECT email FROM usuarios WHERE id = $1', [rows[0].usuario_id]);
  notificarResultadoSolicitud({ ...rows[0], email: solicitante.rows[0]?.email }, true);

  return res.json({ solicitud: rows[0] });
}

export async function editarFechas(req, res) {
  const { id } = req.params;
  const comentario = (req.body.comentario || '').trim();
  if (comentario.length > 1000) {
    return res.status(400).json({ detail: 'El comentario no puede pasar de 1000 caracteres' });
  }

  const actual = await pool.query(
    `SELECT s.*, u.email AS email
     FROM solicitudes s
     LEFT JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.id = $1 AND s.estado = 'aprobada' AND s.completada = false`,
    [id]
  );
  const previa = actual.rows[0];
  if (!previa) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o no está activa' });
  }
  // Solo las solicitudes de colaboradores tienen a alguien externo a quien avisar del cambio.
  const avisarSolicitante = previa.origen === 'solicitud';
  if (avisarSolicitante && !comentario) {
    return res.status(400).json({ detail: 'Escribe un comentario para el solicitante explicando el cambio' });
  }

  const inicioAnterior = fechaISO(previa.fecha_inicio) || fechaISO(previa.fecha_aprobacion);
  const finAnterior = fechaISO(previa.fecha_objetivo);
  const fecha_inicio = req.body.fecha_inicio || inicioAnterior;
  const fecha_objetivo = req.body.fecha_objetivo || finAnterior;

  const errorRango = validarRango(fecha_inicio, fecha_objetivo);
  if (errorRango) {
    return res.status(400).json({ detail: errorRango });
  }

  const { rows } = comentario
    ? await pool.query(
        `UPDATE solicitudes
         SET fecha_inicio = $1, fecha_objetivo = $2, comentario_admin = $3, fecha_comentario = now()
         WHERE id = $4
         RETURNING *`,
        [fecha_inicio, fecha_objetivo, comentario, id]
      )
    : await pool.query(
        `UPDATE solicitudes SET fecha_inicio = $1, fecha_objetivo = $2 WHERE id = $3 RETURNING *`,
        [fecha_inicio, fecha_objetivo, id]
      );

  if (avisarSolicitante) {
    notificarCambioFechas({ ...rows[0], email: previa.email }, { inicio: inicioAnterior, fin: finAnterior });
  }

  return res.json({ solicitud: rows[0] });
}

export async function rechazar(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;

  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET estado = 'rechazada', motivo_rechazo = $1
     WHERE id = $2 AND estado = 'pendiente'
     RETURNING *`,
    [motivo || null, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o ya procesada' });
  }

  const solicitante = await pool.query('SELECT email FROM usuarios WHERE id = $1', [rows[0].usuario_id]);
  notificarResultadoSolicitud({ ...rows[0], email: solicitante.rows[0]?.email }, false);

  return res.json({ solicitud: rows[0] });
}

export async function reabrir(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET estado = 'pendiente', motivo_rechazo = NULL, fecha_inicio = NULL, fecha_objetivo = NULL, orden_prioridad = NULL,
         fecha_aprobacion = NULL, modo_avance = 'automatico', avance_manual = NULL,
         comentario_admin = NULL, fecha_comentario = NULL
     WHERE id = $1 AND estado = 'rechazada'
     RETURNING *`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o no está rechazada' });
  }
  return res.json({ solicitud: rows[0] });
}

export async function eliminar(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `DELETE FROM solicitudes WHERE id = $1 AND estado = 'rechazada' RETURNING id`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o no está rechazada' });
  }
  return res.json({ ok: true });
}

export async function pausar(req, res) {
  const { id } = req.params;
  const { motivo } = req.body;

  const actual = await pool.query(
    `SELECT * FROM solicitudes WHERE id = $1 AND estado = 'aprobada' AND completada = false AND pausada = false`,
    [id]
  );
  if (actual.rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o no se puede pausar' });
  }
  const avanceActual = avanceEfectivo(actual.rows[0]);

  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET pausada = true, fecha_pausa_inicio = now(), motivo_pausa = $1, avance_congelado = $2
     WHERE id = $3
     RETURNING *`,
    [motivo || null, avanceActual, id]
  );
  return res.json({ solicitud: rows[0] });
}

export async function reanudar(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET fecha_objetivo = fecha_objetivo + CEIL(EXTRACT(EPOCH FROM (now() - fecha_pausa_inicio)) / 86400)::int,
         pausada = false, fecha_pausa_inicio = NULL, motivo_pausa = NULL, avance_congelado = NULL
     WHERE id = $1 AND estado = 'aprobada' AND pausada = true
     RETURNING *`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada o no está pausada' });
  }
  return res.json({ solicitud: rows[0] });
}

export async function completar(req, res) {
  const { id } = req.params;
  const archivos = req.files || [];
  if (archivos.length === 0) {
    return res.status(400).json({ detail: 'Adjunta al menos una foto como evidencia de que se atendió la solicitud' });
  }

  const { rows } = await pool.query(
    `UPDATE solicitudes SET completada = true, fecha_completada = now()
     WHERE id = $1 AND estado = 'aprobada' AND pausada = false
     RETURNING *`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Solicitud no encontrada, no está aprobada o está pausada' });
  }

  for (const archivo of archivos) {
    await pool.query(
      `INSERT INTO solicitud_imagenes (solicitud_id, ruta_archivo, tipo) VALUES ($1, $2, 'evidencia')`,
      [id, archivo.filename]
    );
  }

  const [conImagenes] = await adjuntarImagenes([rows[0]]);
  return res.json({ solicitud: conImagenes });
}

export async function listadoPrioridad(req, res) {
  const { rows } = await pool.query(
    `SELECT s.id, s.nombre_solicitante, s.area, s.prioridad, s.fecha_aprobacion, s.modo_avance, s.avance_manual,
            s.fecha_inicio, s.fecha_objetivo, s.orden_prioridad, s.pausada, s.motivo_pausa, s.avance_congelado,
            s.origen, s.responsable_id, ${TITULO_SQL}, ${RESPONSABLE_SQL}
     FROM solicitudes s
     ${RESPONSABLE_JOIN}
     WHERE s.estado = 'aprobada' AND s.completada = false
     ORDER BY s.orden_prioridad ASC NULLS LAST, s.fecha_aprobacion ASC`
  );

  const listado = rows.map((r) => ({
    ...r,
    avance: avanceEfectivo(r),
    dias_restantes: diasRestantes(r.fecha_objetivo),
  }));

  return res.json({ listado });
}

export async function reordenarPrioridad(req, res) {
  const { orden } = req.body;
  if (!Array.isArray(orden) || orden.length === 0) {
    return res.status(400).json({ detail: 'Se requiere un arreglo "orden" con los ids en el nuevo orden' });
  }

  await Promise.all(
    orden.map((id, index) =>
      pool.query(
        `UPDATE solicitudes SET orden_prioridad = $1 WHERE id = $2 AND estado = 'aprobada'`,
        [index + 1, id]
      )
    )
  );

  return res.json({ ok: true });
}

export async function actualizarAvance(req, res) {
  const { id } = req.params;
  const { modo_avance, avance_manual } = req.body;

  if (!['automatico', 'manual'].includes(modo_avance)) {
    return res.status(400).json({ detail: 'modo_avance debe ser "automatico" o "manual"' });
  }
  if (modo_avance === 'manual' && (avance_manual === undefined || avance_manual < 0 || avance_manual > 100)) {
    return res.status(400).json({ detail: 'avance_manual debe estar entre 0 y 100 cuando el modo es manual' });
  }

  const { rows } = await pool.query(
    `UPDATE solicitudes
     SET modo_avance = $1, avance_manual = $2
     WHERE id = $3 AND estado = 'aprobada'
     RETURNING *`,
    [modo_avance, modo_avance === 'manual' ? avance_manual : null, id]
  );
  if (rows.length === 0) return res.status(404).json({ detail: 'Solicitud aprobada no encontrada' });

  return res.json({ solicitud: rows[0] });
}

export async function alertas(req, res) {
  const { rows } = await pool.query(
    `SELECT s.id, s.nombre_solicitante, s.area, s.prioridad, s.fecha_objetivo, s.origen,
            ${TITULO_SQL}, ${RESPONSABLE_SQL}
     FROM solicitudes s
     ${RESPONSABLE_JOIN}
     WHERE s.estado = 'aprobada' AND s.completada = false AND s.pausada = false AND s.fecha_objetivo IS NOT NULL`
  );

  const conDias = rows
    .map((r) => ({ ...r, dias_restantes: diasRestantes(r.fecha_objetivo) }))
    .filter((r) => r.dias_restantes <= 3)
    .sort((a, b) => a.dias_restantes - b.dias_restantes);

  return res.json({ alertas: conDias });
}

export async function estadisticas(req, res) {
  const porEstado = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
       COUNT(*) FILTER (WHERE estado = 'aprobada' AND completada = false AND pausada = false)::int AS aprobadas_activas,
       COUNT(*) FILTER (WHERE estado = 'aprobada' AND completada = false AND pausada = true)::int AS pausadas,
       COUNT(*) FILTER (WHERE estado = 'aprobada' AND completada = true)::int AS completadas,
       COUNT(*) FILTER (WHERE estado = 'rechazada')::int AS rechazadas
     FROM solicitudes`
  );

  const porArea = await pool.query(
    `SELECT area, COUNT(*)::int AS total
     FROM solicitudes
     GROUP BY area
     ORDER BY total DESC, area ASC
     LIMIT 8`
  );

  const porSemana = await pool.query(
    `SELECT gs::date AS semana, COALESCE(COUNT(s.id), 0)::int AS total
     FROM generate_series(
       date_trunc('week', CURRENT_DATE) - INTERVAL '7 weeks',
       date_trunc('week', CURRENT_DATE),
       INTERVAL '1 week'
     ) AS gs
     LEFT JOIN solicitudes s ON date_trunc('week', s.fecha_creacion) = gs
     GROUP BY gs
     ORDER BY gs ASC`
  );

  return res.json({
    porEstado: porEstado.rows[0],
    porArea: porArea.rows,
    porSemana: porSemana.rows,
  });
}

export async function calendario(req, res) {
  const { rows } = await pool.query(
    `SELECT s.id, s.nombre_solicitante, s.area, s.prioridad, s.fecha_inicio, s.fecha_objetivo, s.fecha_aprobacion,
            s.fecha_completada, s.modo_avance, s.avance_manual, s.avance_congelado, s.pausada, s.completada, s.origen,
            ${TITULO_SQL}, ${RESPONSABLE_SQL}
     FROM solicitudes s
     ${RESPONSABLE_JOIN}
     WHERE s.estado = 'aprobada'
     ORDER BY s.fecha_objetivo ASC NULLS LAST`
  );

  // Si ya se completó, el rango termina en la fecha real de cierre
  // en vez de estirarse hasta la fecha objetivo original.
  const actividades = rows.map((r) => ({
    ...r,
    avance: r.completada ? 100 : avanceEfectivo(r),
    fecha_inicio: fechaISO(r.fecha_inicio) || fechaISO(r.fecha_aprobacion),
    fecha_fin: r.completada ? fechaISO(r.fecha_completada || r.fecha_objetivo) : fechaISO(r.fecha_objetivo),
  }));

  return res.json({ actividades });
}
