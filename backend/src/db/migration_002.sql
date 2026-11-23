-- Migración 002: rol "consulta", avance manual/seguimiento, notificaciones

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'coordinador', 'supervisor', 'invitado', 'consulta'));

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS modo_avance VARCHAR(10) NOT NULL DEFAULT 'automatico'
  CHECK (modo_avance IN ('automatico', 'manual'));
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS avance_manual INTEGER CHECK (avance_manual IS NULL OR (avance_manual BETWEEN 0 AND 100));

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL,
  destinatario VARCHAR(255),
  asunto VARCHAR(255) NOT NULL,
  solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
