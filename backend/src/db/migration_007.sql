-- Migración 007: código de verificación por correo para recuperar contraseña olvidada.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_recuperacion_hash VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_recuperacion_expira TIMESTAMPTZ;
