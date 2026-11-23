-- Migración 005: prioridad (alta/media/baja), pausa de actividades y evidencia de cierre

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) NOT NULL DEFAULT 'media'
  CHECK (prioridad IN ('alta', 'media', 'baja'));

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS pausada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_pausa_inicio TIMESTAMPTZ;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS motivo_pausa TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS avance_congelado INTEGER
  CHECK (avance_congelado IS NULL OR (avance_congelado BETWEEN 0 AND 100));

ALTER TABLE solicitud_imagenes ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'solicitud'
  CHECK (tipo IN ('solicitud', 'evidencia'));

CREATE INDEX IF NOT EXISTS idx_solicitudes_prioridad ON solicitudes(prioridad);
