import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Se cuenta por IP y por cuenta: si detrás de IIS todos llegaran con la misma IP,
// los intentos fallidos de una persona no bloquean a las demás.
function porIpYCuenta(req) {
  const cuenta = String(req.body?.identificador || req.body?.email || '').trim().toLowerCase();
  return `${ipKeyGenerator(req.ip)}|${cuenta}`;
}

// Protege contra fuerza bruta: máximo 8 intentos de login por cuenta cada 15 minutos.
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: porIpYCuenta,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
});

// Protege el registro de visitantes contra creación masiva de cuentas.
export const limitarRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Demasiados intentos de registro. Espera un momento y vuelve a intentar.' },
});

// Evita saturar de correos a una cuenta y limita los intentos de adivinar el código.
export const limitarRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  keyGenerator: porIpYCuenta,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
});
