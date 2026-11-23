-- Migración 004: reemplazar "duración en días" por una fecha objetivo concreta

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_objetivo DATE;

UPDATE solicitudes
SET fecha_objetivo = (fecha_aprobacion + (duracion_dias || ' days')::interval)::date
WHERE duracion_dias IS NOT NULL AND fecha_aprobacion IS NOT NULL AND fecha_objetivo IS NULL;

ALTER TABLE solicitudes DROP COLUMN IF EXISTS duracion_dias;
