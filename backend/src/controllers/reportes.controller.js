import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { ORDENES_ROOT } from '../middleware/upload.js';

function rutaSegura(rutaArchivo) {
  return path.join(ORDENES_ROOT, path.basename(rutaArchivo));
}

// El mimetype lo declara el navegador; se confirma que el contenido realmente sea un PDF.
function esPdfReal(rutaAbsoluta) {
  const fd = fs.openSync(rutaAbsoluta, 'r');
  try {
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    return buffer.toString('ascii') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
}

function borrarArchivos(archivos) {
  for (const archivo of archivos) {
    fs.rm(archivo.path, { force: true }, () => {});
  }
}

export async function listarOrdenes(req, res) {
  const { rows } = await pool.query(
    `SELECT o.id, o.nombre_original, o.tamano_bytes, o.created_at,
            COALESCE(u.nombre_corto, u.nombre) AS subido_por
     FROM ordenes_trabajo o
     LEFT JOIN usuarios u ON u.id = o.subido_por
     ORDER BY o.created_at DESC`
  );
  return res.json({ ordenes: rows });
}

export async function subirOrdenes(req, res) {
  const archivos = req.files || [];
  if (archivos.length === 0) {
    return res.status(400).json({ detail: 'Selecciona al menos un archivo PDF' });
  }

  const invalido = archivos.find((a) => !esPdfReal(a.path));
  if (invalido) {
    borrarArchivos(archivos);
    return res.status(400).json({ detail: `"${invalido.originalname}" no es un PDF válido` });
  }

  const guardadas = [];
  for (const archivo of archivos) {
    const { rows } = await pool.query(
      `INSERT INTO ordenes_trabajo (nombre_original, ruta_archivo, tamano_bytes, subido_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre_original, tamano_bytes, created_at`,
      [archivo.originalname.slice(0, 255), archivo.filename, archivo.size, req.user.id]
    );
    guardadas.push(rows[0]);
  }

  return res.status(201).json({ ordenes: guardadas });
}

export async function verOrden(req, res) {
  const { rows } = await pool.query('SELECT * FROM ordenes_trabajo WHERE id = $1', [req.params.id]);
  const orden = rows[0];
  if (!orden) {
    return res.status(404).json({ detail: 'Orden de trabajo no encontrada' });
  }

  const ruta = rutaSegura(orden.ruta_archivo);
  if (!fs.existsSync(ruta)) {
    return res.status(404).json({ detail: 'El archivo ya no existe en el servidor' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(orden.nombre_original)}`);
  return res.sendFile(ruta);
}

export async function eliminarOrden(req, res) {
  const { rows } = await pool.query(
    'DELETE FROM ordenes_trabajo WHERE id = $1 RETURNING ruta_archivo',
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ detail: 'Orden de trabajo no encontrada' });
  }
  fs.rm(rutaSegura(rows[0].ruta_archivo), { force: true }, () => {});
  return res.json({ ok: true });
}
