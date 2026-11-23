-- Migración 008: rango de fechas (inicio → terminación) por actividad, comentario al
-- solicitante cuando se modifica la fecha, y órdenes de trabajo en PDF para Reportes.

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS comentario_admin TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_comentario TIMESTAMPTZ;

-- Las ya aprobadas no tenían fecha de inicio; se toma el día en que se aprobaron.
UPDATE solicitudes
SET fecha_inicio = LEAST(fecha_aprobacion::date, COALESCE(fecha_objetivo, fecha_aprobacion::date))
WHERE estado = 'aprobada' AND fecha_inicio IS NULL AND fecha_aprobacion IS NOT NULL;

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id SERIAL PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(255) NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  subido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
