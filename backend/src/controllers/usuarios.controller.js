import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { PASSWORD_GENERICA_COLABORADOR } from '../utils/passwordGenerica.js';

export async function listar(req, res) {
  const { rows } = await pool.query(
    `SELECT id, numero_empleado, nombre, nombre_corto, email, area, rol, primera_vez, activo, created_at
     FROM usuarios ORDER BY nombre ASC`
  );
  return res.json({ usuarios: rows });
}

export async function cambiarRol(req, res) {
  const { id } = req.params;
  const { rol } = req.body;
  if (!['admin', 'colaborador'].includes(rol)) {
    return res.status(400).json({ detail: 'Rol inválido (usa admin o colaborador)' });
  }

  const { rows } = await pool.query(
    `UPDATE usuarios SET rol = $1 WHERE id = $2 AND rol IN ('admin', 'colaborador') RETURNING id, nombre, rol`,
    [rol, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Usuario no encontrado o no es personal interno' });
  }
  return res.json({ usuario: rows[0] });
}

export async function regenerarPassword(req, res) {
  const { id } = req.params;
  const hash = await bcrypt.hash(PASSWORD_GENERICA_COLABORADOR, 10);

  const { rows } = await pool.query(
    `UPDATE usuarios SET password_hash = $1, primera_vez = true,
            codigo_recuperacion_hash = NULL, codigo_recuperacion_expira = NULL
     WHERE id = $2 AND rol = 'colaborador'
     RETURNING id, nombre, numero_empleado`,
    [hash, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Usuario no encontrado o no es colaborador' });
  }
  return res.json({ usuario: rows[0], password_temporal: PASSWORD_GENERICA_COLABORADOR });
}

export async function desactivar(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    'UPDATE usuarios SET activo = NOT activo WHERE id = $1 RETURNING id, activo',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ detail: 'Usuario no encontrado' });
  return res.json({ usuario: rows[0] });
}
