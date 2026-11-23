-- Migración 003: eliminar categorías; duración y prioridad pasan a definirse por solicitud al aprobar

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS duracion_dias INTEGER CHECK (duracion_dias IS NULL OR duracion_dias > 0);
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS orden_prioridad INTEGER;

UPDATE solicitudes s
SET duracion_dias = c.duracion_dias, orden_prioridad = c.orden_prioridad
FROM categorias c
WHERE s.categoria_id = c.id;

ALTER TABLE solicitudes DROP COLUMN IF EXISTS categoria_id;
DROP TABLE IF EXISTS categorias;
