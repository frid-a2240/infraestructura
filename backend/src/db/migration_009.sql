-- Migración 009: actividades creadas por administradores (o importadas de Notion),
-- con responsable asignado entre administradores.

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'solicitud';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitudes_origen_check') THEN
    ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_origen_check CHECK (origen IN ('solicitud', 'admin', 'notion'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_solicitudes_responsable ON solicitudes(responsable_id);
