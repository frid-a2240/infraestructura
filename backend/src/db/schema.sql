-- Esquema del Sistema de Infraestructura ISP

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  numero_empleado VARCHAR(20) UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  nombre_corto VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  area VARCHAR(100),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'colaborador', 'invitado')),
  password_hash VARCHAR(255) NOT NULL,
  primera_vez BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  codigo_recuperacion_hash VARCHAR(255),
  codigo_recuperacion_expira TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nombre_solicitante VARCHAR(150) NOT NULL,
  area VARCHAR(100) NOT NULL,
  explicacion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  fecha_inicio DATE,
  fecha_objetivo DATE,
  orden_prioridad INTEGER,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  solicitud_origen_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
  modo_avance VARCHAR(10) NOT NULL DEFAULT 'automatico' CHECK (modo_avance IN ('automatico', 'manual')),
  avance_manual INTEGER CHECK (avance_manual IS NULL OR (avance_manual BETWEEN 0 AND 100)),
  completada BOOLEAN NOT NULL DEFAULT false,
  fecha_completada TIMESTAMPTZ,
  pausada BOOLEAN NOT NULL DEFAULT false,
  fecha_pausa_inicio TIMESTAMPTZ,
  motivo_pausa TEXT,
  avance_congelado INTEGER CHECK (avance_congelado IS NULL OR (avance_congelado BETWEEN 0 AND 100)),
  comentario_admin TEXT,
  fecha_comentario TIMESTAMPTZ,
  responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  origen VARCHAR(20) NOT NULL DEFAULT 'solicitud' CONSTRAINT solicitudes_origen_check CHECK (origen IN ('solicitud', 'admin', 'notion'))
);

CREATE TABLE IF NOT EXISTS solicitud_imagenes (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  ruta_archivo VARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL DEFAULT 'solicitud' CHECK (tipo IN ('solicitud', 'evidencia')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL,
  destinatario VARCHAR(255),
  asunto VARCHAR(255) NOT NULL,
  solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id SERIAL PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(255) NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  subido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_prioridad ON solicitudes(prioridad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_responsable ON solicitudes(responsable_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_imagenes_solicitud ON solicitud_imagenes(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
