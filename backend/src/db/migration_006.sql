-- Migración 006: registrar la fecha real en la que se completó una solicitud,
-- para que el Gantt no siga mostrando la barra hasta la fecha objetivo original.

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_completada TIMESTAMPTZ;

-- Solicitudes ya completadas antes de esta migración no tienen fecha real de cierre;
-- se aproxima con la fecha objetivo (o hoy, si la fecha objetivo seguía en el futuro).
UPDATE solicitudes
SET fecha_completada = LEAST(fecha_objetivo::timestamptz, now())
WHERE completada = true AND fecha_completada IS NULL AND fecha_objetivo IS NOT NULL;
