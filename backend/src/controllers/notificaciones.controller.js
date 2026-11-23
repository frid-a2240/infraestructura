import { pool } from '../config/db.js';

export async function pendientes(req, res) {
  const { rows } = await pool.query(
    `SELECT id, nombre_solicitante, area, fecha_objetivo, origen,
            CASE WHEN origen = 'solicitud' THEN nombre_solicitante ELSE explicacion END AS titulo,
            (fecha_objetivo - CURRENT_DATE)::int AS dias_restantes
     FROM solicitudes
     WHERE estado = 'aprobada' AND completada = false AND fecha_objetivo IS NOT NULL
     ORDER BY fecha_objetivo ASC`
  );
  return res.json({ pendientes: rows });
}

export async function conteoUrgentes(req, res) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM solicitudes
     WHERE estado = 'aprobada' AND completada = false
       AND fecha_objetivo <= (CURRENT_DATE + INTERVAL '15 days')`
  );
  return res.json({ count: rows[0].count });
}
